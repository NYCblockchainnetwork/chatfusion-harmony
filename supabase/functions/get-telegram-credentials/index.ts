
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CredentialsRequest {
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received request to get-telegram-credentials");
    
    // Parse request body
    let data;
    try {
      data = await req.json() as CredentialsRequest;
      console.log("Request data:", { userId: data.userId });
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request body format",
          details: parseError.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { userId } = data;
    
    // Validate inputs
    if (!userId) {
      console.error("Missing userId in request");
      return new Response(
        JSON.stringify({ 
          error: "User ID is required",
          details: "The request must include a userId field"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client to verify the user's authentication
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ 
          error: "Server configuration error",
          details: "Supabase configuration is incomplete"
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { 
        headers: { 
          Authorization: req.headers.get("Authorization") || "" 
        } 
      }
    });
    
    // Verify user authentication
    console.log("Verifying user authentication");
    const authResult = await supabaseClient.auth.getUser();
    
    if (authResult.error) {
      console.error("Authentication error:", authResult.error);
      return new Response(
        JSON.stringify({ 
          error: "Authentication failed",
          details: authResult.error.message
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!authResult.data.user) {
      console.error("No authenticated user found");
      return new Response(
        JSON.stringify({ 
          error: "Authentication required",
          details: "No authenticated user found"
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if the authenticated user matches the requested userId
    if (authResult.data.user.id !== userId) {
      console.error("User ID mismatch:", {
        authenticatedId: authResult.data.user.id,
        requestedId: userId
      });
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized",
          details: "You can only access your own credentials"
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get credentials from environment variables
    const apiId = Deno.env.get("telegram_api_id");
    const apiHash = Deno.env.get("telegram_api_hash");

    if (!apiId || !apiHash) {
      console.error("Missing Telegram API credentials in environment");
      return new Response(
        JSON.stringify({ 
          error: "Telegram API credentials not configured on server",
          details: "The server does not have the required Telegram API credentials"
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Successfully retrieved Telegram API credentials");
    
    // Return the credentials
    return new Response(
      JSON.stringify({ 
        apiId,
        apiHash
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in get-telegram-credentials function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unknown error occurred",
        details: "Unhandled exception in edge function"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
