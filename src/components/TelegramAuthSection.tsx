
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

const TelegramAuthSection = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { settings, updateSettings, saveApiKey, getApiKey } = useUserSettings();
  const { user } = useAuth();
  
  const form = useForm({
    defaultValues: {
      apiId: '',
      apiHash: '',
    },
  });

  // Load existing API credentials on component mount
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        if (!user?.id) {
          console.error("No user ID available for Telegram credentials");
          return;
        }
        
        console.log("Loading Telegram credentials for user:", user.id);
        
        // Check if user has already connected to Telegram
        if (settings?.telegramIntegrationEnabled) {
          setConnectionStatus('connected');
          return;
        }
        
        // Try to get saved API credentials
        const apiId = await getApiKey('telegram_api_id');
        const apiHash = await getApiKey('telegram_api_hash');
        
        console.log("Retrieved credentials:", {
          apiId: apiId ? "exists" : "missing",
          apiHash: apiHash ? "exists" : "missing"
        });
        
        // If we have credentials, pre-fill the form
        if (apiId) {
          form.setValue('apiId', apiId);
        }
        
        if (apiHash) {
          form.setValue('apiHash', apiHash);
        }
      } catch (error) {
        console.error('Error loading Telegram credentials:', error);
        setErrorMessage("Failed to load saved credentials");
      }
    };
    
    if (settings && user?.id) {
      loadCredentials();
    }
  }, [settings, getApiKey, form, user]);
  
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
      console.log("Saving Telegram credentials for user:", user.id);
      
      // When using the pre-configured API credentials from .env, 
      // pass the exact environment variable name to trigger the Edge Function
      // to use the stored secret value
      
      // If user enters the actual placeholders as defined in .env file,
      // we'll use the secret values from Supabase
      const useApiIdSecret = apiId === import.meta.env.VITE_TELEGRAM_API_ID;
      const useApiHashSecret = apiHash === import.meta.env.VITE_TELEGRAM_API_HASH;
      
      // Save API ID first
      console.log("Saving API ID...");
      const apiIdSaved = await saveApiKey(
        'telegram_api_id', 
        useApiIdSecret ? 'telegram_api_id' : apiId
      );
      
      if (!apiIdSaved) {
        throw new Error("Failed to save API ID");
      }
      
      // Then save API Hash
      console.log("Saving API Hash...");
      const apiHashSaved = await saveApiKey(
        'telegram_api_hash', 
        useApiHashSecret ? 'telegram_api_hash' : apiHash
      );
      
      if (!apiHashSaved) {
        throw new Error("Failed to save API Hash");
      }
      
      console.log("API credentials saved successfully");
      
      // If both were saved successfully, update the user settings
      await updateSettings({
        telegramIntegrationEnabled: true,
        telegramHandles: settings?.telegramHandles || []
      });
      
      // Update UI state to show success
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
      // Remove sensitive API credentials via Edge Function
      await saveApiKey('telegram_api_id', '');
      await saveApiKey('telegram_api_hash', '');
      
      // Update user settings
      await updateSettings({
        telegramIntegrationEnabled: false,
      });
      
      setConnectionStatus('disconnected');
      setErrorMessage(null);
      form.reset(); // Clear the form
      
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
              
              <div className="pt-2">
                <Button 
                  type="submit"
                  disabled={isConnecting}
                >
                  {isConnecting ? "Connecting..." : "Connect Telegram"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};

export default TelegramAuthSection;
