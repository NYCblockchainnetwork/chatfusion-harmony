
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

// Function to create an error response
function createErrorResponse(message: string, status = 500) {
  console.error(`Error: ${message}`);
  return createResponse({ error: message }, status);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received request to get-telegram-credentials");
    
    // Parse authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("Invalid or missing Authorization header");
      return createErrorResponse("Valid Authorization header is required", 401);
    }
    
    // Get Supabase URL and key from env vars
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return createErrorResponse("Server configuration error", 500);
    }
    
    // Extract token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    try {
      // Create Supabase client with service role key to validate the token
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Verify the JWT token
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error("Authentication error:", authError);
        return createErrorResponse("Invalid authentication token", 401);
      }
      
      // Parse request body
      let body;
      try {
        body = await req.json();
        console.log("Request body:", JSON.stringify(body));
      } catch (error) {
        console.error("Error parsing request body:", error);
        return createErrorResponse("Invalid request body", 400);
      }
      
      // Check for userId
      const { userId } = body;
      if (!userId) {
        console.error("No userId provided in request");
        return createErrorResponse("userId is required", 400);
      }
      
      // Verify that the authenticated user matches the requested userId
      if (user.id !== userId) {
        console.error(`User ID mismatch: ${user.id} vs ${userId}`);
        return createErrorResponse("Not authorized to access this user's data", 403);
      }
      
      // Get API credentials from env vars
      const apiId = Deno.env.get("telegram_api_id");
      const apiHash = Deno.env.get("telegram_api_hash");
      
      if (!apiId || !apiHash) {
        console.error("Telegram API credentials not found in environment");
        return createErrorResponse("Telegram API credentials not configured", 500);
      }
      
      console.log("Successfully retrieved Telegram API credentials");
      
      // Return the API credentials
      return createResponse({
        apiId,
        apiHash
      });
      
    } catch (error) {
      console.error("Error validating auth token:", error);
      return createErrorResponse("Invalid authentication token", 401);
    }
    
  } catch (error) {
    console.error("Unhandled error:", error);
    return createErrorResponse(`Server error: ${error.message}`, 500);
  }
});
