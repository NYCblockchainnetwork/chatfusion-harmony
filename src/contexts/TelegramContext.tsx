
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface TelegramContextType {
  isConnected: boolean;
  error: Error | null;
  messages: any[];
  refreshMessages: () => void;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (context === undefined) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
};

const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  // Mock messages data
  const mockMessages = [
    {
      id: 1,
      text: "Hello, this is a simulated Telegram message",
      from: { firstName: "John", lastName: "Doe" },
      date: new Date().getTime() / 1000 - 3600
    },
    {
      id: 2,
      text: "This is using mock data because the Telegram API requires a Node.js environment",
      from: { firstName: "Jane", lastName: "Smith" },
      date: new Date().getTime() / 1000 - 1800
    },
    {
      id: 3,
      text: "Please check the settings page for more information",
      from: { firstName: "Support", lastName: "Team" },
      date: new Date().getTime() / 1000 - 600
    }
  ];

  useEffect(() => {
    const initializeTelegram = async () => {
      try {
        // Simulate a delay to mimic API connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Telegram mock client initialized");
        
        // Set mock data
        setMessages(mockMessages);
        setIsConnected(true);
      } catch (err) {
        console.error("Failed to initialize Telegram client:", err);
        setError(err instanceof Error ? err : new Error("Unknown Telegram error"));
        setIsConnected(false);
        
        toast({
          title: "Telegram Connection Failed",
          description: "Using mock data instead. See settings for details.",
          variant: "destructive"
        });
      }
    };

    initializeTelegram();
  }, []);

  const refreshMessages = () => {
    // In a real implementation, this would fetch fresh messages
    // For now, just shuffle the mock messages a bit
    setMessages([...mockMessages].reverse());
    toast({
      title: "Messages Refreshed",
      description: "Using simulated data for demonstration",
    });
  };

  return (
    <TelegramContext.Provider 
      value={{ 
        isConnected, 
        error, 
        messages,
        refreshMessages
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
};

export default TelegramProvider;
