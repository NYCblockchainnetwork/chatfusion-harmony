
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import ErrorDisplay from "./ErrorDisplay";
import PhoneNumberInput from "./PhoneNumberInput";
import VerificationCodeInput from "./VerificationCodeInput";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import { useTelegramVerification } from "@/hooks/useTelegramVerification";

interface TelegramPhoneVerificationProps {
  onSuccess: (sessionId: string, phone: string) => void;
  onCancel: () => void;
}

const TelegramPhoneVerification: React.FC<TelegramPhoneVerificationProps> = ({ 
  onSuccess,
  onCancel
}) => {
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
  
  if (isLoading && !hasLoadedCredentials) {
    return <LoadingState />;
  }
  
  if (error && !hasLoadedCredentials) {
    return <ErrorState error={error} onCancel={onCancel} />;
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
