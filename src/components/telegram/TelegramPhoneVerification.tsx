
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import PhoneNumberInput from './PhoneNumberInput';
import VerificationCodeInput from './VerificationCodeInput';
import ErrorDisplay from './ErrorDisplay';
import { useTelegramVerification } from '@/hooks/useTelegramVerification';
import TelegramQRLogin from './TelegramQRLogin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { validateTelegramCredentials } from '@/utils/telegramCredentialValidator';
import LoadingState from './LoadingState';
import { useAuth } from '@/contexts/AuthContext';

interface TelegramPhoneVerificationProps {
  onSuccess: (sessionId: string, phone?: string) => void;
  onCancel: () => void;
}

const TelegramPhoneVerification: React.FC<TelegramPhoneVerificationProps> = ({
  onSuccess,
  onCancel
}) => {
  const [tabValue, setTabValue] = useState<string>("qr");
  const [credentialsValid, setCredentialsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState<string>("");
  const [isValidating, setIsValidating] = useState(true);
  const { user } = useAuth();
  
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

  // Validate credentials on mount
  useEffect(() => {
    if (!user?.id) return;
    
    const checkCredentials = async () => {
      try {
        setIsValidating(true);
        setCredentialsValid(null);
        
        // Get credentials from localStorage first for speed
        const apiId = localStorage.getItem(`telegram_api_id_${user.id}`);
        const apiHash = localStorage.getItem(`telegram_api_hash_${user.id}`);
        
        if (!apiId || !apiHash) {
          setCredentialsValid(false);
          setValidationMessage("API credentials not found. Please set them in Settings first.");
          return;
        }
        
        // Validate the credentials
        const result = await validateTelegramCredentials(apiId, apiHash, user.id);
        setCredentialsValid(result.valid);
        setValidationMessage(result.message);
      } catch (error) {
        console.error("Error validating credentials:", error);
        setCredentialsValid(false);
        setValidationMessage("Failed to validate credentials. Please check Settings.");
      } finally {
        setIsValidating(false);
      }
    };
    
    checkCredentials();
  }, [user?.id]);

  const handleTabChange = (value: string) => {
    console.log("Tab changed to:", value);
    setTabValue(value);
  };

  const handleQRLoginSuccess = (sessionId: string) => {
    console.log("QR login successful, sessionId:", sessionId);
    onSuccess(sessionId);
  };
  
  // Show loading state while validating credentials
  if (isValidating) {
    return <LoadingState title="Checking Telegram Credentials" description="Validating your API credentials..." />;
  }
  
  // If credentials are invalid, show error and redirect to settings
  if (credentialsValid === false) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Telegram Credentials Invalid</CardTitle>
          <CardDescription>
            Your Telegram API credentials are missing or invalid
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation Failed</AlertTitle>
            <AlertDescription>{validationMessage}</AlertDescription>
          </Alert>
          
          <p className="text-sm text-gray-700">
            Please go to Settings and configure your Telegram API credentials:
          </p>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                window.location.href = '/settings';
              }}
            >
              Go to Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Connect to Telegram</h3>
      
      {credentialsValid && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-700">Credentials Validated</AlertTitle>
          <AlertDescription className="text-green-600">
            {validationMessage}
          </AlertDescription>
        </Alert>
      )}
      
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
                phone={phone} 
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
                code={code}
                phone={phone}
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
