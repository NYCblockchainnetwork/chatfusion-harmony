
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to create a response with CORS headers
function createResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received request to get-telegram-credentials");
    
    // Validate request method
    if (req.method !== 'POST') {
      return createResponse({ error: "Only POST requests are allowed" }, 405);
    }
    
    // Get JWT token from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("Invalid or missing Authorization header");
      return createResponse({ error: "Valid Authorization header is required" }, 401);
    }
    
    // Extract token
    const token = authHeader.replace('Bearer ', '');
    
    // Get Supabase URL and key from env vars
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");  // Using anon key for auth only
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return createResponse({ error: "Server configuration error" }, 500);
    }
    
    try {
      // Create Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Verify the JWT token
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error("Authentication error:", authError);
        return createResponse({ error: "Invalid authentication token" }, 401);
      }
      
      console.log("Authenticated user:", user.id);
      
      // Parse request body
      let body;
      try {
        body = await req.json();
      } catch (error) {
        console.error("Error parsing request body:", error);
        return createResponse({ error: "Invalid request body" }, 400);
      }
      
      // Verify that the authenticated user matches the requested userId
      const { userId } = body;
      if (!userId) {
        return createResponse({ error: "userId is required" }, 400);
      }
      
      if (user.id !== userId) {
        console.error(`User ID mismatch: ${user.id} vs ${userId}`);
        return createResponse({ error: "Not authorized to access this user's data" }, 403);
      }
      
      // Get API credentials from env vars
      const apiId = Deno.env.get("telegram_api_id");
      const apiHash = Deno.env.get("telegram_api_hash");
      
      if (!apiId || !apiHash) {
        console.error("Telegram API credentials not found in environment");
        return createResponse({ error: "Telegram API credentials not configured" }, 500);
      }
      
      console.log("Successfully retrieved Telegram API credentials");
      
      // Return the API credentials
      return createResponse({
        apiId,
        apiHash
      });
      
    } catch (error) {
      console.error("Error validating auth token:", error);
      return createResponse({ error: "Invalid authentication token" }, 401);
    }
    
  } catch (error) {
    console.error("Unhandled error:", error);
    return createResponse({ error: "Server error: " + error.message }, 500);
  }
});
