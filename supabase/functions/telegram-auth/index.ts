
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
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check for API credentials
    const apiId = data.apiId || Number(Deno.env.get("telegram_api_id"));
    const apiHash = data.apiHash || Deno.env.get("telegram_api_hash");
    const userId = data.userId;
    
    console.log(`Using apiId: ${apiId}, apiHash: ${!!apiHash ? 'provided' : 'missing'}, userId: ${userId}`);

    if (!apiId || !apiHash) {
      console.error("Missing Telegram API credentials");
      return new Response(
        JSON.stringify({ 
          error: "Telegram API credentials not found",
          details: `apiId ${!apiId ? 'missing' : 'provided'}, apiHash ${!apiHash ? 'missing' : 'provided'}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      console.error("Missing userId in request");
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Import the grm library for Deno
    let grmModule;
    try {
      grmModule = await import("https://deno.land/x/grm@0.0.5/mod.ts");
      console.log("Successfully imported grm library");
    } catch (error) {
      console.error("Error importing grm library:", error);
      return new Response(
        JSON.stringify({ 
          error: `Failed to import Telegram library: ${error.message}`,
          details: error.stack || "No stack trace available"
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { StringSession, TelegramClient } = grmModule;
    
    // If the action is "send-code", send a verification code
    if (action === "send-code") {
      const { phone } = data as PhoneAuthRequest;
      
      if (!phone) {
        console.error("Missing phone number in request");
        return new Response(
          JSON.stringify({ error: "Phone number is required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
        
        return new Response(
          JSON.stringify({ 
            success: true,
            phoneCodeHash: result.phoneCodeHash,
            message: "Verification code sent successfully"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
        
        return new Response(
          JSON.stringify({ 
            error: `Failed to send verification code: ${error.message}`,
            details: error.stack || "No stack trace available"
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // If the action is "verify-code", verify the code and get a session
    else if (action === "verify-code") {
      const { phone, code, phoneCodeHash } = data as CodeVerifyRequest;
      
      if (!phone || !code || !phoneCodeHash) {
        console.error("Missing required parameters in verify-code request");
        return new Response(
          JSON.stringify({ 
            error: "Phone number, code, and phoneCodeHash are required",
            missing: { 
              phone: !phone, 
              code: !code, 
              phoneCodeHash: !phoneCodeHash 
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
        const sessionString = stringSession.save();
        console.log("Session string saved, length:", sessionString.length);
        
        // Store the session in the database - check if a session already exists
        console.log(`Storing session for user: ${userId}, phone: ${phone}`);
        
        const { data: existingSession, error: checkError } = await supabase
          .from('telegram_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('phone', phone)
          .maybeSingle();
        
        if (checkError) {
          console.error("Error checking for existing session:", checkError);
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
            throw new Error(`Failed to update session: ${updateError.message}`);
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
            throw new Error(`Failed to create session: ${insertError.message}`);
          }
          
          sessionId = newSession.id;
          console.log("New session created successfully, ID:", sessionId);
        }
        
        // Disconnect client
        await client.disconnect();
        console.log("Disconnected from Telegram API");
        
        return new Response(
          JSON.stringify({ 
            success: true,
            sessionId,
            phone,
            message: "Telegram authentication successful"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
        
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            details: error.stack || "No stack trace available"
          }),
          { status: errorStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // If no valid action is specified
    console.error("Invalid action specified:", action);
    return new Response(
      JSON.stringify({ error: "Invalid action. Use send-code or verify-code" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Unhandled error in telegram-auth function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unknown error occurred",
        details: error.stack || "No stack trace available"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
