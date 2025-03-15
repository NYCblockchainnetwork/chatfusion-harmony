
import React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LoadingStateProps {
  title?: string;
  description?: string;
  error?: string | null;
  onRetry?: () => void;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  title = "Connecting to Telegram", 
  description = "Loading API credentials...",
  error = null,
  onRetry
}) => {
  // Check if error is authentication related
  const isAuthError = error && (
    error.includes("Authentication") || 
    error.includes("auth") || 
    error.includes("logged in") ||
    error.includes("session")
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{error ? "Connection Error" : title}</CardTitle>
        <CardDescription>{error || description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col justify-center items-center p-6 gap-4">
        {error ? (
          <>
            <div className="text-destructive text-sm mb-2">
              {isAuthError 
                ? "There was an authentication error. Please make sure you are logged in." 
                : "There was an error connecting to Telegram. This may be due to a server configuration issue."}
            </div>
            {onRetry && (
              <Button 
                onClick={onRetry}
                variant="default"
                className="px-4 py-2"
              >
                Try Again
              </Button>
            )}
          </>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        )}
      </CardContent>
    </Card>
  );
};

export default LoadingState;
