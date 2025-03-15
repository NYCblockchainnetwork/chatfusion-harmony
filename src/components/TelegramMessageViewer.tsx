import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { MessageCircle, Search, User, AlertCircle } from "lucide-react";
import { fetchMessagesFromHandles, TelegramMessage } from '@/utils/telegramMessages';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const TelegramMessageViewer = () => {
  const [handleInput, setHandleInput] = useState('');
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
  
  const addHandle = async () => {
    if (!handleInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Telegram handle",
        variant: "destructive"
      });
      return;
    }
    
    const cleanHandle = handleInput.trim().startsWith('@') 
      ? handleInput.trim().substring(1) 
      : handleInput.trim();
    
    if (handles.includes(cleanHandle)) {
      toast({
        title: "Already added",
        description: `${cleanHandle} is already in your list`,
      });
      setHandleInput('');
      return;
    }
    
    console.log(`Adding handle: @${cleanHandle}`);
    const newHandles = [...handles, cleanHandle];
    setHandles(newHandles);
    setHandleInput('');
    
    try {
      await updateSettings({
        telegramHandles: newHandles
      });
      
      console.log(`Handle @${cleanHandle} saved to settings`);
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
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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
                  
                  {handleMessages.length === 1 && handleMessages[0].id === 0 && handleMessages[0].text.startsWith('Error') && (
                    <Alert variant="destructive" className="mb-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{handleMessages[0].text}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-3">
                    {handleMessages
                      .filter(msg => !(msg.id === 0 && msg.text.startsWith('Error')))
                      .map((message) => (
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
                      ))
                    }
                    
                    {handleMessages.filter(msg => !(msg.id === 0 && msg.text.startsWith('Error'))).length === 0 && (
                      <p className="text-sm text-muted-foreground">No messages available</p>
                    )}
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
