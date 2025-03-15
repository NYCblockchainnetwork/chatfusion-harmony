
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export async function validateTelegramCredentials(
  apiId: string,
  apiHash: string, 
  userId?: string
): Promise<{ valid: boolean; message: string }> {
  if (!apiId || !apiHash) {
    toast({
      title: "Validation Error",
      description: "API ID and API Hash are required",
      variant: "destructive"
    });
    return { valid: false, message: "API ID and API Hash are required" };
  }
  
  try {
    console.log("Validating Telegram credentials...");
    
    const { data, error } = await supabase.functions.invoke('telegram-auth', {
      body: { 
        method: "validate-credentials",
        apiId,
        apiHash,
        userId
      }
    });
    
    if (error) {
      console.error("Error invoking Telegram auth function:", error);
      return { valid: false, message: `Service error: ${error.message}` };
    }
    
    if (!data.valid) {
      console.error("Invalid credentials response:", data);
      return { valid: false, message: data.error || "Invalid credentials" };
    }
    
    // Save to localStorage for quick access
    if (userId) {
      localStorage.setItem(`telegram_api_id_${userId}`, apiId);
      localStorage.setItem(`telegram_api_hash_${userId}`, apiHash);
    }
    
    return { 
      valid: true, 
      message: data.message || "Credentials validated successfully" 
    };
  } catch (error) {
    console.error("Error validating Telegram credentials:", error);
    return { 
      valid: false, 
      message: error.message || "Failed to validate credentials" 
    };
  }
}
