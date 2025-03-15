
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramRequest {
  handles: string[]; 
  limit?: number;
  apiId?: number;
  apiHash?: string;
  sessionString?: string;
}

interface TelegramMessage {
  id: number;
  text: string;
  date: number;
  from: {
    username: string;
    firstName: string;
    lastName?: string;
  }
}

// Function to create an error message
function createErrorMessage(handle: string, error: string): TelegramMessage {
  return {
    id: 0,
    text: `Error processing @${handle}: ${error}`,
    date: Math.floor(Date.now() / 1000),
    from: {
      username: handle,
      firstName: 'Error',
    }
  };
}

// Function to connect to Telegram and fetch real messages
async function fetchRealTelegramMessages(
  handles: string[], 
  limit: number, 
  apiId: number, 
  apiHash: string,
  sessionString: string
): Promise<Record<string, TelegramMessage[]>> {
  const result: Record<string, TelegramMessage[]> = {};
  
  try {
    // Import the grm library for Deno
    const { StringSession, TelegramClient } = await import("https://deno.land/x/grm@0.0.5/mod.ts");
    
    console.log("Successfully imported grm library");
    
    // Create a new Telegram client
    const stringSession = new StringSession(sessionString || "");
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 3,
    });
    
    console.log("Telegram client created, connecting...");
    
    // Connect to Telegram
    await client.connect();
    console.log("Connected to Telegram API");
    
    // Get the session string for future use
    const newSessionString = stringSession.save();
    console.log("Session string saved");
    
    // Process each handle
    for (const handle of handles) {
      const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
      
      try {
        console.log(`Fetching messages for @${cleanHandle}`);
        
        // Get the entity (user/chat)
        const entity = await client.getEntity(`@${cleanHandle}`);
        console.log(`Entity found for @${cleanHandle}`);
        
        // Get messages
        const messages = await client.getMessages(entity, { limit });
        console.log(`Retrieved ${messages.length} messages for @${cleanHandle}`);
        
        // Transform messages to our format
        result[cleanHandle] = messages.map((msg: any) => ({
          id: msg.id,
          text: msg.message || "(No text content)",
          date: msg.date,
          from: {
            username: cleanHandle,
            firstName: entity.firstName || "User",
            lastName: entity.lastName
          }
        }));
      } catch (error) {
        console.error(`Error fetching messages for @${cleanHandle}:`, error);
        result[cleanHandle] = [createErrorMessage(cleanHandle, error.message)];
      }
    }
    
    // Disconnect client
    await client.disconnect();
    console.log("Disconnected from Telegram API");
    
    return { result, newSessionString };
  } catch (importError) {
    console.error("Error importing or using grm library:", importError);
    throw new Error(`Failed to use Telegram client: ${importError.message}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { handles, limit = 5, apiId, apiHash, sessionString = "" } = await req.json() as TelegramRequest;
    
    // Validate inputs
    if (!handles || !Array.isArray(handles) || handles.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one Telegram handle is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for API credentials
    const apiIdToUse = apiId || Number(Deno.env.get("telegram_api_id"));
    const apiHashToUse = apiHash || Deno.env.get("telegram_api_hash");

    if (!apiIdToUse || !apiHashToUse) {
      console.error("Missing Telegram API credentials");
      return new Response(
        JSON.stringify({ error: "Telegram API credentials not found" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing request for ${handles.length} handles with limit ${limit}`);
    
    try {
      console.log("Attempting to fetch real messages from Telegram API");
      const { result, newSessionString } = await fetchRealTelegramMessages(
        handles, 
        limit, 
        apiIdToUse, 
        apiHashToUse, 
        sessionString
      );
      
      console.log("Successfully fetched real messages from Telegram API");
      
      // Return the results with real data
      return new Response(
        JSON.stringify({ 
          messages: result,
          sessionString: newSessionString,
          mode: "live"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (telegramError) {
      console.error("Failed to fetch real messages:", telegramError.message);
      
      // If we encounter an error, we should return it rather than falling back to mock data
      return new Response(
        JSON.stringify({ 
          error: `Telegram API Error: ${telegramError.message}`,
          details: "Please check your API credentials and session string"
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error("Error in fetch-telegram-messages function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
