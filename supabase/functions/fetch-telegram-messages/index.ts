
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramRequest {
  handles: string[]; 
  limit?: number;
  apiId?: number;
  apiHash?: string;
  userId: string;
  sessionId?: string;
  phone?: string;
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

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to connect to Telegram and fetch real messages
async function fetchRealTelegramMessages(
  handles: string[], 
  limit: number, 
  apiId: number, 
  apiHash: string,
  sessionString: string
): Promise<{result: Record<string, TelegramMessage[]>, newSessionString: string}> {
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
    
    try {
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
    } catch (connectionError) {
      // Check for session expiration errors
      if (
        connectionError.message.includes("AUTH_KEY_UNREGISTERED") || 
        connectionError.message.includes("SESSION_EXPIRED") ||
        connectionError.message.includes("AUTH_KEY_INVALID")
      ) {
        console.error("Telegram session has expired:", connectionError.message);
        throw new Error("TELEGRAM_SESSION_EXPIRED");
      }
      
      // Rethrow other connection errors
      throw connectionError;
    }
  } catch (error) {
    console.error("Error importing or using grm library:", error);
    throw error;
  }
}

// Create mock messages for testing when real API fails
function createMockMessages(handles: string[]): Record<string, TelegramMessage[]> {
  const result: Record<string, TelegramMessage[]> = {};
  
  for (const handle of handles) {
    const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
    
    result[cleanHandle] = [
      {
        id: 1,
        text: `This is a mock message for @${cleanHandle}. The Telegram API could not be accessed.`,
        date: Math.floor(Date.now() / 1000) - 3600,
        from: {
          username: cleanHandle,
          firstName: "Mock",
          lastName: "User"
        }
      },
      {
        id: 2,
        text: "Please check your Telegram API credentials or session validity.",
        date: Math.floor(Date.now() / 1000) - 1800,
        from: {
          username: cleanHandle,
          firstName: "Mock",
          lastName: "User"
        }
      }
    ];
  }
  
  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received request to fetch-telegram-messages");
    let body;
    
    try {
      body = await req.json();
      console.log("Request body:", JSON.stringify(body));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request body format",
          details: parseError.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { handles, limit = 5, apiId, apiHash, userId, sessionId, phone } = body as TelegramRequest;
    
    // Validate inputs
    if (!handles || !Array.isArray(handles) || handles.length === 0) {
      console.error("Invalid or missing handles in request:", body);
      return new Response(
        JSON.stringify({ error: "At least one Telegram handle is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      console.error("Missing userId in request:", body);
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for API credentials
    const apiIdToUse = apiId || Number(Deno.env.get("telegram_api_id"));
    const apiHashToUse = apiHash || Deno.env.get("telegram_api_hash");
    
    if (!apiIdToUse || !apiHashToUse) {
      console.error("Missing Telegram API credentials. apiId:", apiIdToUse, "apiHash exists:", !!apiHashToUse);
      return new Response(
        JSON.stringify({ 
          error: "Telegram API credentials not found",
          needsAuth: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the session string from the database
    console.log(`Fetching session for user: ${userId}, sessionId: ${sessionId}, phone: ${phone}`);
    
    let sessionQuery = supabase
      .from('telegram_sessions')
      .select('*')
      .eq('user_id', userId);
    
    // If sessionId is provided, query by id
    if (sessionId) {
      sessionQuery = sessionQuery.eq('id', sessionId);
    } 
    // If phone is provided, query by phone
    else if (phone) {
      sessionQuery = sessionQuery.eq('phone', phone);
    }
    
    const { data: sessionData, error: sessionError } = await sessionQuery.maybeSingle();
    
    console.log("Session query result:", JSON.stringify({ 
      found: !!sessionData, 
      error: sessionError ? sessionError.message : null,
      sessionId: sessionData?.id,
      phone: sessionData?.phone
    }));
    
    if (sessionError) {
      console.error("Database error fetching session:", sessionError);
      
      // If we couldn't query the database, return a proper error
      return new Response(
        JSON.stringify({ 
          error: "Database error fetching session: " + sessionError.message,
          needsAuth: true,
          mode: "error",
          details: sessionError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!sessionData) {
      console.log("No session found for user:", userId);
      
      // If we couldn't find a session, return mock data as fallback
      const mockMessages = createMockMessages(handles);
      
      return new Response(
        JSON.stringify({ 
          messages: mockMessages,
          error: "Telegram session not found, authentication required",
          needsAuth: true,
          mode: "mock",
          details: "No active session found for this user. Please authenticate with Telegram."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const sessionString = sessionData.session_string;
    console.log(`Retrieved session for user: ${userId}, phone: ${sessionData.phone}`);

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
      
      // Always update the session string to ensure it's current
      if (newSessionString && newSessionString !== sessionString) {
        console.log("Updating session string in database");
        const { error: updateError } = await supabase
          .from('telegram_sessions')
          .update({ 
            session_string: newSessionString,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionData.id);
        
        if (updateError) {
          console.error("Failed to update session in database:", updateError);
        } else {
          console.log("Session updated successfully in database");
        }
      }
      
      // Return the results with real data
      return new Response(
        JSON.stringify({ 
          messages: result,
          sessionId: sessionData.id,
          phone: sessionData.phone,
          mode: "live"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (telegramError) {
      console.error("Error fetching real messages:", telegramError);
      
      // Handle expired/invalid sessions specifically
      if (telegramError.message === "TELEGRAM_SESSION_EXPIRED" || 
          telegramError.message.includes("AUTH_KEY_UNREGISTERED") ||
          telegramError.message.includes("AUTH_KEY_INVALID") ||
          telegramError.message.includes("SESSION_EXPIRED")) {
        
        console.log("Detected expired session, marking for re-authentication");
        
        // Mark the session as invalid in the database
        const { error: updateError } = await supabase
          .from('telegram_sessions')
          .update({ 
            session_string: "EXPIRED",
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionData.id);
        
        if (updateError) {
          console.error("Failed to mark session as expired:", updateError);
        }
        
        return new Response(
          JSON.stringify({ 
            error: "Your Telegram session has expired. Please re-authenticate.",
            needsAuth: true,
            mode: "expired",
            sessionExpired: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Create mock data as fallback for other errors
      const mockMessages = createMockMessages(handles);
      
      return new Response(
        JSON.stringify({ 
          messages: mockMessages,
          error: `Telegram API Error: ${telegramError.message}`,
          needsAuth: telegramError.message.includes("auth") || telegramError.message.includes("session"),
          mode: "mock",
          details: "Using mock data as fallback due to Telegram API error: " + telegramError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error("Unhandled error in fetch-telegram-messages function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unknown error occurred",
        mode: "error",
        messages: {},
        details: "Unhandled exception in edge function"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
