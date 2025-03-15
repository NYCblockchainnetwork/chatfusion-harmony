
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { handleQrLogin, processQrCodeLogin } from "./qr-login.ts";
import { CustomStringSession } from "./custom-session.ts";

// Using a direct import strategy that works better with Deno
import { TelegramClient } from "https://esm.sh/v135/telegram@2.26.22/X-ZS8q/deno/telegram.mjs";

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
          console.error("Missing credentials");
          return createResponse({ error: "API ID and API Hash are required" }, 400);
        }
        
        // Validate API ID format
        if (!/^\d+$/.test(apiId)) {
          console.error("Invalid API ID format");
          return createResponse({
            valid: false,
            error: "API ID must be a valid number"
          }, 400);
        }
        
        try {
          console.log("Validating Telegram credentials...");
          console.log("API ID exists:", !!apiId);
          console.log("API Hash exists:", !!apiHash);
          
          // Create custom session
          const session = new CustomStringSession("");
          console.log("Session created with type:", session.constructor.name);
          
          // Initialize client with minimal config
          console.log("Creating TelegramClient instance...");
          const client = new TelegramClient(
            session,
            parseInt(apiId, 10),
            apiHash,
            {
              connectionRetries: 3,
              useWSS: true,
              baseLogger: console,
              deviceModel: "Deno Edge Function",
              systemVersion: "Windows",
              appVersion: "1.0.0",
              langCode: "en",
              systemLangCode: "en",
              initConnectionParams: {
                apiId: parseInt(apiId, 10),
                deviceModel: "Deno Edge Function",
                systemVersion: "Windows",
                appVersion: "1.0.0",
                langCode: "en",
                systemLangCode: "en",
              }
            }
          );
          
          console.log("TelegramClient instance created, testing connection...");
          
          // Set a connection timeout
          const connectionTimeout = setTimeout(() => {
            console.error("Connection timeout after 15 seconds");
            client.disconnect();
          }, 15000);
          
          try {
            console.log("Connecting to Telegram...");
            await client.connect();
            clearTimeout(connectionTimeout);
            
            console.log("Successfully connected to Telegram");
            
            // Test if we're actually connected
            const isConnected = await client.isConnected();
            console.log("Connection test result:", isConnected);
            
            if (!isConnected) {
              throw new Error("Failed to connect to Telegram");
            }
            
            // Save the session string for debugging
            const sessionString = session.save();
            console.log("Session string generated:", !!sessionString);
            
            await client.disconnect();
            console.log("Client disconnected successfully");
            
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
              } else {
                console.log("API ID stored successfully");
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
              } else {
                console.log("API Hash stored successfully");
              }
            }
            
            return createResponse({ 
              valid: true, 
              message: "Credentials valid and successfully connected to Telegram" 
            });
          } catch (connectErr) {
            clearTimeout(connectionTimeout);
            console.error("Error connecting to Telegram:", connectErr);
            
            // Try fallback authentication check (simplified validation)
            console.log("Attempting fallback validation...");
            
            try {
              // Simple check to verify the credentials format
              if (apiId && apiHash && /^\d+$/.test(apiId) && apiHash.length > 10) {
                console.log("Credentials appear valid (fallback check)");
                
                // If userId is provided, still store the credentials
                if (userId) {
                  // Store API ID and API Hash (same code as above)
                  await supabase
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
                  
                  await supabase
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
                }
                
                return createResponse({
                  valid: true,
                  message: "Credentials look valid (format check only, actual connection failed)"
                });
              } else {
                throw new Error("Invalid credential format");
              }
            } catch (fallbackErr) {
              console.error("Fallback validation failed:", fallbackErr);
              return createResponse({
                valid: false,
                error: "Failed to validate credentials: " + (connectErr.message || "Connection error")
              }, 400);
            }
          }
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
