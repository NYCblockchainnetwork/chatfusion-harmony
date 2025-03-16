
// Import the Deno standard library HTTP server
export { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import Supabase client
export { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Import GRM (Gram JS for Deno)
export { 
  TelegramClient,
  StringSession,
  Api,
  utils
} from "https://deno.land/x/grm@0.0.4/mod.ts";

// Import QR code library for login functionality
export { default as QRCode } from "https://esm.sh/qrcode@1.5.3";

// Export a helper function to log info with timestamps
export function log(message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, ...args);
}

// Export error logging helper
export function logError(message: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, error);
}

// Ensure GRM is properly initialized
console.log("Initializing GRM dependencies...");
