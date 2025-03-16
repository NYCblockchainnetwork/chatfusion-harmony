
// This file is no longer needed as we'll use the built-in StringSession directly
// The file remains to prevent import errors, but we'll bypass its usage
import { StringSession } from "./deps.ts";
export { StringSession };

export function log(message: string) {
  console.log(`[StringSession] ${message}`);
}
