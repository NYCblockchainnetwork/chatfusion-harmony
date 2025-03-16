
import { TelegramClient, StringSession, QRCode, log, logError } from "./deps.ts";

// Function to handle QR login initialization
export async function handleQrLogin(supabase, userId) {
  try {
    log("Starting QR login process for user:", userId);
    
    // Get API credentials from user_api_keys table
    const { data: apiIdData, error: apiIdError } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("service", "telegram_api_id")
      .single();
    
    if (apiIdError) {
      logError("Error fetching API ID:", apiIdError);
      return { error: "Failed to retrieve API ID" };
    }
    
    const { data: apiHashData, error: apiHashError } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("service", "telegram_api_hash")
      .single();
    
    if (apiHashError) {
      logError("Error fetching API Hash:", apiHashError);
      return { error: "Failed to retrieve API Hash" };
    }
    
    const apiId = apiIdData.api_key;
    const apiHash = apiHashData.api_key;
    
    // Initialize Telegram client
    log("Initializing Telegram client with API ID:", apiId);
    
    // Create session
    const session = new StringSession("");
    log("QR login: Session created with type:", session.constructor.name);

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
        systemVersion: "Deno",
        appVersion: "1.0.0",
        langCode: "en"
      }
    );
    
    try {
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        logError("QR login: Connection timeout after 15 seconds", {});
        client.disconnect();
      }, 15000);
      
      try {
        log("QR login: Connecting to Telegram...");
        await client.connect();
        clearTimeout(connectionTimeout);
        
        log("QR login: Connected to Telegram");
        
        // Generate QR login data
        log("Generating QR login token...");
        const qrLoginResult = await client.qrLogin({
          qrCode: true,
          onError: (err) => {
            logError("QR login error:", err);
          }
        });
        
        if (!qrLoginResult || !qrLoginResult.token) {
          throw new Error("Failed to generate QR login token");
        }
        
        const token = qrLoginResult.token;
        const expires = qrLoginResult.expires || 300; // Default 5 minutes if not specified
        
        log("QR login token generated:", !!token);
        log("QR login token expires in:", expires, "seconds");
        
        // Generate QR code URL
        const qrUrl = await QRCode.toDataURL(token.url);
        log("Generated QR code URL");
        
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
          logError("Error storing QR login state:", insertError);
          return { error: "Failed to store QR login state" };
        }
        
        return {
          token: token.token,
          qrUrl,
          expiresAt
        };
      } catch (err) {
        clearTimeout(connectionTimeout);
        logError("Error in QR login client initialization:", err);
        return { error: "Failed to initialize Telegram client: " + (err.message || "Unknown error") };
      }
    } catch (err) {
      logError("Error in QR login process:", err);
      return { error: err.message || "Failed to initiate QR login" };
    }
  } catch (err) {
    logError("Error in QR login process:", err);
    return { error: err.message || "Failed to initiate QR login" };
  }
}

// Function to process QR code login
export async function processQrCodeLogin(supabase, userId, token) {
  try {
    log("Processing QR code login for user:", userId, "token:", token);
    
    // Get QR login state from database
    const { data: loginState, error: fetchError } = await supabase
      .from("qr_login_states")
      .select("*")
      .eq("user_id", userId)
      .eq("token", token)
      .single();
    
    if (fetchError) {
      logError("Error fetching QR login state:", fetchError);
      return { success: false, error: "Failed to fetch login state" };
    }
    
    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(loginState.expires_at);
    
    if (now > expiresAt) {
      log("Token expired at:", expiresAt);
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
      logError("Error fetching API ID:", apiIdFetchError);
      return { success: false, error: "Failed to retrieve API ID" };
    }
    
    const { data: apiHashData, error: apiHashFetchError } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("service", "telegram_api_hash")
      .single();
    
    if (apiHashFetchError) {
      logError("Error fetching API Hash:", apiHashFetchError);
      return { success: false, error: "Failed to retrieve API Hash" };
    }
    
    const apiId = apiIdData.api_key;
    const apiHash = apiHashData.api_key;
    
    // Create client with saved session
    log("Restoring session from saved state...");
    
    // Initialize with StringSession from GRM
    const session = new StringSession(loginState.session_string);
    
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
        systemVersion: "Deno",
        appVersion: "1.0.0",
        langCode: "en"
      }
    );
    
    try {
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        logError("QR check: Connection timeout after 15 seconds", {});
        client.disconnect();
      }, 15000);
      
      try {
        log("QR check: Connecting to Telegram...");
        await client.connect();
        clearTimeout(connectionTimeout);
        
        log("Connected to Telegram with saved session");
        
        // Check authorization status
        const isAuthorized = await client.isUserAuthorized();
        log("User authorization status:", isAuthorized);
        
        if (isAuthorized) {
          log("User is authorized");
          
          // Get user information
          const me = await client.getMe();
          log("Got user info:", me);
          
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
            logError("Error creating session record:", sessionError);
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
          log("User is not authorized yet");
          return { success: false, expired: false };
        }
      } catch (err) {
        clearTimeout(connectionTimeout);
        logError("Error checking authorization status:", err);
        return { success: false, error: "Failed to check authorization status: " + (err.message || "Unknown error") };
      }
    } catch (err) {
      logError("Error processing QR login:", err);
      return { success: false, error: err.message || "Error processing QR login" };
    }
  } catch (err) {
    logError("Error processing QR login:", err);
    return { success: false, error: err.message || "Error processing QR login" };
  }
}
