
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useTelegram } from '@/contexts/TelegramContext';
import { AlertCircle, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateTelegramCredentials } from "@/utils/telegramCredentialValidator";
import TelegramAuthSection from "@/components/TelegramAuthSection";

const Settings = () => {
  const { user } = useAuth();
  const { isConnected, error } = useTelegram();
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'none' | 'success' | 'error'>('none');
  const [validationMessage, setValidationMessage] = useState('');
  
  useEffect(() => {
    const loadSavedCredentials = async () => {
      if (!user?.id) return;
      
      try {
        const storedApiId = localStorage.getItem(`telegram_api_id_${user.id}`);
        const storedApiHash = localStorage.getItem(`telegram_api_hash_${user.id}`);
        
        if (storedApiId) setApiId(storedApiId);
        if (storedApiHash) setApiHash(storedApiHash);
        
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          console.error("No active session found");
          return;
        }
        
        const { data, error } = await supabase.functions.invoke('get-telegram-credentials', {
          body: { userId: user.id },
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`
          }
        });
        
        if (error) {
          console.error("Error fetching credentials:", error);
          return;
        }
        
        if (data?.apiId) {
          setApiId(data.apiId);
          localStorage.setItem(`telegram_api_id_${user.id}`, data.apiId);
        }
        
        if (data?.apiHash) {
          setApiHash(data.apiHash);
          localStorage.setItem(`telegram_api_hash_${user.id}`, data.apiHash);
        }
      } catch (error) {
        console.error("Error loading saved credentials:", error);
      }
    };
    
    loadSavedCredentials();
  }, [user?.id]);
  
  const validateCredentials = async () => {
    if (!apiId || !apiHash) {
      toast({
        title: "Validation Error",
        description: "API ID and API Hash are required",
        variant: "destructive"
      });
      return;
    }
    
    setIsValidating(true);
    setValidationStatus('none');
    setValidationMessage('');
    
    try {
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { 
          method: "validate-credentials",
          apiId,
          apiHash,
          userId: user?.id
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data.valid) {
        setValidationStatus('error');
        setValidationMessage(data.error || "Invalid credentials");
        toast({
          title: "Validation Failed",
          description: data.error || "Invalid credentials",
          variant: "destructive"
        });
      } else {
        setValidationStatus('success');
        setValidationMessage(data.message || "Credentials valid");
        toast({
          title: "Success",
          description: "Telegram credentials validated successfully",
        });
        
        if (user?.id) {
          localStorage.setItem(`telegram_api_id_${user.id}`, apiId);
          localStorage.setItem(`telegram_api_hash_${user.id}`, apiHash);
        }
      }
    } catch (error) {
      console.error("Error validating credentials:", error);
      setValidationStatus('error');
      setValidationMessage(error instanceof Error ? error.message : String(error));
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };
  
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
                  Configure your Telegram API credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Integration Error</AlertTitle>
                    <AlertDescription>{error instanceof Error ? error.message : String(error)}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiId">API ID</Label>
                    <Input 
                      id="apiId" 
                      value={apiId} 
                      onChange={(e) => setApiId(e.target.value)} 
                      placeholder="Enter your Telegram API ID"
                    />
                    <p className="text-xs text-muted-foreground">
                      <a 
                        href="https://my.telegram.org/apps" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-500 hover:underline"
                      >
                        Get this from my.telegram.org/apps
                      </a>
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="apiHash">API Hash</Label>
                    <Input 
                      id="apiHash" 
                      value={apiHash} 
                      onChange={(e) => setApiHash(e.target.value)} 
                      placeholder="Enter your Telegram API Hash"
                      type="password"
                    />
                  </div>
                  
                  <Button 
                    onClick={validateCredentials} 
                    disabled={isValidating || !apiId || !apiHash}
                    className="w-full mt-2"
                  >
                    {isValidating ? "Validating..." : "Validate Credentials"}
                  </Button>
                  
                  {validationStatus === 'success' && (
                    <Alert className="bg-green-50 border-green-200">
                      <Check className="h-4 w-4 text-green-500" />
                      <AlertTitle className="text-green-700">Validation Successful</AlertTitle>
                      <AlertDescription className="text-green-600">
                        {validationMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {validationStatus === 'error' && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Validation Failed</AlertTitle>
                      <AlertDescription>{validationMessage}</AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-medium mb-2">What's Next?</h3>
                  <p className="text-sm text-gray-700 mb-2">
                    After validating your API credentials, you can:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                    <li>Go to the home page to connect your Telegram account</li>
                    <li>Use QR code or phone number authentication to log in</li>
                    <li>Start receiving and processing your Telegram messages</li>
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
