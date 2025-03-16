
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
  
  // Basic validation checks before calling edge function
  if (!/^\d+$/.test(apiId)) {
    toast({
      title: "Validation Error",
      description: "API ID must be a number",
      variant: "destructive"
    });
    return { valid: false, message: "API ID must be a number" };
  }
  
  if (apiHash.length < 10) {
    toast({
      title: "Validation Error",
      description: "API Hash appears to be invalid",
      variant: "destructive"
    });
    return { valid: false, message: "API Hash appears to be invalid" };
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
      toast({
        title: "Service Error",
        description: error.message,
        variant: "destructive"
      });
      return { valid: false, message: `Service error: ${error.message}` };
    }
    
    if (!data || !data.valid) {
      console.error("Invalid credentials response:", data);
      toast({
        title: "Validation Failed",
        description: data?.error || "Invalid credentials",
        variant: "destructive"
      });
      return { valid: false, message: data?.error || "Invalid credentials" };
    }
    
    // Save to localStorage for quick access
    if (userId) {
      localStorage.setItem(`telegram_api_id_${userId}`, apiId);
      localStorage.setItem(`telegram_api_hash_${userId}`, apiHash);
    }
    
    toast({
      title: "Validation Successful",
      description: data.message || "Credentials validated successfully"
    });
    
    return { 
      valid: true, 
      message: data.message || "Credentials validated successfully" 
    };
  } catch (error) {
    console.error("Error validating Telegram credentials:", error);
    toast({
      title: "Validation Error",
      description: error.message || "Failed to validate credentials",
      variant: "destructive"
    });
    return { 
      valid: false, 
      message: error.message || "Failed to validate credentials" 
    };
  }
}
