import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createApiKey, hashApiKey } from "../src/crypto.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, "..", ".env") });

type ImportInput = z.infer<typeof inputSchema>;

type RawTags = z.infer<typeof eventSchema>['tags'];

const insightSchema = z.object({
  title: z.string().trim().min(1).max(120),
  value: z.union([z.string(), z.number()]),
  icon: z.string().trim().max(12).optional(),
});

const eventSchema = z.object({
  channel: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(1000).optional(),
  icon: z.string().trim().max(12).optional(),
  tags: z
    .union([
      z.array(z.string().trim().min(1).max(30)).max(20),
      z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
    ])
    .optional(),
  minutes_ago: z.number().int().min(0),
});

const inputSchema = z.object({
  project: z.object({
    name: z.string().trim().min(1).max(80),
  }),
  insights: z.array(insightSchema).default([]),
  events: z.array(eventSchema).default([]),
});

function resolveInputPath(rawPath: string): string {
  const absoluteInput = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);

  if (existsSync(absoluteInput)) {
    return absoluteInput;
  }

  const fromApiDir = path.resolve(scriptDir, "..", rawPath);
  if (existsSync(fromApiDir)) {
    return fromApiDir;
  }

  const fromWorkspaceRoot = path.resolve(scriptDir, "..", "..", rawPath);
  if (existsSync(fromWorkspaceRoot)) {
    return fromWorkspaceRoot;
  }

  throw new Error(`Input JSON file not found: ${rawPath}`);
}

function loadInput(filePathArg: string): ImportInput {
  const resolvedPath = resolveInputPath(filePathArg);
  const fileContent = readFileSync(resolvedPath, "utf8");
  const parsedJson = JSON.parse(fileContent) as unknown;
  return inputSchema.parse(parsedJson);
}

function normalizeTags(tags: RawTags): string[] {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags;
  }

  return Object.entries(tags).map(([key, value]) => {
    const normalizedValue = value === null ? "null" : String(value);
    return `${key}:${normalizedValue}`;
  });
}

function normalizeInsightValue(value: string | number, icon?: string): string {
  const base = typeof value === "number" ? String(value) : value;
  return icon ? `${icon} ${base}` : base;
}

async function main() {
  const rawPath = process.argv[2];
  if (!rawPath) {
    console.error("Usage: npm --workspace api run import:sample -- <path-to-json>");
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in api/.env");
  }

  const payload = loadInput(rawPath);

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const apiKey = createApiKey();
  const apiKeyHash = hashApiKey(apiKey);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: payload.project.name,
      api_key_hash: apiKeyHash,
    })
    .select("id,name,created_at")
    .single();

  if (projectError || !project) {
    throw new Error(`Failed to create project: ${projectError?.message ?? "unknown error"}`);
  }

  const now = Date.now();

  if (payload.events.length > 0) {
    const rows = payload.events.map((event) => ({
      project_id: project.id,
      channel: event.channel,
      title: event.title,
      description: event.description ?? null,
      emoji: event.icon ?? null,
      tags: normalizeTags(event.tags),
      created_at: new Date(now - event.minutes_ago * 60000).toISOString(),
    }));

    const { error: eventsError } = await supabase.from("events").insert(rows);
    if (eventsError) {
      throw new Error(`Failed to insert events: ${eventsError.message}`);
    }
  }

  if (payload.insights.length > 0) {
    const rows = payload.insights.map((insight) => ({
      project_id: project.id,
      title: insight.title,
      value: normalizeInsightValue(insight.value, insight.icon),
      updated_at: new Date().toISOString(),
    }));

    const { error: insightsError } = await supabase
      .from("insights")
      .upsert(rows, { onConflict: "project_id,title" });

    if (insightsError) {
      throw new Error(`Failed to upsert insights: ${insightsError.message}`);
    }
  }

  console.log("Sample import complete.");
  console.log(`Project ID: ${project.id}`);
  console.log(`Project Name: ${project.name}`);
  console.log(`API Key: ${apiKey}`);
  console.log(`Events inserted: ${payload.events.length}`);
  console.log(`Insights upserted: ${payload.insights.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Import failed.");
  process.exit(1);
});
