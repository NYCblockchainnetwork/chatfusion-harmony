
// Import the Deno standard library HTTP server
export { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import Supabase client
export { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Import telegram library - directly import from the main telegram package
// This is CRITICAL - import StringSession directly from telegram/sessions
import { TelegramClient } from "https://esm.sh/telegram@2.26.22";
import { Api } from "https://esm.sh/telegram@2.26.22";

// Import the StringSession class correctly
import { StringSession } from "https://esm.sh/telegram@2.26.22/sessions";

// Re-export the telegram imports
export { TelegramClient, Api, StringSession };

// Import QR code library for login functionality
export { default as QRCode } from "https://esm.sh/qrcode@1.5.3";

// Utility functions for logging
export function log(message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, ...args);
}

export function logError(message: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, error);
}

// Initialize logging for dependencies
log("Telegram-auth dependencies loaded successfully");
