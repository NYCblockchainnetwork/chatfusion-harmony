
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

function createMockMessage(handle: string, error?: string): TelegramMessage {
  return {
    id: 0,
    text: error 
      ? `Error processing @${handle}: ${error}` 
      : `This is a mock message for @${handle}. The Telegram API integration is not available in Deno environment.`,
    date: Math.floor(Date.now() / 1000),
    from: {
      username: handle,
      firstName: error ? 'Error' : 'Mock',
      lastName: error ? undefined : 'User'
    }
  };
}

async function fetchMessagesUsingMTProto(credentials: {
  apiId: number;
  apiHash: string;
  sessionString?: string;
}, handle: string, limit: number = 5): Promise<{ messages: TelegramMessage[], sessionString?: string }> {
  try {
    console.log(`Attempting to fetch real messages for handle: ${handle} using MTProto API`);
    
    // Attempt to dynamically import the required modules
    let TelegramClient, StringSession;
    
    try {
      // Try loading from npm via esm.sh
      const gramjs = await import("https://esm.sh/telegram@2.26.0");
      TelegramClient = gramjs.TelegramClient;
      StringSession = gramjs.sessions.StringSession;
      console.log("Successfully imported TelegramClient from esm.sh");
    } catch (importError) {
      console.error("Failed to import from esm.sh:", importError);
      
      try {
        // Try GitHub raw URL as fallback
        const mainModule = await import("https://raw.githubusercontent.com/gram-js/gramjs/master/index.ts");
        TelegramClient = mainModule.TelegramClient;
        const sessionsModule = await import("https://raw.githubusercontent.com/gram-js/gramjs/master/sessions/index.ts");
        StringSession = sessionsModule.StringSession;
        console.log("Successfully imported TelegramClient from GitHub raw URL");
      } catch (githubError) {
        console.error("Failed to import from GitHub raw URL:", githubError);
        
        // If both imports fail, throw a more descriptive error
        throw new Error("Failed to import Telegram client library. This is likely due to Node.js library incompatibility with Deno runtime.");
      }
    }
    
    // If we got here but don't have the required classes, throw an error
    if (!TelegramClient || !StringSession) {
      throw new Error("Required Telegram client classes not found after import attempts");
    }
    
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
    
    // Check if we're in a test mode (detecting Deno environment incompatibility)
    const useTestMode = Deno.env.get("TELEGRAM_TEST_MODE") === "true";
    if (useTestMode) {
      console.log("Running in test mode, using mock Telegram messages");
      
      // Generate mock messages for each handle
      for (const handle of handles) {
        const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
        result[cleanHandle] = Array(Math.min(limit, 3)).fill(0).map((_, i) => ({
          id: i + 1,
          text: `This is mock message ${i + 1} for @${cleanHandle}. Set TELEGRAM_TEST_MODE=false to use real API.`,
          date: Math.floor(Date.now() / 1000) - (i * 3600),
          from: {
            username: cleanHandle,
            firstName: 'Mock',
            lastName: 'User'
          }
        }));
      }
      
      // Return the mock results
      return new Response(
        JSON.stringify({ 
          messages: result,
          sessionString: updatedSessionString,
          mode: "test"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Attempt to use real Telegram API (with graceful fallback)
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
        
        // Create a placeholder error message
        result[cleanHandle] = [createMockMessage(cleanHandle, error.message)];
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
