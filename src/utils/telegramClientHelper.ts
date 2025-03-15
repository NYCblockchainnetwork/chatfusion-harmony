
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// These methods can be used to extend the telegramClient object 
export const getQRLoginToken = async (userId: string) => {
  try {
    console.log("Getting QR login token for user", userId);
    const response = await supabase.functions.invoke('telegram-auth', {
      body: { 
        method: 'get-qr-token',
        userId 
      }
    });
    
    console.log("QR token response:", response);
    
    if (response.error) {
      throw new Error(response.error.message || "Failed to get QR login token");
    }
    
    if (!response.data || !response.data.token || !response.data.qrUrl) {
      console.error("Invalid response from QR token endpoint:", response.data);
      throw new Error("Invalid response from QR login endpoint");
    }
    
    return {
      token: response.data.token,
      qrUrl: response.data.qrUrl,
      expiresAt: response.data.expiresAt
    };
  } catch (error) {
    console.error("Error getting QR login token:", error);
    toast({
      title: "Error",
      description: error.message || "Failed to get QR login token",
      variant: "destructive" 
    });
    throw error;
  }
};

export const checkQRLoginStatus = async (userId: string, token: string) => {
  try {
    console.log("Checking QR login status for user", userId);
    const response = await supabase.functions.invoke('telegram-auth', {
      body: { 
        method: 'check-qr-status',
        userId,
        token
      }
    });
    
    console.log("QR status response:", response);
    
    if (response.error) {
      throw new Error(response.error.message || "Failed to check QR login status");
    }
    
    return {
      success: response.data?.success || false,
      expired: response.data?.expired || false,
      sessionId: response.data?.sessionId || null
    };
  } catch (error) {
    console.error("Error checking QR login status:", error);
    throw error;
  }
};

// Apply the helper functions to the telegramClient object
export const extendTelegramClient = (client: any) => {
  if (!client.getQRLoginToken) {
    client.getQRLoginToken = getQRLoginToken;
  }
  
  if (!client.checkQRLoginStatus) {
    client.checkQRLoginStatus = checkQRLoginStatus;
  }
  
  return client;
};
