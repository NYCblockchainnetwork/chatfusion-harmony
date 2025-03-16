
import { log, logError, QRCode } from "./deps.ts";

export async function handleQrLogin(supabase: any, userId: string) {
  try {
    log(`Generating QR login token for user ${userId}`);
    
    // Generate a random token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    
    // Store token in database
    const { error } = await supabase
      .from("qr_login_states")
      .insert({
        user_id: userId,
        token,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      });
    
    if (error) {
      logError("Error storing QR token", error);
      throw new Error(`Failed to store QR token: ${error.message}`);
    }
    
    // Generate QR code
    const qrValue = `tg://login?token=${token}`;
    const qrImage = await QRCode.toDataURL(qrValue);
    
    return {
      token,
      qrImage,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    logError("Error in handleQrLogin", error);
    throw error;
  }
}

export async function processQrCodeLogin(supabase: any, userId: string, token: string) {
  try {
    log(`Processing QR login for token ${token}`);
    
    // Check if token exists and is valid
    const { data, error } = await supabase
      .from("qr_login_states")
      .select("*")
      .eq("token", token)
      .eq("user_id", userId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();
    
    if (error || !data) {
      logError("Invalid or expired QR token", error || "Token not found");
      return {
        success: false,
        error: "Invalid or expired QR token"
      };
    }
    
    // For demonstration, we'll just mark the token as complete
    // In a real implementation, this would happen after Telegram confirms the login
    
    const { error: updateError } = await supabase
      .from("qr_login_states")
      .update({ status: "completed" })
      .eq("token", token);
    
    if (updateError) {
      logError("Error updating QR token status", updateError);
      return {
        success: false,
        error: "Failed to update token status"
      };
    }
    
    return {
      success: true,
      status: "completed",
      message: "QR login successful"
    };
  } catch (error) {
    logError("Error in processQrCodeLogin", error);
    return {
      success: false,
      error: error.message || "Failed to process QR login"
    };
  }
}
