
import { telegramClient } from "@/integrations/supabase/client";
import { extendTelegramClient } from "./telegramClientHelper";

// Initialize the telegramClient with QR login methods
export const initializeTelegramClient = () => {
  console.log("Initializing Telegram client extensions");
  return extendTelegramClient(telegramClient);
};

// Call this once when the app loads
export const initializedTelegramClient = initializeTelegramClient();
