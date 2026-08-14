import Constants from "expo-constants";

const normalize = (value: unknown) => String(value ?? "").trim().replace(/\/$/, "");

const configured = normalize(process.env.EXPO_PUBLIC_API_BASE_URL);
const extra = normalize((Constants.expoConfig?.extra as any)?.apiBaseUrl);

// Native builds receive EXPO_PUBLIC_API_BASE_URL at build time. The app.config
// fallback is kept for cases where Expo has already evaluated app.config.js.
export const API_BASE_URL = configured || extra || "https://emilio2026.pythonanywhere.com";

export const apiUrl = (path: string) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export function isProductionApi(): boolean {
  return /^https:\/\/emilio2026\.pythonanywhere\.com$/i.test(API_BASE_URL);
}
