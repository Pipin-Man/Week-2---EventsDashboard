import type { NextFunction, Request, Response } from "express";
import { hashApiKey } from "./crypto.js";
import { supabase } from "./supabase.js";

type Project = {
  id: string;
  name: string;
};

declare global {
  namespace Express {
    interface Request {
      project?: Project;
    }
  }
}

export async function requireApiKey(request: Request, response: Response, next: NextFunction) {
  const apiKey = request.header("x-api-key");
  if (!apiKey) {
    return response.status(401).json({ error: "Missing API key. Send x-api-key header." });
  }

  const apiKeyHash = hashApiKey(apiKey);

  const { data, error } = await supabase
    .from("projects")
    .select("id,name")
    .eq("api_key_hash", apiKeyHash)
    .single();

  if (error || !data) {
    return response.status(401).json({ error: "Invalid API key." });
  }

  request.project = data;
  next();
}
