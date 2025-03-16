
// Production implementation for the Telegram client
// This uses the telegram package to interact with Telegram's API

import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

export interface TelegramCredentials {
  apiId: number;
  apiHash: string;
  sessionString?: string;
}

export async function createTelegramClient(credentials: TelegramCredentials) {
  try {
    console.log("Creating Telegram client with credentials:", {
      apiId: credentials.apiId ? credentials.apiId.toString().substring(0, 3) + "..." : "missing",
      apiHash: credentials.apiHash ? credentials.apiHash.substring(0, 3) + "..." : "missing",
      sessionString: credentials.sessionString ? "provided" : "missing"
    });
    
    const { apiId, apiHash, sessionString = "" } = credentials;
    
    if (!apiId || !apiHash) {
      throw new Error("API ID and API Hash are required");
    }
    
    console.log("Creating StringSession with string:", sessionString ? "provided" : "empty", "Type:", typeof sessionString);
    
    // Explicitly create a StringSession with the provided session string or an empty string
    const stringSession = new StringSession(sessionString || "");
    
    console.log("StringSession instance created successfully");
    console.log("Initializing Telegram client with real API");
    
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 3,
      useWSS: true,
    });
    
    return {
      client,
      stringSession
    };
  } catch (error) {
    console.error("Error creating Telegram client:", error);
    throw new Error(`Failed to create Telegram client: ${error.message}`);
  }
}
