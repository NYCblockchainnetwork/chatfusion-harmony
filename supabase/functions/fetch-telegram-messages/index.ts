
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { TelegramClient } from "https://esm.sh/telegram@2.26.0";
import { StringSession } from "https://esm.sh/telegram@2.26.0/sessions";

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

    console.log(`Starting Telegram client with API ID: ${apiIdToUse}`);
    
    // Initialize Telegram client
    const stringSession = new StringSession(sessionString);
    const client = new TelegramClient(
      stringSession, 
      apiIdToUse, 
      apiHashToUse,
      { connectionRetries: 3 }
    );

    // Connect to Telegram
    console.log("Connecting to Telegram...");
    await client.connect();
    console.log("Connected to Telegram successfully");
    
    // Save session string for future use
    const newSessionString = stringSession.save();
    
    // Create object to store messages for each handle
    const result: Record<string, any[]> = {};
    
    // Fetch messages for each handle
    for (const handle of handles) {
      const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
      
      try {
        console.log(`Fetching messages for @${cleanHandle}...`);
        
        // Resolve username to entity
        let entity;
        try {
          console.log(`Resolving username: @${cleanHandle}`);
          entity = await client.getEntity(`@${cleanHandle}`);
          console.log(`Successfully resolved @${cleanHandle} to entity`);
        } catch (resolveError) {
          console.error(`Failed to resolve @${cleanHandle}:`, resolveError);
          result[cleanHandle] = [{
            id: 0,
            text: `Error: Could not find Telegram user @${cleanHandle}`,
            timestamp: new Date().toISOString(),
            from: {
              username: cleanHandle,
              firstName: 'Error',
            }
          }];
          continue;
        }
        
        // Fetch actual messages
        try {
          console.log(`Getting messages for entity: @${cleanHandle}`);
          
          // Fetch most recent messages from this chat
          const fetchedMessages = await client.getMessages(entity, {
            limit: limit
          });
          
          console.log(`Successfully fetched ${fetchedMessages.length} messages for @${cleanHandle}`);
          
          // Transform the messages to our format
          const transformedMessages = fetchedMessages.map(msg => {
            // Handle different message types and extract text content
            let messageText = "";
            if (msg.message) {
              messageText = msg.message;
            } else if (msg.media) {
              const mediaType = msg.media.className || "media";
              messageText = `[${mediaType}] ${msg.message || ""}`;
            }
            
            return {
              id: msg.id,
              text: messageText || "(No text content)",
              timestamp: new Date(msg.date * 1000).toISOString(),
              from: {
                username: entity.username || "unknown",
                firstName: entity.firstName || "User",
                lastName: entity.lastName
              }
            };
          });
          
          result[cleanHandle] = transformedMessages;
        } catch (fetchError) {
          console.error(`Error fetching messages for @${cleanHandle}:`, fetchError);
          result[cleanHandle] = [{
            id: 0,
            text: `Error fetching messages for @${cleanHandle}: ${fetchError.message}`,
            timestamp: new Date().toISOString(),
            from: {
              username: cleanHandle,
              firstName: 'Error',
            }
          }];
        }
      } catch (error) {
        console.error(`Error processing @${cleanHandle}:`, error);
        result[cleanHandle] = [{
          id: 0,
          text: `Error processing @${cleanHandle}: ${error.message}`,
          timestamp: new Date().toISOString(),
          from: {
            username: cleanHandle,
            firstName: 'Error',
          }
        }];
      }
    }
    
    console.log("Completed fetching messages for all handles:", Object.keys(result));
    
    // Disconnect and return results
    await client.disconnect();
    
    return new Response(
      JSON.stringify({ 
        messages: result,
        sessionString: newSessionString
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
