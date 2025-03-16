import { serve } from "./deps.ts";
import { createClient, TelegramClient, StringSession, log, logError } from "./deps.ts";
import { handleQrLogin, processQrCodeLogin } from "./qr-login.ts";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request body
    const body = await req.json();
    log("Request body:", body);
    
    // Extract method and params
    const { method } = body;
    
    // Create response helper
    const createResponse = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
      });
    };
    
    // Route request based on method
    switch (method) {
      case "validate-credentials": {
        const { apiId, apiHash, userId } = body;
        
        if (!apiId || !apiHash) {
          return createResponse({ 
            valid: false, 
            error: "API ID and API Hash are required" 
          }, 400);
        }
        
        log(`Validating Telegram credentials for user ${userId || 'unknown'}`);
        
        try {
          // Validate API ID format (must be a number)
          if (!/^\d+$/.test(apiId)) {
            log("Invalid API ID format");
            return createResponse({
              valid: false,
              error: "API ID must be a valid number"
            }, 400);
          }
          
          // Debug info for StringSession
          log("API ID type:", typeof apiId, "Value:", apiId);
          log("API Hash type:", typeof apiHash, "Value (first 3 chars):", apiHash.substring(0, 3) + "...");
          
          // CRITICAL FIX: Do not pre-initialize the empty session variable
          // Directly create StringSession with empty string literal
          log("Creating StringSession instance directly...");
          const stringSession = new StringSession("");
          log("StringSession created:", typeof stringSession, "Is instance of StringSession:", stringSession instanceof StringSession);
          
          // Initialize client with credentials - cast apiId to number explicitly
          log("Creating TelegramClient instance...");
          const client = new TelegramClient(stringSession, Number(apiId), apiHash, {
            connectionRetries: 3,
            useWSS: true,
            baseLogger: console,
            deviceModel: "Edge Function",
            systemVersion: "Deno",
            appVersion: "1.0.0",
            langCode: "en"
          });
          
          try {
            // Test connection to verify credentials
            log("Starting Telegram client...");
            await client.start({
              phoneNumber: async () => "",
              password: async () => "",
              phoneCode: async () => "",
              onError: (err) => {
                logError("Connection error", err);
                throw err;
              },
            });
            
            log("Getting user info to verify connection...");
            const me = await client.getMe();
            log("Successfully verified connection with user:", me);
            
            await client.disconnect();
            log("Disconnected from Telegram");
            
            // Store credentials if userId is provided
            if (userId) {
              log(`Storing credentials for user ${userId}`);
              
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
                logError("Error storing API ID", apiIdError);
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
                logError("Error storing API Hash", apiHashError);
              } else {
                log("API Hash stored successfully");
              }
            }
            
            // Save and return the session string
            const savedSession = stringSession.save();
            log("Session saved, returning session string:", savedSession ? "non-empty string" : "empty string");
            
            return createResponse({
              valid: true,
              message: "Credentials valid and successfully connected to Telegram",
              session: savedSession
            });
          } catch (connectErr) {
            logError("Error connecting to Telegram", connectErr);
            return createResponse({
              valid: false,
              error: "Failed to connect to Telegram: " + (connectErr.message || "Unknown error"),
              stack: connectErr.stack
            }, 400);
          }
        } catch (validationErr) {
          logError("Error validating credentials", validationErr);
          return createResponse({
            valid: false,
            error: validationErr.message || "Invalid credentials",
            stack: validationErr.stack
          }, 400);
        }
      }
      
      case "get-qr-token": {
        const { userId } = body;
        if (!userId) {
          return createResponse({ error: "User ID is required" }, 400);
        }
        
        log("Getting QR token for user:", userId);
        const qrToken = await handleQrLogin(supabase, userId);
        return createResponse(qrToken);
      }
      
      case "check-qr-status": {
        const { userId, token } = body;
        if (!userId || !token) {
          return createResponse({ error: "User ID and token are required" }, 400);
        }
        
        log("Checking QR status for token:", token);
        const status = await processQrCodeLogin(supabase, userId, token);
        return createResponse(status);
      }
      
      default:
        log("Invalid method:", method);
        return createResponse({ error: "Invalid method" }, 400);
    }
  } catch (error) {
    logError("Error in telegram-auth function", error);
    return new Response(
      JSON.stringify({ 
        error: `Server error: ${error.message}`,
        stack: error.stack 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
