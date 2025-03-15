
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
    const { userId, service, apiKey } = await req.json() as ApiKeyRequest;

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
      return createErrorResponse("You can only manage your own API keys", 403);
    }

    // Delete the API key if empty
    if (!apiKey || apiKey.trim() === "") {
      const { error: deleteError } = await supabaseClient
        .from("user_api_keys")
        .delete()
        .eq("user_id", userId)
        .eq("service", service);

      if (deleteError) {
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
          service,
          api_key: apiKey,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,service" }
      );

    if (upsertError) {
      return createErrorResponse(`Error storing API key: ${upsertError.message}`);
    }

    return createResponse({ success: true });
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
