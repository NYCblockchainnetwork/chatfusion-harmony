
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Link } from 'react-router-dom';

interface TelegramErrorFallbackProps {
  error?: Error | null;
  resetErrorBoundary?: () => void;
}

const TelegramErrorFallback: React.FC<TelegramErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary 
}) => {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Telegram Integration Error
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-800 mb-2">
          The Telegram integration encountered an error. This is likely because the Telegram
          library is not fully compatible with browser environments. The application is now using
          mock data instead.
        </p>
        {error && (
          <div className="bg-white p-3 rounded border border-red-200 overflow-auto max-h-32 text-xs text-gray-800 font-mono">
            {error.message}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        {resetErrorBoundary && (
          <Button 
            variant="outline" 
            onClick={resetErrorBoundary}
            className="flex-1"
          >
            Try Again
          </Button>
        )}
        <Button 
          variant="secondary"
          className="flex-1"
          asChild
        >
          <Link to="/settings">Settings</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TelegramErrorFallback;
