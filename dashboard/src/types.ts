export type EventRecord = {
  id: string;
  project_id: string;
  channel: string;
  title: string;
  description: string | null;
  emoji: string | null;
  tags: string[];
  created_at: string;
};

export type ProjectRecord = {
  id: string;
  name: string;
  created_at: string;
};

export type InsightRecord = {
  id: string;
  project_id: string;
  title: string;
  value: string;
  created_at: string;
  updated_at: string;
};
