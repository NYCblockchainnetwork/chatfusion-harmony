
import React from 'react';
import { AlertCircle, MessageCircle, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { TelegramMessage } from '@/utils/telegramMessages';

interface MessageDisplayProps {
  messages: Record<string, TelegramMessage[]>;
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({ messages }) => {
  if (Object.keys(messages).length === 0) {
    return null;
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
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
  );
};

export default MessageDisplay;
