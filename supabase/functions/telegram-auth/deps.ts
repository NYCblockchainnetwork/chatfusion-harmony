
export { serve } from "https://deno.land/std@0.168.0/http/server.ts";
export { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CACHE BUSTING: Update Telegram to newer version
export { TelegramClient, Api } from "https://esm.sh/telegram@2.26.23";
export { StringSession } from "https://esm.sh/telegram@2.26.23/sessions";

// Utility logging
export function log(message: string, ...args: any[]) {
  console.log(`[${new Date().toISOString()}] ${message}`, ...args);
}

export function logError(message: string, error: any) {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error);
}
