
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { handleQrLogin, processQrCodeLogin } from "./qr-login.ts";
import { TelegramClient } from "https://esm.sh/telegram@2.26.22";
import { StringSession } from "https://esm.sh/telegram@2.26.22/sessions";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { userId, token, method, apiId, apiHash } = body;

    console.log("Telegram Auth function called with method:", method);
    
    // Create response with CORS headers
    const createResponse = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status,
      });
    };

    // Handle different methods
    switch (method) {
      case "validate-credentials":
        if (!apiId || !apiHash) {
          return createResponse({ error: "API ID and API Hash are required" }, 400);
        }
        
        try {
          console.log("Validating Telegram credentials...");
          // Make sure we're using an empty StringSession
          const stringSession = new StringSession("");
          
          // Create the client with proper configuration for web environments
          const client = new TelegramClient(stringSession, parseInt(apiId, 10), apiHash, {
            connectionRetries: 2,
            useWSS: true,
            timeout: 10000
          });
          
          // Test connecting to Telegram servers
          await client.connect();
          console.log("Successfully connected to Telegram with provided credentials");
          await client.disconnect();
          
          // If we reached here, credentials are valid
          // Store them in Supabase user_api_keys table if userId is provided
          if (userId) {
            // Store API ID
            const { error: apiIdError } = await supabase
              .from("user_api_keys")
              .upsert(
                {
                  user_id: userId,
                  service: "telegram_api_id",
                  api_key: apiId,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id,service" }
              );
            
            if (apiIdError) {
              console.error("Error storing API ID:", apiIdError);
              // Continue anyway, this is not critical
            }
            
            // Store API Hash
            const { error: apiHashError } = await supabase
              .from("user_api_keys")
              .upsert(
                {
                  user_id: userId,
                  service: "telegram_api_hash",
                  api_key: apiHash,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id,service" }
              );
            
            if (apiHashError) {
              console.error("Error storing API Hash:", apiHashError);
              // Continue anyway, this is not critical
            }
          }
          
          return createResponse({ 
            valid: true, 
            message: "Credentials valid and successfully connected to Telegram" 
          });
        } catch (validationErr) {
          console.error("Error validating credentials:", validationErr);
          return createResponse({
            valid: false,
            error: validationErr.message || "Invalid credentials"
          }, 400);
        }

      case "get-qr-token":
        if (!userId) {
          return createResponse({ error: "User ID is required" }, 400);
        }
        
        console.log("Getting QR token for user:", userId);
        const qrToken = await handleQrLogin(supabase, userId);
        return createResponse(qrToken);

      case "check-qr-status":
        if (!userId || !token) {
          return createResponse({ error: "User ID and token are required" }, 400);
        }
        
        console.log("Checking QR status for token:", token);
        const status = await processQrCodeLogin(supabase, userId, token);
        return createResponse(status);
      
      default:
        console.log("Invalid method:", method);
        return createResponse({ error: "Invalid method" }, 400);
    }
  } catch (error) {
    console.error("Error in telegram-auth function:", error.message);
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
