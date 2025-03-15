
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TelegramErrorFallback from './telegram/TelegramErrorFallback';
import TelegramMessageList from './telegram/TelegramMessageList';
import HandleInput from './telegram/HandleInput';
import HandleList from './telegram/HandleList';
import MessageDisplay from './telegram/MessageDisplay';
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings } from "@/hooks/use-user-settings";
import { fetchMessagesFromHandles } from "@/utils/telegramMessages";
import { toast } from "@/hooks/use-toast";

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
    
    if (!user?.id) {
      toast({
        title: "Not Logged In",
        description: "Please log in to fetch messages",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Fetch messages for all handles
      const fetchedMessages = await fetchMessagesFromHandles(handles, 5, user.id);
      setMessages(fetchedMessages);
      
      toast({
        title: "Messages Fetched",
        description: `Retrieved messages from ${Object.keys(fetchedMessages).length} handles`,
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
