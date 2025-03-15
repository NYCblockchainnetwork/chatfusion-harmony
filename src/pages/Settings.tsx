
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  
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
                <p className="text-sm text-gray-500 mb-4">
                  The Telegram integration is currently using the mock implementation for browser compatibility.
                </p>
                <div className="flex items-center bg-amber-50 p-3 rounded border border-amber-200">
                  <p className="text-sm text-amber-700">
                    Note: Full Telegram integration requires a Node.js environment and cannot run directly in browsers.
                    The app is currently using simulated data for demonstration purposes.
                  </p>
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
