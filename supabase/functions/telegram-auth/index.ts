
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
          
          // Create string session
          const session = new StringSession("");
          
          // Initialize client with credentials
          log("Creating TelegramClient instance...");
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
          
          // Test connection to verify credentials
          log("Connecting to Telegram...");
          await client.connect();
          
          log("Connection successful, credentials are valid");
          await client.disconnect();
          
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
            }
          }
          
          return createResponse({
            valid: true,
            message: "Credentials valid and connection successful"
          });
        } catch (error) {
          logError("Validation error", error);
          
          return createResponse({
            valid: false,
            error: error.message || "Invalid credentials"
          }, 400);
        }
      }
      
      case "send-code": {
        const { phone, userId } = body;
        
        if (!phone || !userId) {
          return createResponse({ 
            success: false, 
            error: "Phone number and user ID are required" 
          }, 400);
        }
        
        log(`Sending verification code to ${phone} for user ${userId}`);
        
        try {
          // Get API credentials for user
          const { data: apiIdData, error: apiIdError } = await supabase
            .from("user_api_keys")
            .select("api_key")
            .eq("user_id", userId)
            .eq("service", "telegram_api_id")
            .single();
          
          if (apiIdError) {
            logError("Error fetching API ID", apiIdError);
            return createResponse({
              success: false,
              error: "API ID not found for user"
            }, 400);
          }
          
          const { data: apiHashData, error: apiHashError } = await supabase
            .from("user_api_keys")
            .select("api_key")
            .eq("user_id", userId)
            .eq("service", "telegram_api_hash")
            .single();
          
          if (apiHashError) {
            logError("Error fetching API Hash", apiHashError);
            return createResponse({
              success: false,
              error: "API Hash not found for user"
            }, 400);
          }
          
          const apiId = apiIdData.api_key;
          const apiHash = apiHashData.api_key;
          
          // Create string session
          const session = new StringSession("");
          
          // Initialize client with credentials
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
          
          // Connect and send code
          await client.connect();
          
          log(`Sending code to ${phone}`);
          const result = await client.sendCode(
            {
              apiId: parseInt(apiId, 10),
              apiHash: apiHash,
            },
            phone
          );
          
          log("Code sent successfully, result:", result);
          
          await client.disconnect();
          
          return createResponse({
            success: true,
            phoneCodeHash: result.phoneCodeHash
          });
        } catch (error) {
          logError("Error sending code", error);
          
          return createResponse({
            success: false,
            error: error.message || "Failed to send verification code"
          }, 500);
        }
      }
      
      case "verify-code": {
        const { phone, code, phoneCodeHash, userId } = body;
        
        if (!phone || !code || !phoneCodeHash || !userId) {
          return createResponse({ 
            success: false, 
            error: "Phone, code, phoneCodeHash and userId are required" 
          }, 400);
        }
        
        log(`Verifying code for ${phone}, user ${userId}`);
        
        try {
          // Get API credentials for user
          const { data: apiIdData, error: apiIdError } = await supabase
            .from("user_api_keys")
            .select("api_key")
            .eq("user_id", userId)
            .eq("service", "telegram_api_id")
            .single();
          
          if (apiIdError) {
            logError("Error fetching API ID", apiIdError);
            return createResponse({
              success: false,
              error: "API ID not found for user"
            }, 400);
          }
          
          const { data: apiHashData, error: apiHashError } = await supabase
            .from("user_api_keys")
            .select("api_key")
            .eq("user_id", userId)
            .eq("service", "telegram_api_hash")
            .single();
          
          if (apiHashError) {
            logError("Error fetching API Hash", apiHashError);
            return createResponse({
              success: false,
              error: "API Hash not found for user"
            }, 400);
          }
          
          const apiId = apiIdData.api_key;
          const apiHash = apiHashData.api_key;
          
          // Create string session
          const session = new StringSession("");
          
          // Initialize client with credentials
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
          
          // Connect and verify code
          await client.connect();
          
          log(`Signing in with code for ${phone}`);
          await client.signIn({
            phoneNumber: phone,
            phoneCode: code,
            phoneCodeHash: phoneCodeHash
          });
          
          // Get Telegram user data
          const me = await client.getMe();
          log("User signed in successfully:", me);
          
          // Save the session
          const sessionString = client.session.save();
          log("Session saved");
          
          // Store session in database
          const { data: sessionData, error: sessionError } = await supabase
            .from("telegram_sessions")
            .upsert(
              {
                user_id: userId,
                phone: phone,
                session_string: sessionString,
                telegram_user_id: me.id?.toString(),
                telegram_username: me.username || null,
                telegram_first_name: me.firstName || null,
                telegram_last_name: me.lastName || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,phone", returning: "representation" }
            );
          
          if (sessionError) {
            logError("Error storing session", sessionError);
            return createResponse({
              success: false,
              error: "Failed to store session"
            }, 500);
          }
          
          await client.disconnect();
          
          return createResponse({
            success: true,
            sessionId: sessionData[0].id,
            telegramUserId: me.id?.toString(),
            telegramUsername: me.username || null
          });
        } catch (error) {
          logError("Error verifying code", error);
          
          return createResponse({
            success: false,
            error: error.message || "Failed to verify code"
          }, 500);
        }
      }
      
      case "qr-login-token": {
        const { userId } = body;
        
        if (!userId) {
          return createResponse({ 
            error: "User ID is required" 
          }, 400);
        }
        
        log(`Getting QR login token for user ${userId}`);
        const qrToken = await handleQrLogin(supabase, userId);
        return createResponse(qrToken);
      }
      
      case "check-qr-login": {
        const { userId, token } = body;
        
        if (!userId || !token) {
          return createResponse({ 
            error: "User ID and token are required" 
          }, 400);
        }
        
        log(`Checking QR login status for token ${token}`);
        const status = await processQrCodeLogin(supabase, userId, token);
        return createResponse(status);
      }
      
      default:
        log(`Invalid method: ${method}`);
        return createResponse({ error: "Invalid method" }, 400);
    }
  } catch (error) {
    logError("Unhandled error in edge function", error);
    
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
