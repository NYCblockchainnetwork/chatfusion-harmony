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

// Function to create mock messages for a handle
function createMockMessage(handle: string, index: number = 0): TelegramMessage {
  const topics = ["sports", "news", "technology", "entertainment", "business"];
  const topic = topics[Math.floor(Math.random() * topics.length)];
  
  return {
    id: index + 1,
    text: `This is a mock message ${index + 1} about ${topic} for @${handle}. Telegram API integration is using mock data.`,
    date: Math.floor(Date.now() / 1000) - (index * 3600), // Messages spaced 1 hour apart
    from: {
      username: handle,
      firstName: 'Mock',
      lastName: 'User'
    }
  };
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

// Generate mock messages for a handle
function generateMockMessages(handle: string, count: number = 5): TelegramMessage[] {
  console.log(`Generating ${count} mock messages for @${handle}`);
  return Array(count).fill(null).map((_, i) => createMockMessage(handle, i));
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
    
    // Create object to store messages for each handle
    const result: Record<string, TelegramMessage[]> = {};
    
    // Try to import a Deno-compatible Telegram client
    try {
      // This is a placeholder for a future Deno-compatible Telegram client
      // For now, we'll use mock data since there's no reliable Deno-compatible
      // Telegram MTProto client available at this time
      throw new Error("No Deno-compatible Telegram client available");
    } catch (importError) {
      console.warn("Using mock messages due to Telegram client incompatibility:", importError.message);
      
      // Generate mock messages for each handle
      for (const handle of handles) {
        const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
        result[cleanHandle] = generateMockMessages(cleanHandle, Math.min(limit, 5));
        console.log(`Generated ${result[cleanHandle].length} mock messages for @${cleanHandle}`);
      }
    }
    
    console.log("Completed processing request for all handles:", Object.keys(result));
    
    // Return the results with the session string unchanged
    return new Response(
      JSON.stringify({ 
        messages: result,
        sessionString: sessionString,
        mode: "mock"
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
