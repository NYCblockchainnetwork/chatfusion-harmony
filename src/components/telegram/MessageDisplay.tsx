
import React from 'react';
import { MessageCircle, User, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { TelegramMessage } from '@/utils/telegramMessages';

interface MessageDisplayProps {
  messages: Record<string, TelegramMessage[]>;
  isMockMode?: boolean;
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({ messages, isMockMode = false }) => {
  if (!messages || Object.keys(messages).length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed rounded-lg bg-gray-50">
            <MessageCircle className="h-8 w-8 text-gray-400 mb-2" />
            <h3 className="text-base font-medium text-gray-700">No Messages</h3>
            <p className="text-sm text-gray-500 mt-1">
              Add a Telegram handle and click 'Fetch Messages' to load conversations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-lg font-medium">Recent Messages</h3>
      
      {isMockMode && (
        <Alert className="bg-amber-50 border-amber-100 text-amber-800 mb-3">
          <Info className="h-4 w-4 text-amber-500" />
          <AlertDescription>
            These are mock messages. Real-time Telegram API integration is unavailable in this environment.
          </AlertDescription>
        </Alert>
      )}
      
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
  );
};

export default MessageDisplay;
