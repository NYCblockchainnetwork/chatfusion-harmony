
import { StringSession } from "https://esm.sh/telegram@2.26.22/sessions";
import { TelegramClient } from "https://esm.sh/telegram@2.26.22";
import QRCode from "https://esm.sh/qrcode@1.5.3";

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
    
    // Initialize Telegram client
    console.log("Initializing Telegram client with API ID:", apiId);
    const stringSession = new StringSession("");
    const client = new TelegramClient(
      stringSession, 
      parseInt(apiId, 10), 
      apiHash, 
      {
        connectionRetries: 3,
        useWSS: true,
        timeout: 10000,
        baseLogger: console
      }
    );
    
    // Use proper async connection
    await client.start({
      phoneNumber: async () => "",
      password: async () => "",
      onError: (err) => console.error("Connection error:", err),
      phoneCode: async () => "",
    });
    
    console.log("Connected to Telegram");
    
    // Generate QR login data
    const { token, expires } = await client.qrLogin({ 
      qrCode: true,
      onError: (errorMessage) => {
        console.error("QR login error:", errorMessage);
        return { qrError: errorMessage };
      }
    });
    
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
        session_string: stringSession.save()
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
    const stringSession = new StringSession(loginState.session_string);
    const client = new TelegramClient(
      stringSession, 
      parseInt(apiId, 10), 
      apiHash, 
      {
        connectionRetries: 3,
        useWSS: true,
        timeout: 10000,
        baseLogger: console
      }
    );
    
    // Use proper async connection
    await client.start({
      phoneNumber: async () => "",
      password: async () => "",
      onError: (err) => console.error("Connection error:", err),
      phoneCode: async () => "",
    });
    
    console.log("Connected to Telegram with saved session");
    
    // Check authorization status
    if (await client.isUserAuthorized()) {
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
          session_string: stringSession.save(),
          phone: phoneNumber,
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
        phone: phoneNumber
      };
    } else {
      console.log("User is not authorized yet");
      return { success: false, expired: false };
    }
  } catch (err) {
    console.error("Error processing QR login:", err);
    return { success: false, error: err.message || "Error processing QR login" };
  }
}
