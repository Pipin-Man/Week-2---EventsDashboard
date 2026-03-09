import cors from "cors";
import express from "express";
import { z } from "zod";
import { requireApiKey } from "./auth.js";
import { config } from "./config.js";
import { createApiKey, hashApiKey } from "./crypto.js";
import { supabase } from "./supabase.js";

const app = express();

app.use(cors());
app.use(express.json());

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  creationToken: z.string().optional(),
});

const manageProjectKeySchema = z.object({
  creationToken: z.string().optional(),
});

const projectParamsSchema = z.object({
  projectId: z.string().uuid(),
});

const createEventSchema = z.object({
  channel: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(1000).optional(),
  emoji: z.string().trim().max(10).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
});

const upsertInsightSchema = z.object({
  title: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(240),
});

function hasValidCreationToken(creationToken?: string): boolean {
  if (!config.projectCreationToken) {
    return true;
  }

  return creationToken === config.projectCreationToken;
}

function toStartOfDayIso(dateInput: string): string | null {
  const candidate = new Date(`${dateInput}T00:00:00`);
  return Number.isNaN(candidate.getTime()) ? null : candidate.toISOString();
}

function toEndOfDayIso(dateInput: string): string | null {
  const candidate = new Date(`${dateInput}T23:59:59.999`);
  return Number.isNaN(candidate.getTime()) ? null : candidate.toISOString();
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/projects", async (_request, response) => {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return response.status(500).json({ error: "Failed to load projects.", details: error.message });
  }

  return response.json({ projects: data ?? [] });
});

app.get("/api/insights", async (request, response) => {
  const projectId = typeof request.query.projectId === "string" ? request.query.projectId : null;
  const startDate = typeof request.query.startDate === "string" ? request.query.startDate : null;
  const endDate = typeof request.query.endDate === "string" ? request.query.endDate : null;

  if (startDate && !DATE_INPUT_PATTERN.test(startDate)) {
    return response.status(400).json({ error: "Invalid startDate. Expected YYYY-MM-DD." });
  }

  if (endDate && !DATE_INPUT_PATTERN.test(endDate)) {
    return response.status(400).json({ error: "Invalid endDate. Expected YYYY-MM-DD." });
  }

  const startIso = startDate ? toStartOfDayIso(startDate) : null;
  const endIso = endDate ? toEndOfDayIso(endDate) : null;

  if (startDate && !startIso) {
    return response.status(400).json({ error: "Invalid startDate value." });
  }

  if (endDate && !endIso) {
    return response.status(400).json({ error: "Invalid endDate value." });
  }

  if (startIso && endIso && startIso > endIso) {
    return response.status(400).json({ error: "startDate must be before or equal to endDate." });
  }

  let query = supabase
    .from("insights")
    .select("id,project_id,title,value,created_at,updated_at")
    .order("title", { ascending: true });

  if (projectId && projectId.length > 0) {
    query = query.eq("project_id", projectId);
  }

  if (startIso) {
    query = query.gte("updated_at", startIso);
  }

  if (endIso) {
    query = query.lte("updated_at", endIso);
  }

  const { data, error } = await query;

  if (error) {
    return response.status(500).json({ error: "Failed to load insights.", details: error.message });
  }

  return response.json({ insights: data ?? [] });
});

app.post("/api/projects", async (request, response) => {
  const parsed = createProjectSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ error: "Invalid project payload.", details: parsed.error.flatten() });
  }

  if (!hasValidCreationToken(parsed.data.creationToken)) {
    return response.status(403).json({ error: "Invalid creation token." });
  }

  const apiKey = createApiKey();
  const apiKeyHash = hashApiKey(apiKey);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: parsed.data.name,
      api_key_hash: apiKeyHash,
    })
    .select("id,name,created_at")
    .single();

  if (error || !data) {
    return response.status(500).json({ error: "Failed to create project.", details: error?.message });
  }

  return response.status(201).json({
    project: data,
    apiKey,
  });
});

app.post("/api/projects/:projectId/rotate-key", async (request, response) => {
  const paramsParsed = projectParamsSchema.safeParse(request.params);
  if (!paramsParsed.success) {
    return response.status(400).json({ error: "Invalid project id." });
  }

  const bodyParsed = manageProjectKeySchema.safeParse(request.body ?? {});
  if (!bodyParsed.success) {
    return response.status(400).json({ error: "Invalid request payload." });
  }

  if (!hasValidCreationToken(bodyParsed.data.creationToken)) {
    return response.status(403).json({ error: "Invalid creation token." });
  }

  const apiKey = createApiKey();
  const apiKeyHash = hashApiKey(apiKey);

  const { data, error } = await supabase
    .from("projects")
    .update({
      api_key_hash: apiKeyHash,
    })
    .eq("id", paramsParsed.data.projectId)
    .select("id,name,created_at")
    .maybeSingle();

  if (error) {
    return response.status(500).json({ error: "Failed to rotate API key.", details: error.message });
  }

  if (!data) {
    return response.status(404).json({ error: "Project not found." });
  }

  return response.status(200).json({
    project: data,
    apiKey,
  });
});

app.post("/api/projects/:projectId/revoke-key", async (request, response) => {
  const paramsParsed = projectParamsSchema.safeParse(request.params);
  if (!paramsParsed.success) {
    return response.status(400).json({ error: "Invalid project id." });
  }

  const bodyParsed = manageProjectKeySchema.safeParse(request.body ?? {});
  if (!bodyParsed.success) {
    return response.status(400).json({ error: "Invalid request payload." });
  }

  if (!hasValidCreationToken(bodyParsed.data.creationToken)) {
    return response.status(403).json({ error: "Invalid creation token." });
  }

  const revokedHash = hashApiKey(createApiKey());

  const { data, error } = await supabase
    .from("projects")
    .update({
      api_key_hash: revokedHash,
    })
    .eq("id", paramsParsed.data.projectId)
    .select("id")
    .maybeSingle();

  if (error) {
    return response.status(500).json({ error: "Failed to revoke API key.", details: error.message });
  }

  if (!data) {
    return response.status(404).json({ error: "Project not found." });
  }

  return response.status(200).json({
    ok: true,
    projectId: paramsParsed.data.projectId,
  });
});

app.post("/api/events", requireApiKey, async (request, response) => {
  const parsed = createEventSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ error: "Invalid event payload.", details: parsed.error.flatten() });
  }

  const payload = parsed.data;

  const { data, error } = await supabase
    .from("events")
    .insert({
      project_id: request.project!.id,
      channel: payload.channel,
      title: payload.title,
      description: payload.description ?? null,
      emoji: payload.emoji ?? null,
      tags: payload.tags ?? [],
    })
    .select("id,project_id,channel,title,description,emoji,tags,created_at")
    .single();

  if (error || !data) {
    return response.status(500).json({ error: "Failed to store event.", details: error?.message });
  }

  return response.status(201).json({ event: data });
});

app.post("/api/insight", requireApiKey, async (request, response) => {
  const parsed = upsertInsightSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ error: "Invalid insight payload.", details: parsed.error.flatten() });
  }

  const payload = parsed.data;

  const { data, error } = await supabase
    .from("insights")
    .upsert(
      {
        project_id: request.project!.id,
        title: payload.title,
        value: payload.value,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "project_id,title",
      }
    )
    .select("id,project_id,title,value,created_at,updated_at")
    .single();

  if (error || !data) {
    return response.status(500).json({ error: "Failed to upsert insight.", details: error?.message });
  }

  return response.status(200).json({ insight: data });
});

app.use((_request, response) => {
  response.status(404).json({ error: "Not found." });
});

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});
