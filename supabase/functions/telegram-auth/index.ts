
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhoneAuthRequest {
  phone: string;
  apiId?: number;
  apiHash?: string;
}

interface CodeVerifyRequest extends PhoneAuthRequest {
  code: string;
  phoneCodeHash: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // Check for API credentials
    const data = await req.json();
    const apiId = data.apiId || Number(Deno.env.get("telegram_api_id"));
    const apiHash = data.apiHash || Deno.env.get("telegram_api_hash");

    if (!apiId || !apiHash) {
      console.error("Missing Telegram API credentials");
      return new Response(
        JSON.stringify({ error: "Telegram API credentials not found" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Import the grm library for Deno
    const { StringSession, TelegramClient } = await import("https://deno.land/x/grm@0.0.5/mod.ts");
    
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
      
      await client.connect();
      console.log("Connected to Telegram API");
      
      // Send the code
      try {
        const result = await client.sendCode(
          {
            apiId: apiId,
            apiHash: apiHash,
          }, 
          phone
        );
        
        console.log("Code sent successfully");
        
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
      const { phone, code, phoneCodeHash } = data as CodeVerifyRequest;
      
      if (!phone || !code || !phoneCodeHash) {
        return new Response(
          JSON.stringify({ error: "Phone number, code, and phoneCodeHash are required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Verifying code for phone: ${phone}`);
      
      // Create a new Telegram client
      const stringSession = new StringSession("");
      const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 3,
      });
      
      await client.connect();
      console.log("Connected to Telegram API");
      
      // Verify the code
      try {
        await client.signIn({
          phoneNumber: phone,
          phoneCode: code,
          phoneCodeHash: phoneCodeHash,
        });
        
        console.log("Code verified successfully");
        
        // Get the session string
        const sessionString = stringSession.save();
        console.log("Session string saved");
        
        // Store the session (in a production app, this would go to a database)
        // Deno.env.set(`telegram_session_${phone.replace(/[^0-9]/g, '')}`, sessionString);
        
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
