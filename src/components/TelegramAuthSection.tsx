
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";

const TelegramAuthSection = () => {
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // In a production app, these would be stored in Supabase, not localStorage
  const [storedApiId, setStoredApiId] = useLocalStorage('telegram_api_id', '');
  const [storedApiHash, setStoredApiHash] = useLocalStorage('telegram_api_hash', '');
  const [storedSession, setStoredSession] = useLocalStorage('telegram_session', '');
  
  const handleConnect = async () => {
    if (!apiId || !apiHash) {
      toast({
        title: "Error",
        description: "API ID and API Hash are required",
        variant: "destructive"
      });
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Note: In a real implementation, this would call a Supabase Edge Function
      // that would handle the actual Telegram connection using the ESM imports
      // For now, we'll just simulate the connection
      
      // Simulating successful connection
      setTimeout(() => {
        // Store credentials (in production, this would be in Supabase)
        setStoredApiId(apiId);
        setStoredApiHash(apiHash);
        setStoredSession('simulated_session_string');
        
        setConnectionStatus('connected');
        setIsConnecting(false);
        
        toast({
          title: "Success",
          description: "Connected to Telegram successfully",
        });
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to Telegram",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };
  
  const handleDisconnect = () => {
    // Clear stored credentials
    setStoredApiId('');
    setStoredApiHash('');
    setStoredSession('');
    setConnectionStatus('disconnected');
    
    toast({
      title: "Disconnected",
      description: "Telegram account has been disconnected",
    });
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Telegram Integration</CardTitle>
        <CardDescription>
          Connect your Telegram account to receive and process messages
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connectionStatus === 'connected' ? (
          <div className="space-y-4">
            <div className="bg-green-50 p-3 rounded-md border border-green-200">
              <p className="text-green-700 font-medium">Connected to Telegram</p>
              <p className="text-sm text-green-600">Your Telegram account is successfully connected</p>
            </div>
            <Button variant="destructive" onClick={handleDisconnect}>
              Disconnect Telegram
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-id">API ID</Label>
              <Input 
                id="api-id" 
                placeholder="Enter your Telegram API ID" 
                value={apiId}
                onChange={(e) => setApiId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-hash">API Hash</Label>
              <Input 
                id="api-hash" 
                type="password"
                placeholder="Enter your Telegram API Hash" 
                value={apiHash}
                onChange={(e) => setApiHash(e.target.value)}
              />
            </div>
            <div className="pt-2">
              <Button 
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect Telegram"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TelegramAuthSection;
