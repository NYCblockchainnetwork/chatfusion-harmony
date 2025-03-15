
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

type User = {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
};

// This is a publishable client ID that is safe to include in client-side code
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useLocalStorage<User | null>('auth_user', null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);

  // Load the Google API script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('Google Client ID is not set. Set the VITE_GOOGLE_CLIENT_ID environment variable.');
      setIsLoading(false);
      return;
    }

    // Check if script already exists
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      setGoogleScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google Sign-In script loaded successfully');
      setGoogleScriptLoaded(true);
    };
    script.onerror = (error) => {
      console.error('Failed to load Google Sign-In script:', error);
      toast({
        title: "Authentication Error",
        description: "Failed to load Google authentication service.",
        variant: "destructive"
      });
      setIsLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  // Initialize Google authentication once the script is loaded
  useEffect(() => {
    if (!googleScriptLoaded || !GOOGLE_CLIENT_ID) {
      return;
    }

    try {
      console.log('Initializing Google Sign-In');
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      console.log('Google Sign-In initialized successfully');
      setAuthInitialized(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Google Sign-In initialization error:', error);
      toast({
        title: "Authentication Error",
        description: "Failed to initialize Google authentication.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  }, [googleScriptLoaded]);

  // Check authentication status on load
  useEffect(() => {
    const checkAuthStatus = () => {
      if (user) {
        console.log('User is already authenticated:', user.name);
      }
      setIsLoading(false);
    };
    
    checkAuthStatus();
  }, [user]);

  const handleGoogleCredentialResponse = (response: any) => {
    try {
      if (!response?.credential) {
        console.error('Google authentication failed: No credential');
        toast({
          title: "Authentication Error",
          description: "Failed to receive credentials from Google.",
          variant: "destructive"
        });
        return;
      }

      console.log('Google authentication successful, processing credentials');
      // Decode the JWT token to get user information
      const decodedToken = decodeJwtResponse(response.credential);
      const googleUser: User = {
        id: decodedToken.sub,
        name: decodedToken.name,
        email: decodedToken.email,
        photoUrl: decodedToken.picture,
      };

      setUser(googleUser);
      console.log('User successfully authenticated:', googleUser.name);
      toast({
        title: "Authentication Successful",
        description: `Signed in as ${googleUser.name}`,
      });
      
      // Force a navigation update after setting the user
      setIsLoading(false);
      
      // We don't need to manually navigate here, it will be handled by AuthGuard
    } catch (error) {
      console.error('Error processing Google credentials:', error);
      toast({
        title: "Authentication Error",
        description: "Failed to process Google credentials.",
        variant: "destructive"
      });
    }
  };

  // Function to decode the JWT token received from Google
  const decodeJwtResponse = (token: string) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  };

  const loginWithGoogle = async () => {
    return new Promise<void>((resolve, reject) => {
      try {
        console.log('Initiating Google login flow');
        setIsLoading(true);
        
        if (!window.google || !authInitialized || !GOOGLE_CLIENT_ID) {
          const error = new Error('Google authentication is not initialized');
          console.error(error);
          setIsLoading(false);
          reject(error);
          return;
        }

        // Add a timeout to handle cases where Google prompt never returns
        const timeoutId = setTimeout(() => {
          setIsLoading(false);
          const error = new Error('Google login timed out. Please try again.');
          console.error(error);
          reject(error);
        }, 30000); // 30 second timeout

        // Display One Tap UI or prompt selector
        window.google.accounts.id.prompt((notification: any) => {
          clearTimeout(timeoutId);
          
          if (notification.isNotDisplayed()) {
            console.error('Google One Tap not displayed:', notification.getNotDisplayedReason());
            setIsLoading(false);
            
            // Instead of rejecting here, we'll render the button
            if (notification.getNotDisplayedReason() === 'browser_not_supported') {
              // Will render the button instead
              renderGoogleButton();
              resolve();
            } else {
              reject(new Error('Google login failed. Please try again.'));
            }
          } else if (notification.isSkippedMoment()) {
            console.error('Google login prompt skipped:', notification.getSkippedReason());
            setIsLoading(false);
            reject(new Error('Google login was skipped. Please try again.'));
          } else if (notification.isDismissedMoment()) {
            console.error('Google login prompt dismissed:', notification.getDismissedReason());
            setIsLoading(false);
            reject(new Error('Google login was dismissed. Please try again.'));
          } else {
            // This means the prompt is being shown to the user
            // The result will come through the callback function above
            console.log('Google login prompt is being shown to the user');
            resolve();
          }
        });
      } catch (error) {
        setIsLoading(false);
        console.error('Google login failed:', error);
        reject(error);
      }
    });
  };

  const renderGoogleButton = () => {
    if (!window.google || !authInitialized) return;
    
    // Find or create a container for the button
    let buttonContainer = document.getElementById('google-signin-button');
    if (!buttonContainer) {
      buttonContainer = document.createElement('div');
      buttonContainer.id = 'google-signin-button';
      document.body.appendChild(buttonContainer);
    }
    
    // Clear any existing content
    buttonContainer.innerHTML = '';
    
    try {
      console.log('Rendering Google button');
      window.google.accounts.id.renderButton(buttonContainer, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
      });
    } catch (error) {
      console.error('Failed to render Google button:', error);
    }
  };

  const logout = () => {
    console.log('Logging out user');
    setUser(null);
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully.",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
