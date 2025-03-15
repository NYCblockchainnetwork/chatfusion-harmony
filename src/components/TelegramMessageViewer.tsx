
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from 'react-error-boundary';
import TelegramErrorFallback from './telegram/TelegramErrorFallback';
import TelegramMessageList from './telegram/TelegramMessageList';

const TelegramMessageViewer = () => {
  return (
    <ErrorBoundary 
      FallbackComponent={TelegramErrorFallback}
      onReset={() => window.location.reload()}
    >
      <Card>
        <CardHeader>
          <CardTitle>Telegram Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <TelegramMessageList />
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

export default TelegramMessageViewer;
