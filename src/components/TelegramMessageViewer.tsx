
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { MessageCircle, Search, User } from "lucide-react";
import { fetchMessagesFromHandles, TelegramMessage } from '@/utils/telegramMessages';
import { useUserSettings } from '@/hooks/use-user-settings';

const TelegramMessageViewer = () => {
  const [handleInput, setHandleInput] = useState('');
  const [handles, setHandles] = useState<string[]>([]);
  const [messages, setMessages] = useState<Record<string, TelegramMessage[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { settings, updateSettings } = useUserSettings();
  
  // Load saved handles when component mounts
  useEffect(() => {
    if (settings?.telegramHandles && settings.telegramHandles.length > 0) {
      setHandles(settings.telegramHandles);
    }
  }, [settings]);
  
  const addHandle = async () => {
    if (!handleInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Telegram handle",
        variant: "destructive"
      });
      return;
    }
    
    // Clean handle - remove @ if present
    const cleanHandle = handleInput.trim().startsWith('@') 
      ? handleInput.trim().substring(1) 
      : handleInput.trim();
    
    // Check if handle already exists
    if (handles.includes(cleanHandle)) {
      toast({
        title: "Already added",
        description: `${cleanHandle} is already in your list`,
      });
      setHandleInput('');
      return;
    }
    
    const newHandles = [...handles, cleanHandle];
    setHandles(newHandles);
    setHandleInput('');
    
    // Save handles to database via userSettings
    try {
      await updateSettings({
        telegramHandles: newHandles
      });
      
      toast({
        title: "Handle saved",
        description: `@${cleanHandle} has been saved to your handles list`,
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
    const newHandles = handles.filter(h => h !== handle);
    setHandles(newHandles);
    
    // Also remove messages for this handle
    const newMessages = { ...messages };
    delete newMessages[handle];
    setMessages(newMessages);
    
    // Update handles in database
    try {
      await updateSettings({
        telegramHandles: newHandles
      });
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
    
    setIsLoading(true);
    try {
      const fetchedMessages = await fetchMessagesFromHandles(handles);
      setMessages(fetchedMessages);
      toast({
        title: "Success",
        description: `Fetched messages from ${Object.keys(fetchedMessages).length} handles`,
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
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
          <div className="space-y-2">
            <Label htmlFor="handle-input">Add Telegram Handle</Label>
            <div className="flex gap-2">
              <Input 
                id="handle-input" 
                placeholder="Enter a Telegram handle (e.g. @username)" 
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addHandle()}
              />
              <Button onClick={addHandle}>Add</Button>
            </div>
          </div>
          
          {handles.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Handles</Label>
              <div className="flex flex-wrap gap-2">
                {handles.map((handle) => (
                  <div 
                    key={handle}
                    className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-full"
                  >
                    <User className="h-4 w-4" />
                    <span>@{handle}</span>
                    <button
                      className="ml-1 text-secondary-foreground/70 hover:text-secondary-foreground"
                      onClick={() => removeHandle(handle)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              <Button 
                className="mt-2"
                onClick={fetchMessages}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Fetch Messages"}
                <Search className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
          
          {Object.keys(messages).length > 0 && (
            <div className="space-y-4 mt-6">
              <h3 className="text-lg font-medium">Recent Messages</h3>
              
              {Object.entries(messages).map(([handle, handleMessages]) => (
                <div key={handle} className="border rounded-lg p-4">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <User className="h-4 w-4" />
                    @{handle}
                  </h4>
                  
                  <div className="space-y-3">
                    {handleMessages.map((message) => (
                      <div key={message.id} className="bg-muted p-3 rounded-md">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <MessageCircle className="h-4 w-4" />
                          <span>{formatDate(message.timestamp)}</span>
                        </div>
                        <Textarea 
                          value={message.text}
                          readOnly
                          className="mt-1 resize-none"
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TelegramMessageViewer;
