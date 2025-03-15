
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
    const action = url.pathname.split('/').pop();
    console.log(`Action: ${action}`);

    // Check for request body
    let data;
    try {
      data = await req.json();
      console.log("Request data:", JSON.stringify(data));
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check for API credentials
    const apiId = data.apiId || Number(Deno.env.get("telegram_api_id"));
    const apiHash = data.apiHash || Deno.env.get("telegram_api_hash");
    const userId = data.userId;
    
    console.log(`Using apiId: ${apiId}, userId: ${userId}`);

    if (!apiId || !apiHash) {
      console.error("Missing Telegram API credentials");
      return new Response(
        JSON.stringify({ error: "Telegram API credentials not found" }),
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
        JSON.stringify({ error: `Failed to import Telegram library: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { StringSession, TelegramClient } = grmModule;
    
    // If the action is "send-code", send a verification code
    if (action === "send-code") {
      const { phone } = data as PhoneAuthRequest;
      
      if (!phone) {
        return new Response(
          JSON.stringify({ error: "Phone number is required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Sending verification code to phone: ${phone}`);
      
      // Create a new Telegram client
      const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
        connectionRetries: 3,
      });
      
      try {
        await client.connect();
        console.log("Connected to Telegram API");
        
        // Send the code
        const result = await client.sendCode(
          {
            apiId: apiId,
            apiHash: apiHash,
          }, 
          phone
        );
        
        console.log("Code sent successfully, phoneCodeHash:", result.phoneCodeHash);
        
        // Disconnect client
        await client.disconnect();
        
        return new Response(
          JSON.stringify({ 
            success: true,
            phoneCodeHash: result.phoneCodeHash
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error("Error sending code:", error);
        return new Response(
          JSON.stringify({ error: `Failed to send verification code: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // If the action is "verify-code", verify the code and get a session
    else if (action === "verify-code") {
      const { phone, code, phoneCodeHash, userId } = data as CodeVerifyRequest;
      
      if (!phone || !code || !phoneCodeHash || !userId) {
        return new Response(
          JSON.stringify({ 
            error: "Phone number, code, phoneCodeHash, and userId are required",
            missing: { phone: !phone, code: !code, phoneCodeHash: !phoneCodeHash, userId: !userId }
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
        await client.connect();
        console.log("Connected to Telegram API");
        
        // Verify the code
        await client.signIn({
          phoneNumber: phone,
          phoneCode: code,
          phoneCodeHash: phoneCodeHash,
        });
        
        console.log("Code verified successfully");
        
        // Get the session string
        const sessionString = stringSession.save();
        console.log("Session string saved");
        
        // Store the session in the database
        console.log(`Storing session for user: ${userId}, phone: ${phone}`);
        
        const { data: sessionData, error: sessionError } = await supabase
          .from('telegram_sessions')
          .upsert({
            user_id: userId,
            phone: phone,
            session_string: sessionString
          })
          .select();
        
        if (sessionError) {
          console.error("Error storing session in database:", sessionError);
          throw new Error(`Failed to store session: ${sessionError.message}`);
        }
        
        console.log("Session stored in database successfully:", sessionData);
        
        // Disconnect client
        await client.disconnect();
        
        return new Response(
          JSON.stringify({ 
            success: true,
            sessionString: sessionString
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error("Error verifying code:", error);
        return new Response(
          JSON.stringify({ error: `Failed to verify code: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // If no valid action is specified
    return new Response(
      JSON.stringify({ error: "Invalid action. Use send-code or verify-code" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error in telegram-auth function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
