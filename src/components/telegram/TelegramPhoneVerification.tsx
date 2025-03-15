
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { useUserSettings } from "@/hooks/use-user-settings";
import { useAuth } from "@/contexts/AuthContext";
import ErrorDisplay from './ErrorDisplay';

interface TelegramPhoneVerificationProps {
  onSuccess: (sessionString: string) => void;
  onCancel: () => void;
}

const TelegramPhoneVerification: React.FC<TelegramPhoneVerificationProps> = ({ onSuccess, onCancel }) => {
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Handle phone submission to request verification code
  const handleSendCode = async () => {
    if (!phone) {
      setError('Please enter a phone number');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get API credentials from localStorage
      const apiId = user?.id ? localStorage.getItem(`telegram_api_id_${user.id}`) : null;
      const apiHash = user?.id ? localStorage.getItem(`telegram_api_hash_${user.id}`) : null;
      
      if (!apiId || !apiHash) {
        throw new Error('Telegram API credentials not found. Please set them up in Settings first.');
      }
      
      console.log('Sending verification code request to Telegram...');
      
      // Call the Edge Function to send verification code
      const { data, error } = await supabase.functions.invoke('telegram-auth/send-code', {
        body: {
          phone,
          apiId: parseInt(apiId, 10),
          apiHash
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to send verification code');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Store the phone code hash for the next step
      setPhoneCodeHash(data.phoneCodeHash);
      
      // Move to the code verification step
      setStep('code');
      
      toast({
        title: "Verification Code Sent",
        description: "Please check your Telegram for the verification code",
      });
      
    } catch (error) {
      console.error('Error sending verification code:', error);
      setError(error.message || 'Failed to send verification code');
      toast({
        title: "Error",
        description: error.message || 'Failed to send verification code',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle code submission to verify and get session
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get API credentials from localStorage
      const apiId = user?.id ? localStorage.getItem(`telegram_api_id_${user.id}`) : null;
      const apiHash = user?.id ? localStorage.getItem(`telegram_api_hash_${user.id}`) : null;
      
      if (!apiId || !apiHash) {
        throw new Error('Telegram API credentials not found. Please set them up in Settings first.');
      }
      
      console.log('Verifying code with Telegram...');
      
      // Call the Edge Function to verify the code
      const { data, error } = await supabase.functions.invoke('telegram-auth/verify-code', {
        body: {
          phone,
          code: verificationCode,
          phoneCodeHash,
          apiId: parseInt(apiId, 10),
          apiHash
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to verify code');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Store the session string in localStorage
      if (user?.id && data.sessionString) {
        localStorage.setItem(`telegram_session_${user.id}`, data.sessionString);
      }
      
      toast({
        title: "Verification Successful",
        description: "Your Telegram account has been successfully verified",
      });
      
      // Call the success callback
      onSuccess(data.sessionString);
      
    } catch (error) {
      console.error('Error verifying code:', error);
      setError(error.message || 'Failed to verify code');
      toast({
        title: "Error",
        description: error.message || 'Failed to verify code',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telegram Verification</CardTitle>
        <CardDescription>
          {step === 'phone' 
            ? 'Please enter your phone number to receive a verification code on Telegram' 
            : 'Enter the verification code received on Telegram'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && <ErrorDisplay error={error} />}
        
        {step === 'phone' ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (with country code)
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="+15551234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                Include country code (e.g., +1 for US)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code
              </label>
              <Input
                id="code"
                type="text"
                placeholder="Enter code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the code sent to your Telegram account
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        
        {step === 'phone' ? (
          <Button 
            onClick={handleSendCode}
            disabled={!phone || isLoading}
          >
            {isLoading ? "Sending..." : "Send Code"}
          </Button>
        ) : (
          <Button 
            onClick={handleVerifyCode}
            disabled={!verificationCode || isLoading}
          >
            {isLoading ? "Verifying..." : "Verify Code"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default TelegramPhoneVerification;
