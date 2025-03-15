
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initializedTelegramClient } from '@/utils/initTelegramClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import QRCode from 'react-qr-code';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import LoadingState from './LoadingState';

interface TelegramQRLoginProps {
  onSuccess: (sessionId: string) => void;
  onError?: (error: Error) => void;
}

const TelegramQRLogin: React.FC<TelegramQRLoginProps> = ({ onSuccess, onError }) => {
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusCheckCount, setStatusCheckCount] = useState(0);
  const { user } = useAuth();

  // Generate QR code on component mount
  useEffect(() => {
    generateQrCode();
  }, []);

  // Check status every 3 seconds if we have a token
  useEffect(() => {
    if (!token || statusCheckCount >= 30) return; // limit to 30 checks (90 seconds)

    const intervalId = setInterval(() => {
      checkQrCodeStatus();
      setStatusCheckCount(prev => prev + 1);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [token, statusCheckCount]);

  const generateQrCode = async () => {
    if (!user?.id) {
      setErrorMessage("User authentication required");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setStatusCheckCount(0);

    try {
      console.log("Generating QR code for user:", user.id);
      
      const result = await initializedTelegramClient.getQRLoginToken(user.id);
      
      console.log("QR token result:", result);
      
      if (!result || !result.token || !result.link) {
        throw new Error("Failed to generate QR code token");
      }
      
      setQrLink(result.link);
      setToken(result.token);
      
      console.log("QR code generated successfully");
    } catch (error) {
      console.error("Error generating QR code:", error);
      setErrorMessage(error.message || "Failed to generate QR code");
      if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      
      toast({
        title: "QR Code Generation Failed",
        description: error.message || "Failed to generate QR code",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const checkQrCodeStatus = async () => {
    if (!user?.id || !token) return;
    
    try {
      console.log("Checking QR code status for token:", token);
      
      const result = await initializedTelegramClient.checkQRLoginStatus(user.id, token);
      
      console.log("QR status check result:", result);
      
      if (result.status === "confirmed") {
        console.log("QR code login confirmed with sessionId:", result.sessionId);
        onSuccess(result.sessionId);
        
        toast({
          title: "Telegram Connected",
          description: "Successfully connected via QR code",
        });
      }
    } catch (error) {
      console.error("Error checking QR code status:", error);
      
      // Only show error toast on first error
      if (statusCheckCount === 0) {
        toast({
          title: "Status Check Failed",
          description: error.message || "Failed to check QR code status",
          variant: "destructive"
        });
      }
    }
  };

  const handleRefresh = () => {
    generateQrCode();
  };

  if (isGenerating) {
    return <LoadingState message="Generating QR code..." />;
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-4">
          Scan this QR code with your Telegram mobile app to connect your account
        </p>
        
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        {qrLink ? (
          <Card className="p-4 bg-white mx-auto max-w-[220px]">
            <div className="flex justify-center items-center">
              <QRCode value={qrLink} size={200} />
            </div>
          </Card>
        ) : (
          <div className="h-[200px] flex items-center justify-center border rounded">
            <p className="text-gray-400">QR code unavailable</p>
          </div>
        )}
      </div>
      
      <div className="text-center text-sm text-gray-500">
        <p>Open Telegram on your phone</p>
        <p>Go to Settings → Devices → Link Desktop Device</p>
        <p>Scan this QR code with your camera</p>
      </div>
      
      <div className="flex justify-center">
        <Button onClick={handleRefresh} className="flex items-center gap-2" disabled={isGenerating}>
          <RefreshCw size={16} />
          Refresh QR Code
        </Button>
      </div>
    </div>
  );
};

export default TelegramQRLogin;
