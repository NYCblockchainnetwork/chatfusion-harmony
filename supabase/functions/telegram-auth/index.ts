
import { serve, TelegramClient, StringSession, log, logError, createClient } from "./deps.ts";

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiId, apiHash } = await req.json();
    log("Received apiId:", apiId, "apiHash:", apiHash ? apiHash.substring(0,3)+"..." : "missing");

    if (!apiId || !apiHash) {
      return new Response(JSON.stringify({error: "Missing API credentials"}), { 
        status: 400, 
        headers: {...corsHeaders, 'Content-Type': 'application/json'}
      });
    }

    const stringSession = new StringSession("");
    log("Created empty StringSession:", stringSession instanceof StringSession);

    const client = new TelegramClient(stringSession, Number(apiId), apiHash, { 
      connectionRetries: 3,
      useWSS: true 
    });
    log("TelegramClient instance created.");

    await client.connect();
    log("TelegramClient connected successfully.");

    const isAuthorized = await client.isUserAuthorized();
    log("Authorization check:", isAuthorized);

    await client.disconnect();
    log("TelegramClient disconnected.");

    return new Response(JSON.stringify({ 
      valid: true, 
      authorized: isAuthorized,
      session: stringSession.save()
    }), { 
      headers: {...corsHeaders, 'Content-Type': 'application/json'}, 
      status: 200 
    });

  } catch (err) {
    logError("Telegram Client Initialization Error", err);
    return new Response(JSON.stringify({ 
      error: err.message,
      stack: err.stack 
    }), { 
      headers: {...corsHeaders, 'Content-Type': 'application/json'}, 
      status: 500 
    });
  }
});
