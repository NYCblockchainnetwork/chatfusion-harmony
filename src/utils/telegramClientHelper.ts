
import { telegramClient } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";

export function extendTelegramClient(client: any) {
  console.log("Extending telegramClient with QR login methods");
  
  // Add method to validate Telegram API credentials
  client.validateCredentials = async (apiId: string, apiHash: string) => {
    console.log("Validating Telegram credentials:", apiId, apiHash ? "***hash provided***" : "no hash provided");
    
    try {
      // Call the telegram-auth function with the validate-credentials method
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { 
          method: "validate-credentials",
          apiId,
          apiHash
        }
      });
      
      if (error) {
        console.error("Error calling telegram-auth function:", error);
        throw new Error(`Failed to validate credentials: ${error.message}`);
      }
      
      console.log("Validation response:", data);
      
      if (!data || data.error) {
        console.error("Error response from telegram-auth function:", data);
        throw new Error(data?.error || "Failed to validate credentials");
      }
      
      return {
        valid: data.valid,
        message: data.message || "Credentials valid"
      };
    } catch (error) {
      console.error("Error in validateCredentials:", error);
      throw error;
    }
  };
  
  // Add QR login methods
  client.getQRLoginToken = async (userId: string) => {
    console.log("Getting QR login token for user:", userId);
    
    try {
      // Get auth headers
      const headers = await client.getAuthHeaders();
      
      // Call the telegram-auth function with the get-qr-token method
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { 
          method: "get-qr-token",
          userId 
        },
        headers
      });
      
      if (error) {
        console.error("Error calling telegram-auth function:", error);
        throw new Error(`Failed to get QR login token: ${error.message}`);
      }
      
      if (!data || data.error) {
        console.error("Error response from telegram-auth function:", data);
        throw new Error(data?.error || "Failed to get QR login token");
      }
      
      console.log("Successfully got QR login token:", data);
      return {
        token: data.token,
        qrUrl: data.qrUrl,
        expiresAt: data.expiresAt
      };
    } catch (error) {
      console.error("Error in getQRLoginToken:", error);
      throw error;
    }
  };
  
  client.checkQRLoginStatus = async (userId: string, token: string) => {
    console.log("Checking QR login status for user:", userId, "token:", token);
    
    try {
      // Get auth headers
      const headers = await client.getAuthHeaders();
      
      // Call the telegram-auth function with the check-qr-status method
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { 
          method: "check-qr-status",
          userId,
          token
        },
        headers
      });
      
      if (error) {
        console.error("Error calling telegram-auth function:", error);
        throw new Error(`Failed to check QR login status: ${error.message}`);
      }
      
      if (!data) {
        console.error("Empty response from telegram-auth function");
        throw new Error("Failed to check QR login status");
      }
      
      if (data.error) {
        console.error("Error response from telegram-auth function:", data);
        throw new Error(data.error);
      }
      
      console.log("QR login status:", data);
      return {
        success: data.success,
        expired: data.expired || false,
        sessionId: data.sessionId
      };
    } catch (error) {
      console.error("Error in checkQRLoginStatus:", error);
      throw error;
    }
  };
  
  return client;
}
