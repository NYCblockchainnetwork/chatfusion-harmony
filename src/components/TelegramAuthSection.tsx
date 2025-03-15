
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
      useEnvSecrets: false
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
          
          // Try to get saved API credentials - we still need to populate the form
          // in case the user wants to update them
          const apiId = await getApiKey('telegram_api_id');
          const apiHash = await getApiKey('telegram_api_hash');
          
          // Simplify this logic: if we get back non-null values, use them
          if (apiId) form.setValue('apiId', apiId);
          if (apiHash) form.setValue('apiHash', apiHash);
          
          return;
        }
        
        // Not yet connected, check if we have pre-saved credentials
        const apiId = await getApiKey('telegram_api_id');
        const apiHash = await getApiKey('telegram_api_hash');
        
        console.log("Retrieved credentials:", {
          apiId: apiId ? "exists" : "missing",
          apiHash: apiHash ? "exists" : "missing"
        });
        
        // If we have credentials, pre-fill the form
        if (apiId) form.setValue('apiId', apiId);
        if (apiHash) form.setValue('apiHash', apiHash);
        
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
    const { apiId, apiHash, useEnvSecrets } = formData;
    
    // Check if we're using environment secrets or user-provided values
    const useSecrets = useEnvSecrets || 
                      apiId === import.meta.env.VITE_TELEGRAM_API_ID || 
                      apiHash === import.meta.env.VITE_TELEGRAM_API_HASH;
    
    if ((!apiId || !apiHash) && !useSecrets) {
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
      
      // Use our new simplified approach
      // If using environment secrets, send a special value that the Edge Function recognizes
      const finalApiId = useSecrets ? 'USE_ENV_SECRET' : apiId;
      const finalApiHash = useSecrets ? 'USE_ENV_SECRET' : apiHash;
      
      // Save API ID first
      console.log("Saving API ID...");
      const apiIdSaved = await saveApiKey('telegram_api_id', finalApiId);
      
      if (!apiIdSaved) {
        throw new Error("Failed to save API ID");
      }
      
      // Then save API Hash
      console.log("Saving API Hash...");
      const apiHashSaved = await saveApiKey('telegram_api_hash', finalApiHash);
      
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
              <div className="bg-amber-50 p-3 rounded-md border border-amber-200 mb-4">
                <p className="text-amber-700 font-medium">Use Preconfigured Credentials</p>
                <p className="text-sm text-amber-600 mb-2">
                  This app has preconfigured Telegram API credentials you can use.
                </p>
                <Button 
                  type="button"
                  variant="outline"
                  className="bg-white text-amber-700 border-amber-300 hover:bg-amber-100"
                  onClick={() => {
                    form.setValue('useEnvSecrets', true);
                    form.handleSubmit(handleConnect)();
                  }}
                >
                  Use Preconfigured Credentials
                </Button>
              </div>
              
              <p className="text-sm text-gray-500 mb-2">Or enter your own credentials:</p>
              
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
