
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

const TelegramMessageViewer = () => {
  const [handles, setHandles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Record<string, any>>({});
  const [isMockMode, setIsMockMode] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const { user } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  
  // Load existing handles from settings
  useEffect(() => {
    if (settings?.telegramHandles && settings.telegramHandles.length > 0) {
      setHandles(settings.telegramHandles);
    }
  }, [settings]);

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
          description: "Please set up Telegram integration in Settings first",
          variant: "destructive"
        });
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
          sessionString: sessionStringToUse,
          phone: user.phone // If we have user's phone in the auth context
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
        {needsAuth ? (
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
