import { supabase } from "@/integrations/supabase/client";

/**
 * Validates Telegram API credentials by making a request to the Supabase edge function
 * 
 * @param {string} apiId - The Telegram API ID
 * @param {string} apiHash - The Telegram API Hash
 * @param {string} userId - Optional user ID to associate credentials with
 * @returns {Promise<{valid: boolean, message: string}>} - Validation result
 */
export async function validateTelegramCredentials(
  apiId: string,
  apiHash: string,
  userId?: string
): Promise<{ valid: boolean; message: string }> {
  try {
    console.log("Validating Telegram credentials...");

    if (!apiId || !apiHash) {
      return {
        valid: false,
        message: "API ID and API Hash are required"
      };
    }

    // Use Supabase Edge Function to validate credentials
    const { data, error } = await supabase.functions.invoke('telegram-auth', {
      body: {
        method: "validate-credentials",
        apiId,
        apiHash,
        userId
      }
    });

    if (error) {
      console.error("Error from edge function:", error);
      throw new Error(`Validation error: ${error.message}`);
    }

    if (!data) {
      console.error("No data returned from edge function");
      throw new Error("Invalid response from server");
    }

    console.log("Validation result:", data);

    // If the data indicates valid credentials, return success
    if (data.valid) {
      return {
        valid: true,
        message: data.message || "Credentials valid"
      };
    } else {
      // Otherwise, return the error
      return {
        valid: false,
        message: data.error || "Invalid credentials"
      };
    }
  } catch (error) {
    console.error("Error validating credentials:", error);
    return {
      valid: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}
