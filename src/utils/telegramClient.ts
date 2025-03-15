
// Import GramJS from ESM.sh (Deno-compatible CDN)
import { TelegramClient } from 'https://esm.sh/gramjs@1.16.3';
import { StringSession } from 'https://esm.sh/gramjs@1.16.3/sessions';

export interface TelegramCredentials {
  apiId: number;
  apiHash: string;
  sessionString?: string;
}

export async function createTelegramClient(credentials: TelegramCredentials) {
  try {
    const { apiId, apiHash, sessionString = "" } = credentials;
    
    const stringSession = new StringSession(sessionString);
    
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });
    
    return {
      client,
      stringSession,
      getSessionString: () => stringSession.save(),
    };
  } catch (error) {
    console.error("Error creating Telegram client:", error);
    throw new Error(`Failed to create Telegram client: ${error.message}`);
  }
}

export async function connectToTelegram(client: any, callbacks: {
  onPhoneNumber?: () => Promise<string>;
  onPassword?: () => Promise<string>;
  onPhoneCode?: () => Promise<string>;
} = {}) {
  try {
    // Use default prompts if callbacks aren't provided
    const defaultCallbacks = {
      phoneNumber: callbacks.onPhoneNumber || (async () => prompt("Enter your phone number: ")),
      password: callbacks.onPassword || (async () => prompt("Enter your password: ")),
      phoneCode: callbacks.onPhoneCode || (async () => prompt("Enter the code you received: ")),
    };

    await client.start(defaultCallbacks);
    return true;
  } catch (error) {
    console.error("Error connecting to Telegram:", error);
    return false;
  }
}
