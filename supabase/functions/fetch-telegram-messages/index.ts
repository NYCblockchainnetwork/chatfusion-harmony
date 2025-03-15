
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

async function fetchMessagesUsingMTProto(credentials: {
  apiId: number;
  apiHash: string;
  sessionString?: string;
}, handle: string, limit: number = 5): Promise<{ messages: TelegramMessage[], sessionString?: string }> {
  try {
    console.log(`Attempting to fetch real messages for handle: ${handle} using MTProto API`);
    
    // Import the GramJS library - Deno compatible version of Telegram client
    const { TelegramClient } = await import("https://deno.land/x/gramjs@v2.19.6/mod.ts");
    const { StringSession } = await import("https://deno.land/x/gramjs@v2.19.6/sessions/mod.ts");
    
    // Initialize the client with user credentials
    const stringSession = new StringSession(credentials.sessionString || "");
    
    console.log(`Creating Telegram client with API ID: ${credentials.apiId}`);
    const client = new TelegramClient(
      stringSession,
      credentials.apiId,
      credentials.apiHash,
      {
        connectionRetries: 3,
        useWSS: true,
      }
    );
    
    try {
      // Connect to Telegram
      console.log("Connecting to Telegram...");
      await client.connect();
      console.log("Successfully connected to Telegram");
      
      // Get the entity (user/channel) by username
      console.log(`Resolving entity for handle: ${handle}`);
      const entity = await client.getEntity(handle.startsWith('@') ? handle : `@${handle}`);
      console.log(`Successfully resolved entity: ${JSON.stringify(entity, null, 2)}`);
      
      // Get messages from the entity
      console.log(`Fetching messages from entity...`);
      const messages = await client.getMessages(entity, { limit });
      console.log(`Successfully fetched ${messages.length} messages`);
      
      // Format messages to match our interface
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        text: msg.message || "(No text content)",
        date: msg.date,
        from: {
          username: handle,
          firstName: entity.firstName || entity.title || handle,
          lastName: entity.lastName || undefined
        }
      }));
      
      // Save the session for future use
      const newSession = stringSession.save();
      
      await client.disconnect();
      return { 
        messages: formattedMessages,
        sessionString: newSession 
      };
    } catch (innerError) {
      console.error(`Error in MTProto operation:`, innerError);
      throw new Error(`MTProto API error: ${innerError.message}`);
    }
  } catch (error) {
    console.error(`Error fetching messages for ${handle}:`, error);
    throw error;
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

    console.log(`Processing request with API ID: ${apiIdToUse}`);
    
    // Create object to store messages for each handle
    const result: Record<string, TelegramMessage[]> = {};
    let updatedSessionString = sessionString;
    
    // Fetch messages for each handle using MTProto API
    for (const handle of handles) {
      const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
      
      try {
        console.log(`Processing handle: @${cleanHandle}`);
        
        const response = await fetchMessagesUsingMTProto({
          apiId: apiIdToUse,
          apiHash: apiHashToUse,
          sessionString: updatedSessionString
        }, cleanHandle, limit);
        
        result[cleanHandle] = response.messages;
        
        // Update session string if it changed
        if (response.sessionString) {
          updatedSessionString = response.sessionString;
        }
      } catch (error) {
        console.error(`Error processing @${cleanHandle}:`, error);
        result[cleanHandle] = [{
          id: 0,
          text: `Error processing @${cleanHandle}: ${error.message}`,
          date: Math.floor(Date.now() / 1000),
          from: {
            username: cleanHandle,
            firstName: 'Error',
          }
        }];
      }
    }
    
    console.log("Completed fetching messages for all handles:", Object.keys(result));
    
    // Return the results with updated session string
    return new Response(
      JSON.stringify({ 
        messages: result,
        sessionString: updatedSessionString
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in fetch-telegram-messages function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
