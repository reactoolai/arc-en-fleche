import { createClient } from "@supabase/supabase-js";

const url = "https://nvlvsocxhhgupgvszqjw.supabase.co";
const anonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52bHZzb2N4aGhndXBndnN6cWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwOTk5MTEsImV4cCI6MjEwMTY3NTkxMX0.VOv3UNLZqx_RrzDqHGP_Dhn5hrmvoa25YeJOd_psdH0";

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
