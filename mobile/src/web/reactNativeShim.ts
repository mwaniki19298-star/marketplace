/**
 * React Native -> browser compatibility layer used by the Vite website build.
 * The mobile application still uses the real React Native implementation.
 */
export * from 'react-native-web';
import * as RNWeb from 'react-native-web';

class WebEventEmitter {
  private listenerMap: Record<string, Set<(...args: any[]) => void>> = {};

  addListener(event: string, listener: (...args: any[]) => void) {
    if (!this.listenerMap[event]) this.listenerMap[event] = new Set();
    this.listenerMap[event].add(listener);
    return {
      remove: () => this.removeListener(event, listener),
    };
  }

  on(event: string, listener: (...args: any[]) => void) {
    return this.addListener(event, listener);
  }

  once(event: string, listener: (...args: any[]) => void) {
    const wrapped = (...args: any[]) => {
      this.removeListener(event, wrapped);
      listener(...args);
    };
    return this.addListener(event, wrapped);
  }

  removeListener(event: string, listener: (...args: any[]) => void) {
    this.listenerMap[event]?.delete(listener);
    return this;
  }

  off(event: string, listener: (...args: any[]) => void) {
    return this.removeListener(event, listener);
  }

  removeAllListeners(event?: string) {
    if (event) delete this.listenerMap[event];
    else this.listenerMap = {};
    return this;
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.listenerMap[event] ? [...this.listenerMap[event]] : [];
    callbacks.forEach((listener) => listener(...args));
    return callbacks.length > 0;
  }

  listenerCount(event: string) {
    return this.listenerMap[event]?.size ?? 0;
  }

  listeners(event: string) {
    return Array.from(this.listenerMap[event] ?? []);
  }
}

// Node.js events module polyfill
export class EventEmitter extends WebEventEmitter {}
export const NativeEventEmitter = WebEventEmitter;
export const DeviceEventEmitter = new WebEventEmitter();

// Add static method for EventEmitter
(EventEmitter as any).defaultMaxListeners = 10;

export const TurboModuleRegistry = {
  get: (_name: string) => null,
  getEnforcing: (_name: string) => null,
};

export const NativeModules = {};
export const DevSettings = {};

// Add this to global scope for any code that tries to use it directly
if (typeof globalThis !== 'undefined' && !globalThis.EventEmitter) {
  (globalThis as any).EventEmitter = EventEmitter;
}
