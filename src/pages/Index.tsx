
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTelegram } from '@/contexts/TelegramContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TelegramQRLogin from '@/components/telegram/TelegramQRLogin';
import TelegramPhoneVerification from '@/components/telegram/TelegramPhoneVerification';
import TelegramErrorFallback from '@/components/telegram/TelegramErrorFallback';
import { useUserSettings } from '@/hooks/use-user-settings';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { AlertCircle, Check, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { telegramClient } from '@/integrations/supabase/client';

const Index = () => {
  const { user } = useAuth();
  const { isConnected, error, refreshMessages } = useTelegram();
  const { settings, updateSettings } = useUserSettings();
  const [hasApiCredentials, setHasApiCredentials] = useState(false);
  const [authTab, setAuthTab] = useState<'qr' | 'phone'>('qr');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [telegramSessions, setTelegramSessions] = useState<any[]>([]);
  
  // Check if user has API credentials
  useEffect(() => {
    const checkCredentials = async () => {
      if (!user?.id) return;
      
      try {
        const apiId = localStorage.getItem(`telegram_api_id_${user.id}`);
        const apiHash = localStorage.getItem(`telegram_api_hash_${user.id}`);
        
        setHasApiCredentials(!!(apiId && apiHash));
      } catch (error) {
        console.error("Error checking credentials:", error);
      }
    };
    
    checkCredentials();
  }, [user?.id]);
  
  // Fetch telegram sessions
  useEffect(() => {
    const fetchTelegramSessions = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await telegramClient.getSessions(user.id);
        
        if (error) throw error;
        
        setTelegramSessions(data || []);
        
        if (data && data.length > 0) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
      } catch (error) {
        console.error('Error fetching Telegram sessions:', error);
      }
    };
    
    fetchTelegramSessions();
  }, [user?.id, settings?.telegramIntegrationEnabled]);
  
  const handleVerificationSuccess = async (sessionId: string, phone?: string) => {
    await updateSettings({
      telegramIntegrationEnabled: true,
      telegramHandles: settings?.telegramHandles || [],
      activeSessionId: sessionId
    });
    
    setConnectionStatus('connected');
    setIsConnecting(false);
    
    toast({
      title: "Connection Successful",
      description: `Connected to Telegram${phone ? ` with phone ${phone}` : ''}. You can now fetch messages.`,
    });
    
    // Refresh sessions list
    if (user?.id) {
      const { data } = await telegramClient.getSessions(user.id);
      setTelegramSessions(data || []);
    }
  };
  
  const handleDisconnect = async (sessionId?: string) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (sessionId) {
        const { error } = await telegramClient.deleteSession(sessionId);
        
        if (error) throw error;
        
        toast({
          title: "Session Removed",
          description: "The selected Telegram session has been removed",
        });
      } else {
        for (const session of telegramSessions) {
          await telegramClient.deleteSession(session.id);
        }
        
        toast({
          title: "All Sessions Removed",
          description: "All Telegram sessions have been removed",
        });
      }
      
      await updateSettings({
        telegramIntegrationEnabled: false,
      });
      
      // Refresh sessions list
      const { data } = await telegramClient.getSessions(user.id);
      setTelegramSessions(data || []);
      
      if (!data || data.length === 0) {
        setConnectionStatus('disconnected');
      }
      
    } catch (error) {
      console.error('Error disconnecting from Telegram:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect from Telegram",
        variant: "destructive"
      });
    }
  };
  
  const renderSessionList = () => {
    if (telegramSessions.length === 0) {
      return (
        <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
          <p className="text-amber-700">No active sessions. Connect using QR code or phone number.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {telegramSessions.map(session => (
          <div key={session.id} className="bg-green-50 p-3 rounded-md border border-green-200 flex justify-between items-center">
            <div>
              <p className="text-green-700 font-medium">
                {session.phone ? `Phone: ${session.phone}` : 'QR Authentication'}
              </p>
              <p className="text-xs text-green-600">Connected on {new Date(session.created_at).toLocaleString()}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleDisconnect(session.id)}
            >
              Remove
            </Button>
          </div>
        ))}
        
        <Button 
          variant="destructive" 
          onClick={() => handleDisconnect()}
          className="mt-4 w-full"
        >
          Disconnect All Sessions
        </Button>
      </div>
    );
  };
  
  if (error) {
    return <TelegramErrorFallback error={error instanceof Error ? error : new Error(String(error))} />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-2">Telegram Explorer</h1>
          <p className="text-center text-gray-500 mb-8">Connect to your Telegram account to explore and manage your messages</p>
          
          {!hasApiCredentials ? (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Setup Required</CardTitle>
                <CardDescription>Configure your Telegram API credentials before connecting</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive" className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-800" />
                  <AlertTitle className="text-amber-800">Telegram API Credentials Required</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    You need to set up your Telegram API credentials before connecting your account. 
                    Go to your settings to configure them.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link to="/settings">Go to Settings</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : connectionStatus === 'connected' ? (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-600" />
                  Telegram Connected
                </CardTitle>
                <CardDescription>
                  You're connected to Telegram and ready to use the application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-md border border-green-200">
                    <h3 className="text-lg font-medium text-green-800 mb-2">Active Sessions</h3>
                    {renderSessionList()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Connect to Telegram</CardTitle>
                <CardDescription>
                  Choose your preferred authentication method
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="qr" value={authTab} onValueChange={(value) => setAuthTab(value as 'qr' | 'phone')}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="qr">QR Code Login</TabsTrigger>
                    <TabsTrigger value="phone">Phone Number</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="qr" className="mt-0">
                    <div className="text-center">
                      <TelegramQRLogin
                        onSuccess={handleVerificationSuccess}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="phone" className="mt-0">
                    <TelegramPhoneVerification
                      onSuccess={handleVerificationSuccess}
                      onCancel={() => setAuthTab('qr')}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex flex-col text-center">
                <p className="text-sm text-gray-500 mb-2">
                  <Lock className="inline h-3 w-3 mr-1" />
                  Your Telegram credentials are securely stored and used only to access your account
                </p>
              </CardFooter>
            </Card>
          )}
          
          {/* Additional cards or content can be added here */}
        </div>
      </main>
    </div>
  );
};

export default Index;
