
import { CustomStringSession } from "./custom-session.ts";
import QRCode from "https://esm.sh/qrcode@1.5.3";
import { GramJs } from "https://esm.sh/@grm/core@1.6.7";

// Using a direct import strategy that works better with Deno
import { TelegramClient } from "https://esm.sh/v135/telegram@2.26.22/X-ZS8q/deno/telegram.mjs";

// Function to handle QR login initialization
export async function handleQrLogin(supabase, userId) {
  try {
    console.log("Starting QR login process for user:", userId);
    
    // Get API credentials from user_api_keys table
    const { data: apiIdData, error: apiIdError } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("service", "telegram_api_id")
      .single();
    
    if (apiIdError) {
      console.error("Error fetching API ID:", apiIdError);
      return { error: "Failed to retrieve API ID" };
    }
    
    const { data: apiHashData, error: apiHashError } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("service", "telegram_api_hash")
      .single();
    
    if (apiHashError) {
      console.error("Error fetching API Hash:", apiHashError);
      return { error: "Failed to retrieve API Hash" };
    }
    
    const apiId = apiIdData.api_key;
    const apiHash = apiHashData.api_key;
    
    // Initialize Telegram client with custom session
    console.log("Initializing Telegram client with API ID:", apiId);
    
    // Create custom session with GRM enhancement
    const session = new CustomStringSession("");
    console.log("QR login: Session created with type:", session.constructor.name);

    // Create the client with proper configuration for Deno environment
    const client = new TelegramClient(
      session,
      parseInt(apiId, 10),
      apiHash,
      {
        connectionRetries: 3,
        useWSS: true,
        baseLogger: console,
        deviceModel: "Deno Edge Function",
        systemVersion: "Windows",
        appVersion: "1.0.0",
        langCode: "en",
        systemLangCode: "en",
        initConnectionParams: {
          apiId: parseInt(apiId, 10),
          deviceModel: "Deno Edge Function",
          systemVersion: "Windows",
          appVersion: "1.0.0",
          langCode: "en",
          systemLangCode: "en",
        }
      }
    );
    
    // Apply GRM enhancements to the client
    GramJs.enhanceClient(client);
    
    try {
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error("QR login: Connection timeout after 15 seconds");
        client.disconnect();
      }, 15000);
      
      try {
        console.log("QR login: Connecting to Telegram...");
        await client.connect();
        clearTimeout(connectionTimeout);
        
        console.log("QR login: Connected to Telegram");
        
        // Generate QR login data with GRM's enhanced QR login method
        console.log("Generating QR login token with GRM...");
        let token;
        let expires;
        
        // Try to use GRM's enhanced QR login if available
        if (GramJs.generateQrLogin) {
          const qrData = await GramJs.generateQrLogin(client);
          token = qrData.token;
          expires = qrData.expires;
        } else {
          // Fallback to standard QR login
          const qrData = await client.qrLogin({ 
            qrCode: true,
            onError: (errorMessage) => {
              console.error("QR login error:", errorMessage);
              return { qrError: errorMessage };
            }
          });
          token = qrData.token;
          expires = qrData.expires;
        }
        
        console.log("QR login token generated:", !!token);
        console.log("QR login token expires in:", expires, "seconds");
        
        // Generate QR code URL
        const qrUrl = await QRCode.toDataURL(token.url);
        console.log("Generated QR code URL");
        
        // Store token, session, and expiry in database
        const expiresAt = new Date(Date.now() + expires * 1000).toISOString();
        const { error: insertError } = await supabase
          .from("qr_login_states")
          .insert({
            user_id: userId,
            token: token.token,
            expires_at: expiresAt,
            session_string: session.save()
          });
        
        if (insertError) {
          console.error("Error storing QR login state:", insertError);
          return { error: "Failed to store QR login state" };
        }
        
        return {
          token: token.token,
          qrUrl,
          expiresAt
        };
      } catch (err) {
        clearTimeout(connectionTimeout);
        console.error("Error in QR login client initialization:", err);
        return { error: "Failed to initialize Telegram client: " + (err.message || "Unknown error") };
      }
    } catch (err) {
      console.error("Error in QR login process:", err);
      return { error: err.message || "Failed to initiate QR login" };
    }
  } catch (err) {
    console.error("Error in QR login process:", err);
    return { error: err.message || "Failed to initiate QR login" };
  }
}

// Function to process QR code login
export async function processQrCodeLogin(supabase, userId, token) {
  try {
    console.log("Processing QR code login for user:", userId, "token:", token);
    
    // Get QR login state from database
    const { data: loginState, error: fetchError } = await supabase
      .from("qr_login_states")
      .select("*")
      .eq("user_id", userId)
      .eq("token", token)
      .single();
    
    if (fetchError) {
      console.error("Error fetching QR login state:", fetchError);
      return { success: false, error: "Failed to fetch login state" };
    }
    
    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(loginState.expires_at);
    
    if (now > expiresAt) {
      console.log("Token expired at:", expiresAt);
      return { success: false, expired: true };
    }
    
    // Get API credentials
    const { data: apiIdData, error: apiIdFetchError } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("service", "telegram_api_id")
      .single();
    
    if (apiIdFetchError) {
      console.error("Error fetching API ID:", apiIdFetchError);
      return { success: false, error: "Failed to retrieve API ID" };
    }
    
    const { data: apiHashData, error: apiHashFetchError } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("service", "telegram_api_hash")
      .single();
    
    if (apiHashFetchError) {
      console.error("Error fetching API Hash:", apiHashFetchError);
      return { success: false, error: "Failed to retrieve API Hash" };
    }
    
    const apiId = apiIdData.api_key;
    const apiHash = apiHashData.api_key;
    
    // Create client with saved session
    console.log("Restoring session from saved state with GRM...");
    
    // Initialize with custom session handler enhanced by GRM
    const session = new CustomStringSession(loginState.session_string);
    
    // Create the client with proper configuration for Deno environment
    const client = new TelegramClient(
      session,
      parseInt(apiId, 10),
      apiHash,
      {
        connectionRetries: 3,
        useWSS: true,
        baseLogger: console,
        deviceModel: "Deno Edge Function",
        systemVersion: "Windows",
        appVersion: "1.0.0",
        langCode: "en",
        systemLangCode: "en",
        initConnectionParams: {
          apiId: parseInt(apiId, 10),
          deviceModel: "Deno Edge Function",
          systemVersion: "Windows",
          appVersion: "1.0.0",
          langCode: "en",
          systemLangCode: "en",
        }
      }
    );
    
    // Apply GRM enhancements to the client
    GramJs.enhanceClient(client);
    
    try {
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error("QR check: Connection timeout after 15 seconds");
        client.disconnect();
      }, 15000);
      
      try {
        console.log("QR check: Connecting to Telegram with GRM...");
        await client.connect();
        clearTimeout(connectionTimeout);
        
        console.log("Connected to Telegram with saved session (GRM enhanced)");
        
        // Check authorization status with GRM's enhanced method if available
        let isAuthorized;
        if (GramJs.checkAuthorization) {
          isAuthorized = await GramJs.checkAuthorization(client);
        } else {
          isAuthorized = await client.isUserAuthorized();
        }
        
        console.log("User authorization status:", isAuthorized);
        
        if (isAuthorized) {
          console.log("User is authorized");
          
          // Get user information
          const me = await client.getMe();
          console.log("Got user info:", me);
          
          const phoneNumber = me.phone ? me.phone : null;
          
          // Create a session record
          const { data: session, error: sessionError } = await supabase
            .from("telegram_sessions")
            .insert({
              user_id: userId,
              session_string: session.save(),
              phone: phoneNumber || "QR authenticated",
              is_active: true
            })
            .select()
            .single();
          
          if (sessionError) {
            console.error("Error creating session record:", sessionError);
            return { success: false, error: "Failed to create session record" };
          }
          
          // Clean up QR login state
          await supabase
            .from("qr_login_states")
            .delete()
            .eq("id", loginState.id);
          
          return { 
            success: true, 
            sessionId: session.id,
            phone: phoneNumber || "QR authenticated"
          };
        } else {
          console.log("User is not authorized yet");
          return { success: false, expired: false };
        }
      } catch (err) {
        clearTimeout(connectionTimeout);
        console.error("Error checking authorization status:", err);
        return { success: false, error: "Failed to check authorization status: " + (err.message || "Unknown error") };
      }
    } catch (err) {
      console.error("Error processing QR login:", err);
      return { success: false, error: err.message || "Error processing QR login" };
    }
  } catch (err) {
    console.error("Error processing QR login:", err);
    return { success: false, error: err.message || "Error processing QR login" };
  }
}
