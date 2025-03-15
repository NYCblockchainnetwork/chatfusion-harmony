
import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App.tsx'
import './index.css'

// Polyfill Buffer for browser compatibility
// This is a more complete polyfill that satisfies TypeScript's type expectations
if (typeof window !== 'undefined' && typeof Buffer === 'undefined') {
  console.warn('Buffer is not defined in this environment. Using polyfill implementation.');
  
  // Create a minimal Buffer-like class that satisfies the TypeScript interface
  class BufferPolyfill {
    data: Uint8Array;
    
    constructor(data: any) {
      this.data = data instanceof Uint8Array ? data : new Uint8Array(0);
    }
    
    // Implement minimal required methods
    write() { return 0; }
    toJSON() { return { type: 'Buffer', data: Array.from(this.data) }; }
    equals() { return false; }
    compare() { return 0; }
    copy() { return 0; }
    slice() { return new BufferPolyfill(new Uint8Array(0)); }
    toString() { return ''; }
    
    // Define static methods directly on the class
    static from(data: any): any {
      return new BufferPolyfill(data);
    }
    
    static isBuffer(obj: any): obj is Buffer {
      return obj instanceof BufferPolyfill;
    }
  }
  
  // @ts-ignore - Apply our polyfill to the window object
  window.Buffer = BufferPolyfill;
}

// Catch unhandled errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
