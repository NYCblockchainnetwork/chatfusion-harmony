
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  // Get API credentials from environment
  const defaultApiId = Deno.env.get("telegram_api_id");
  const defaultApiHash = Deno.env.get("telegram_api_hash");
  
  if (!defaultApiId || !defaultApiHash) {
    return createErrorResponse(
      "Telegram API credentials not found in environment variables",
      400
    );
  }
  
  // Parse request data
  let data;
  try {
    data = await req.json();
    console.log(`QR login request (${action}):`, JSON.stringify(data));
  } catch (error) {
    console.error("Error parsing request body:", error);
    return createErrorResponse("Invalid request body: " + error.message, 400);
  }
  
  // Validate user ID
  const userId = data.userId;
  if (!userId) {
    return createErrorResponse("User ID is required", 400);
  }
  
  try {
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
    
    // Handle QR login token generation
    if (action === "qr-login-token") {
      // Create a new Telegram client with empty session
      const stringSession = new StringSession("");
      const client = new TelegramClient(stringSession, Number(defaultApiId), defaultApiHash, {
        connectionRetries: 3,
      });
      
      try {
        // Connect to Telegram API
        await client.connect();
        console.log("Connected to Telegram API for QR login");
        
        // Generate QR login data
        console.log("Generating QR login token...");
        const qrLoginResult = await client.invoke({
          _: "auth.exportLoginToken",
          apiId: Number(defaultApiId),
          apiHash: defaultApiHash,
          exceptIds: []
        });
        
        // Disconnect client
        await client.disconnect();
        console.log("Disconnected from Telegram API");
        
        // Extract token from result
        if (!qrLoginResult || !qrLoginResult.token) {
          return createErrorResponse("Failed to generate QR login token", 500);
        }
        
        const token = Buffer.from(qrLoginResult.token).toString("base64url");
        const qrUrl = `tg://login?token=${token}`;
        
        // Store token in database with expiration
        const expiration = new Date();
        expiration.setMinutes(expiration.getMinutes() + 5); // Token expires in 5 minutes
        
        // Check if a token already exists for this user, and remove it
        const { error: deleteError } = await supabase
          .from("qr_login_states")
          .delete()
          .eq("user_id", userId);
        
        if (deleteError) {
          console.error("Error deleting existing QR login state:", deleteError);
        }
        
        // Insert new token
        const { data: insertData, error: insertError } = await supabase
          .from("qr_login_states")
          .insert({
            token: token,
            user_id: userId,
            expires_at: expiration.toISOString(),
            status: "pending"
          })
          .select()
          .single();
        
        if (insertError) {
          console.error("Error storing QR login token:", insertError);
          return createErrorResponse(`Failed to store QR login token: ${insertError.message}`, 500);
        }
        
        return createResponse({
          success: true,
          token: token,
          qrUrl: qrUrl,
          expiresAt: expiration.toISOString()
        });
      } catch (error) {
        console.error("Error generating QR login token:", error);
        
        // Make sure client is disconnected on error
        try {
          if (client.connected) {
            await client.disconnect();
            console.log("Disconnected client due to error");
          }
        } catch (disconnectError) {
          console.error("Error disconnecting client:", disconnectError);
        }
        
        return createErrorResponse(`Failed to generate QR login token: ${error.message}`, 500);
      }
    }
    
    // Handle QR login status check
    else if (action === "check-qr-login") {
      const { token } = data;
      
      if (!token) {
        return createErrorResponse("Token is required", 400);
      }
      
      try {
        // Get the token from database
        const { data: tokenData, error: tokenError } = await supabase
          .from("qr_login_states")
          .select("*")
          .eq("user_id", userId)
          .eq("token", token)
          .single();
        
        if (tokenError) {
          console.error("Error fetching QR login token:", tokenError);
          return createErrorResponse(`Failed to fetch QR login token: ${tokenError.message}`, 500);
        }
        
        if (!tokenData) {
          return createResponse({
            success: false,
            expired: true,
            message: "QR login token not found or expired"
          });
        }
        
        // Check if token has expired
        const now = new Date();
        const expiresAt = new Date(tokenData.expires_at);
        
        if (now > expiresAt) {
          return createResponse({
            success: false,
            expired: true,
            message: "QR login token has expired"
          });
        }
        
        // Check if this token has already been used to create a session
        if (tokenData.status === "completed" && tokenData.session_id) {
          return createResponse({
            success: true,
            sessionId: tokenData.session_id,
            message: "QR login completed successfully"
          });
        }
        
        // If not, connect to Telegram API to check status
        const stringSession = new StringSession("");
        const client = new TelegramClient(stringSession, Number(defaultApiId), defaultApiHash, {
          connectionRetries: 3,
        });
        
        // Connect to Telegram API
        await client.connect();
        console.log("Connected to Telegram API for QR status check");
        
        // Check QR login status
        const rawToken = Buffer.from(token, "base64url");
        
        try {
          console.log("Checking QR login status with Telegram...");
          const statusResult = await client.invoke({
            _: "auth.importLoginToken",
            token: rawToken
          });
          
          // If we get here without an error, the user has scanned and confirmed the QR code
          console.log("QR login status result:", statusResult);
          
          // Get the session string
          const sessionString = client.session.save();
          console.log("Session string saved, length:", sessionString.length);
          
          // Create a new session record in database
          const { data: sessionData, error: sessionError } = await supabase
            .from("telegram_sessions")
            .insert({
              user_id: userId,
              phone: statusResult.user?.phone || "QR Login",
              session_string: sessionString,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (sessionError) {
            console.error("Error creating session:", sessionError);
            return createErrorResponse(`Failed to create session: ${sessionError.message}`, 500);
          }
          
          // Update the QR login state with the session ID
          const { error: updateError } = await supabase
            .from("qr_login_states")
            .update({
              status: "completed",
              session_id: sessionData.id
            })
            .eq("id", tokenData.id);
          
          if (updateError) {
            console.error("Error updating QR login state:", updateError);
          }
          
          // Disconnect client
          await client.disconnect();
          console.log("Disconnected from Telegram API");
          
          return createResponse({
            success: true,
            sessionId: sessionData.id,
            message: "QR login completed successfully"
          });
        } catch (error) {
          // Disconnect client
          await client.disconnect();
          console.log("Disconnected from Telegram API");
          
          // Check if the error indicates that the QR code hasn't been scanned yet
          if (error.message.includes("IMPORT_LOGIN_TOKEN_INVALID")) {
            console.log("QR login token not yet used");
            return createResponse({
              success: false,
              message: "QR login token not yet used"
            });
          }
          
          console.error("Error checking QR login status:", error);
          throw error;
        }
      } catch (error) {
        console.error("Error checking QR login status:", error);
        return createErrorResponse(`Failed to check QR login status: ${error.message}`, 500);
      }
    }
    
    // Invalid action
    else {
      return createErrorResponse(`Invalid QR login action: ${action}`, 400);
    }
  } catch (error) {
    console.error(`Unhandled error in QR login (${action}):`, error);
    return createErrorResponse(`Unhandled error: ${error.message}`, 500);
  }
}
