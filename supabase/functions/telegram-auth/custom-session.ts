
import { StringSession } from "./deps.ts";

export class CustomStringSession extends StringSession {
  constructor(initialString = "") {
    super(initialString);
    log("CustomStringSession initialized");
  }
  
  static log(message: string) {
    console.log(`[CustomStringSession] ${message}`);
  }
}

function log(message: string) {
  console.log(`[CustomStringSession] ${message}`);
}
