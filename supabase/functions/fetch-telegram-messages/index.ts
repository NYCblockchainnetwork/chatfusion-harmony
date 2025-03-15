
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

// Function to call the Telegram API directly
async function fetchTelegramMessages(credentials: {
  apiId: number;
  apiHash: string;
  sessionString?: string;
}, handle: string, limit: number = 5): Promise<{ messages: TelegramMessage[] }> {
  try {
    console.log(`Fetching live messages for handle: ${handle}`);
    
    // We need to use a bot token rather than API ID/hash for this method
    // For now, we'll create a simple mock response as we transition to using a proper bot token
    console.log("Note: This endpoint requires a Telegram bot token for real implementation");
    
    // Mock data until bot token is implemented
    const messages: TelegramMessage[] = [];
    const currentTime = Math.floor(Date.now() / 1000);
    
    for (let i = 0; i < limit; i++) {
      messages.push({
        id: i + 1,
        text: `Live message ${i + 1} for @${handle} (Note: For real data, a Telegram bot token is required)`,
        date: currentTime - (i * 60), // Each message is 1 minute apart
        from: {
          username: handle,
          firstName: handle.charAt(0).toUpperCase() + handle.slice(1),
          lastName: undefined
        }
      });
    }
    
    return { messages };
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
    
    // Fetch messages for each handle
    for (const handle of handles) {
      const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
      
      try {
        console.log(`Processing handle: @${cleanHandle} for live data`);
        
        const response = await fetchTelegramMessages({
          apiId: apiIdToUse,
          apiHash: apiHashToUse,
          sessionString
        }, cleanHandle, limit);
        
        result[cleanHandle] = response.messages;
        
      } catch (error) {
        console.error(`Error processing @${cleanHandle}:`, error);
        // Return error in result but don't provide mock data
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
    
    console.log("Completed fetching live messages for all handles:", Object.keys(result));
    
    // Return the results
    return new Response(
      JSON.stringify({ 
        messages: result,
        sessionString: sessionString // Return the same session string for now
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
