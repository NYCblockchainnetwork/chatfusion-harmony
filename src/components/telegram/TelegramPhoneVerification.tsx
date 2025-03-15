
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ErrorDisplay from "./ErrorDisplay";
import PhoneNumberInput from "./PhoneNumberInput";
import VerificationCodeInput from "./VerificationCodeInput";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import TelegramQRLogin from "./TelegramQRLogin";
import { useTelegramVerification } from "@/hooks/useTelegramVerification";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface TelegramPhoneVerificationProps {
  onSuccess: (sessionId: string, phone?: string) => void;
  onCancel: () => void;
}

const TelegramPhoneVerification: React.FC<TelegramPhoneVerificationProps> = ({ 
  onSuccess,
  onCancel
}) => {
  const { isAuthenticated, user } = useAuth();
  const [authMethod, setAuthMethod] = useState<"phone" | "qr">("qr"); // Default to QR authentication
  
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to use Telegram integration. Please log in and try again.",
        variant: "destructive"
      });
    }
  }, [isAuthenticated]);
  
  const {
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
  } = useTelegramVerification({ onSuccess });
  
  if (!isAuthenticated || !user) {
    return (
      <ErrorState 
        error="You must be logged in to use Telegram integration. Please log in and try again." 
        onCancel={onCancel} 
      />
    );
  }
  
  if (isLoading && !hasLoadedCredentials) {
    return <LoadingState />;
  }
  
  if (error && !hasLoadedCredentials) {
    return <ErrorState error={error} onCancel={onCancel} />;
  }

  const handleQRSuccess = (sessionId: string) => {
    onSuccess(sessionId);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Connect to Telegram</CardTitle>
        <CardDescription>
          Connect your Telegram account to receive and process messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="qr" onValueChange={(value) => setAuthMethod(value as "phone" | "qr")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr">QR Code</TabsTrigger>
            <TabsTrigger value="phone">Phone Number</TabsTrigger>
          </TabsList>
          
          <TabsContent value="qr" className="mt-4">
            <TelegramQRLogin 
              onSuccess={handleQRSuccess} 
              onCancel={onCancel} 
            />
          </TabsContent>
          
          <TabsContent value="phone" className="mt-4">
            <ErrorDisplay error={error} />
            
            {step === "phone" ? (
              <PhoneNumberInput 
                phone={phone} 
                onChange={handlePhoneChange} 
                disabled={isLoading} 
              />
            ) : (
              <VerificationCodeInput 
                code={code} 
                phone={phone} 
                onChange={handleCodeChange} 
                disabled={isLoading} 
              />
            )}
            
            <div className="flex justify-between mt-4">
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
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TelegramPhoneVerification;
