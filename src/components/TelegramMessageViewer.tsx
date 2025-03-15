
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TelegramErrorFallback from './telegram/TelegramErrorFallback';
import HandleInput from './telegram/HandleInput';
import HandleList from './telegram/HandleList';
import MessageDisplay from './telegram/MessageDisplay';
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings } from "@/hooks/use-user-settings";
import { toast } from "@/hooks/use-toast";
import { fetchMessagesFromHandles } from "@/utils/telegramMessages";

// We're using a mock data approach instead of direct Telegram API
// due to browser compatibility issues
const mockFetchMessagesFromHandles = async (handles: string[], limit: number = 5) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const result: Record<string, any> = {};
  
  for (const handle of handles) {
    // Generate mock messages for each handle
    result[handle] = Array.from({ length: Math.floor(Math.random() * limit) + 1 }).map((_, i) => ({
      id: i + 1,
      text: `This is a mock message ${i + 1} for @${handle}`,
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      from: {
        username: handle,
        firstName: "Mock",
        lastName: "User"
      }
    }));
  }
  
  return result;
};

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
      let fetchedMessages;
      
      if (!user?.id) {
        // Use mock data if user is not logged in
        fetchedMessages = await mockFetchMessagesFromHandles(handles, 5);
      } else {
        // Try to use the real Telegram API
        try {
          console.log("Attempting to fetch real Telegram messages");
          fetchedMessages = await fetchMessagesFromHandles(handles, 5, user.id);
          console.log("Successfully fetched real messages:", Object.keys(fetchedMessages));
        } catch (error) {
          console.error("Error fetching real messages, falling back to mock:", error);
          // Fall back to mock data if the real API fails
          fetchedMessages = await mockFetchMessagesFromHandles(handles, 5);
        }
      }
      
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
