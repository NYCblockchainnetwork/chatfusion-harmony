
import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorStateProps {
  error: string;
  onCancel: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onCancel }) => {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Telegram Connection Error
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-800 mb-4">
          Failed to load Telegram API credentials. This may be due to a server configuration issue.
        </p>
        <div className="bg-white p-3 rounded border border-red-200 overflow-auto max-h-32 text-xs text-gray-800 font-mono">
          {error}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onCancel} className="w-full">
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ErrorState;
