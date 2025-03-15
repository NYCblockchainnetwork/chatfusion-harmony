
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initializedTelegramClient } from '@/utils/initTelegramClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import QRCode from 'react-qr-code';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Check } from 'lucide-react';
import LoadingState from './LoadingState';

interface TelegramQRLoginProps {
  onSuccess: (sessionId: string) => void;
  onError?: (error: Error) => void;
}

const TelegramQRLogin: React.FC<TelegramQRLoginProps> = ({ onSuccess, onError }) => {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(30);
  const checkIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const { user } = useAuth();

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) window.clearInterval(checkIntervalRef.current);
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Generate QR code on component mount
  useEffect(() => {
    generateQrCode();
  }, []);

  // Set up timer to show remaining time for QR code
  useEffect(() => {
    if (!expiresAt) return;
    
    const updateRemainingTime = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const timeLeft = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));
      
      setRemainingTime(timeLeft);
      
      if (timeLeft <= 0) {
        console.log("QR code expired, refreshing...");
        if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
        generateQrCode();
      }
    };
    
    // Update immediately
    updateRemainingTime();
    
    // Then update every second
    if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = window.setInterval(updateRemainingTime, 1000);
    
    return () => {
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    };
  }, [expiresAt]);

  // Set up status check interval
  useEffect(() => {
    if (!token || isChecking || !isPending) return;
    
    const checkStatus = () => {
      if (!isPending) return;
      checkQrCodeStatus();
    };
    
    // Start checking status every 3 seconds
    if (checkIntervalRef.current) window.clearInterval(checkIntervalRef.current);
    checkIntervalRef.current = window.setInterval(checkStatus, 3000);
    
    return () => {
      if (checkIntervalRef.current) window.clearInterval(checkIntervalRef.current);
    };
  }, [token, isChecking, isPending]);

  const generateQrCode = async () => {
    if (!user?.id) {
      setErrorMessage("User authentication required");
      return;
    }

    // Clear existing timer and interval
    if (checkIntervalRef.current) window.clearInterval(checkIntervalRef.current);
    if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    
    setIsGenerating(true);
    setErrorMessage(null);
    setIsPending(false);

    try {
      console.log("Generating QR code for user:", user.id);
      
      // Get QR login token
      const result = await initializedTelegramClient.getQRLoginToken(user.id);
      
      console.log("QR token result:", result);
      
      if (!result || !result.token || !result.qrUrl) {
        throw new Error("Failed to generate QR code token");
      }
      
      // Set the QR code URL, token and expiry
      setQrUrl(result.qrUrl);
      setToken(result.token);
      setExpiresAt(new Date(result.expiresAt));
      setIsPending(true);
      
      console.log("QR code generated successfully:", result.qrUrl);
      console.log("QR code expires at:", result.expiresAt);
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

  const checkQrCodeStatus = useCallback(async () => {
    if (!user?.id || !token || !isPending) return;
    
    // Prevent multiple simultaneous checks
    if (isChecking) return;
    setIsChecking(true);
    
    try {
      console.log("Checking QR code status for token:", token);
      
      // Check the status of the QR login
      const result = await initializedTelegramClient.checkQRLoginStatus(user.id, token);
      
      console.log("QR status check result:", result);
      
      // If login was successful
      if (result.success) {
        console.log("QR code login confirmed with sessionId:", result.sessionId);
        
        // Stop checking status and clear timers
        setIsPending(false);
        if (checkIntervalRef.current) window.clearInterval(checkIntervalRef.current);
        if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
        
        onSuccess(result.sessionId);
        
        toast({
          title: "Telegram Connected",
          description: "Successfully connected via QR code",
        });
      } else if (result.expired) {
        // If the token has expired
        console.log("QR code expired, refreshing...");
        setErrorMessage("QR code has expired. Refreshing...");
        generateQrCode();
      }
    } catch (error) {
      console.error("Error checking QR code status:", error);
      
      // Only show error toast for critical errors
      if (error.message.includes("auth") || error.message.includes("login") || error.message.includes("session")) {
        setErrorMessage(`Authentication error: ${error.message}`);
        setIsPending(false);
        
        toast({
          title: "Authentication Error",
          description: error.message || "Failed to check QR code status",
          variant: "destructive"
        });
      }
    } finally {
      setIsChecking(false);
    }
  }, [user?.id, token, isPending, isChecking, onSuccess]);

  const handleRefresh = () => {
    generateQrCode();
  };

  if (isGenerating) {
    return <LoadingState 
      title="Generating QR Code" 
      description="Please wait while we generate a secure QR code..." 
    />;
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
        
        {qrUrl ? (
          <>
            <Card className="p-4 bg-white mx-auto max-w-[220px] relative">
              <div className="flex justify-center items-center">
                <QRCode value={qrUrl} size={200} />
              </div>
              
              {remainingTime <= 10 && (
                <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {remainingTime}s
                </div>
              )}
            </Card>
            
            <div className="mt-2 text-sm text-gray-500">
              {remainingTime > 0 ? (
                <p>Expires in {remainingTime} seconds</p>
              ) : (
                <p>Expired! Generating new code...</p>
              )}
            </div>
            
            {isPending && (
              <div className="mt-2 flex items-center justify-center text-sm text-blue-500">
                <div className="animate-pulse flex gap-2 items-center">
                  <span className="h-2 w-2 rounded-full bg-blue-500 inline-block"></span>
                  <span>Waiting for you to scan the QR code...</span>
                </div>
              </div>
            )}
          </>
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
        <Button 
          onClick={handleRefresh} 
          className="flex items-center gap-2" 
          disabled={isGenerating}
        >
          <RefreshCw size={16} className={isGenerating ? "animate-spin" : ""} />
          Refresh QR Code
        </Button>
      </div>
    </div>
  );
};

export default TelegramQRLogin;
