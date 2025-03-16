
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
    
    const { apiId, apiHash, sessionString } = credentials;
    
    if (!apiId || !apiHash) {
      throw new Error("API ID and API Hash are required");
    }
    
    console.log("Creating StringSession...");
    
    // Debug session string value
    if (sessionString) {
      console.log("Session string provided:", typeof sessionString, "length:", sessionString.length);
      // Check if session string was accidentally JSON-stringified
      try {
        const parsed = JSON.parse(sessionString);
        console.error("WARNING: Session string appears to be JSON. This is likely incorrect:", parsed);
        // Continue anyway, as StringSession will handle this, but log the warning
      } catch (e) {
        // Not JSON, which is good
        console.log("Session string is not JSON (expected)");
      }
    } else {
      console.log("No session string provided, using empty string");
    }
    
    // Ensure sessionString is a plain string, not an object or null
    const safeSessionString = typeof sessionString === 'string' ? sessionString : "";
    
    // Create StringSession directly with the session string or empty string
    const stringSession = new StringSession(safeSessionString);
    
    console.log("StringSession created successfully, instanceof StringSession:", stringSession instanceof StringSession);
    console.log("Initializing Telegram client...");
    
    // Make sure apiId is passed as a number
    const client = new TelegramClient(stringSession, Number(apiId), apiHash, {
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
