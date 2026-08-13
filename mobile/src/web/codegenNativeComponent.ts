import * as React from 'react';

/**
 * Web-only compatibility shim for React Native's native codegen helper.
 * Native-safe-area-context imports this module even though its web implementation
 * does not need the native component. Returning a harmless component keeps Vite
 * from trying to resolve React Native's internal native-only module.
 */
export default function codegenNativeComponent() {
  return React.forwardRef<any, any>(function NativeComponentShim(props, ref) {
    return React.createElement('div', { ...props, ref });
  });
}
