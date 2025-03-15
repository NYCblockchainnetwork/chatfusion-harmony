
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

// Function to call the Telegram API directly
async function fetchTelegramMessages(credentials: {
  apiId: number;
  apiHash: string;
  sessionString?: string;
}, handle: string, limit: number = 5) {
  try {
    console.log(`Fetching messages for handle: ${handle}`);
    
    // This is a simplified implementation that makes direct HTTP requests to Telegram API
    // In a real implementation, you would use proper API endpoints and authentication
    
    // For now, return mock data since we can't use the Node.js telegram library in Deno
    return {
      messages: Array.from({ length: Math.floor(Math.random() * limit) + 1 }).map((_, i) => ({
        id: i + 1,
        text: `Message ${i + 1} from @${handle} (via Edge Function)`,
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
        from: {
          username: handle,
          firstName: "Telegram",
          lastName: "User"
        }
      }))
    };
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
    const result: Record<string, any[]> = {};
    
    // Fetch messages for each handle
    for (const handle of handles) {
      const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
      
      try {
        console.log(`Processing handle: @${cleanHandle}`);
        
        const response = await fetchTelegramMessages({
          apiId: apiIdToUse,
          apiHash: apiHashToUse,
          sessionString
        }, cleanHandle, limit);
        
        result[cleanHandle] = response.messages;
        
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
