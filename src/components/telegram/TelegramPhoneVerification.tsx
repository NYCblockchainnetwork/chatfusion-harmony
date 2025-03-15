
// Note: I don't have access to the current implementation of this file,
// so I'm reimplementing it using our database-backed approach.
// Make sure to adjust it if your component has additional functionality.

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TelegramPhoneVerificationProps {
  onSuccess: (sessionId: string, phone: string) => void;
  onCancel: () => void;
}

const TelegramPhoneVerification: React.FC<TelegramPhoneVerificationProps> = ({ 
  onSuccess, 
  onCancel 
}) => {
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const { user } = useAuth();
  
  // Fetch Telegram API credentials from secure Edge Function
  const fetchApiCredentials = async () => {
    if (!user?.id) {
      throw new Error("You must be logged in to use this feature");
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('get-telegram-credentials', {
        body: {
          userId: user.id
        }
      });
      
      if (error) throw new Error(error.message);
      if (!data || !data.apiId || !data.apiHash) {
        throw new Error("Could not retrieve Telegram API credentials");
      }
      
      // Store temporarily in localStorage
      localStorage.setItem(`telegram_api_id_${user.id}`, data.apiId);
      localStorage.setItem(`telegram_api_hash_${user.id}`, data.apiHash);
      
      return {
        apiId: parseInt(data.apiId, 10),
        apiHash: data.apiHash
      };
    } catch (error) {
      console.error("Error fetching API credentials:", error);
      throw error;
    }
  };
  
  const handleRequestCode = async () => {
    if (!phone) {
      toast({
        title: "Error",
        description: "Phone number is required",
        variant: "destructive"
      });
      return;
    }
    
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to authenticate with Telegram",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get API credentials from Edge Function
      const { apiId, apiHash } = await fetchApiCredentials();
      
      console.log("Sending code to phone:", phone);
      
      // Call the Edge Function to request verification code
      const response = await supabase.functions.invoke('telegram-auth/send-code', {
        body: {
          phone,
          apiId,
          apiHash,
          userId: user.id
        }
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      const data = response.data;
      
      if (!data || !data.success || !data.phoneCodeHash) {
        throw new Error(data?.error?.details || data?.error || "Failed to send verification code");
      }
      
      // Store the phoneCodeHash for verification
      setPhoneCodeHash(data.phoneCodeHash);
      setStage('code');
      
      toast({
        title: "Code Sent",
        description: "Please check your Telegram app for the verification code",
      });
      
    } catch (error) {
      console.error("Error sending code:", error);
      setError(error.message || "Failed to send verification code");
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerifyCode = async () => {
    if (!verificationCode || !phoneCodeHash) {
      toast({
        title: "Error",
        description: "Verification code is required",
        variant: "destructive"
      });
      return;
    }
    
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to authenticate with Telegram",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get API credentials (they should be in localStorage from the previous step)
      const apiId = localStorage.getItem(`telegram_api_id_${user.id}`);
      const apiHash = localStorage.getItem(`telegram_api_hash_${user.id}`);
      
      if (!apiId || !apiHash) {
        throw new Error("Telegram API credentials not found");
      }
      
      console.log("Verifying code for phone:", phone);
      
      // Call the Edge Function to verify the code
      const response = await supabase.functions.invoke('telegram-auth/verify-code', {
        body: {
          phone,
          code: verificationCode,
          phoneCodeHash,
          apiId: parseInt(apiId, 10),
          apiHash,
          userId: user.id
        }
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      const data = response.data;
      
      if (!data || !data.success) {
        throw new Error(data?.error?.details || data?.error || "Failed to verify code");
      }
      
      // Call the onSuccess callback with the session ID and phone
      onSuccess(data.sessionId, phone);
      
      toast({
        title: "Success",
        description: "Telegram authenticated successfully!",
      });
      
    } catch (error) {
      console.error("Error verifying code:", error);
      setError(error.message || "Failed to verify code");
      toast({
        title: "Error",
        description: error.message || "Failed to verify code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderPhoneInput = () => (
    <>
      <CardHeader>
        <CardTitle>Connect Telegram</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Your Telegram Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1234567890"
            disabled={isLoading}
          />
          <p className="text-sm text-muted-foreground">
            Enter the phone number associated with your Telegram account, including the country code.
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleRequestCode} disabled={isLoading || !phone}>
          {isLoading ? "Sending..." : "Send Code"}
        </Button>
      </CardFooter>
    </>
  );
  
  const renderCodeInput = () => (
    <>
      <CardHeader>
        <CardTitle>Enter Verification Code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
          <Input
            id="code"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="12345"
            disabled={isLoading}
            maxLength={5}
          />
          <p className="text-sm text-muted-foreground">
            Enter the verification code sent to your Telegram app.
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="ghost" 
          onClick={() => {
            setStage('phone');
            setVerificationCode('');
            setPhoneCodeHash(null);
            setError(null);
          }} 
          disabled={isLoading}
        >
          Back
        </Button>
        <Button onClick={handleVerifyCode} disabled={isLoading || !verificationCode}>
          {isLoading ? "Verifying..." : "Verify Code"}
        </Button>
      </CardFooter>
    </>
  );
  
  return (
    <Card className="w-full">
      {stage === 'phone' ? renderPhoneInput() : renderCodeInput()}
    </Card>
  );
};

export default TelegramPhoneVerification;
