
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import HandleInput from './telegram/HandleInput';
import HandleList from './telegram/HandleList';
import MessageDisplay from './telegram/MessageDisplay';
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings } from "@/hooks/use-user-settings";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TelegramMessageViewer = () => {
  const [handles, setHandles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Record<string, any>>({});
  const { user } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  
  // Load existing handles from settings
  React.useEffect(() => {
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
  
  const fetchMessages = async () => {
    if (handles.length === 0) {
      toast({
        title: "No Handles",
        description: "Please add at least one Telegram handle first",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
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
      const sessionString = localStorage.getItem(`telegram_session_${user.id}`);
      
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
          sessionString
        }
      });
      
      if (error) {
        throw new Error(error.message || "Failed to fetch messages from Telegram");
      }
      
      console.log("Successfully fetched messages via Edge Function");
      
      // Save the new session string if provided
      if (data.sessionString && user.id) {
        localStorage.setItem(`telegram_session_${user.id}`, data.sessionString);
      }
      
      setMessages(data.messages);
      
      toast({
        title: "Messages Fetched",
        description: `Retrieved messages from ${Object.keys(data.messages).length} handles`,
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch messages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telegram Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Development Mode</AlertTitle>
          <AlertDescription>
            This integration is currently using simulated data. For real Telegram data, a proper bot token implementation is needed.
          </AlertDescription>
        </Alert>
        
        <HandleInput onAddHandle={handleAddHandle} />
        
        <HandleList 
          handles={handles} 
          onRemoveHandle={handleRemoveHandle} 
          onFetchMessages={fetchMessages} 
          isLoading={isLoading}
        />
        
        <MessageDisplay messages={messages} />
      </CardContent>
    </Card>
  );
};

export default TelegramMessageViewer;
