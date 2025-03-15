import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import QRCode from "react-qr-code";
import { telegramClient } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import ErrorDisplay from "./ErrorDisplay";
import { initializedTelegramClient } from "@/utils/initTelegramClient";

interface TelegramQRLoginProps {
  onSuccess: (sessionId: string) => void;
  onCancel: () => void;
}

const TelegramQRLogin: React.FC<TelegramQRLoginProps> = ({ 
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  
  console.log("TelegramQRLogin rendered");
  
  // Generate a new QR code token
  const generateQRToken = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Generating QR login token...");
      const client = initializedTelegramClient || telegramClient;
      const result = await client.getQRLoginToken(user.id);
      
      if (!result || !result.token) {
        throw new Error("Failed to generate QR login token");
      }
      
      console.log("QR token generated successfully:", result);
      setQrToken(result.token);
      setQrUrl(result.qrUrl);
      setIsPolling(true);
      setPollCount(0);
    } catch (err: any) {
      console.error("Error generating QR login token:", err);
      setError(`Error: ${err.message}`);
      toast({
        title: "Error",
        description: err.message || "Failed to generate QR code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);
  
  // Check QR login status periodically
  useEffect(() => {
    let intervalId: number | null = null;
    
    if (isPolling && qrToken && user?.id) {
      intervalId = window.setInterval(async () => {
        try {
          // Increment poll count for timeout calculation
          setPollCount(count => count + 1);
          
          console.log(`Checking QR login status (attempt ${pollCount + 1})...`);
          const client = initializedTelegramClient || telegramClient;
          const result = await client.checkQRLoginStatus(user.id, qrToken);
          
          console.log("QR login status:", result);
          
          // If QR code is scanned and accepted successfully
          if (result.success && result.sessionId) {
            clearInterval(intervalId!);
            setIsPolling(false);
            
            toast({
              title: "Authentication Successful",
              description: "Your Telegram account has been connected",
            });
            
            onSuccess(result.sessionId);
          }
          
          // If QR code is expired or invalid
          if (result.expired || pollCount > 60) { // 2 minutes timeout (polling every 2 seconds)
            clearInterval(intervalId!);
            setIsPolling(false);
            setError("QR code has expired. Please generate a new one.");
          }
        } catch (err: any) {
          console.error("Error checking QR login status:", err);
          
          // Don't stop polling on error, it might be a temporary issue
          // Just log the error and continue
          console.log(`Polling error: ${err.message}`);
          
          // If we get consistent errors, stop polling after a few attempts
          if (pollCount > 10) {
            clearInterval(intervalId!);
            setIsPolling(false);
            setError(`Error checking QR login status: ${err.message}`);
          }
        }
      }, 2000); // Check every 2 seconds
    }
    
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [isPolling, qrToken, user?.id, pollCount, onSuccess]);
  
  // Generate QR token on component mount
  useEffect(() => {
    console.log("TelegramQRLogin - Calling generateQRToken on mount");
    generateQRToken();
  }, [generateQRToken]);
  
  return (
    <div className="flex flex-col items-center space-y-4">
      <ErrorDisplay error={error} />
      
      {isLoading ? (
        <div className="flex flex-col items-center p-6 space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Generating QR code...</p>
        </div>
      ) : qrUrl ? (
        <Card className="border-2 p-1">
          <CardContent className="p-4">
            <QRCode
              value={qrUrl}
              size={200}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 256 256`}
            />
          </CardContent>
        </Card>
      ) : null}
      
      <div className="text-center space-y-2">
        <h3 className="text-base font-medium">Scan with Telegram App</h3>
        <p className="text-sm text-muted-foreground">
          Open Telegram app → Settings → Devices → Link Desktop Device
        </p>
      </div>
      
      <div className="flex space-x-3 mt-4">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          onClick={generateQRToken} 
          disabled={isLoading}
          variant="secondary"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              New QR Code
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TelegramQRLogin;
