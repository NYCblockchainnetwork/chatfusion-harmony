
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useUserSettings } from '@/hooks/use-user-settings';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase, telegramClient } from '@/integrations/supabase/client';
import TelegramPhoneVerification from './telegram/TelegramPhoneVerification';

const TelegramAuthSection = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [telegramSessions, setTelegramSessions] = useState<any[]>([]);
  const { settings, updateSettings } = useUserSettings();
  const { user } = useAuth();
  
  const form = useForm({
    defaultValues: {
      apiId: '',
      apiHash: '',
    },
  });

  // Fetch telegram sessions from database
  const fetchTelegramSessions = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await telegramClient.getSessions(user.id);
      
      if (error) throw error;
      
      setTelegramSessions(data || []);
      
      if (data && data.length > 0) {
        setConnectionStatus('connected');
        
        // Set API credentials in form if they exist in localStorage
        const storedApiId = localStorage.getItem(`telegram_api_id_${user.id}`);
        const storedApiHash = localStorage.getItem(`telegram_api_hash_${user.id}`);
        
        if (storedApiId) form.setValue('apiId', storedApiId);
        if (storedApiHash) form.setValue('apiHash', storedApiHash);
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Error fetching Telegram sessions:', error);
      setErrorMessage("Failed to load saved sessions");
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    
    fetchTelegramSessions();
    
    try {
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
      
      // Show the phone verification UI
      setShowPhoneVerification(true);
      
    } catch (error) {
      console.error('Error connecting to Telegram with secure credentials:', error);
      setErrorMessage(error.message || "Failed to use secure credentials");
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to use secure credentials",
        variant: "destructive"
      });
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
      
      // Show the phone verification UI
      setShowPhoneVerification(true);
      
    } catch (error) {
      console.error('Error connecting to Telegram:', error);
      setErrorMessage(error.message || "Failed to save API credentials");
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to save API credentials",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };
  
  const handleDisconnect = async (sessionId?: string) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (sessionId) {
        // Delete specific session
        const { error } = await telegramClient.deleteSession(sessionId);
        
        if (error) throw error;
        
        toast({
          title: "Session Removed",
          description: "The selected Telegram session has been removed",
        });
      } else {
        // Delete all sessions
        for (const session of telegramSessions) {
          await telegramClient.deleteSession(session.id);
        }
        
        // Clear local storage as well
        localStorage.removeItem(`telegram_api_id_${user.id}`);
        localStorage.removeItem(`telegram_api_hash_${user.id}`);
        
        toast({
          title: "All Sessions Removed",
          description: "All Telegram sessions have been removed",
        });
      }
      
      // Update settings
      await updateSettings({
        telegramIntegrationEnabled: false,
      });
      
      // Refresh session list
      await fetchTelegramSessions();
      
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
  
  const handleVerificationSuccess = (sessionId: string, phone: string) => {
    // Update settings
    updateSettings({
      telegramIntegrationEnabled: true,
      telegramHandles: settings?.telegramHandles || [],
      activeSessionId: sessionId
    });
    
    // Refresh session list
    fetchTelegramSessions();
    
    setShowPhoneVerification(false);
    setIsConnecting(false);
    
    toast({
      title: "Success",
      description: `Connected to Telegram with phone ${phone}. You can now fetch messages.`,
    });
  };
  
  const handleVerificationCancel = () => {
    setShowPhoneVerification(false);
    setIsConnecting(false);
  };
  
  const renderSessionList = () => {
    if (telegramSessions.length === 0) {
      return (
        <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
          <p className="text-amber-700">No sessions found</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {telegramSessions.map(session => (
          <div key={session.id} className="bg-green-50 p-3 rounded-md border border-green-200 flex justify-between items-center">
            <div>
              <p className="text-green-700 font-medium">Phone: {session.phone}</p>
              <p className="text-xs text-green-600">Connected on {new Date(session.created_at).toLocaleString()}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleDisconnect(session.id)}
            >
              Remove
            </Button>
          </div>
        ))}
        
        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={() => setShowPhoneVerification(true)}>
            Add Another Phone
          </Button>
        </div>
      </div>
    );
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
        
        {showPhoneVerification ? (
          <TelegramPhoneVerification
            onSuccess={handleVerificationSuccess}
            onCancel={handleVerificationCancel}
          />
        ) : connectionStatus === 'connected' ? (
          <div className="space-y-4">
            <div className="bg-green-50 p-3 rounded-md border border-green-200">
              <p className="text-green-700 font-medium">Connected to Telegram</p>
              <p className="text-sm text-green-600">Your Telegram account is successfully connected</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Telegram Sessions</h3>
              {renderSessionList()}
            </div>
            
            <Button 
              variant="destructive" 
              onClick={() => handleDisconnect()}
              className="mt-4"
            >
              Disconnect All Sessions
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
