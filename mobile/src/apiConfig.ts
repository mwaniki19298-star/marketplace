import Constants from "expo-constants";
import { Platform } from "react-native";

const normalize = (value: unknown) => String(value ?? "").trim().replace(/\/$/, "");

const configured = normalize(process.env.EXPO_PUBLIC_API_BASE_URL);
const extra = normalize((Constants.expoConfig?.extra as any)?.apiBaseUrl);

// In Expo Go / a development client, localhost points to the phone/emulator,
// not to the computer running Django. Expo exposes the Metro host through
// hostUri, so use that host for native development automatically. This makes
// the same build work on a physical phone and an Android emulator without
// hard-coding 10.0.2.2 or the developer's LAN IP.
const hostUri = normalize((Constants as any).expoConfig?.hostUri);
const devHost = hostUri ? hostUri.split(":")[0] : "";
const nativeDevApi = __DEV__ && Platform.OS !== "web" && devHost
  ? `http://${devHost}:8000`
  : "";

// Native development must prefer Metro's reachable host over localhost.
// Production builds use the EAS-provided EXPO_PUBLIC_API_BASE_URL.
export const API_BASE_URL = nativeDevApi || configured || extra || "https://emilio2026.pythonanywhere.com";

export const apiUrl = (path: string) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export function isProductionApi(): boolean {
  return /^https:\/\/emilio2026\.pythonanywhere\.com$/i.test(API_BASE_URL);
}
