
// Dependencies file for Telegram authentication
// This file ensures all necessary libraries are properly imported and initialized

// Import the GRM core library
export { GramJs } from "https://esm.sh/@grm/core@1.6.7";

// Import additional GRM modules that might be useful
export { ApiManager } from "https://esm.sh/@grm/api@1.6.5";
export { SessionManager } from "https://esm.sh/@grm/session@1.6.2";

// Re-export Telegram core classes for convenience
export { TelegramClient } from "https://esm.sh/v135/telegram@2.26.22/X-ZS8q/deno/telegram.mjs";
export { StringSession } from "https://esm.sh/telegram@2.26.22/sessions";

// Initialize GRM
import { GramJs } from "https://esm.sh/@grm/core@1.6.7";
GramJs.initRuntime();

console.log("GRM library and dependencies initialized");
