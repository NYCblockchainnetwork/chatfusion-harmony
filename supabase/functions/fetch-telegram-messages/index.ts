
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
    
    // Direct HTTP request to the Telegram API
    const url = `https://api.telegram.org/bot${credentials.apiHash}/getUpdates`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Telegram API error: ${errorData}`);
      throw new Error(`Telegram API returned ${response.status}: ${errorData}`);
    }
    
    const data = await response.json();
    console.log(`Received response from Telegram API for ${handle}`);
    
    // Process and transform the raw Telegram API response
    // This is a simplified example and might need adjustments based on the actual API response
    const messages = data.result
      .filter((update: any) => update.message && update.message.from.username === handle)
      .slice(0, limit)
      .map((update: any) => ({
        id: update.message.message_id,
        text: update.message.text || "(No text content)",
        date: update.message.date,
        from: {
          username: update.message.from.username,
          firstName: update.message.from.first_name,
          lastName: update.message.from.last_name
        }
      }));
    
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
