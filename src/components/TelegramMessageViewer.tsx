
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { fetchMessagesFromHandles, TelegramMessage } from '@/utils/telegramMessages';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useAuth } from '@/contexts/AuthContext';

// Import our new components
import HandleInput from './telegram/HandleInput';
import HandleList from './telegram/HandleList';
import MessageDisplay from './telegram/MessageDisplay';
import ErrorDisplay from './telegram/ErrorDisplay';

const TelegramMessageViewer = () => {
  const [handles, setHandles] = useState<string[]>([]);
  const [messages, setMessages] = useState<Record<string, TelegramMessage[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings, updateSettings } = useUserSettings();
  const { user } = useAuth();
  
  useEffect(() => {
    if (settings?.telegramHandles && settings.telegramHandles.length > 0) {
      console.log("Loaded saved handles from settings:", settings.telegramHandles);
      setHandles(settings.telegramHandles);
    }
  }, [settings]);
  
  const addHandle = async (handle: string) => {
    if (handles.includes(handle)) {
      toast({
        title: "Already added",
        description: `${handle} is already in your list`,
      });
      return;
    }
    
    console.log(`Adding handle: @${handle}`);
    const newHandles = [...handles, handle];
    setHandles(newHandles);
    
    try {
      await updateSettings({
        telegramHandles: newHandles
      });
      
      console.log(`Handle @${handle} saved to settings`);
      toast({
        title: "Handle saved",
        description: `@${handle} has been saved to your handles list`,
      });
    } catch (error) {
      console.error("Error saving handle:", error);
      toast({
        title: "Error",
        description: "Failed to save handle to database",
        variant: "destructive"
      });
    }
  };
  
  const removeHandle = async (handle: string) => {
    console.log(`Removing handle: @${handle}`);
    const newHandles = handles.filter(h => h !== handle);
    setHandles(newHandles);
    
    const newMessages = { ...messages };
    delete newMessages[handle];
    setMessages(newMessages);
    
    try {
      await updateSettings({
        telegramHandles: newHandles
      });
      console.log(`Handle @${handle} removed from settings`);
    } catch (error) {
      console.error("Error removing handle:", error);
      toast({
        title: "Error",
        description: "Failed to remove handle from database",
        variant: "destructive"
      });
    }
  };
  
  const fetchMessages = async () => {
    if (handles.length === 0) {
      toast({
        title: "No handles",
        description: "Please add at least one Telegram handle",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      console.error("No user found in auth context");
      toast({
        title: "Authentication Required",
        description: "You must be signed in to fetch messages",
        variant: "destructive"
      });
      return;
    }
    
    console.log("Current user from auth context:", { id: user.id, name: user.name });
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Starting to fetch real Telegram messages for handles:", handles);
      console.log("Using user ID for fetching:", user.id);
      
      const fetchedMessages = await fetchMessagesFromHandles(handles, 5, user.id);
      
      const handleErrors = Object.entries(fetchedMessages)
        .filter(([_, msgs]) => msgs.length === 1 && msgs[0].id === 0 && msgs[0].text.startsWith('Error'))
        .map(([handle, msgs]) => `@${handle}: ${msgs[0].text.replace('Error fetching messages for @' + handle + ': ', '')}`);
      
      if (handleErrors.length > 0) {
        setError(`Issues fetching messages for some handles: ${handleErrors.join('; ')}`);
      }
      
      setMessages(fetchedMessages);
      
      const successCount = Object.keys(fetchedMessages).length - handleErrors.length;
      if (successCount > 0) {
        toast({
          title: "Success",
          description: `Fetched real messages from ${successCount} Telegram handles`,
        });
      }
    } catch (error) {
      console.error("Error fetching Telegram messages:", error);
      setError(error.message || "Failed to fetch Telegram messages");
      toast({
        title: "Error",
        description: error.message || "Failed to fetch Telegram messages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Telegram Message Viewer</CardTitle>
        <CardDescription>
          Enter Telegram handles to fetch and display recent messages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <HandleInput onAddHandle={addHandle} />
          <HandleList 
            handles={handles} 
            onRemoveHandle={removeHandle} 
            onFetchMessages={fetchMessages}
            isLoading={isLoading}
          />
          <ErrorDisplay error={error} />
          <MessageDisplay messages={messages} />
        </div>
      </CardContent>
    </Card>
  );
};

export default TelegramMessageViewer;
