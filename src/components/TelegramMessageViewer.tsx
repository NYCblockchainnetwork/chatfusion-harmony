
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import HandleInput from './telegram/HandleInput';
import HandleList from './telegram/HandleList';
import MessageDisplay from './telegram/MessageDisplay';
import TelegramPhoneVerification from './telegram/TelegramPhoneVerification';
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings } from "@/hooks/use-user-settings";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from './ui/button';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const TelegramMessageViewer = () => {
  const [handles, setHandles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Record<string, any>>({});
  const [isMockMode, setIsMockMode] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const { user } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  
  // Load existing handles from settings
  useEffect(() => {
    if (settings?.telegramHandles && settings.telegramHandles.length > 0) {
      setHandles(settings.telegramHandles);
    }
    
    // Check if we need to show the credentials form
    if (user?.id) {
      const storedApiId = localStorage.getItem(`telegram_api_id_${user.id}`);
      const storedApiHash = localStorage.getItem(`telegram_api_hash_${user.id}`);
      
      if (!storedApiId || !storedApiHash) {
        setShowCredentialsForm(true);
      }
    }
  }, [settings, user]);

  const handleAddHandle = (handle: string) => {
    if (handles.includes(handle)) {
      toast({
        title: "Handle already added",
        description: `@${handle} is already in your list`,
        variant: "default"
      });
      return;
    }
    
    const newHandles = [...handles, handle];
    setHandles(newHandles);
    
    // Save to user settings
    if (settings) {
      updateSettings({
        ...settings,
        telegramHandles: newHandles
      });
    }
    
    toast({
      title: "Handle Added",
      description: `@${handle} was added to your list`,
    });
  };
  
  const handleRemoveHandle = (handle: string) => {
    const newHandles = handles.filter(h => h !== handle);
    setHandles(newHandles);
    
    // Save to user settings
    if (settings) {
      updateSettings({
        ...settings,
        telegramHandles: newHandles
      });
    }
    
    toast({
      title: "Handle Removed",
      description: `@${handle} was removed from your list`,
    });
  };
  
  const saveCredentials = () => {
    if (!apiId || !apiHash) {
      toast({
        title: "Missing credentials",
        description: "Both API ID and API Hash are required",
        variant: "destructive"
      });
      return;
    }
    
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to save credentials",
        variant: "destructive"
      });
      return;
    }
    
    // Save credentials to localStorage
    localStorage.setItem(`telegram_api_id_${user.id}`, apiId);
    localStorage.setItem(`telegram_api_hash_${user.id}`, apiHash);
    
    toast({
      title: "Credentials Saved",
      description: "Your Telegram API credentials have been saved",
    });
    
    setShowCredentialsForm(false);
    setNeedsAuth(true);
  };
  
  const fetchMessages = async (sessionString?: string) => {
    if (handles.length === 0) {
      toast({
        title: "No Handles",
        description: "Please add at least one Telegram handle first",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setNeedsAuth(false);
    
    try {
      if (!user?.id) {
        toast({
          title: "Authentication Required", 
          description: "Please log in to fetch Telegram messages",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      console.log("Fetching Telegram messages via Edge Function");
      
      // Get stored API credentials from localStorage
      const apiId = localStorage.getItem(`telegram_api_id_${user.id}`);
      const apiHash = localStorage.getItem(`telegram_api_hash_${user.id}`);
      
      // Use provided session string or get from localStorage
      const sessionStringToUse = sessionString || localStorage.getItem(`telegram_session_${user.id}`);
      
      if (!apiId || !apiHash) {
        toast({
          title: "API Credentials Missing",
          description: "Please set up Telegram integration first",
          variant: "destructive"
        });
        setShowCredentialsForm(true);
        setIsLoading(false);
        return;
      }
      
      // Call the Supabase Edge Function to fetch Telegram messages
      const { data, error } = await supabase.functions.invoke('fetch-telegram-messages', {
        body: {
          handles,
          limit: 5,
          apiId: apiId ? parseInt(apiId, 10) : undefined,
          apiHash,
          sessionString: sessionStringToUse
        }
      });
      
      if (error) {
        throw new Error(error.message || "Failed to fetch messages from Telegram");
      }
      
      if (data.error) {
        // Check if we need authentication
        if (data.needsAuth) {
          console.log("Authentication required for Telegram");
          setNeedsAuth(true);
          throw new Error("Telegram authentication required");
        }
        throw new Error(data.error);
      }
      
      console.log("Response from Edge Function:", data);
      
      // Check if we're in mock mode
      if (data.mode === "mock") {
        setIsMockMode(true);
        console.log("Using mock Telegram data");
      } else {
        setIsMockMode(false);
        console.log("Using live Telegram data");
      }
      
      // Save the new session string if provided
      if (data.sessionString && user.id) {
        localStorage.setItem(`telegram_session_${user.id}`, data.sessionString);
        console.log("Updated session string saved to localStorage");
      }
      
      setMessages(data.messages);
      
      toast({
        title: "Messages Fetched",
        description: isMockMode 
          ? `Retrieved mock messages from ${Object.keys(data.messages).length} handles` 
          : `Retrieved live messages from ${Object.keys(data.messages).length} handles`,
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      
      // Only show toast if it's not due to auth requirement
      if (!needsAuth) {
        toast({
          title: "Error",
          description: error.message || "Failed to fetch messages",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle successful phone verification
  const handleVerificationSuccess = (sessionString: string) => {
    setNeedsAuth(false);
    // Fetch messages with the new session string
    fetchMessages(sessionString);
  };
  
  // Cancel verification
  const handleVerificationCancel = () => {
    setNeedsAuth(false);
  };
  
  const handleUseSecureCredentials = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to use secure credentials",
        variant: "destructive"
      });
      return;
    }
    
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
      
      // Save the credentials to localStorage
      localStorage.setItem(`telegram_api_id_${user.id}`, data.apiId);
      localStorage.setItem(`telegram_api_hash_${user.id}`, data.apiHash);
      
      toast({
        title: "Secure Credentials Loaded",
        description: "Telegram API credentials have been securely loaded",
      });
      
      // Now we need authentication
      setShowCredentialsForm(false);
      setNeedsAuth(true);
      
    } catch (error) {
      console.error('Error loading secure credentials:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load secure credentials",
        variant: "destructive"
      });
    }
  };

  // Render the credentials form
  const renderCredentialsForm = () => {
    return (
      <div className="space-y-6">
        <Alert variant="info" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Telegram API Credentials Required</AlertTitle>
          <AlertDescription>
            To use the Telegram integration, you need to provide your API credentials from my.telegram.org
          </AlertDescription>
        </Alert>
        
        <div className="bg-amber-50 p-4 rounded-md border border-amber-200 mb-4">
          <p className="text-amber-700 font-medium">Use Secure Credentials</p>
          <p className="text-sm text-amber-600 mb-3">
            Connect using securely stored Telegram API credentials.
          </p>
          <Button 
            type="button"
            variant="outline"
            className="bg-white text-amber-700 border-amber-300 hover:bg-amber-100"
            onClick={handleUseSecureCredentials}
          >
            Use Secure Credentials
          </Button>
        </div>
        
        <p className="text-sm text-gray-500 mb-4">Or enter your own credentials:</p>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="apiId" className="block text-sm font-medium text-gray-700 mb-1">
              API ID
            </label>
            <input
              id="apiId"
              type="text"
              className="px-3 py-2 border border-gray-300 rounded-md w-full"
              placeholder="Enter your Telegram API ID"
              value={apiId}
              onChange={(e) => setApiId(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Get this from my.telegram.org
            </p>
          </div>
          
          <div>
            <label htmlFor="apiHash" className="block text-sm font-medium text-gray-700 mb-1">
              API Hash
            </label>
            <input
              id="apiHash"
              type="password"
              className="px-3 py-2 border border-gray-300 rounded-md w-full"
              placeholder="Enter your Telegram API Hash"
              value={apiHash}
              onChange={(e) => setApiHash(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={saveCredentials}
            className="w-full"
          >
            Save Credentials
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Telegram Messages
          {isMockMode && (
            <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              Mock Data
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {showCredentialsForm ? (
          renderCredentialsForm()
        ) : needsAuth ? (
          <TelegramPhoneVerification
            onSuccess={handleVerificationSuccess}
            onCancel={handleVerificationCancel}
          />
        ) : (
          <>
            {isMockMode && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                <p className="text-sm text-amber-800">
                  Using mock Telegram data. The Telegram API client may have encountered an error or the credentials may be invalid.
                  Check the console logs for more details.
                </p>
              </div>
            )}
            
            <HandleInput onAddHandle={handleAddHandle} />
            
            <HandleList 
              handles={handles} 
              onRemoveHandle={handleRemoveHandle} 
              onFetchMessages={() => fetchMessages()} 
              isLoading={isLoading}
            />
            
            <MessageDisplay messages={messages} isMockMode={isMockMode} />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TelegramMessageViewer;
