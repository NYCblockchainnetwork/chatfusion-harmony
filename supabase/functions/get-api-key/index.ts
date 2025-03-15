
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApiKeyRequest {
  userId: string;
  service: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get request body
    const { userId, service } = await req.json() as ApiKeyRequest;

    // Validate inputs
    if (!userId) return createErrorResponse("User ID is required");
    if (!service) return createErrorResponse("Service name is required");

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

    if (authError || !user) {
      return createErrorResponse("Unauthorized", 401);
    }

    if (user.id !== userId) {
      return createErrorResponse("You can only access your own API keys", 403);
    }

    // Get the API key from the user_api_keys table
    const { data, error: fetchError } = await supabaseClient
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("service", service)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      return createErrorResponse(`Error retrieving API key: ${fetchError.message}`);
    }

    if (!data) {
      return createResponse({ apiKey: null });
    }

    return createResponse({ apiKey: data.api_key });
  } catch (error) {
    return createErrorResponse(`Internal server error: ${error.message}`);
  }
});

function createErrorResponse(message: string, status = 400) {
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
