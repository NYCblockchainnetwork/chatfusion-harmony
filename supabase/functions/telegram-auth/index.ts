
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhoneAuthRequest {
  phone: string;
  apiId?: number;
  apiHash?: string;
  userId?: string;
}

interface CodeVerifyRequest extends PhoneAuthRequest {
  code: string;
  phoneCodeHash: string;
}

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

// Helper function to validate input parameters
function validateInput(data: any, requiredFields: string[]) {
  const missingFields = requiredFields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(', ')}`;
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received request to telegram-auth");
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1]; // Get the last segment of the path
    console.log(`Action: ${action}`);

    // Check for request body
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

    // Get API credentials - either from request or from environment
    const defaultApiId = Deno.env.get("telegram_api_id");
    const defaultApiHash = Deno.env.get("telegram_api_hash");
    
    const apiId = data.apiId || (defaultApiId ? Number(defaultApiId) : undefined);
    const apiHash = data.apiHash || defaultApiHash;
    
    console.log(`Using apiId: ${apiId ? 'provided' : 'missing'}, apiHash: ${apiHash ? 'provided' : 'missing'}, userId: ${userId}`);

    if (!apiId || !apiHash) {
      return createErrorResponse(
        "Telegram API credentials not found. " +
        `apiId ${!apiId ? 'missing' : 'provided'}, apiHash ${!apiHash ? 'missing' : 'provided'}`,
        400
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
    
    // If the action is "send-code", send a verification code
    if (action === "send-code") {
      // Validate required fields
      const validationError = validateInput(data, ['phone']);
      if (validationError) {
        return createErrorResponse(validationError, 400);
      }
      
      const { phone } = data as PhoneAuthRequest;
      console.log(`Sending verification code to phone: ${phone}`);
      
      // Create a new Telegram client
      const stringSession = new StringSession("");
      const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 3,
      });
      
      try {
        // Connect to Telegram API
        await client.connect();
        console.log("Connected to Telegram API");
        
        // Send the code
        const result = await client.sendCode(
          {
            apiId,
            apiHash,
          }, 
          phone
        );
        
        console.log("Code sent successfully, phoneCodeHash:", result.phoneCodeHash);
        
        // Disconnect client
        await client.disconnect();
        console.log("Disconnected from Telegram API");
        
        return createResponse({ 
          success: true,
          phoneCodeHash: result.phoneCodeHash,
          message: "Verification code sent successfully"
        });
      } catch (error) {
        console.error("Error sending verification code:", error);
        
        // Make sure client is disconnected on error
        try {
          if (client.connected) {
            await client.disconnect();
            console.log("Disconnected client due to error");
          }
        } catch (disconnectError) {
          console.error("Error disconnecting client:", disconnectError);
        }
        
        return createErrorResponse(`Failed to send verification code: ${error.message}`, 500);
      }
    }
    
    // If the action is "verify-code", verify the code and get a session
    else if (action === "verify-code") {
      // Validate required fields
      const validationError = validateInput(data, ['phone', 'code', 'phoneCodeHash']);
      if (validationError) {
        return createErrorResponse(validationError, 400);
      }
      
      const { phone, code, phoneCodeHash } = data as CodeVerifyRequest;
      console.log(`Verifying code for phone: ${phone}, userId: ${userId}`);
      
      // Create a new Telegram client
      const stringSession = new StringSession("");
      const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 3,
      });
      
      try {
        // Connect to Telegram API
        await client.connect();
        console.log("Connected to Telegram API");
        
        // Verify the code
        await client.signIn({
          phoneNumber: phone,
          phoneCode: code,
          phoneCodeHash,
        });
        
        console.log("Code verified successfully");
        
        // Get the session string
        const sessionString = client.session.save();
        console.log("Session string saved, length:", sessionString.length);
        
        // Check if a session already exists for this phone number and user
        console.log(`Checking for existing session for user: ${userId}, phone: ${phone}`);
        
        const { data: existingSession, error: checkError } = await supabase
          .from('telegram_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('phone', phone)
          .maybeSingle();
        
        if (checkError) {
          console.error("Error checking for existing session:", checkError);
          return createErrorResponse(`Failed to check for existing session: ${checkError.message}`, 500);
        }
        
        let sessionId;
        if (existingSession) {
          // Update existing session
          console.log(`Updating existing session for ${phone}`);
          const { data: updatedSession, error: updateError } = await supabase
            .from('telegram_sessions')
            .update({ 
              session_string: sessionString,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSession.id)
            .select()
            .single();
          
          if (updateError) {
            console.error("Error updating session:", updateError);
            return createErrorResponse(`Failed to update session: ${updateError.message}`, 500);
          }
          
          sessionId = existingSession.id;
          console.log("Session updated successfully, ID:", sessionId);
        } else {
          // Create new session
          console.log(`Creating new session for ${phone}`);
          const { data: newSession, error: insertError } = await supabase
            .from('telegram_sessions')
            .insert({
              user_id: userId,
              phone: phone,
              session_string: sessionString,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (insertError) {
            console.error("Error creating new session:", insertError);
            return createErrorResponse(`Failed to create session: ${insertError.message}`, 500);
          }
          
          sessionId = newSession.id;
          console.log("New session created successfully, ID:", sessionId);
        }
        
        // Disconnect client
        await client.disconnect();
        console.log("Disconnected from Telegram API");
        
        return createResponse({ 
          success: true,
          sessionId,
          phone,
          message: "Telegram authentication successful"
        });
      } catch (error) {
        console.error("Error verifying code:", error);
        
        // Make sure client is disconnected on error
        try {
          if (client.connected) {
            await client.disconnect();
            console.log("Disconnected client due to error");
          }
        } catch (disconnectError) {
          console.error("Error disconnecting client:", disconnectError);
        }
        
        // Check for specific error types
        let errorMessage = `Failed to verify code: ${error.message}`;
        let errorStatus = 500;
        
        if (error.message.includes("SESSION_PASSWORD_NEEDED")) {
          errorMessage = "This account has two-factor authentication. Please use another account or disable 2FA.";
          errorStatus = 403;
        } else if (error.message.includes("PHONE_CODE_INVALID")) {
          errorMessage = "Invalid verification code. Please try again.";
          errorStatus = 400;
        } else if (error.message.includes("PHONE_CODE_EXPIRED")) {
          errorMessage = "Verification code has expired. Please request a new code.";
          errorStatus = 400;
        }
        
        return createErrorResponse(errorMessage, errorStatus);
      }
    }
    
    // If no valid action is specified
    console.error("Invalid action specified:", action);
    return createErrorResponse("Invalid action. Use send-code or verify-code", 400);
    
  } catch (error) {
    console.error("Unhandled error in telegram-auth function:", error);
    return createErrorResponse(error.message || "An unknown error occurred");
  }
});
