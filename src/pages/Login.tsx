import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
const Login = () => {
  const {
    loginWithGoogle,
    isLoading,
    isAuthenticated
  } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [loginAttempted, setLoginAttempted] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    console.log("Login page - Auth status:", {
      isAuthenticated,
      isLoading
    });
    if (isAuthenticated) {
      console.log("User is authenticated, navigating to home page");
      navigate('/', {
        replace: true
      });
    }
  }, [isAuthenticated, navigate]);

  // Setup container for Google's custom button if needed
  useEffect(() => {
    const container = document.getElementById('google-signin-button');
    if (container && googleButtonRef.current) {
      googleButtonRef.current.appendChild(container);
    }
  }, []);
  const handleGoogleLogin = async () => {
    try {
      setLoginAttempted(true);
      await loginWithGoogle();
      console.log("Login initiated via Google");
      // The actual login happens via the callback in AuthContext
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginAttempted(false);
      toast({
        title: "Login failed",
        description: error.message || "Could not log in with Google. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Check if Google Client ID is set
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isGoogleConfigMissing = !googleClientId;
  return <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
          <CardDescription>
            Sign in to continue to the Telegram Integration App
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isGoogleConfigMissing && <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Google Client ID not found. Add VITE_GOOGLE_CLIENT_ID to your .env file to enable Google login.
                </AlertDescription>
              </Alert>}
            
            {isLoading && loginAttempted ? <div className="py-4 flex flex-col items-center space-y-4">
                <Progress value={75} className="w-full h-2" />
                <p className="text-sm text-gray-500">Signing in with Google...</p>
              </div> : <Button className="w-full flex items-center justify-center gap-2" onClick={handleGoogleLogin} disabled={isLoading || isGoogleConfigMissing}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" className="h-5 w-5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                {isLoading ? "Processing..." : "Sign in with Google"}
              </Button>}
            
            <div ref={googleButtonRef} className="mt-4 flex justify-center"></div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-xs text-gray-500">Application settings and user preferences will be securely stored.</p>
        </CardFooter>
      </Card>
    </div>;
};
export default Login;