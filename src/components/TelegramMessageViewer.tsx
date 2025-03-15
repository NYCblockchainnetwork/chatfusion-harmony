
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TelegramErrorFallback from './telegram/TelegramErrorFallback';
import TelegramMessageList from './telegram/TelegramMessageList';

const TelegramMessageViewer = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Telegram Messages</CardTitle>
      </CardHeader>
      <CardContent>
        <TelegramMessageList />
      </CardContent>
    </Card>
  );
};

export default TelegramMessageViewer;
