
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import PhoneNumberInput from './PhoneNumberInput';
import VerificationCodeInput from './VerificationCodeInput';
import ErrorDisplay from './ErrorDisplay';
import { useTelegramVerification } from '@/hooks/useTelegramVerification';
import TelegramQRLogin from './TelegramQRLogin';

interface TelegramPhoneVerificationProps {
  onSuccess: (sessionId: string, phone?: string) => void;
  onCancel: () => void;
}

const TelegramPhoneVerification: React.FC<TelegramPhoneVerificationProps> = ({
  onSuccess,
  onCancel
}) => {
  const [tabValue, setTabValue] = useState<string>("qr");
  
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

  // Set debug console log for mounting
  useEffect(() => {
    console.log("TelegramPhoneVerification mounted, default tab:", tabValue);
  }, []);

  const handleTabChange = (value: string) => {
    console.log("Tab changed to:", value);
    setTabValue(value);
  };

  const handleQRLoginSuccess = (sessionId: string) => {
    console.log("QR login successful, sessionId:", sessionId);
    onSuccess(sessionId);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Connect to Telegram</h3>
      
      <Tabs defaultValue="qr" onValueChange={handleTabChange} value={tabValue}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qr">QR Code Login</TabsTrigger>
          <TabsTrigger value="phone">Phone Login</TabsTrigger>
        </TabsList>
        
        <TabsContent value="qr" className="space-y-4">
          <TelegramQRLogin onSuccess={handleQRLoginSuccess} onError={(err) => console.error("QR Login error:", err)} />
        </TabsContent>
        
        <TabsContent value="phone" className="space-y-4">
          {step === "phone" ? (
            <div className="space-y-4">
              <PhoneNumberInput 
                value={phone} 
                onChange={handlePhoneChange} 
                disabled={isLoading}
              />
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button 
                  onClick={sendVerificationCode} 
                  disabled={isLoading || !hasLoadedCredentials}
                >
                  {isLoading ? "Sending..." : "Send Code"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <VerificationCodeInput 
                value={code} 
                onChange={handleCodeChange} 
                disabled={isLoading}
              />
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={goBackToPhone}>
                  Back
                </Button>
                <Button 
                  onClick={verifyCode} 
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify Code"}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <ErrorDisplay error={error} />
    </div>
  );
};

export default TelegramPhoneVerification;
