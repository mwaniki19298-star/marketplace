import Constants from "expo-constants";

const normalize = (value: unknown) => String(value ?? "").trim().replace(/\/$/, "");

const configured = normalize(process.env.EXPO_PUBLIC_API_BASE_URL);
const extra = normalize((Constants.expoConfig?.extra as any)?.apiBaseUrl);

// During Expo development, prefer the machine running Metro/Django when no
// explicit API URL has been configured. This prevents a dev build from
// silently calling the production API (which can be missing newer endpoints).
const devHost = normalize((Constants as any).expoConfig?.hostUri)?.split(":")[0];
const devApi = __DEV__ && devHost ? `http://${devHost}:8000` : "";

// Native production builds receive EXPO_PUBLIC_API_BASE_URL at build time.
export const API_BASE_URL = configured || devApi || extra || "https://emilio2026.pythonanywhere.com";

export const apiUrl = (path: string) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export function isProductionApi(): boolean {
  return /^https:\/\/emilio2026\.pythonanywhere\.com$/i.test(API_BASE_URL);
}
