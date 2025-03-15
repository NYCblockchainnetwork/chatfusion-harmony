import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useUserSettings } from '@/hooks/use-user-settings';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

const TelegramAuthSection = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { settings, updateSettings } = useUserSettings();
  const { user } = useAuth();
  
  const form = useForm({
    defaultValues: {
      apiId: '',
      apiHash: '',
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    
    try {
      if (settings?.telegramIntegrationEnabled) {
        setConnectionStatus('connected');
      }
      
      const storedApiId = localStorage.getItem(`telegram_api_id_${user.id}`);
      const storedApiHash = localStorage.getItem(`telegram_api_hash_${user.id}`);
      
      if (storedApiId) form.setValue('apiId', storedApiId);
      if (storedApiHash) form.setValue('apiHash', storedApiHash);
    } catch (error) {
      console.error('Error loading Telegram credentials:', error);
      setErrorMessage("Failed to load saved credentials");
    }
  }, [settings, user, form]);

  const saveApiKeyToLocalStorage = async (service: string, value: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      localStorage.setItem(`${service}_${user.id}`, value);
      console.log(`Saved ${service} to localStorage:`, value);
      return true;
    } catch (error) {
      console.error(`Error saving ${service}:`, error);
      return false;
    }
  };

  const getApiKeyFromLocalStorage = (service: string): string | null => {
    if (!user?.id) return null;
    return localStorage.getItem(`${service}_${user.id}`);
  };
  
  const handleUseEnvSecrets = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to connect to Telegram",
        variant: "destructive"
      });
      return;
    }
    
    setIsConnecting(true);
    setErrorMessage(null);
    
    try {
      console.log("Fetching Telegram credentials from Supabase Edge Function");
      
      // Call Supabase Edge Function to get secure credentials
      const { data, error } = await supabase.functions.invoke('get-telegram-credentials', {
        body: { userId: user.id }
      });
      
      if (error) {
        throw new Error(`Failed to get credentials: ${error.message}`);
      }
      
      if (!data || !data.apiId || !data.apiHash) {
        throw new Error("Could not retrieve valid Telegram credentials");
      }
      
      const apiIdResult = await saveApiKeyToLocalStorage('telegram_api_id', data.apiId);
      if (!apiIdResult) {
        throw new Error("Failed to save API ID");
      }
      
      const apiHashResult = await saveApiKeyToLocalStorage('telegram_api_hash', data.apiHash);
      if (!apiHashResult) {
        throw new Error("Failed to save API Hash");
      }
      
      await updateSettings({
        telegramIntegrationEnabled: true,
        telegramHandles: settings?.telegramHandles || []
      });
      
      setConnectionStatus('connected');
      
      toast({
        title: "Success",
        description: "Connected to Telegram using secure credentials. You can now fetch real messages.",
      });
    } catch (error) {
      console.error('Error connecting to Telegram with secure credentials:', error);
      setErrorMessage(error.message || "Failed to use secure credentials");
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to use secure credentials",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleConnect = async (formData) => {
    const { apiId, apiHash } = formData;
    
    if (!apiId || !apiHash) {
      toast({
        title: "Error",
        description: "API ID and API Hash are required",
        variant: "destructive"
      });
      return;
    }
    
    if (!user?.id) {
      toast({
        title: "Error", 
        description: "You must be logged in to connect to Telegram",
        variant: "destructive"
      });
      return;
    }
    
    setIsConnecting(true);
    setErrorMessage(null);
    
    try {
      const apiIdSaved = await saveApiKeyToLocalStorage('telegram_api_id', apiId);
      if (!apiIdSaved) {
        throw new Error("Failed to save API ID");
      }
      
      const apiHashSaved = await saveApiKeyToLocalStorage('telegram_api_hash', apiHash);
      if (!apiHashSaved) {
        throw new Error("Failed to save API Hash");
      }
      
      await updateSettings({
        telegramIntegrationEnabled: true,
        telegramHandles: settings?.telegramHandles || []
      });
      
      setConnectionStatus('connected');
      
      toast({
        title: "Success",
        description: "Connected to Telegram successfully",
      });
    } catch (error) {
      console.error('Error connecting to Telegram:', error);
      setErrorMessage(error.message || "Failed to save API credentials");
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to save API credentials",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleDisconnect = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }
    
    try {
      localStorage.removeItem(`telegram_api_id_${user.id}`);
      localStorage.removeItem(`telegram_api_hash_${user.id}`);
      
      await updateSettings({
        telegramIntegrationEnabled: false,
      });
      
      setConnectionStatus('disconnected');
      setErrorMessage(null);
      form.reset();
      
      toast({
        title: "Disconnected",
        description: "Telegram account has been disconnected",
      });
    } catch (error) {
      console.error('Error disconnecting from Telegram:', error);
      setErrorMessage("Failed to disconnect from Telegram");
      toast({
        title: "Error",
        description: "Failed to disconnect from Telegram",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Telegram Integration</CardTitle>
        <CardDescription>
          Connect your Telegram account to receive and process messages
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        {connectionStatus === 'connected' ? (
          <div className="space-y-4">
            <div className="bg-green-50 p-3 rounded-md border border-green-200">
              <p className="text-green-700 font-medium">Connected to Telegram</p>
              <p className="text-sm text-green-600">Your Telegram account is successfully connected</p>
            </div>
            <Button variant="destructive" onClick={handleDisconnect}>
              Disconnect Telegram
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
              <p className="text-amber-700 font-medium">Use Secure Credentials</p>
              <p className="text-sm text-amber-600 mb-3">
                Connect using securely stored Telegram API credentials.
              </p>
              <Button 
                type="button"
                variant="outline"
                className="bg-white text-amber-700 border-amber-300 hover:bg-amber-100"
                onClick={handleUseEnvSecrets}
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Use Secure Credentials"}
              </Button>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-4">Or enter your own credentials:</p>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleConnect)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="apiId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your Telegram API ID" {...field} />
                        </FormControl>
                        <FormDescription>
                          Get this from my.telegram.org
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="apiHash"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Hash</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your Telegram API Hash" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit"
                    disabled={isConnecting}
                  >
                    {isConnecting ? "Connecting..." : "Connect Telegram"}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TelegramAuthSection;
