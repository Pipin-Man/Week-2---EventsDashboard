import cors from "cors";
import express from "express";
import { z } from "zod";
import { config } from "./config.js";
import { requireApiKey } from "./auth.js";
import { createApiKey, hashApiKey } from "./crypto.js";
import { supabase } from "./supabase.js";

const app = express();

app.use(cors());
app.use(express.json());

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  creationToken: z.string().optional(),
});

const createEventSchema = z.object({
  channel: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(1000).optional(),
  emoji: z.string().trim().max(10).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/projects", async (request, response) => {
  const parsed = createProjectSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ error: "Invalid project payload.", details: parsed.error.flatten() });
  }

  if (config.projectCreationToken && parsed.data.creationToken !== config.projectCreationToken) {
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

app.use((_request, response) => {
  response.status(404).json({ error: "Not found." });
});

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});
