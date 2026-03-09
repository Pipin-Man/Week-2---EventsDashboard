const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const apiBaseUrl = (rawApiBaseUrl && rawApiBaseUrl.trim().length > 0
  ? rawApiBaseUrl
  : "http://localhost:3000").replace(/\/$/, "");
