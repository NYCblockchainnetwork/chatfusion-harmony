
import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import QRCode from 'react-qr-code';
import { Loader2, RefreshCw } from 'lucide-react';
import { telegramClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface TelegramQRLoginProps {
  onSuccess: (sessionId: string) => void;
  onCancel: () => void;
}

const TelegramQRLogin: React.FC<TelegramQRLoginProps> = ({ onSuccess, onCancel }) => {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginToken, setLoginToken] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  
  // Generate new QR code
  const generateQRCode = async () => {
    if (!user?.id) {
      setError("User authentication required");
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Generating QR code for Telegram login");
      
      // Clear any existing polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      
      // Get QR login token
      const response = await telegramClient.getQRLoginToken(user.id);
      
      if (!response.success || !response.token || !response.url) {
        throw new Error("Failed to generate QR code");
      }
      
      setQrUrl(response.url);
      setLoginToken(response.token);
      
      console.log("QR code generated successfully");
      
      // Start polling for login status
      startPolling(response.token);
      
    } catch (error) {
      console.error("Error generating QR code:", error);
      setError(error.message || "Failed to generate QR code");
      toast({
        title: "Error",
        description: error.message || "Failed to generate QR code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Start polling for login status
  const startPolling = (token: string) => {
    console.log("Starting polling for QR login status");
    
    // Poll every 3 seconds to check login status
    pollingRef.current = setInterval(async () => {
      try {
        if (!user?.id) return;
        
        const status = await telegramClient.checkQRLoginStatus(user.id, token);
        
        console.log("QR login status:", status);
        
        if (status.success && status.sessionId) {
          // Login successful
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          
          console.log("QR login successful, session ID:", status.sessionId);
          
          onSuccess(status.sessionId);
          
          toast({
            title: "Authentication Successful",
            description: "Your Telegram account has been connected",
          });
        } else if (status.expired) {
          // QR code expired
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          
          console.log("QR code expired, generating new one");
          
          setError("QR code expired. Please try again.");
          setQrUrl(null);
          setLoginToken(null);
          
          toast({
            title: "QR Code Expired",
            description: "Please generate a new QR code",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error checking QR login status:", error);
      }
    }, 3000);
  };
  
  // Initialize QR code generation on mount
  useEffect(() => {
    generateQRCode();
    
    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [user?.id]);
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Scan QR Code with Telegram</CardTitle>
        <CardDescription>
          Open Telegram on your phone, go to Settings → Devices → Link Desktop Device,
          then scan this QR code
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md border border-red-200 w-full mb-2">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="w-full aspect-square flex items-center justify-center">
            <Loader2 className="w-16 h-16 animate-spin text-blue-500" />
          </div>
        ) : qrUrl ? (
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <QRCode 
              value={qrUrl} 
              size={256}
              level="H"
              className="rounded-md"
            />
          </div>
        ) : (
          <div className="w-full aspect-square flex items-center justify-center">
            <Button onClick={generateQRCode} variant="outline" className="w-40 h-40 flex flex-col gap-2">
              <RefreshCw className="w-10 h-10" />
              <span>Generate QR</span>
            </Button>
          </div>
        )}
        
        {qrUrl && (
          <p className="text-sm text-center text-gray-500 max-w-xs">
            This QR code will expire after 1 minute.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          variant="outline" 
          onClick={generateQRCode} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh QR
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TelegramQRLogin;
