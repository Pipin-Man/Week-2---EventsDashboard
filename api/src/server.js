import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { config } from './config.js';
import { supabase } from './supabase.js';
import { generateApiKey } from './security.js';

const app = express();
app.use(cors({ origin: config.dashboardOrigin }));
app.use(express.json());

const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(300).optional()
});

const createEventSchema = z.object({
  channel: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  icon: z.string().max(8).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional()
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/projects', async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const apiKey = generateApiKey();

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      api_key: apiKey
    })
    .select('id, name, description, created_at')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ project: data, apiKey });
});

app.post('/api/events', async (req, res) => {
  const apiKeyHeader = req.header('x-api-key');

  if (!apiKeyHeader) {
    return res.status(401).json({ error: 'Missing API key in x-api-key header' });
  }

  const eventParsed = createEventSchema.safeParse(req.body);
  if (!eventParsed.success) {
    return res.status(400).json({ error: eventParsed.error.flatten() });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('api_key', apiKeyHeader)
    .single();

  if (projectError || !project) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const payload = eventParsed.data;

  const { data, error } = await supabase
    .from('events')
    .insert({
      project_id: project.id,
      channel: payload.channel,
      title: payload.title,
      description: payload.description ?? null,
      icon: payload.icon ?? null,
      tags: payload.tags ?? []
    })
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ event: data });
});

app.get('/api/events', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const channel = req.query.channel;
  const search = req.query.search;

  let query = supabase
    .from('events')
    .select('id, channel, title, description, icon, tags, created_at, project_id, projects(name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (channel) {
    query = query.eq('channel', channel);
  }

  if (search) {
    const safeSearch = search.replace(/[,%]/g, '');
    query = query.or(`title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,tags.cs.{${safeSearch}}`);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ events: data });
});

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
