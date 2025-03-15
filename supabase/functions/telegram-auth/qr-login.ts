
// QR Login functionality for Telegram authentication
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to create a response with CORS headers
function createResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Helper function to create an error response
function createErrorResponse(message: string, status = 500) {
  console.error(`Error: ${message}`);
  return createResponse({ error: message }, status);
}

export async function handleQRLogin(req: Request, action: string) {
  try {
    console.log(`Handling ${action} request`);
    
    // Parse the request body
    let data;
    try {
      data = await req.json();
      console.log("Request data:", JSON.stringify(data));
    } catch (error) {
      console.error("Error parsing request body:", error);
      return createErrorResponse("Invalid request body: " + error.message, 400);
    }
    
    // Validate user ID
    const userId = data.userId;
    if (!userId) {
      return createErrorResponse("User ID is required", 400);
    }

    // Get API credentials from environment
    const apiId = Deno.env.get("telegram_api_id");
    const apiHash = Deno.env.get("telegram_api_hash");
    
    if (!apiId || !apiHash) {
      return createErrorResponse(
        "Telegram API credentials not found in environment variables",
        500
      );
    }

    // Import the telegram library
    let telegramModule;
    try {
      telegramModule = await import("https://esm.sh/telegram@2.26.0");
      console.log("Successfully imported telegram library");
    } catch (error) {
      console.error("Error importing telegram library:", error);
      return createErrorResponse(`Failed to import Telegram library: ${error.message}`, 500);
    }
    
    const { StringSession, TelegramClient } = telegramModule;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if we have an existing token for this user
    let qrLoginState: Record<string, any> = {};
    
    try {
      const { data: existingState, error } = await supabase
        .from('qr_login_states')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error("Error checking for existing QR login state:", error);
        return createErrorResponse(`Database error: ${error.message}`, 500);
      }
      
      if (existingState) {
        qrLoginState = existingState;
        console.log("Found existing QR login state:", qrLoginState);
      }
    } catch (error) {
      console.error("Error checking for existing QR login state:", error);
      // Continue without existing state
    }
    
    // Create a new Telegram client
    const stringSession = new StringSession("");
    const client = new TelegramClient(stringSession, Number(apiId), apiHash, {
      connectionRetries: 3,
    });
    
    try {
      // Connect to Telegram
      await client.connect();
      console.log("Connected to Telegram API");
      
      // Handle QR login token generation
      if (action === "qr-login-token") {
        // Generate QR login token
        const qrLogin = await client.qrLogin({ apiId: Number(apiId), apiHash });
        console.log("Generated QR login token");
        
        // Get the login token
        const loginToken = qrLogin.token.toString('base64url');
        console.log("Login token:", loginToken.substring(0, 10) + "...");
        
        // Generate QR code URL
        const qrUrl = `tg://login?token=${loginToken}`;
        console.log("QR URL:", qrUrl);
        
        // Save login token to database for status checking
        try {
          await supabase
            .from('qr_login_states')
            .upsert({
              user_id: userId,
              token: loginToken,
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 60 * 1000).toISOString(), // 1 minute expiry
              status: 'pending'
            }, { onConflict: 'user_id' });
          
          console.log("Saved QR login state to database");
        } catch (error) {
          console.error("Error saving QR login state:", error);
          // Continue even if save fails
        }
        
        // Disconnect client as we don't need it anymore for token generation
        await client.disconnect();
        console.log("Disconnected from Telegram API after token generation");
        
        return createResponse({
          success: true,
          token: loginToken,
          url: qrUrl,
          message: "QR login token generated successfully"
        });
      }
      
      // Handle QR login status check
      else if (action === "check-qr-login") {
        const token = data.token;
        
        if (!token) {
          return createErrorResponse("Login token is required", 400);
        }
        
        // Check if token has expired
        const { data: storedState, error } = await supabase
          .from('qr_login_states')
          .select('*')
          .eq('user_id', userId)
          .eq('token', token)
          .single();
        
        if (error) {
          console.error("Error retrieving QR login state:", error);
          return createErrorResponse("Invalid or expired login token", 400);
        }
        
        if (storedState.status === 'complete') {
          console.log("QR login already completed, returning session ID:", storedState.session_id);
          return createResponse({
            success: true,
            sessionId: storedState.session_id,
            message: "Authentication already completed"
          });
        }
        
        if (new Date(storedState.expires_at) < new Date()) {
          console.log("QR login token has expired");
          return createResponse({
            success: false,
            expired: true,
            message: "QR login token has expired"
          });
        }
        
        // Create Buffer from base64 token
        const loginToken = atob(token);
        
        try {
          console.log("Checking QR login status...");
          
          // Try to complete the login process
          const qrLogin = await client.qrLogin({ apiId: Number(apiId), apiHash });
          qrLogin.token = new Uint8Array(
            loginToken.split('').map((c) => c.charCodeAt(0))
          );
          
          // Set a timeout for the login check
          const loginPromise = qrLogin.waitForLogin();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Login check timed out")), 5000);
          });
          
          const user = await Promise.race([loginPromise, timeoutPromise]) as any;
          
          if (user) {
            console.log("User authenticated:", user.username || user.id);
            
            // Get the session string
            const sessionString = client.session.save();
            console.log("Session string saved, length:", sessionString.length);
            
            // Store the session in the database
            const { data: newSession, error: sessionError } = await supabase
              .from('telegram_sessions')
              .insert({
                user_id: userId,
                session_string: sessionString,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (sessionError) {
              console.error("Error creating new session:", sessionError);
              return createErrorResponse(`Failed to create session: ${sessionError.message}`, 500);
            }
            
            const sessionId = newSession.id;
            console.log("New session created successfully, ID:", sessionId);
            
            // Update the QR login state
            await supabase
              .from('qr_login_states')
              .update({
                status: 'complete',
                session_id: sessionId
              })
              .eq('user_id', userId)
              .eq('token', token);
            
            // Disconnect client
            await client.disconnect();
            console.log("Disconnected from Telegram API after successful login");
            
            return createResponse({
              success: true,
              sessionId,
              message: "Authentication successful"
            });
          }
        } catch (error) {
          console.log("QR login not completed yet:", error.message);
          
          // If the error is because the user hasn't scanned the code yet, that's normal
          if (error.message.includes("timeout") || error.message.includes("Login check timed out")) {
            return createResponse({
              success: false,
              expired: false,
              message: "Waiting for user to scan QR code"
            });
          }
          
          // For other errors, log but continue
          console.error("Error checking QR login status:", error);
        }
        
        // Disconnect client
        await client.disconnect();
        console.log("Disconnected from Telegram API after login check");
        
        // If we reach here, the user hasn't scanned the code yet
        return createResponse({
          success: false,
          expired: false,
          message: "Waiting for user to scan QR code"
        });
      }
      
      // Invalid action
      else {
        return createErrorResponse(`Invalid action: ${action}`, 400);
      }
    } catch (error) {
      console.error(`Error handling ${action}:`, error);
      
      // Ensure client is disconnected on error
      try {
        if (client && client.connected) {
          await client.disconnect();
          console.log("Disconnected client due to error");
        }
      } catch (disconnectError) {
        console.error("Error disconnecting client:", disconnectError);
      }
      
      return createErrorResponse(`Failed to handle ${action}: ${error.message}`, 500);
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    return createErrorResponse(`Unhandled error: ${error.message}`, 500);
  }
}
