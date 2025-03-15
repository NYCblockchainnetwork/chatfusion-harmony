
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Phone, Key, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, telegramClient } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface TelegramPhoneVerificationProps {
  onSuccess: (sessionId: string, phone: string) => void;
  onCancel: () => void;
}

const TelegramPhoneVerification: React.FC<TelegramPhoneVerificationProps> = ({ 
  onSuccess,
  onCancel
}) => {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedCredentials, setHasLoadedCredentials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Load the API credentials at component mount
  useEffect(() => {
    const loadCredentials = async () => {
      if (!user?.id) return;
      
      try {
        // Try to get secure credentials from the edge function first
        setIsLoading(true);
        setError(null);
        
        console.log("Fetching Telegram API credentials from edge function");
        const { data, error } = await supabase.functions.invoke('get-telegram-credentials', {
          body: { userId: user.id }
        });
        
        if (error) {
          console.error("Error fetching credentials from edge function:", error);
          throw new Error(`Failed to get credentials: ${error.message}`);
        }
        
        if (!data || !data.apiId || !data.apiHash) {
          console.error("Invalid credentials response:", data);
          throw new Error("Could not retrieve valid Telegram credentials");
        }
        
        // Store in localStorage for this session
        localStorage.setItem(`telegram_api_id_${user.id}`, data.apiId);
        localStorage.setItem(`telegram_api_hash_${user.id}`, data.apiHash);
        
        console.log("Successfully loaded Telegram API credentials");
        setHasLoadedCredentials(true);
      } catch (error) {
        console.error("Error loading Telegram credentials:", error);
        setError(`Failed to load Telegram credentials: ${error.message}`);
        toast({
          title: "Error",
          description: "Failed to load Telegram credentials. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCredentials();
  }, [user?.id]);
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove any non-digit characters except for the initial +
    let value = e.target.value;
    if (value.charAt(0) !== '+') {
      value = '+' + value;
    }
    
    // Remove any non-digit characters after the + sign
    value = '+' + value.substring(1).replace(/\D/g, '');
    
    setPhone(value);
  };
  
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
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
    if (!user?.id) {
      setError("User authentication required");
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Sending verification code to ${phone} for user ${user.id}`);
      
      // Use the telegramClient to send the verification code
      const result = await telegramClient.sendCode(phone, user.id);
      
      console.log("Response from send-code:", result);
      
      if (!result || !result.success || !result.phoneCodeHash) {
        console.error("Invalid response from edge function:", result);
        throw new Error("Failed to get verification code hash");
      }
      
      // Store the phoneCodeHash
      setPhoneCodeHash(result.phoneCodeHash);
      
      // Move to the code verification step
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
    if (!user?.id) {
      setError("User authentication required");
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Verifying code for ${phone}, user ${user.id}`);
      
      // Use the telegramClient to verify the code
      const result = await telegramClient.verifyCode(phone, code, phoneCodeHash, user.id);
      
      console.log("Response from verify-code:", result);
      
      if (!result || !result.success || !result.sessionId) {
        console.error("Invalid response from edge function:", result);
        throw new Error("Failed to create Telegram session");
      }
      
      // Notify parent component of successful verification
      onSuccess(result.sessionId, phone);
      
      toast({
        title: "Authentication Successful",
        description: "Your Telegram account has been connected",
      });
    } catch (error) {
      console.error("Error verifying code:", error);
      
      setError(`Error: ${error.message}`);
      
      // Check for specific error messages
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
  
  if (isLoading && !hasLoadedCredentials) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connecting to Telegram</CardTitle>
          <CardDescription>Loading API credentials...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (error && !hasLoadedCredentials) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Telegram Connection Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-800 mb-4">
            Failed to load Telegram API credentials. This may be due to a server configuration issue.
          </p>
          <div className="bg-white p-3 rounded border border-red-200 overflow-auto max-h-32 text-xs text-gray-800 font-mono">
            {error}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect to Telegram</CardTitle>
        <CardDescription>
          {step === "phone" ? 
            "Enter your phone number to receive a verification code" : 
            "Enter the verification code sent to your phone"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {step === "phone" ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Phone Number</span>
            </div>
            <Input
              type="tel"
              placeholder="+1234567890"
              value={phone}
              onChange={handlePhoneChange}
              className="w-full"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Enter your phone number including country code (e.g., +1 for US).
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Verification Code</span>
            </div>
            <Input
              type="text"
              placeholder="12345"
              value={code}
              onChange={handleCodeChange}
              className="w-full"
              disabled={isLoading}
              maxLength={7}
            />
            <p className="text-xs text-muted-foreground">
              Enter the verification code sent to {phone}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {step === "phone" ? (
          <>
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={sendVerificationCode} disabled={isLoading || !phone}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Code"
              )}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={goBackToPhone} disabled={isLoading}>
              Back
            </Button>
            <Button onClick={verifyCode} disabled={isLoading || !code}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default TelegramPhoneVerification;
