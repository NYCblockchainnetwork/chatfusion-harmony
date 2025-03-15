
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TelegramAuthSection from '@/components/TelegramAuthSection';
import TelegramMessageViewer from '@/components/TelegramMessageViewer';
import Header from '@/components/Header';
import { useTelegram } from '@/contexts/TelegramContext';

const Index = () => {
  const { isConnected } = useTelegram();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Telegram Message Integration</h1>
            <p className="text-gray-500 mt-2">
              Connect your Telegram and Pipedrive accounts to automate message processing
            </p>
          </header>

          <div className="grid grid-cols-1 gap-8">
            <TelegramAuthSection />
            
            <TelegramMessageViewer />
            
            <Card>
              <CardHeader>
                <CardTitle>Pipedrive Integration</CardTitle>
                <CardDescription>
                  Connect your Pipedrive CRM account to sync data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Pipedrive integration will be implemented in the next phase.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
