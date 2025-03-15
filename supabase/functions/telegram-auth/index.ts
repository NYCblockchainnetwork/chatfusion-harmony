
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { handleQrLogin, processQrCodeLogin } from "./qr-login.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { userId, token, method } = body;

    console.log("Telegram Auth function called with method:", method);
    
    // Create response with CORS headers
    const createResponse = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status,
      });
    };

    // Handle different methods
    switch (method) {
      case "get-qr-token":
        if (!userId) {
          return createResponse({ error: "User ID is required" }, 400);
        }
        
        console.log("Getting QR token for user:", userId);
        const qrToken = await handleQrLogin(supabase, userId);
        return createResponse(qrToken);

      case "check-qr-status":
        if (!userId || !token) {
          return createResponse({ error: "User ID and token are required" }, 400);
        }
        
        console.log("Checking QR status for token:", token);
        const status = await processQrCodeLogin(supabase, userId, token);
        return createResponse(status);
      
      default:
        console.log("Invalid method:", method);
        return createResponse({ error: "Invalid method" }, 400);
    }
  } catch (error) {
    console.error("Error in telegram-auth function:", error);
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
