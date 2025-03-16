
import { serve, createClient, TelegramClient, StringSession, log, logError } from "./deps.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { handleQrLogin, processQrCodeLogin } from "./qr-login.ts";

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

    log(`Telegram Auth function called with method: ${method}`);
    
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
          logError("Missing credentials", { apiId: !!apiId, apiHash: !!apiHash });
          return createResponse({ error: "API ID and API Hash are required" }, 400);
        }
        
        // Validate API ID format
        if (!/^\d+$/.test(apiId)) {
          logError("Invalid API ID format", { apiId });
          return createResponse({
            valid: false,
            error: "API ID must be a valid number"
          }, 400);
        }
        
        try {
          log("Validating Telegram credentials...");
          log("API ID exists:", !!apiId);
          log("API Hash exists:", !!apiHash);
          
          // Create GRM session
          const session = new StringSession("");
          log("Session created with type:", session.constructor.name);
          
          // Initialize GRM client with proper configuration
          log("Creating TelegramClient instance with GRM...");
          const client = new TelegramClient(
            session, 
            parseInt(apiId, 10), 
            apiHash, 
            {
              connectionRetries: 3,
              useWSS: true,
              baseLogger: console,
              deviceModel: "Edge Function",
              systemVersion: "Deno",
              appVersion: "1.0.0",
              langCode: "en"
            }
          );
          
          log("TelegramClient instance created, testing connection...");
          
          // Set a connection timeout
          const connectionTimeout = setTimeout(() => {
            logError("Connection timeout after 15 seconds", {});
            client.disconnect();
          }, 15000);
          
          try {
            log("Connecting to Telegram...");
            await client.connect();
            clearTimeout(connectionTimeout);
            
            log("Successfully connected to Telegram");
            
            // Test if we're actually connected
            const isConnected = await client.isConnected();
            log("Connection test result:", isConnected);
            
            if (!isConnected) {
              throw new Error("Failed to connect to Telegram");
            }
            
            // Save the session string for debugging
            const sessionString = session.save();
            log("Session string generated:", !!sessionString);
            
            await client.disconnect();
            log("Client disconnected successfully");
            
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
                logError("Error storing API ID:", apiIdError);
                // Continue anyway, this is not critical
              } else {
                log("API ID stored successfully");
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
                logError("Error storing API Hash:", apiHashError);
                // Continue anyway, this is not critical
              } else {
                log("API Hash stored successfully");
              }
            }
            
            return createResponse({ 
              valid: true, 
              message: "Credentials valid and successfully connected to Telegram",
              session: sessionString
            });
          } catch (connectErr) {
            clearTimeout(connectionTimeout);
            logError("Error connecting to Telegram:", connectErr);
            
            // Fallback to basic validation
            // With GRM, there's no need for a separate validation step since
            // we already tried to connect. If it failed, the credentials are invalid.
            return createResponse({
              valid: false,
              error: "Failed to connect to Telegram: " + (connectErr.message || "Unknown error")
            }, 400);
          }
        } catch (validationErr) {
          logError("Error validating credentials:", validationErr);
          return createResponse({
            valid: false,
            error: validationErr.message || "Invalid credentials"
          }, 400);
        }

      case "get-qr-token":
        if (!userId) {
          return createResponse({ error: "User ID is required" }, 400);
        }
        
        log("Getting QR token for user:", userId);
        const qrToken = await handleQrLogin(supabase, userId);
        return createResponse(qrToken);

      case "check-qr-status":
        if (!userId || !token) {
          return createResponse({ error: "User ID and token are required" }, 400);
        }
        
        log("Checking QR status for token:", token);
        const status = await processQrCodeLogin(supabase, userId, token);
        return createResponse(status);
      
      default:
        log("Invalid method:", method);
        return createResponse({ error: "Invalid method" }, 400);
    }
  } catch (error) {
    logError("Error in telegram-auth function:", error);
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
