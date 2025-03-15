
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { telegramClient } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UseTelegramVerificationProps {
  onSuccess: (sessionId: string, phone: string) => void;
}

export function useTelegramVerification({ onSuccess }: UseTelegramVerificationProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedCredentials, setHasLoadedCredentials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setError("You must be logged in to connect to Telegram");
      return;
    }
    
    const loadCredentials = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("Fetching Telegram API credentials from edge function");
        console.log("User authenticated:", isAuthenticated, "User ID:", user.id);
        
        // Attempt to get credentials
        const credentials = await telegramClient.getApiCredentials(user.id);
        
        // Store credentials in localStorage for client-side use
        localStorage.setItem(`telegram_api_id_${user.id}`, credentials.apiId);
        localStorage.setItem(`telegram_api_hash_${user.id}`, credentials.apiHash);
        
        console.log("Successfully loaded Telegram API credentials");
        setHasLoadedCredentials(true);
      } catch (error) {
        console.error("Error loading Telegram credentials:", error);
        let errorMessage = "Failed to load Telegram credentials.";
        
        // Check for specific authentication errors
        if (error.message && (
            error.message.includes("No active session") || 
            error.message.includes("Authentication error") ||
            error.message.includes("Invalid authentication token") ||
            error.message.includes("auth"))) {
          errorMessage = "Authentication failed. Please log in again and try once more.";
        }
        
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user?.id && isAuthenticated) {
      loadCredentials();
    }
  }, [user?.id, isAuthenticated]);
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value.charAt(0) !== '+') {
      value = '+' + value;
    }
    
    value = '+' + value.substring(1).replace(/\D/g, '');
    
    setPhone(value);
  };
  
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCode(value);
  };
  
  const validatePhone = () => {
    if (!phone || phone.length < 7) {
      setError("Please enter a valid phone number");
      return false;
    }
    
    if (!phone.startsWith('+')) {
      setError("Phone number must start with a + sign");
      return false;
    }
    
    return true;
  };
  
  const validateCode = () => {
    if (!code || code.length < 3) {
      setError("Please enter the verification code");
      return false;
    }
    
    return true;
  };

  const sendVerificationCode = async () => {
    if (!validatePhone()) return;
    if (!isAuthenticated || !user?.id) {
      setError("User authentication required");
      toast({
        title: "Authentication Required",
        description: "Please log in to use this feature",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Sending verification code to ${phone} for user ${user.id}`);
      
      const result = await telegramClient.sendCode(phone, user.id);
      
      console.log("Response from send-code:", result);
      
      if (!result || !result.success || !result.phoneCodeHash) {
        console.error("Invalid response from edge function:", result);
        throw new Error("Failed to get verification code hash");
      }
      
      setPhoneCodeHash(result.phoneCodeHash);
      
      setStep("code");
      
      toast({
        title: "Code Sent",
        description: "Verification code has been sent to your phone",
      });
    } catch (error) {
      console.error("Error sending verification code:", error);
      
      setError(`Error: ${error.message}`);
      
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const verifyCode = async () => {
    if (!validateCode()) return;
    if (!phoneCodeHash) {
      setError("Session expired. Please request a new code.");
      return;
    }
    if (!isAuthenticated || !user?.id) {
      setError("User authentication required");
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Verifying code for ${phone}, user ${user.id}`);
      
      const result = await telegramClient.verifyCode(phone, code, phoneCodeHash, user.id);
      
      console.log("Response from verify-code:", result);
      
      if (!result || !result.success || !result.sessionId) {
        console.error("Invalid response from edge function:", result);
        throw new Error("Failed to create Telegram session");
      }
      
      onSuccess(result.sessionId, phone);
      
      toast({
        title: "Authentication Successful",
        description: "Your Telegram account has been connected",
      });
    } catch (error) {
      console.error("Error verifying code:", error);
      
      setError(`Error: ${error.message}`);
      
      if (error.message.includes("PHONE_CODE_INVALID")) {
        setError("Invalid verification code. Please check and try again.");
      } else if (error.message.includes("PHONE_CODE_EXPIRED")) {
        setError("Verification code has expired. Please request a new code.");
        setStep("phone");
      } else if (error.message.includes("SESSION_PASSWORD_NEEDED")) {
        setError("This account requires a password (2FA). Please use another account or disable 2FA in Telegram.");
      }
      
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const goBackToPhone = () => {
    setStep("phone");
    setCode("");
    setPhoneCodeHash("");
    setError(null);
  };
  
  return {
    phone,
    code,
    step,
    isLoading,
    hasLoadedCredentials,
    error,
    handlePhoneChange,
    handleCodeChange,
    sendVerificationCode,
    verifyCode,
    goBackToPhone
  };
}
