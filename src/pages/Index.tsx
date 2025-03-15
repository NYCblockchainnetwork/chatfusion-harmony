
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TelegramAuthSection from '@/components/TelegramAuthSection';
import Header from '@/components/Header';

const Index = () => {
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
            
            <Card>
              <CardHeader>
                <CardTitle>Message Management</CardTitle>
                <CardDescription>
                  Configure which Telegram chats to process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Message filters and management will be implemented in the next phase.
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
