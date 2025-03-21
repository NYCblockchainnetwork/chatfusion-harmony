
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApiKeyRequest {
  userId: string;
  service: string;
  apiKey: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get request body
    const requestData = await req.json() as ApiKeyRequest;
    const { userId, service, apiKey } = requestData;
    
    console.log(`Processing request for user ${userId} and service ${service}`);
    
    // Validate inputs
    if (!userId) {
      console.error("Missing userId in request");
      return createErrorResponse("User ID is required");
    }
    if (!service) {
      console.error("Missing service in request");
      return createErrorResponse("Service name is required");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    // Verify the user is authenticated and matches the userId
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError) {
      console.error("Authentication error:", authError.message);
      return createErrorResponse("Unauthorized: " + authError.message, 401);
    }
    
    if (!user) {
      console.error("No user found in auth context");
      return createErrorResponse("Unauthorized: No user found", 401);
    }

    if (user.id !== userId) {
      console.error(`User ID mismatch: ${user.id} vs ${userId}`);
      return createErrorResponse("You can only manage your own API keys", 403);
    }

    // Check if we need to use environment variables
    let finalApiKey = apiKey;
    
    if (service === 'telegram_api_id' && apiKey === 'USE_ENV_SECRET') {
      const secretValue = Deno.env.get('telegram_api_id');
      if (secretValue) {
        console.log("Using telegram_api_id from environment variable");
        finalApiKey = secretValue;
      } else {
        console.error("Environment variable telegram_api_id not found");
        return createErrorResponse("Required environment variable telegram_api_id not found");
      }
    } 
    else if (service === 'telegram_api_hash' && apiKey === 'USE_ENV_SECRET') {
      const secretValue = Deno.env.get('telegram_api_hash');
      if (secretValue) {
        console.log("Using telegram_api_hash from environment variable");
        finalApiKey = secretValue;
      } else {
        console.error("Environment variable telegram_api_hash not found");
        return createErrorResponse("Required environment variable telegram_api_hash not found");
      }
    }

    // Handle deletion (empty value)
    if (!finalApiKey || finalApiKey.trim() === "") {
      console.log(`Deleting ${service} API key`);
      const { error: deleteError } = await supabaseClient
        .from("user_api_keys")
        .delete()
        .eq("user_id", userId)
        .eq("service", service);

      if (deleteError) {
        console.error("Error deleting API key:", deleteError);
        return createErrorResponse(`Error deleting API key: ${deleteError.message}`);
      }

      return createResponse({ success: true, message: "API key deleted" });
    }

    // Store the API key in the user_api_keys table
    const { error: upsertError } = await supabaseClient
      .from("user_api_keys")
      .upsert(
        {
          user_id: userId,
          service: service,
          api_key: finalApiKey,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,service" }
      );

    if (upsertError) {
      console.error(`Error storing ${service} API key:`, upsertError);
      return createErrorResponse(`Error storing API key: ${upsertError.message}`);
    }

    console.log(`Successfully stored ${service} API key`);
    return createResponse({ 
      success: true,
      message: `${service} API key saved successfully` 
    });
  } catch (error) {
    console.error("Unexpected error in store-api-key function:", error);
    return createErrorResponse(`Internal server error: ${error.message}`);
  }
});

function createErrorResponse(message: string, status = 400) {
  console.error(`Returning error response: ${message}`);
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

function createResponse(data: any, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
