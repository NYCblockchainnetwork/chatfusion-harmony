
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
    
    // Ensure sessionString is a plain string, not null or undefined
    const safeSessionString = typeof sessionString === 'string' ? sessionString : "";
    
    // Debug session string value
    console.log("Session string (safe):", 
        "type:", typeof safeSessionString, 
        "length:", safeSessionString.length,
        "value:", safeSessionString.substring(0, 5) + "...");
    
    // Create StringSession with the string
    const stringSession = new StringSession(safeSessionString);
    
    console.log("StringSession created successfully:", 
        "type:", typeof stringSession, 
        "instanceof StringSession:", stringSession instanceof StringSession);
    
    console.log("Initializing Telegram client...");
    
    // Make sure apiId is a number
    const apiIdNum = Number(apiId);
    console.log("API ID as number:", apiIdNum);
    
    // Create the TelegramClient
    const client = new TelegramClient(stringSession, apiIdNum, apiHash, {
      connectionRetries: 3,
      useWSS: true,
      deviceModel: "Web Client",
      systemVersion: "Browser", 
      appVersion: "1.0.0",
      langCode: "en"
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
