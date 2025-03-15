
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useTelegram } from '@/contexts/TelegramContext';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const Settings = () => {
  const { user } = useAuth();
  const { isConnected, error } = useTelegram();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-gray-500 mt-2">
              Manage your account preferences and integrations
            </p>
          </header>

          <div className="grid grid-cols-1 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Your account details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user ? (
                  <div className="flex items-center space-x-4">
                    {user.photoUrl && (
                      <img 
                        src={user.photoUrl} 
                        alt={user.name} 
                        className="w-16 h-16 rounded-full"
                      />
                    )}
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Loading profile information...</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Telegram Integration</CardTitle>
                <CardDescription>
                  Configure your Telegram integration settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert variant={error ? "destructive" : (isConnected ? "default" : "warning")} className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {error ? "Integration Error" : (isConnected ? "Using Mock Data" : "Not Connected")}
                  </AlertTitle>
                  <AlertDescription>
                    {error 
                      ? "There was an error connecting to Telegram. Using mock data instead."
                      : "This application is using simulated Telegram data for demonstration purposes."}
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">
                    <strong>Browser Compatibility Note:</strong> The official Telegram client library requires 
                    Node.js and cannot run directly in browsers due to its dependencies on Node-specific 
                    modules like <code>crypto</code> and <code>net</code>.
                  </p>
                  
                  <p className="text-sm text-gray-700">
                    For a production application, you would need to:
                  </p>
                  
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li>Create a backend service that uses the Telegram API</li>
                    <li>Expose a REST or WebSocket API for your frontend</li>
                    <li>Handle authentication and message processing on the server</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
