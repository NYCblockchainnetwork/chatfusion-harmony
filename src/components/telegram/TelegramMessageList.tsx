
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useTelegram } from '@/contexts/TelegramContext';
import TelegramErrorFallback from './TelegramErrorFallback';

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

const TelegramMessageList: React.FC = () => {
  const { messages, error, refreshMessages } = useTelegram();

  if (error) {
    return <TelegramErrorFallback error={error} />;
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Recent Messages</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshMessages}
          className="h-8 px-2"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages found.</p>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className="p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium">
                    {message.from.firstName} {message.from.lastName}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(message.date)}
                  </span>
                </div>
                <p className="text-sm">{message.text}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TelegramMessageList;
