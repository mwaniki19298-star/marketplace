import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  AlertCircle,
  Bell,
  Camera,
  LockKeyhole,
  RotateCcw,
  Bookmark,
  Check,
  ChevronRight,
  Compass,
  Heart,
  Home as HomeIcon,
  Image as ImageIcon,
  MapPin,
  Tag,
  Eye,
  Truck,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Pencil,
  Trash2,
  Zap,
  BadgePercent,
  ChevronUp,
  ChevronDown,
  Plus,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Sparkles,
  Store,
  Sun,
  User,
  Users,
  Send,
  Paperclip,
  X,
  Phone,
} from "lucide-react-native";
import { ActivityIndicator, Alert, AppState, FlatList, Image, KeyboardAvoidingView, Linking, Share, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri, ResponseType, useAuthRequest } from "expo-auth-session";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { BackHandler } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl, API_BASE_URL } from "./src/apiConfig";

const BUTTON_BLUE = "#2563EB";

const filters = ["All", "Products", "Services", "New", "Used", "Nearby"];

type Listing = {
  id: string;
  title: string;
  price: string;
  location: string;
  image: string;
  store: string;
  storeId: string;
  sellerId?: string;
  storeLogo?: string | null;
  type: "Product" | "Service";
  category: string;
  categoryId?: number;
  rating: string;
  reviews: number;
  description: string;
  currency?: string;
  negotiable?: boolean;
  condition?: string;
  stock?: number;
  isFeatured?: boolean;
  isOnOffer?: boolean;
  originalPrice?: number | null;
  offerPrice?: number | null;
  images?: string[];
  likesCount?: number;
  liked?: boolean;
};

type ApiUser = { id: number; email: string; full_name: string; avatar?: string | null; avatar_url?: string | null; is_community_verified?: boolean };
type ProfileStore = { id: number; name: string; logo?: string | null; cover?: string | null; description?: string; location?: string; phone?: string; verification?: string; is_active?: boolean };
type AuthPayload = { access: string; refresh: string; user: ApiUser };
type MessageItem = { id: number; conversation: number; sender: number; sender_name?: string; sender_avatar?: string | null; body: string; is_read?: boolean; created_at: string };
type ConversationItem = {
  id: number; buyer: number; seller: number; buyer_name?: string; seller_name?: string;
  buyer_avatar?: string | null; seller_avatar?: string | null; store?: number | null; store_name?: string | null; store_logo?: string | null;
  messages?: MessageItem[]; last_message?: { id: number; sender: number; sender_name?: string; body: string; created_at: string } | null;
  unread_count?: number; updated_at: string;
};

type OrderItem = {
  id: number;
  buyer: number;
  seller: number;
  store: number;
  listing: number;
  listing_detail?: any;
  store_detail?: any;
  quantity: number;
  message?: string;
  fulfillment: string;
  status: "pending" | "accepted" | "declined" | "preparing" | "ready" | "completed" | "cancelled";
  buyer_confirmed: boolean;
  seller_confirmed: boolean;
  created_at: string;
  updated_at: string;
};

type NotificationItem = {
  id: number;
  kind: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
};

const API_BASE = API_BASE_URL;
const AUTH_STORAGE_KEY = "marketplace_auth";


function ProfileAvatar({
  uri,
  initials,
  size = 34,
  theme,
}: {
  uri?: string | null;
  initials: string;
  size?: number;
  theme: Theme;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    opacity.setValue(0);
  }, [uri]);

  const showFallback = !uri || failed;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: showFallback
          ? theme.accent
          : theme.isDark
            ? "#27232F"
            : "#E5E7EB",
      }}
    >
      {showFallback ? (
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: Math.max(11, size * 0.34) }}>
          {initials}
        </Text>
      ) : (
        <>
          {!loaded && <ActivityIndicator size="small" color={theme.muted} />}
          <Animated.Image
            source={{ uri: uri! }}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              opacity,
            }}
            resizeMode="cover"
            onLoad={() => {
              setLoaded(true);
              Animated.timing(opacity, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }).start();
            }}
            onError={() => {
              setFailed(true);
              setLoaded(false);
            }}
          />
        </>
      )}
    </View>
  );
}

class ApiRequestError extends Error {
  status: number | null;
  isNetworkError: boolean;
  code: string | null;

  constructor(message: string, status: number | null = null, isNetworkError = false, code: string | null = null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.isNetworkError = isNetworkError;
    this.code = code;
  }
}

function extractApiError(data: any): string {
  if (!data) return "";
  if (typeof data === "string") return "";
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;
  const fields = ["email", "password", "password_confirm", "full_name", "non_field_errors"];
  for (const field of fields) {
    const value = data[field];
    if (Array.isArray(value) && value.length) return String(value[0]);
    if (typeof value === "string" && value.trim()) return value;
  }
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return "";
}

async function refreshAuthToken(auth: AuthPayload): Promise<AuthPayload> {
  if (!auth.refresh) throw new ApiRequestError("Your session has expired. Please sign in again.", 401, false, "refresh_required");
  let response: Response;
  try {
    response = await fetch(apiUrl("/api/auth/token/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: auth.refresh }),
    });
  } catch {
    throw new ApiRequestError("We couldn't refresh your session. Check your connection and try again.", null, true);
  }
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok || !data?.access) {
    throw new ApiRequestError("Your session has expired. Please sign in again.", response.status || 401, false, "refresh_required");
  }
  const nextAuth: AuthPayload = { ...auth, access: data.access };
  globalThis.__MARKETPLACE_AUTH__ = nextAuth;
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
  return nextAuth;
}

async function apiRequest(path: string, options: RequestInit = {}, auth?: AuthPayload | null) {
  const perform = async (requestAuth?: AuthPayload | null) => {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    if (requestAuth?.access) headers.set("Authorization", `Bearer ${requestAuth.access}`);
    try {
      return await fetch(apiUrl(path), { ...options, headers });
    } catch {
      throw new ApiRequestError("We couldn't load your data. Try again in a few.", null, true);
    }
  };

  let activeAuth = auth;
  let response = await perform(activeAuth);

  // Keep active sessions alive: transparently refresh an expired access token once.
  if (response.status === 401 && activeAuth?.refresh) {
    try {
      activeAuth = await refreshAuthToken(activeAuth);
      response = await perform(activeAuth);
    } catch (refreshError) {
      throw refreshError;
    }
  }

  const text = await response.text();
  let data: any = null;
  let isJson = true;
  try { data = text ? JSON.parse(text) : null; } catch { isJson = false; data = text; }

  if (!response.ok) {
    const serverMessage = isJson ? extractApiError(data) : "";
    const serverCode = isJson && typeof data?.code === "string" ? data.code : null;
    throw new ApiRequestError(serverMessage || `Request failed with status ${response.status}.`, response.status, false, serverCode);
  }
  return data;
}

type CloudinaryUploadResult = { secure_url: string; public_id: string };

/**
 * Upload images directly from the Expo app to Cloudinary using an UNSIGNED
 * upload preset. The Django API is only used after the upload to save the
 * returned secure_url/public_id on the listing. No Cloudinary secret or
 * signing request is sent through the backend.
 */
async function uploadAssetToCloudinary(
  asset: ImagePicker.ImagePickerAsset,
  _auth: AuthPayload | null,
  type: "listing" | "avatar" | "store_logo" | "store_cover" = "listing",
): Promise<CloudinaryUploadResult> {
  const allowedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
  if (asset.mimeType && !allowedMimeTypes.has(asset.mimeType.toLowerCase())) {
    throw new ApiRequestError("Unsupported image format. Use JPEG, PNG, or WEBP.", 400, false);
  }
  if (typeof asset.fileSize === "number" && asset.fileSize > 10 * 1024 * 1024) {
    throw new ApiRequestError("Image exceeds the maximum allowed size of 10 MB.", 400, false);
  }

  const cloudName = String(process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "").trim();
  const uploadPreset = String(
    type === "listing"
      ? process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      : process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "",
  ).trim();

  if (!cloudName || !uploadPreset) {
    throw new ApiRequestError(
      "Image upload is not configured. Add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to the mobile environment.",
      503,
      false,
    );
  }

  const form = new FormData();
  form.append("file", {
    uri: asset.uri,
    name: asset.fileName || `${type}-${Date.now()}.jpg`,
    type: asset.mimeType || "image/jpeg",
  } as any);
  form.append("upload_preset", uploadPreset);

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new ApiRequestError("We couldn't upload the image. Check your internet connection and try again.", null, true);
  }

  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!response.ok || !data?.secure_url) {
    throw new ApiRequestError(
      data?.error?.message || "Cloudinary could not upload the image.",
      response.status,
      false,
    );
  }

  return { secure_url: data.secure_url, public_id: data.public_id || "" };
}

function apiResults<T = any>(data: any): T[] {
  // Django REST Framework pagination returns { count, next, previous, results }.
  // Some custom endpoints return a plain array, so support both shapes.
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.results)) return data.results as T[];
  return [];
}

function mapApiListing(item: any): Listing {
  const firstImage = item?.images?.[0]?.image || "";
  const regularPrice = item?.price == null ? null : Number(item.price);
  const displayPrice = item?.is_on_offer && item?.offer_price != null ? Number(item.offer_price) : regularPrice;
  const price = displayPrice == null ? "Price on request" : `${item.currency || "KES"} ${displayPrice.toLocaleString("en-KE")}`;
  return {
    id: String(item.id), title: item.title || "Untitled listing", price,
    location: item.location || item.store?.location || "", image: firstImage,
    store: item.store?.name || "Marketplace seller", storeId: String(item.store?.id || ""), sellerId: item.store?.owner ? String(item.store.owner) : undefined,
    storeLogo: item.store?.logo || null,
    type: item.kind === "service" ? "Service" : "Product", category: item.category_name || "Uncategorized",
    categoryId: item.category, rating: "0.0", reviews: 0, description: item.description || "",
    currency: item.currency || "KES", negotiable: !!item.negotiable, condition: item.condition || "na",
    stock: item.stock || 0, isFeatured: !!item.is_featured,
    isOnOffer: !!item.is_on_offer, originalPrice: item.original_price == null ? null : Number(item.original_price),
    offerPrice: item.offer_price == null ? null : Number(item.offer_price), likesCount: Number(item.likes_count || 0), liked: !!item.liked_by_user, images: Array.isArray(item.images) ? item.images.map((x: any) => x.image).filter(Boolean) : (firstImage ? [firstImage] : []),
  };
}

let listings: Listing[] = [];
let categoryTiles: Array<[string, string, number]> = [];

declare global { var __MARKETPLACE_AUTH__: AuthPayload | null | undefined; }

type Screen = "home" | "browse" | "create" | "publishSuccess" | "saved" | "profile" | "product" | "orders" | "notifications" | "messages" | "settings" | "settingsPreferences" | "securityPrivacy" | "notificationPreferences" | "helpSupport" | "faq" | "reportProblem" | "safetyTips" | "terms" | "privacyPolicy" | "store" | "login";
type RouteEntry = { screen: Screen; selectedId: string | null };

export default function App() {
  return (
    <SafeAreaProvider>
      <MarketplaceApp />
    </SafeAreaProvider>
  );
}

function MarketplaceApp() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [screen, setScreen] = useState<Screen>("home");
  const [selected, setSelected] = useState<Listing | null>(null);
  const navigationStack = useRef<RouteEntry[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [auth, setAuth] = useState<AuthPayload | null>(null);
  const [loginMode, setLoginMode] = useState<"login" | "signup">("login");
  const [autoGoogleLogin, setAutoGoogleLogin] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const likingIds = useRef<Set<string>>(new Set());

  const theme = dark ? darkTheme : lightTheme;
  const isCompact = width < 380;

  const refreshMarketplaceData = async (authState: AuthPayload | null = auth) => {
    setDataLoading(true);
    try {
      const [listingData, categoryData] = await Promise.all([
        apiRequest("/api/listings/?is_available=true"),
        apiRequest("/api/categories/"),
      ]);
      listings = apiResults(listingData).map(mapApiListing);
      categoryTiles = apiResults(categoryData).map((c: any) => [c.name, c.icon || "•", Number(c.id)]);
      if (authState?.access) {
        try {
          const savedData = await apiRequest("/api/listings/saved/", {}, authState);
          setSavedIds(Array.isArray(savedData) ? savedData.map((x: any) => String(x.id)) : []);
        } catch { setSavedIds([]); }
        setLikedIds(listingData ? apiResults(listingData).filter((x: any) => x.liked_by_user).map((x: any) => String(x.id)) : []);
      } else { setSavedIds([]); setLikedIds([]); }
      setDataError(null);
    } catch (error) {
      listings = [];
      categoryTiles = [];
      setSavedIds([]);
      setLikedIds([]);
      setDataError(error instanceof Error ? error.message : "Unable to load Marketplace data.");
    } finally { setDataLoading(false); }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) {
          const savedAuth = JSON.parse(raw) as AuthPayload;
          const user = await apiRequest("/api/auth/me/", {}, savedAuth);
          const restored = { ...savedAuth, user };
          setAuth(restored); setCurrentUser(user); setIsLoggedIn(true); globalThis.__MARKETPLACE_AUTH__ = restored;
          await refreshMarketplaceData(restored); return;
        }
      } catch {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        setAuth(null); setCurrentUser(null); setIsLoggedIn(false);
      }
      await refreshMarketplaceData(null);
    };
    bootstrap();
  }, []);


  // Refresh the short-lived access token while the user is actively using the app.
  // The refresh token remains persisted, so reopening the app also restores the session.
  useEffect(() => {
    const refreshIfNeeded = async () => {
      const activeAuth = globalThis.__MARKETPLACE_AUTH__ || auth;
      if (!activeAuth?.refresh) return;
      try {
        const nextAuth = await refreshAuthToken(activeAuth);
        setAuth(nextAuth);
        setCurrentUser(nextAuth.user);
        setIsLoggedIn(true);
      } catch (error) {
        if (error instanceof ApiRequestError && error.code === "refresh_required") {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          globalThis.__MARKETPLACE_AUTH__ = null;
          setAuth(null);
          setCurrentUser(null);
          setIsLoggedIn(false);
        }
      }
    };

    const interval = setInterval(refreshIfNeeded, 8 * 60 * 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshIfNeeded();
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [auth]);

  const currentRoute = useMemo<RouteEntry>(() => ({
    screen,
    selectedId: selected?.id ?? null,
  }), [screen, selected]);

  const navigateTo = (next: Screen, nextSelected: Listing | null = null) => {
    setMenuOpen(false);
    if (next === currentRoute.screen && (nextSelected?.id ?? null) === currentRoute.selectedId) return;

    navigationStack.current.push(currentRoute);
    setSelected(nextSelected);
    setScreen(next);
  };

  const goBack = () => {
    const previous = navigationStack.current.pop();
    if (!previous) return false;

    const previousListing = previous.selectedId
      ? listings.find((listing) => listing.id === previous.selectedId) ?? null
      : null;

    setSelected(previousListing);
    setScreen(previous.screen);
    setMenuOpen(false);
    return true;
  };

  const go = (next: Screen) => navigateTo(next);

  const openSell = () => {
    if (isLoggedIn) go("create");
    else go("login");
  };

  const openProduct = (listing: Listing) => navigateTo("product", listing);
  const openProductRef = useRef(openProduct);
  openProductRef.current = openProduct;

  // Shared listing links are HTTPS App Links / Universal Links in production,
  // with marketplace:// kept as a fallback for development. A shared link must
  // open the exact product even when that product is not in the currently loaded feed.
  useEffect(() => {
    if (dataLoading) return;

    const openFromUrl = async (rawUrl: string | null) => {
      if (!rawUrl) return;
      const match = rawUrl.match(/(?:marketplace:\/\/listing\/|https?:\/\/[^/]+\/listing\/)(\d+)(?:[\/?#-]|$)/i);
      if (!match) return;
      const listingId = String(match[1]);
      let listing = listings.find((item) => String(item.id) === listingId);
      if (!listing) {
        try {
          const data = await apiRequest(`/api/listings/${listingId}/`);
          listing = mapApiListing(data);
          listings = [listing, ...listings.filter((item) => item.id !== listing.id)];
        } catch {
          return;
        }
      }
      openProductRef.current(listing);
    };

    void Linking.getInitialURL().then(openFromUrl);
    const subscription = Linking.addEventListener("url", ({ url }) => { void openFromUrl(url); });
    return () => subscription.remove();
  }, [dataLoading]);

  const openConversationForListing = async (listing: Listing) => {
    if (!auth?.access) { go("login"); return; }
    if (!listing.sellerId) { go("messages"); return; }
    try {
      await apiRequest("/api/conversations/", {
        method: "POST",
        body: JSON.stringify({ seller: Number(listing.sellerId), store: listing.storeId ? Number(listing.storeId) : null }),
      }, auth);
      go("messages");
    } catch (error) {
      Alert.alert("Couldn't start chat", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const toggleSaved = async (id: string) => {
    if (!auth?.access) { go("login"); return; }
    try {
      const alreadySaved = savedIds.includes(id);
      await apiRequest(`/api/listings/${id}/save_item/`, { method: alreadySaved ? "DELETE" : "POST" }, auth);
      setSavedIds((current) => alreadySaved ? current.filter((x) => x !== id) : [...current, id]);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to update saved items.");
    }
  };


  const toggleLike = async (id: string) => {
    if (!auth?.access) { go("login"); return; }
    // Prevent double taps from sending two POSTs before the first response arrives.
    if (likingIds.current.has(id)) return;
    likingIds.current.add(id);

    const alreadyLiked = likedIds.includes(id);
    try {
      const result = await apiRequest(
        `/api/listings/${id}/like/`,
        { method: alreadyLiked ? "DELETE" : "POST" },
        auth,
      );
      const liked = result?.liked === true;
      const likesCount = Math.max(0, Number(result?.likes_count ?? 0));

      setLikedIds((current) => {
        if (liked) return current.includes(id) ? current : [...current, id];
        return current.filter((x) => x !== id);
      });
      listings = listings.map((listing) =>
        listing.id === id ? { ...listing, likesCount, liked } : listing
      );
    } catch (error) {
      Alert.alert("Couldn't update like", error instanceof Error ? error.message : "Please try again.");
    } finally {
      likingIds.current.delete(id);
    }
  };

  const shareToWhatsApp = async (listing: Listing) => {
    try {
      const configuredWebBase = (process.env.EXPO_PUBLIC_WEB_BASE_URL || '').trim().replace(/\/$/, '');
      const url = configuredWebBase
        ? `${configuredWebBase}/listing/${listing.id}/${encodeURIComponent(listing.title.trim().replace(/\s+/g, '-').toLowerCase())}`
        : `marketplace://listing/${listing.id}`;

      // IMPORTANT: This button is specifically for OPENING WhatsApp.
      // Do not use ACTION_SEND here because Android can show the system
      // Sharesheet. WhatsApp's URL scheme opens WhatsApp directly and
      // pre-fills the message. The HTTPS product link can generate the
      // product's image preview in WhatsApp when the web page has OG tags.
      const message = `Check out ${listing.title} from ${listing.store}: ${listing.price}\n\n${url}`;
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

      const supported = await Linking.canOpenURL(whatsappUrl);
      if (!supported) {
        Alert.alert(
          "WhatsApp isn't installed",
          "Please install WhatsApp to use the WhatsApp button."
        );
        return;
      }

      await Linking.openURL(whatsappUrl);
    } catch (error) {
      Alert.alert(
        "Couldn't open WhatsApp",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  };

  const shareListing = async (listing: Listing) => {
    try {
      const configuredWebBase = (process.env.EXPO_PUBLIC_WEB_BASE_URL || '').trim().replace(/\/$/, '');
      const url = configuredWebBase
        ? `${configuredWebBase}/listing/${listing.id}/${encodeURIComponent(listing.title.trim().replace(/\s+/g, '-').toLowerCase())}`
        : `marketplace://listing/${listing.id}`;
      const mainImage = listing.images?.[0] || listing.image;

      if (mainImage) {
        // Download the main product image locally so the native share sheet can
        // attach the actual product photo.
        const extension = (mainImage.split("?")[0].match(/\.(jpe?g|png|webp|gif)$/i)?.[1] || "jpg").toLowerCase();
        const safeName = listing.title.replace(/[^a-z0-9_-]/gi, "_").slice(0, 60) || "product";
        const destination = new File(Paths.cache, `${safeName}_${listing.id}.${extension}`);
        const download = await File.downloadFileAsync(mainImage, destination, { idempotent: true });
        const message = `Check out ${listing.title} from ${listing.store}: ${listing.price}\n\nOpen this item in Marketplace:\n${url}`;
        const mimeType = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";

        if (Platform.OS === "android") {
          // Android's normal React Native Share API cannot attach a local image
          // and text/link in the same payload. Send one ACTION_SEND intent with
          // both EXTRA_STREAM (the photo) and EXTRA_TEXT (the deep link).
          // File.contentUri is the SDK 54+ content URI intended for external apps.
          const contentUri = download.contentUri;
          if (!contentUri) throw new Error("Unable to prepare the product image for sharing.");

          await IntentLauncher.startActivityAsync("android.intent.action.SEND", {
            type: mimeType,
            flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
            extra: {
              "android.intent.extra.TEXT": message,
              "android.intent.extra.TITLE": listing.title,
              "android.intent.extra.STREAM": contentUri,
            },
          });
        } else if (await Sharing.isAvailableAsync()) {
          // iOS Share can carry the image file URL while the message contains
          // the Marketplace deep link.
          await Share.share({ message, title: listing.title, url: download.uri });
        } else {
          await Share.share({ message, title: listing.title });
        }
        return;
      }
      // Fallback when image sharing is unavailable.
      await Share.share({
        message: `Check out ${listing.title} from ${listing.store}: ${listing.price}\n${url}`,
        title: listing.title,
      });
    } catch (error) {
      if (!(error instanceof Error) || !/cancel/i.test(error.message)) {
        Alert.alert("Couldn't share", error instanceof Error ? error.message : "Please try again.");
      }
    }
  };

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      // Let Android close the app only when we're already at the root screen.
      return goBack();
    });

    return () => subscription.remove();
  }, []);

  const topTitle = useMemo(() => {
    const titles: Record<Screen, string> = {
      home: "Marketplace",
      browse: "Browse",
      login: "Welcome",
      create: "Sell Something",
      publishSuccess: "Published",
      saved: "Saved Items",
      profile: "Profile",
      product: selected?.store ?? "Listing",
      orders: "My Orders",
      notifications: "Notifications",
      messages: "Messages",
      settings: "Settings",
      settingsPreferences: "Settings & Preferences",
      securityPrivacy: "Security & Privacy",
      notificationPreferences: "Notification Preferences",
      helpSupport: "Help & Support",
      faq: "Frequently Asked Questions",
      reportProblem: "Report a Problem",
      safetyTips: "Safety Tips",
      terms: "Terms of Service",
      privacyPolicy: "Privacy Policy",
      store: "Store",
    };
    return titles[screen];
  }, [screen, selected]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={dark ? "light" : "dark"} backgroundColor={theme.background} translucent={false} />

      <View style={[styles.shell, { paddingTop: insets.top + 8, backgroundColor: theme.background }]}> 
        {screen !== "login" && (
        <View style={styles.topBar}>
          {screen !== "home" && screen !== "browse" ? (
            <Pressable onPress={goBack} style={styles.topIcon}>
              <ArrowLeft size={21} color={theme.text} />
            </Pressable>
          ) : (
            <Pressable onPress={() => setMenuOpen((v) => !v)} style={styles.topIcon}>
              <Menu size={21} color={theme.text} />
            </Pressable>
          )}
          <Text style={[styles.brand, { color: theme.text }]} numberOfLines={1}>{topTitle}</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={() => go("notifications")} style={styles.topIcon}>
              <Bell size={20} color={theme.text} />
              <View style={styles.dot} />
            </Pressable>
          </View>
        </View>
        )}

        {menuOpen && screen !== "login" && (
          <View style={[styles.menu, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <MenuItem label="Home" icon={<HomeIcon size={18} color={theme.text} />} onPress={() => go("home")} theme={theme} />
            <MenuItem label="Orders" icon={<ShoppingBag size={18} color={theme.text} />} onPress={() => go("orders")} theme={theme} />
            <MenuItem label="Messages" icon={<MessageCircle size={18} color={theme.text} />} onPress={() => go("messages")} theme={theme} />
            <MenuItem label="Settings" icon={<Settings size={18} color={theme.text} />} onPress={() => go("settingsPreferences")} theme={theme} />
          </View>
        )}

        {dataError && (screen === "home" || screen === "browse") && (
          <View style={[styles.dataNotice, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.dataNoticeDot} />
            <Text style={[styles.dataNoticeText, { color: theme.muted }]}>No listings available yet.</Text>
            <Pressable onPress={() => refreshMarketplaceData(auth)} hitSlop={8}>
              <Text style={styles.dataNoticeRetry}>Retry</Text>
            </Pressable>
          </View>
        )}
        {screen === "home" && (
          <HomeScreen theme={theme} isLoggedIn={isLoggedIn} currentUser={currentUser} dataLoading={dataLoading} dataError={dataError} onBrowse={() => go("browse")} onCreate={openSell} onOpenProduct={openProduct} />
        )}
        {screen === "browse" && (
          <BrowseScreen
            theme={theme}
            dataLoading={dataLoading}
            dataError={dataError}
            search={search}
            setSearch={setSearch}
            savedIds={savedIds}
            toggleSaved={toggleSaved}
            likedIds={likedIds}
            toggleLike={toggleLike}
            onOpenProduct={openProduct}
            onContactSeller={openConversationForListing}
            shareListing={shareListing}
            shareToWhatsApp={shareToWhatsApp}
          />
        )}
        {screen === "saved" && (
          <SavedScreen theme={theme} savedIds={savedIds} onOpenProduct={openProduct} toggleSaved={toggleSaved} />
        )}
        {screen === "login" && <LoginScreen theme={theme} onBack={goBack} initialMode={loginMode} autoGoogle={autoGoogleLogin} onAuthenticated={async (payload) => { setAutoGoogleLogin(false); setAuth(payload); setCurrentUser(payload.user); setIsLoggedIn(true); globalThis.__MARKETPLACE_AUTH__ = payload; await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload)); await refreshMarketplaceData(payload); go("profile"); }} />}
        {screen === "create" && <CreateScreen theme={theme} auth={auth} onDone={async () => { await refreshMarketplaceData(auth); go("publishSuccess"); }} />}
        {screen === "publishSuccess" && <PublishSuccessScreen theme={theme} onBrowse={() => go("browse")} onHome={() => go("home")} />}
        {screen === "profile" && <ProfileScreen theme={theme} currentUser={currentUser} isLoggedIn={isLoggedIn} onUserUpdated={setCurrentUser} onOrders={() => go("orders")} onSettings={() => go("settingsPreferences")} onSecurity={() => go("securityPrivacy")} onNotificationPreferences={() => go("notificationPreferences")} onHelp={() => go("helpSupport")} onSignIn={() => { setLoginMode("login"); setAutoGoogleLogin(false); go("login"); }} onSignUp={() => { setLoginMode("signup"); setAutoGoogleLogin(false); go("login"); }} onGoogle={() => { setLoginMode("login"); setAutoGoogleLogin(true); go("login"); }} onStore={() => go("store")} onMessages={() => go("messages")} savedCount={savedIds.length} />}
        {screen === "product" && selected && <ProductScreen theme={theme} listing={selected} saved={savedIds.includes(selected.id)} onToggleSaved={() => toggleSaved(selected.id)} onContactSeller={() => openConversationForListing(selected)} auth={auth} />}
        {screen === "orders" && <OrdersScreen theme={theme} auth={auth} currentUser={currentUser} />}
        {screen === "notifications" && <NotificationsScreen theme={theme} auth={auth} />}
        {screen === "messages" && <MessagesScreen theme={theme} auth={auth} currentUser={currentUser} />}
        {screen === "settings" && <SettingsScreen theme={theme} dark={dark} setDark={setDark} />}
        {screen === "settingsPreferences" && <SettingsPreferencesScreen theme={theme} dark={dark} setDark={setDark} />}
        {screen === "securityPrivacy" && <SecurityPrivacyScreen theme={theme} auth={auth} onSignOut={async () => { await AsyncStorage.removeItem(AUTH_STORAGE_KEY); globalThis.__MARKETPLACE_AUTH__ = null; setAuth(null); setCurrentUser(null); setIsLoggedIn(false); setSavedIds([]); setLikedIds([]); go("profile"); }} />}
        {screen === "notificationPreferences" && <NotificationPreferencesScreen theme={theme} />}
        {screen === "helpSupport" && <HelpSupportScreen theme={theme} onFAQ={() => go("faq")} onSafety={() => go("safetyTips")} onReport={() => go("reportProblem")} onTerms={() => go("terms")} onPrivacy={() => go("privacyPolicy")} />}
        {screen === "faq" && <FAQScreen theme={theme} />}
        {screen === "reportProblem" && <ReportProblemScreen theme={theme} auth={auth} />}
        {screen === "safetyTips" && <SafetyTipsScreen theme={theme} />}
        {screen === "terms" && <LegalInfoScreen theme={theme} kind="terms" />}
        {screen === "privacyPolicy" && <LegalInfoScreen theme={theme} kind="privacy" />}
        {screen === "store" && <StoreScreen theme={theme} auth={auth} onOpenProduct={openProduct} onMarketplaceChanged={() => void refreshMarketplaceData(auth)} onUserUpdated={(user) => { setCurrentUser(user); setAuth((prev) => prev ? { ...prev, user } : prev); }} />}

        {screen !== "create" && screen !== "publishSuccess" && screen !== "login" && <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 4, backgroundColor: theme.nav, borderColor: theme.border }]}>
          {[
            [HomeIcon, "Home", "home" as Screen],
            [Compass, "Browse", "browse" as Screen],
            [Plus, "Sell", "create" as Screen],
            [Bookmark, "Saved", "saved" as Screen],
            [User, "Profile", "profile" as Screen],
          ].map(([Icon, label, target]) => {
            const active = screen === target || (target === "browse" && screen === "product");
            const IconComponent = Icon as typeof HomeIcon;
            return (
              <Pressable key={label as string} style={styles.navItem} onPress={() => target === "create" ? openSell() : go(target as Screen)}>
                {target === "create" ? (
                  <View style={[styles.navIconCreate, { backgroundColor: dark ? "#3B82F6" : "#2563EB" }]}><IconComponent size={21} color="#FFFFFF" /></View>
                ) : (
                  <IconComponent size={20} color={active ? (dark ? "#60A5FA" : "#2563EB") : theme.muted} strokeWidth={active ? 2.4 : 2} />
                )}
                <Text style={[styles.navLabel, { color: active ? (dark ? "#60A5FA" : "#2563EB") : theme.muted }, active && styles.navLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>}
      </View>
    </View>
  );
}


const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com", "guerrillamail.com", "mailinator.com", "tempmail.com",
  "temp-mail.org", "yopmail.com", "getnada.com", "sharklasers.com", "guerrillamailblock.com",
  "maildrop.cc", "throwawaymail.com"
]);

function validateMarketplaceEmail(raw: string): { valid: boolean; reason?: string } {
  const email = raw.trim();
  if (!email) return { valid: false, reason: "Enter your email address." };
  if (email.length > 254) return { valid: false, reason: "That email address is too long." };
  if (/\s/.test(email)) return { valid: false, reason: "Email addresses cannot contain spaces." };
  const match = email.match(/^([^@]+)@([^@]+)$/);
  if (!match) return { valid: false, reason: "Enter a valid email address." };
  const local = match[1];
  const domain = match[2].toLowerCase();
  if (!local || local.length > 64) return { valid: false, reason: "Enter a valid email address." };
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return { valid: false, reason: "That email address doesn't look valid." };
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return { valid: false, reason: "That email address contains invalid characters." };
  if (!/^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)) {
    return { valid: false, reason: "Use an email address with a valid domain, like you@example.com." };
  }
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return { valid: false, reason: "Temporary or disposable email addresses aren't accepted." };
  return { valid: true };
}

function passwordQuality(password: string) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Lowercase letter", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(password) },
    { label: "Not an obvious pattern", ok: !/(password|12345678|qwerty|11111111|letmein|admin)/i.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const label = !password ? "Enter a password" : score <= 2 ? "Weak" : score <= 4 ? "Fair" : score === 5 ? "Strong" : "Excellent";
  const color = score <= 2 ? "#DC2626" : score <= 4 ? "#D97706" : "#16A34A";
  return { checks, score, label, color, eligible: checks.every(c => c.ok) };
}

function LoginScreen({ theme, onBack, onAuthenticated, initialMode = "login", autoGoogle = false }: { theme: Theme; onBack: () => boolean; onAuthenticated: (payload: AuthPayload) => void; initialMode?: "login" | "signup"; autoGoogle?: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const emailCheck = useMemo(() => validateMarketplaceEmail(email), [email]);
  const passwordCheck = useMemo(() => passwordQuality(password), [password]);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<{ title: string; message: string } | null>(null);
  const [googleToast, setGoogleToast] = useState<string | null>(null);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const redirectUri = makeRedirectUri({ scheme: "marketplace" });
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || googleClientId;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || googleClientId;
  const clientId = Platform.OS === "android" ? androidClientId : Platform.OS === "ios" ? iosClientId : googleClientId;
  const [googleRequest, googleResponse, promptGoogleAsync] = useAuthRequest(
    {
      clientId,
      responseType: ResponseType.IdToken,
      scopes: ["openid", "profile", "email"],
      redirectUri,
      extraParams: { prompt: "select_account" },
    },
    { authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth" }
  );

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  useEffect(() => {
    const finishGoogleLogin = async () => {
      if (googleResponse?.type !== "success") return;
      const idToken = googleResponse.params?.id_token;
      if (!idToken) {
        setGoogleLoading(false);
        setGoogleError({ title: "Google sign-in could not finish", message: "Google did not return the authentication details Marketplace needs. Please try again." });
        setGoogleToast("Google sign-in could not finish.");
        return;
      }
      try {
        const res = await fetch(apiUrl("/api/auth/google/"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: idToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || "Google authentication failed.");
        // Store tokens for the session; the home/account screens can use these later for API calls.
        globalThis.__MARKETPLACE_AUTH__ = data;
        setGoogleLoading(false);
        setGoogleError(null);
        setGoogleToast(null);
        onAuthenticated(data as AuthPayload);
      } catch (error) {
        setGoogleLoading(false);
        setGoogleError({ title: "Google sign-in unavailable", message: "Google authentication is not connected yet. You can continue with email sign-in." });
        setGoogleToast("Google sign-in is unavailable right now.");
      }
    };
    finishGoogleLogin();
  }, [googleResponse, onAuthenticated]);

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  const startGoogleLogin = async () => {
    setGoogleError(null);
    setGoogleToast(null);
    if (!googleRequest || !clientId) {
      setGoogleError({ title: "Google sign-in isn't connected", message: "Google authentication will be available once the Google OAuth client is configured. For now, use email sign-in." });
      setGoogleToast("Google sign-in isn't connected yet.");
      return;
    }
    setGoogleLoading(true);
    try {
      const result = await promptGoogleAsync();
      if (result.type !== "success") {
        setGoogleLoading(false);
        setGoogleToast("Google sign-in was cancelled.");
      }
    } catch (error) {
      setGoogleLoading(false);
      setGoogleError({ title: "Google sign-in unavailable", message: "We couldn't open Google's sign-in screen. You can continue with email sign-in." });
      setGoogleToast("Could not open Google sign-in.");
    }
  };

  useEffect(() => {
    if (!autoGoogle || mode !== "login") return;
    const timer = setTimeout(() => { void startGoogleLogin(); }, 120);
    return () => clearTimeout(timer);
  }, [autoGoogle, mode, googleRequest, clientId]);

  const submit = async () => {
    if (loginSubmitting) return;
    if (mode === "signup" && !name.trim()) { setGoogleToast("Enter your name to create an account."); return; }
    if (!emailCheck.valid) {
      const message = emailCheck.reason || "Enter a valid email address.";
      setGoogleError({ title: "Check your email", message });
      setGoogleToast(message);
      return;
    }
    if (!password.trim()) { setGoogleToast("Enter your password to continue."); return; }
    if (mode === "signup" && !passwordCheck.eligible) {
      const message = "Choose a stronger password using the requirements shown below.";
      setGoogleError({ title: "Password needs attention", message });
      setGoogleToast(message);
      return;
    }
    setLoginSubmitting(true);
    setGoogleError(null);
    setGoogleToast(null);
    try {
      const payload = mode === "login"
        ? await apiRequest("/api/auth/login/", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) })
        : await apiRequest("/api/auth/register/", { method: "POST", body: JSON.stringify({ email: email.trim(), full_name: name.trim(), password, password_confirm: password }) });
      setLoginSubmitting(false);
      onAuthenticated(payload as AuthPayload);
    } catch (error) {
      setLoginSubmitting(false);
      const requestError = error instanceof ApiRequestError ? error : null;

      if (mode === "login") {
        if (requestError?.code === "invalid_password") {
          setShowPasswordRecovery(true);
          return;
        }
        if (requestError?.isNetworkError) {
          const message = "We couldn't load your data. Try again in a few.";
          setGoogleError({ title: "Couldn't connect", message });
          setGoogleToast(message);
        } else if (requestError?.code === "invalid_credentials" || requestError?.status === 400 || requestError?.status === 401 || requestError?.status === 403) {
          const message = "Username or password incorrect.";
          setGoogleError({ title: "Login unsuccessful", message });
          setGoogleToast(message);
        } else {
          const message = "We couldn't load your data. Try again in a few.";
          setGoogleError({ title: "Couldn't load your data", message });
          setGoogleToast(message);
        }
      } else {
        let message = "Please check your details and try again.";
        if (requestError?.isNetworkError) {
          message = "We couldn't load your data. Try again in a few.";
        } else if (requestError?.status === 400) {
          message = requestError.message || message;
          if (/password.*(common|similar|short|weak|too short|numeric|entirely numeric)/i.test(message)) {
            message = "Password is too weak. Use at least 8 characters with a mix of letters, numbers, or symbols.";
          } else if (/already exists|already registered|unique/i.test(message) && /email/i.test(message)) {
            message = "An account with this email already exists. Try logging in instead.";
          } else if (/passwords do not match/i.test(message)) {
            message = "Passwords do not match.";
          }
        } else if (requestError?.status && requestError.status >= 500) {
          message = "We couldn't create your account right now. Try again in a few.";
        }
        setGoogleError({ title: "Couldn’t create account", message });
        setGoogleToast(message);
      }
    }
  };


  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.authScroll, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.authTopRow}>
        <Pressable onPress={onBack} style={[styles.authBack, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ArrowLeft size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.authHeaderLabel, { color: theme.text }]}>
          {showReset ? "Reset Account" : mode === "login" ? "Welcome back" : "Create account"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {!showReset ? (
        showPasswordRecovery ? (
          <PasswordRecoveryScreen theme={theme} email={email} onRetry={() => setShowPasswordRecovery(false)} onReset={() => { setShowReset(true); setShowPasswordRecovery(false); setResetEmail(email); setResetSent(false); }} />
        ) : (
        <>
          <View style={[styles.authMode, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Pressable onPress={() => { setMode("login"); setShowPasswordRecovery(false); }} style={[styles.authModeItem, mode === "login" && { backgroundColor: BUTTON_BLUE }]}><Text style={[styles.authModeText, { color: mode === "login" ? "#fff" : theme.muted }]}>Log in</Text></Pressable>
            <Pressable onPress={() => { setMode("signup"); setShowPasswordRecovery(false); }} style={[styles.authModeItem, mode === "signup" && { backgroundColor: BUTTON_BLUE }]}><Text style={[styles.authModeText, { color: mode === "signup" ? "#fff" : theme.muted }]}>Create account</Text></Pressable>
          </View>

          {mode === "signup" && <Field label="Full name" value={name} onChangeText={setName} theme={theme} placeholder="Your name" />}
          <Field label="Email address" value={email} onChangeText={(value) => { setEmail(value); if (googleError?.title === "Check your email") setGoogleError(null); }} theme={theme} keyboardType="email-address" placeholder="you@example.com" />
          {mode === "signup" && email.length > 0 && (
            <View style={[styles.validationRow, { marginTop: -8, marginBottom: 12 }]}>
              <View style={[styles.validationDot, { backgroundColor: emailCheck.valid ? "#16A34A" : "#D97706" }]} />
              <Text style={[styles.validationText, { color: emailCheck.valid ? "#16A34A" : theme.muted }]}>{emailCheck.valid ? "Email address looks valid" : (emailCheck.reason || "Check your email address")}</Text>
            </View>
          )}
          <Field label="Password" value={password} onChangeText={(value) => { setPassword(value); if (googleError?.title === "Password needs attention") setGoogleError(null); }} theme={theme} placeholder="Enter your password" />
          {mode === "signup" && password.length > 0 && (
            <View style={[styles.passwordQuality, { marginTop: -7, marginBottom: 12, borderColor: theme.border, backgroundColor: theme.card }]}>
              <View style={styles.passwordQualityTop}>
                <Text style={[styles.validationText, { color: theme.muted }]}>Password quality</Text>
                <Text style={[styles.passwordQualityLabel, { color: passwordCheck.color }]}>{passwordCheck.label}</Text>
              </View>
              <View style={[styles.passwordMeter, { backgroundColor: theme.border }]}>
                <View style={[styles.passwordMeterFill, { width: `${Math.max(8, (passwordCheck.score / passwordCheck.checks.length) * 100)}%`, backgroundColor: passwordCheck.color }]} />
              </View>
              {mode === "signup" && (
                <View style={styles.passwordChecks}>
                  {passwordCheck.checks.map((check) => (
                    <View key={check.label} style={styles.passwordCheckRow}>
                      <Text style={[styles.passwordCheckIcon, { color: check.ok ? "#16A34A" : theme.muted }]}>{check.ok ? "✓" : "•"}</Text>
                      <Text style={[styles.passwordCheckText, { color: check.ok ? "#16A34A" : theme.muted }]}>{check.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {mode === "login" && (
            <Pressable
              style={styles.forgotButton}
              onPress={() => {
                setResetEmail(email);
                setResetSent(false);
                setShowReset(true);
              }}
            >
              <Text style={[styles.forgotText, { color: theme.accent }]}>Forgot password?</Text>
            </Pressable>
          )}

          <Pressable disabled={loginSubmitting} onPress={submit} style={[styles.authPrimary, { backgroundColor: BUTTON_BLUE, opacity: loginSubmitting ? 0.72 : 1 }]}>
            <Text style={styles.authPrimaryText}>{loginSubmitting ? (mode === "login" ? "Signing in…" : "Creating account…") : (mode === "login" ? "Log in" : "Create account")}</Text>
            {loginSubmitting ? <Text style={styles.authSpinner}>●</Text> : <ChevronRight size={18} color="#fff" />}
          </Pressable>

          <View style={styles.authDivider}><View style={[styles.authLine, { backgroundColor: theme.border }]} /><Text style={[styles.authOr, { color: theme.muted }]}>OR</Text><View style={[styles.authLine, { backgroundColor: theme.border }]} /></View>

          <Pressable disabled={googleLoading} onPress={startGoogleLogin} style={[styles.googleButton, { borderColor: theme.border, backgroundColor: theme.card, opacity: googleLoading ? 0.65 : 1 }]}>
            <View style={styles.googleIcon} accessibilityLabel="Google logo">
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.91-4.18 2.91-7.21Z"/>
                <Path fill="#34A853" d="M12 21.5c2.62 0 4.82-.87 6.42-2.36l-3.14-2.44c-.87.58-1.98.92-3.28.92-2.52 0-4.66-1.7-5.43-3.99H3.33v2.52A9.71 9.71 0 0 0 12 21.5Z"/>
                <Path fill="#FBBC05" d="M6.57 13.63a5.82 5.82 0 0 1 0-3.26V7.85H3.33a9.74 9.74 0 0 0 0 8.3l3.24-2.52Z"/>
                <Path fill="#EA4335" d="M12 5.99c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.82 3.03 14.62 2 12 2a9.71 9.71 0 0 0-8.67 5.85l3.24 2.52C7.34 7.69 9.48 5.99 12 5.99Z"/>
              </Svg>
            </View>
            <Text style={[styles.googleButtonText, { color: theme.text }]}>{googleLoading ? "Opening Google…" : "Continue with Google"}</Text>
          </Pressable>

          {googleError && (
            <View style={[styles.authErrorCard, { backgroundColor: theme.isDark ? "#2A171A" : "#FFF4F4", borderColor: theme.isDark ? "#6A2D34" : "#F4C7CB" }]}>
              <View style={[styles.authErrorIcon, { backgroundColor: theme.isDark ? "#4A1F25" : "#FFE0E3" }]}>
                <Text style={{ color: "#C9344C", fontSize: 15, fontWeight: "900" }}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.authErrorTitle, { color: theme.text }]}>{googleError.title}</Text>
                <Text style={[styles.authErrorMessage, { color: theme.muted }]}>{googleError.message}</Text>
              </View>
              <Pressable onPress={() => setGoogleError(null)} hitSlop={10}>
                <Text style={{ color: theme.muted, fontSize: 18 }}>×</Text>
              </Pressable>
            </View>
          )}


          <View style={styles.authTrust}>
            <Check size={16} color={theme.accent} />
            <Text style={[styles.authTrustText, { color: theme.muted }]}>Your account keeps your marketplace activity synced securely.</Text>
          </View>

          <Text style={[styles.authFootnote, { color: theme.muted }]}>By continuing, you agree to the Marketplace terms and community guidelines.</Text>
        </>
        )
      ) : (
        <>
          <View style={styles.authHero}>
            <View style={[styles.authGlow, { backgroundColor: theme.accent + (theme.isDark ? "26" : "16") }]} />
            <Text style={[styles.authEyebrow, { color: theme.accent }]}>ACCOUNT RECOVERY</Text>
            <Text style={[styles.authTitle, { color: theme.text }]}>Reset your password.</Text>
            <Text style={[styles.authSubtitle, { color: theme.muted }]}>Enter the email attached to your Marketplace account and we’ll guide you through the reset process.</Text>
          </View>

          {!resetSent ? (
            <>
              <Field label="Email address" value={resetEmail} onChangeText={setResetEmail} theme={theme} keyboardType="email-address" placeholder="you@example.com" />
              <Pressable
                onPress={() => {
                  if (!resetEmail.trim()) {
                    return;
                  }
                  setResetSent(true);
                }}
                style={[styles.authPrimary, { backgroundColor: BUTTON_BLUE, marginTop: 8 }]}
              >
                <Text style={styles.authPrimaryText}>Send reset link</Text>
                <ChevronRight size={18} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => setShowReset(false)}
                style={[styles.resetSecondary, { borderColor: theme.border, backgroundColor: theme.card }]}
              >
                <ArrowLeft size={16} color={theme.text} />
                <Text style={[styles.resetSecondaryText, { color: theme.text }]}>Back to log in</Text>
              </Pressable>
            </>
          ) : (
            <View style={[styles.resetSuccessCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.resetSuccessIcon, { backgroundColor: theme.accent + (theme.isDark ? "25" : "12") }]}>
                <Check size={28} color={theme.accent} strokeWidth={3} />
              </View>
              <Text style={[styles.resetSuccessTitle, { color: theme.text }]}>Check your email</Text>
              <Text style={[styles.resetSuccessText, { color: theme.muted }]}>If an account exists for {resetEmail.trim()}, a password reset link will be sent to that address.</Text>
              <Pressable
                onPress={() => {
                  setShowReset(false);
                  setResetSent(false);
                }}
                style={[styles.authPrimary, { backgroundColor: BUTTON_BLUE, width: "100%", marginTop: 8 }]}
              >
                <Text style={styles.authPrimaryText}>Return to log in</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.authTrust}>
            <Check size={16} color={theme.accent} />
            <Text style={[styles.authTrustText, { color: theme.muted }]}>We never reveal whether an email is registered.</Text>
          </View>
        </>
      )}
    </ScrollView>
    {googleToast && (
      <View style={styles.authToastWrap} pointerEvents="box-none">
        <View style={[styles.authToast, { backgroundColor: theme.isDark ? "#242229" : "#202126" }]}>
          <View style={styles.authToastDot} />
          <Text style={styles.authToastText}>{googleToast}</Text>
          <Pressable onPress={() => setGoogleToast(null)} hitSlop={10}>
            <Text style={styles.authToastClose}>×</Text>
          </Pressable>
        </View>
      </View>
    )}
    </View>
  );
}

function PasswordRecoveryScreen({ theme, email, onRetry, onReset }: { theme: Theme; email: string; onRetry: () => void; onReset: () => void }) {
  const scale = useRef(new Animated.Value(0.78)).current;
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 65, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(180),
        Animated.timing(shake, { toValue: 1, duration: 140, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 140, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 140, useNativeDriver: true }),
      ]),
    ]).start();
  }, [scale, shake]);
  const translateX = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-4, 0, 4] });
  return (
    <View style={{ paddingTop: 28 }}>
      <View style={styles.passwordLockHero}>
        <Animated.View style={[styles.passwordLockHalo, { backgroundColor: theme.accent + (theme.isDark ? "22" : "14"), transform: [{ scale }] }]} />
        <Animated.View style={[styles.passwordLockBadge, { backgroundColor: theme.card, borderColor: theme.border, transform: [{ scale }, { translateX }] }]}>
          <LockKeyhole size={42} color={BUTTON_BLUE} strokeWidth={2.4} />
        </Animated.View>
      </View>
      <Text style={[styles.authEyebrow, { color: theme.accent, textAlign: "center" }]}>ACCOUNT SECURITY</Text>
      <Text style={[styles.authTitle, { color: theme.text, textAlign: "center", fontSize: 30, lineHeight: 36 }]}>Your password didn’t work.</Text>
      <Text style={[styles.authSubtitle, { color: theme.muted, textAlign: "center", alignSelf: "center", marginTop: 10 }]}>For {email.trim() || "your account"}, you can retry your password or reset it and create a new one.</Text>

      <View style={[styles.passwordAdviceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.passwordAdviceIcon, { backgroundColor: theme.accent + (theme.isDark ? "22" : "10") }]}><RotateCcw size={18} color={BUTTON_BLUE} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.passwordAdviceTitle, { color: theme.text }]}>Try again first</Text>
          <Text style={[styles.passwordAdviceText, { color: theme.muted }]}>Make sure Caps Lock is off and check that you entered the right password.</Text>
        </View>
      </View>

      <Pressable onPress={onRetry} style={[styles.authPrimary, { backgroundColor: BUTTON_BLUE, marginTop: 14 }]}>
        <Text style={styles.authPrimaryText}>Retry password</Text>
        <ChevronRight size={18} color="#fff" />
      </Pressable>
      <Pressable onPress={onReset} style={[styles.resetSecondary, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <LockKeyhole size={16} color={theme.text} />
        <Text style={[styles.resetSecondaryText, { color: theme.text }]}>Reset password instead</Text>
      </Pressable>
    </View>
  );
}

function MenuItem({ label, icon, onPress, theme }: { label: string; icon: React.ReactNode; onPress: () => void; theme: Theme }) {
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      {icon}<Text style={[styles.menuItemText, { color: theme.text }]}>{label}</Text><ChevronRight size={17} color={theme.muted} />
    </Pressable>
  );
}

function ScreenScroll({ children, theme, contentStyle }: { children: React.ReactNode; theme: Theme; contentStyle?: any }) {
  return <ScrollView contentContainerStyle={[styles.scrollContent, contentStyle]} showsVerticalScrollIndicator={false}>{children}</ScrollView>;
}

function HomeScreen({ theme, isLoggedIn, currentUser, dataLoading, dataError, onBrowse, onCreate, onOpenProduct }: { theme: Theme; isLoggedIn: boolean; currentUser: ApiUser | null; dataLoading: boolean; dataError: string | null; onBrowse: () => void; onCreate: () => void; onOpenProduct: (l: Listing) => void }) {
  return (
    <ScreenScroll theme={theme}>
      {isLoggedIn && (
        <>
          <Text style={[styles.welcome, { color: theme.text }]}>Welcome back, {currentUser?.full_name || "there"}! 👋</Text>
          <Text style={[styles.subtle, { color: theme.muted }]}>Find great products and support people in your community.</Text>
        </>
      )}

      <View style={[styles.hero, { backgroundColor: darken(theme.accent, theme.isDark ? 0.12 : 0.92) }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Discover local talent.</Text>
          <Text style={[styles.heroSub, { color: theme.muted }]}>Shop products, book services and find stores you can trust.</Text>
          <Pressable onPress={onBrowse} style={[styles.primaryButton, { backgroundColor: BUTTON_BLUE }]}><Text style={styles.primaryButtonText}>Browse now</Text></Pressable>
        </View>
        <View style={styles.heroIcon}><ShoppingBag size={40} color={theme.accent} /></View>
      </View>

      <SectionHeader title="Top categories" theme={theme} action="View all" onPress={onBrowse} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {categoryTiles.map(([name, emoji]) => (
          <Pressable key={name} onPress={onBrowse} style={[styles.categoryTile, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={styles.categoryEmoji}>{emoji}</Text><Text style={[styles.categoryText, { color: theme.text }]}>{name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable onPress={onCreate} style={[styles.sellBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Store size={28} color={theme.accent} />
        <View style={{ flex: 1 }}><Text style={[styles.sellBannerTitle, { color: theme.text }]}>Have something to sell?</Text><Text style={[styles.subtle, { color: theme.muted }]}>Create your store and reach your community.</Text></View>
        <ChevronRight size={20} color={theme.muted} />
      </Pressable>

      <SectionHeader title="Featured" theme={theme} action="View all" onPress={onBrowse} />
      {dataLoading ? [1,2,3].map((id) => <View key={id} style={[styles.compactCard,{backgroundColor:theme.card,borderColor:theme.border,marginTop:8,height:82}]} />) : listings.slice(0,6).map((listing) => (
        <CompactListing key={listing.id} listing={listing} theme={theme} onPress={() => onOpenProduct(listing)} />
      ))}
      {!dataLoading && listings.length === 0 && <EmptyState theme={theme} title="The marketplace is warming up" text={dataError ? "We could not load marketplace listings right now. Check your connection and try again." : "Fresh products and services will appear here as sellers publish them."} actionLabel="Explore categories" onAction={onBrowse} icon="sparkles" />}
    </ScreenScroll>
  );
}

function BrowseScreen({ theme, search, setSearch, savedIds, toggleSaved, likedIds, toggleLike, onOpenProduct, onContactSeller, shareListing, shareToWhatsApp, dataLoading, dataError }: { theme: Theme; search: string; setSearch: (v: string) => void; savedIds: string[]; toggleSaved: (id: string) => void; likedIds: string[]; toggleLike: (id: string) => void; onOpenProduct: (l: Listing) => void; onContactSeller: (l: Listing) => void; shareListing: (l: Listing) => void; shareToWhatsApp: (l: Listing) => void; dataLoading: boolean; dataError: string | null }) {
  const filtered = listings.filter((listing) => !search.trim() || `${listing.title} ${listing.store} ${listing.category}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <ScreenScroll theme={theme}>
      <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Search size={18} color={theme.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search products, services and stores..." placeholderTextColor={theme.muted} style={[styles.searchInput, { color: theme.text }]} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {filters.map((filter, index) => <Pressable key={filter} style={[styles.filterChip, { borderColor: theme.border, backgroundColor: theme.card }, index === 0 && { backgroundColor: theme.accent, borderColor: theme.accent }]}><Text style={[styles.filterText, { color: index === 0 ? "#fff" : theme.text }]}>{filter}</Text></Pressable>)}
      </ScrollView>
      <Text style={[styles.pageTitle, { color: theme.text }]}>Browse</Text>
      <Text style={[styles.subtle, { color: theme.muted }]}>{filtered.length} listings near you</Text>
      {dataLoading ? [1,2,3].map((id) => <View key={id} style={[styles.card,{backgroundColor:theme.card,borderColor:theme.border,height:420,marginTop:8}]} />) : filtered.map((listing) => <ListingCard key={listing.id} listing={listing} theme={theme} saved={savedIds.includes(listing.id)} liked={likedIds.includes(listing.id)} onToggleSaved={() => toggleSaved(listing.id)} onToggleLike={() => toggleLike(listing.id)} onChat={() => onContactSeller(listing)} onShare={() => shareListing(listing)} onWhatsAppShare={() => shareToWhatsApp(listing)} onPress={() => onOpenProduct(listing)} />)}
      {!dataLoading && filtered.length === 0 && <EmptyState theme={theme} title="Nothing matched that search" text={dataError ? "Marketplace data could not be loaded. Try again in a moment." : "Try another keyword, category or nearby search to discover more."} actionLabel="Clear search" onAction={() => setSearch("")} icon="search" />}
    </ScreenScroll>
  );
}

function ListingCard({ listing, theme, saved, liked, onToggleSaved, onToggleLike, onChat, onShare, onWhatsAppShare, onPress }: { listing: Listing; theme: Theme; saved: boolean; liked?: boolean; onToggleSaved: () => void; onToggleLike?: () => void; onChat?: () => void; onShare?: () => void; onWhatsAppShare?: () => void; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const [activeImage, setActiveImage] = useState(0);
  const images = listing.images?.length ? listing.images : (listing.image ? [listing.image] : []);
  const galleryWidth = Math.max(280, width - 28);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}> 
      <Pressable onPress={onPress} style={styles.cardHeader}>
        <View style={styles.storeMeta}>
          <View style={[styles.storeAvatar, { backgroundColor: darken(theme.accent, theme.isDark ? 0.35 : 0.88) }]}>
            {listing.storeLogo ? (
              <Image source={{ uri: listing.storeLogo }} style={styles.storeAvatarImage} resizeMode="cover" />
            ) : (
              <Text style={[styles.storeAvatarText, { color: theme.accent }]}>{listing.store.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.storeTextWrap}>
            <Text style={[styles.storeName, { color: theme.text }]} numberOfLines={1}>{listing.store}</Text>
            <Text style={[styles.location, { color: theme.muted }]}>{listing.location}</Text>
          </View>
        </View>
        <MoreHorizontal size={20} color={theme.muted} />
      </Pressable>

      <View style={[styles.productGallery, { width: galleryWidth }]}> 
        {images.length > 0 ? (
          <FlatList
            data={images}
            keyExtractor={(uri, index) => `${listing.id}-${index}-${uri}`}
            horizontal
            pagingEnabled
            directionalLockEnabled
            nestedScrollEnabled
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={galleryWidth}
            snapToAlignment="start"
            disableIntervalMomentum={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / galleryWidth);
              setActiveImage(Math.max(0, Math.min(index, images.length - 1)));
            }}
            renderItem={({ item }) => (
              <Pressable onPress={onPress} style={{ width: galleryWidth }}>
                <Image source={{ uri: item }} style={styles.listingImage} resizeMode="cover" />
              </Pressable>
            )}
          />
        ) : (
          <Pressable onPress={onPress} style={{ width: galleryWidth }}>
            <View style={[styles.listingImage, styles.productGalleryPlaceholder, { backgroundColor: theme.isDark ? "#111827" : "#F3F4F6" }]}>
              <ImageIcon size={30} color={theme.muted} />
            </View>
          </Pressable>
        )}

        {listing.isOnOffer && <View style={styles.generalOfferBadge}><BadgePercent size={12} color="#15803D" /><Text style={styles.generalOfferBadgeText}>OFFER</Text></View>}
        {listing.isFeatured && <View style={styles.generalBoostBadge}><Zap size={11} color="#fff" fill="#fff" /><Text style={styles.generalBoostBadgeText}>BOOSTED</Text></View>}

        {images.length > 1 && <View style={styles.galleryDots}>
          {images.map((_, index) => <View key={index} style={[styles.galleryDot, index === activeImage && styles.galleryDotActive]} />)}
        </View>}
        {images.length > 1 && <View style={styles.galleryCount}><Text style={styles.galleryCountText}>{activeImage + 1}/{images.length}</Text></View>}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.actionRow}>
          <Pressable onPress={() => onToggleLike?.()} hitSlop={8} accessibilityRole="button" accessibilityLabel={liked ? "Unlike product" : "Like product"} style={styles.actionButton}>
            <Heart size={20} color={liked ? "#EF4444" : theme.text} fill={liked ? "#EF4444" : "transparent"} />
            <Text style={[styles.actionCount, { color: theme.muted }]}>{listing.likesCount || 0}</Text>
          </Pressable>
          <Pressable onPress={() => onChat?.()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Chat with seller" style={styles.actionButton}>
            <MessageCircle size={20} color={theme.text} />
          </Pressable>
          <Pressable onPress={() => onShare?.()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share product" style={styles.actionButton}>
            <Share2 size={20} color={theme.text} />
          </Pressable>
          <Pressable onPress={() => onWhatsAppShare?.()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share product on WhatsApp" style={styles.whatsappActionButton}>
            <View style={styles.whatsappIconCircle}>
              <MessageCircle size={18} color="#fff" fill="#25D366" strokeWidth={2.4} />
              <Phone size={8} color="#fff" strokeWidth={3} style={styles.whatsappPhoneMark} />
            </View>
          </Pressable>
          <Pressable onPress={onToggleSaved} style={styles.saveAlign} accessibilityRole="button" accessibilityLabel={saved ? "Remove bookmark" : "Save product"}>
            <Bookmark size={20} color={theme.text} fill={saved ? theme.text : "transparent"} />
          </Pressable>
        </View>
        <Text style={[styles.metaText, { color: theme.muted }]}>{listing.likesCount || 0} people liked this</Text>
        <Pressable onPress={onPress}><Text style={[styles.itemText, { color: theme.text }]}><Text style={styles.itemStore}>{listing.store}</Text> {listing.title}</Text></Pressable>
        <Text style={[styles.price, { color: theme.text }]}>{listing.price}</Text>
        <Text style={[styles.itemMeta, { color: theme.muted }]}>{listing.rating} ★ {listing.reviews} reviews • {listing.category}</Text>
      </View>
    </View>
  );
}

function SavedScreen({ theme, savedIds, onOpenProduct, toggleSaved }: { theme: Theme; savedIds: string[]; onOpenProduct: (l: Listing) => void; toggleSaved: (id: string) => void }) {
  const saved = listings.filter((l) => savedIds.includes(l.id));
  return <ScreenScroll theme={theme}>{saved.length === 0 ? <EmptyState theme={theme} title="Build your shortlist" text="Save products you love and keep them ready for later. Your favourites will appear here." icon="bookmark" /> : <><View style={styles.pageIntro}><Text style={[styles.pageTitle,{color:theme.text}]}>Saved items</Text><Text style={[styles.subtle,{color:theme.muted}]}>Your personal shortlist, ready whenever you are.</Text></View>{saved.map((l) => <ListingCard key={l.id} listing={l} theme={theme} saved onToggleSaved={() => toggleSaved(l.id)} onPress={() => onOpenProduct(l)} />)}</>}</ScreenScroll>;
}

function openReportAlert(type: "listing" | "user", subject: string) {
  const reasons = ["Scam/fraud", "Fake listing", "Prohibited item", "Harassment", "Spam", "Misleading information", "Other"];
  Alert.alert(`Report ${type}`, `Choose a reason for reporting ${subject}.`, reasons.map((reason) => ({ text: reason, onPress: () => Alert.alert("Confirm report", `Report ${subject} for: ${reason}?`, [{ text: "Cancel", style: "cancel" }, { text: "Confirm", style: "destructive", onPress: () => Alert.alert("Report ready", "The current backend does not expose a reporting endpoint, so nothing was sent to the server. The reporting operation is isolated and ready for a real endpoint later.") }]) })));
}

function ProductScreen({ theme, listing, saved, onToggleSaved, onContactSeller, auth }: { theme: Theme; listing: Listing; saved: boolean; onToggleSaved: () => void; onContactSeller: () => void; auth: AuthPayload | null }) {
  const { width } = useWindowDimensions();
  const [activeImage, setActiveImage] = useState(0);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [fulfillment, setFulfillment] = useState("pickup");
  const [submitting, setSubmitting] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const submitPurchase = async () => {
    if (!auth?.access) { Alert.alert("Sign in required", "Please sign in before requesting a purchase."); return; }
    const qty = Number(quantity.replace(/[^0-9]/g, ""));
    if (!Number.isInteger(qty) || qty < 1) { setPurchaseError("Enter a valid quantity."); return; }
    if (listing.stock && qty > listing.stock) { setPurchaseError(`Only ${listing.stock} item${listing.stock === 1 ? "" : "s"} available.`); return; }
    setSubmitting(true); setPurchaseError("");
    try {
      await apiRequest("/api/orders/", { method: "POST", body: JSON.stringify({ listing: Number(listing.id), quantity: qty, message: message.trim(), fulfillment }) }, auth);
      setPurchaseOpen(false); setMessage(""); setQuantity("1");
      Alert.alert("Purchase request sent", "The seller has received your request and can now accept or decline it.");
    } catch (e) { setPurchaseError(e instanceof Error ? e.message : "Could not send the purchase request."); }
    finally { setSubmitting(false); }
  };
  const images = listing.images?.length ? listing.images : (listing.image ? [listing.image] : []);
  const galleryWidth = Math.max(280, width - 48);

  return (
    <>
    <ScreenScroll theme={theme}>
      <View style={[styles.detailGallery, { width: galleryWidth, backgroundColor: theme.isDark ? "#111827" : "#F3F4F6" }]}>
        {images.length > 0 ? (
          <FlatList
            data={images}
            keyExtractor={(uri, index) => `detail-${listing.id}-${index}-${uri}`}
            horizontal
            pagingEnabled
            directionalLockEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={galleryWidth}
            snapToAlignment="start"
            disableIntervalMomentum={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / galleryWidth);
              setActiveImage(Math.max(0, Math.min(index, images.length - 1)));
            }}
            renderItem={({ item }) => (
              <View style={{ width: galleryWidth }}>
                <Image source={{ uri: item }} style={[styles.detailGalleryImage, { width: galleryWidth }]} resizeMode="cover" />
              </View>
            )}
          />
        ) : (
          <View style={[styles.detailGalleryImage, styles.productGalleryPlaceholder, { width: galleryWidth, backgroundColor: theme.isDark ? "#111827" : "#F3F4F6" }]}>
            <ImageIcon size={34} color={theme.muted} />
          </View>
        )}

        {images.length > 1 && (
          <>
            <View style={styles.detailGalleryDots}>
              {images.map((_, index) => (
                <View key={index} style={[styles.galleryDot, index === activeImage && styles.galleryDotActive]} />
              ))}
            </View>
            <View style={styles.galleryCount}>
              <Text style={styles.galleryCountText}>{activeImage + 1}/{images.length}</Text>
            </View>
          </>
        )}
      </View>

      <View style={{ paddingHorizontal: 2 }}>
        <View style={styles.rowBetween}>
          <Text style={[styles.productTitle, { color: theme.text }]}>{listing.title}</Text>
          <Pressable onPress={onToggleSaved}>
            <Bookmark size={22} color={theme.text} fill={saved ? theme.text : "transparent"} />
          </Pressable>
        </View>
        <Text style={[styles.bigPrice, { color: theme.accent }]}>{listing.price}</Text>
        {listing.isOnOffer && listing.originalPrice != null && <Text style={[styles.storeListingOriginalPrice, { color: theme.muted }]}>Regular price: KES {listing.originalPrice.toLocaleString("en-KE")}</Text>}
        <Text style={[styles.itemMeta, { color: theme.muted }]}>{listing.rating} ★ {listing.reviews} reviews • {listing.location}</Text>
        <View style={[styles.storePill, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.detailStoreAvatar,{backgroundColor:darken(theme.accent,theme.isDark ? 0.35 : 0.88)}]}>
            {listing.storeLogo ? <Image source={{uri:listing.storeLogo}} style={styles.detailStoreAvatarImage} resizeMode="cover" /> : <Text style={[styles.detailStoreAvatarText,{color:theme.accent}]}>{listing.store.slice(0,1).toUpperCase()}</Text>}
          </View>
          <Text style={[styles.storePillText,{color:theme.text}]} numberOfLines={1}>{listing.store}</Text>
        </View>
        <Text style={[styles.detailText, { color: theme.text }]}>{listing.description}</Text>
        <View style={styles.detailButtons}>
          <Pressable onPress={onContactSeller} style={[styles.primaryButton, { backgroundColor: BUTTON_BLUE, flex: 1 }]}>
            <MessageCircle size={18} color="#fff" /><Text style={styles.primaryButtonText}>Contact seller</Text>
          </Pressable>
          <Pressable onPress={() => { if (!auth?.access) { Alert.alert("Sign in required", "Please sign in before requesting a purchase."); return; } setPurchaseError(""); setPurchaseOpen(true); }} style={[styles.secondaryButton, { backgroundColor: theme.card, borderColor: theme.border, flex: 1 }]}>
            <ShoppingBag size={18} color={theme.text} /><Text style={[styles.secondaryButtonText, { color: theme.text }]}>Request purchase</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Pressable onPress={() => openReportAlert("listing", listing.title)} style={[styles.reportInlineButton,{borderColor:theme.border,backgroundColor:theme.card}]}>
            <AlertCircle size={16} color={theme.text} /><Text style={[styles.reportInlineText,{color:theme.text}]}>Report listing</Text>
          </Pressable>
          <Pressable onPress={() => openReportAlert("user", listing.store)} style={[styles.reportInlineButton,{borderColor:theme.border,backgroundColor:theme.card}]}>
            <User size={16} color={theme.text} /><Text style={[styles.reportInlineText,{color:theme.text}]}>Report seller</Text>
          </Pressable>
        </View>
      </View>
    </ScreenScroll>
    {purchaseOpen && (
      <View style={styles.profileSheetOverlay}>
        <Pressable style={styles.profileSheetBackdrop} onPress={submitting ? undefined : () => setPurchaseOpen(false)} />
        <View style={[styles.profileSheet, { backgroundColor: theme.card, maxHeight: "82%" }]}>
          <View style={[styles.profileSheetHeader, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}><Text style={[styles.profileSheetTitle, { color: theme.text }]}>Request purchase</Text><Text style={[styles.profileSheetSub, { color: theme.muted }]}>{listing.title}</Text></View>
            <Pressable onPress={() => setPurchaseOpen(false)} disabled={submitting} style={[styles.profileSheetClose, { backgroundColor: theme.isDark ? "#26222F" : "#F1F5F9" }]}><X size={18} color={theme.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
            <Field label="Quantity" value={quantity} onChangeText={setQuantity} theme={theme} keyboardType="number-pad" />
            <Field label="Message to seller (optional)" value={message} onChangeText={setMessage} theme={theme} multiline />
            <View><Text style={[styles.fieldLabel, { color: theme.muted }]}>Fulfilment</Text><View style={[styles.segmented, { backgroundColor: theme.background, borderColor: theme.border, marginTop: 8 }]}>{["pickup", "delivery"].map((option) => <Pressable key={option} onPress={() => setFulfillment(option)} style={[styles.segment, fulfillment === option && { backgroundColor: theme.accent }]}><Text style={[styles.segmentText, { color: fulfillment === option ? "#fff" : theme.text }]}>{option === "pickup" ? "Pickup" : "Delivery"}</Text></Pressable>)}</View></View>
            {!!purchaseError && <Text style={{ color: "#DC2626", fontSize: 13 }}>{purchaseError}</Text>}
          </ScrollView>
          <View style={[styles.profileSheetActions, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
            <Pressable onPress={() => setPurchaseOpen(false)} disabled={submitting} style={[styles.profileCancelButton, { borderColor: theme.border }]}><Text style={[styles.profileCancelText, { color: theme.text }]}>Cancel</Text></Pressable>
            <Pressable onPress={() => void submitPurchase()} disabled={submitting} style={[styles.profileSaveButton, { backgroundColor: BUTTON_BLUE, opacity: submitting ? 0.65 : 1 }]}>{submitting ? <ActivityIndicator color="#fff" /> : <><ShoppingBag size={15} color="#fff" /><Text style={styles.profileSaveText}>Send request</Text></>}</Pressable>
          </View>
        </View>
      </View>
    )}
    </>
  );
}

function CreateScreen({ theme, auth, onDone }: { theme: Theme; auth: AuthPayload | null; onDone: () => Promise<void> | void }) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);
  const [sectionY, setSectionY] = useState({ details: 0, photos: 0, publish: 0 });
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"Product" | "Service">("Product");
  const [category, setCategory] = useState("Electronics");
  const [location, setLocation] = useState("");
  const [negotiable, setNegotiable] = useState(true);
  const [condition, setCondition] = useState("New");
  const [delivery, setDelivery] = useState("Pickup");
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<string, "idle" | "uploading" | "done">>({});

  const categories = kind === "Product"
    ? ["Electronics", "Fashion", "Home & Living", "Books", "Food", "Other"]
    : ["Repairs", "Creative Services", "Tutoring", "Transport", "Professional", "Other"];

  const canPublish = title.trim().length > 2 && price.trim().length > 0 && description.trim().length > 10 && category.length > 0;

  const openPhotoPicker = async () => {
    const remaining = Math.max(0, 8 - photos.length);
    if (remaining === 0) {
      Alert.alert("Photo limit reached", "You can add up to 8 photos to a listing.");
      return;
    }
    Alert.alert("Add listing photos", "Choose where you want to get your photos from.", [
      { text: "Take photo", onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert("Camera permission needed", "Please allow camera access in your device settings to take a listing photo.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.85 });
          if (!result.canceled) setPhotos((current) => [...current, ...result.assets].slice(0, 8));
        } },
      { text: "Choose from gallery", onPress: async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert("Gallery permission needed", "Please allow photo library access in your device settings to select listing photos.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, allowsEditing: false, quality: 0.85 });
          if (!result.canceled) setPhotos((current) => [...current, ...result.assets].slice(0, 8));
        } },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removePhoto = (index: number) => setPhotos((current) => current.filter((_, i) => i !== index));

  const makeCover = (index: number) => {
    if (index === 0) return;
    setPhotos((current) => {
      const next = [...current];
      const [selected] = next.splice(index, 1);
      next.unshift(selected);
      return next;
    });
  };

  const publishListing = async () => {
    if (publishing) return;
    if (!auth?.access) {
      Alert.alert("Sign in required", "Please sign in before publishing a listing.");
      return;
    }
    if (!canPublish) {
      Alert.alert("Finish your listing", "Add a title, price, description and category before publishing.");
      return;
    }
    if (photos.length === 0) {
      Alert.alert("Add photos", "Please add at least one photo so buyers can see your listing.");
      return;
    }

    setPublishing(true);
    try {
      const categoryName = category === "Food" ? "Food & Drinks" : category;
      const categoryEntry = categoryTiles.find(([name]) => name.toLowerCase() === categoryName.toLowerCase());

      setUploadStatus(Object.fromEntries(photos.map((photo) => [photo.uri, "uploading"])));
      const uploadedImages = await Promise.all(photos.map(async (photo) => {
        const uploaded = await uploadAssetToCloudinary(photo, auth);
        setUploadStatus((current) => ({ ...current, [photo.uri]: "done" }));
        return uploaded;
      }));
      const imageUrls = uploadedImages.map((item) => item.secure_url);
      const imagePublicIds = uploadedImages.map((item) => item.public_id);
      const slugBase = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const body: Record<string, any> = {
        kind: kind === "Product" ? "product" : "service",
        title: title.trim(),
        slug: `${slugBase || "listing"}-${Date.now()}`,
        description: description.trim(),
        price: Number(price.replace(/[^0-9.]/g, "")),
        currency: "KES",
        negotiable,
        condition: kind === "Product" ? condition.toLowerCase() : "na",
        stock: 1,
        location: location.trim(),
        tags: [],
        image_urls: imageUrls,
        image_public_ids: imagePublicIds,
        category_name: categoryName,
        is_available: true,
        is_draft: false,
      };

      if (categoryEntry) body.category = categoryEntry[2];
      const created = await apiRequest("/api/listings/", { method: "POST", body: JSON.stringify(body) }, auth);
      const createdListing = mapApiListing(created);
      listings = [createdListing, ...listings.filter((item) => item.id !== createdListing.id)];
      await onDone();
    } catch (error) {
      Alert.alert("Couldn't publish listing", error instanceof Error ? error.message : "Something went wrong while publishing your listing.");
    } finally {
      setPublishing(false);
      setUploadStatus({});
    }
  };

  const jumpToStep = (step: 0 | 1 | 2) => {
    setActiveStep(step);
    const y = step === 0 ? sectionY.details : step === 1 ? sectionY.photos : sectionY.publish;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.stickyProgressWrap, { backgroundColor: theme.background, borderBottomColor: theme.border }]}> 
        <View style={styles.progressRail}>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${(activeStep + 1) * 33.333}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            {[
              { label: "Details", step: 0 as const },
              { label: "Photos", step: 1 as const },
              { label: "Publish", step: 2 as const },
            ].map(({ label, step }) => (
              <Pressable key={label} onPress={() => jumpToStep(step)} hitSlop={8} style={styles.progressStepButton}>
                <Text style={[step === activeStep ? styles.progressLabelActive : styles.progressLabel, { color: step === activeStep ? theme.text : theme.muted }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} onScroll={(e) => { const offsetY = e.nativeEvent.contentOffset.y; const next = offsetY > sectionY.publish - 120 ? 2 : offsetY > sectionY.photos - 120 ? 1 : 0; if (next !== activeStep) setActiveStep(next as 0 | 1 | 2); }} scrollEventThrottle={16} contentContainerStyle={[styles.scrollContent, { paddingTop: 12, paddingBottom: 170 }]}>
        <View style={styles.createHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.createTitle, { color: theme.text }]}>Create listing</Text>
            <Text style={[styles.createSub, { color: theme.muted }]}>Make your item easy to discover and easy to trust.</Text>
          </View>
          <View style={[styles.createStepBadge, { backgroundColor: theme.accent + (theme.isDark ? "22" : "0F") }]}>
            <Text style={[styles.createStepText, { color: theme.accent }]}>{activeStep + 1} of 3</Text>
          </View>
        </View>

        <View onLayout={(e) => { const y = e.nativeEvent.layout.y; setSectionY(v => ({ ...v, details: y })); }} style={[styles.typeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.inlineLabel}><Tag size={16} color={theme.accent} /><Text style={[styles.cardTitle, { color: theme.text }]}>Listing type</Text></View>
          <View style={[styles.segmented, { backgroundColor: theme.background, borderColor: theme.border, marginTop: 10 }]}>
            {(["Product", "Service"] as const).map((option) => (
              <Pressable key={option} onPress={() => setKind(option)} style={[styles.segment, kind === option && { backgroundColor: theme.accent }]}>
                {option === "Product" ? <ShoppingBag size={16} color={kind === option ? "#fff" : theme.muted} /> : <Sparkles size={16} color={kind === option ? "#fff" : theme.muted} />}
                <Text style={[styles.segmentText, { color: kind === option ? "#fff" : theme.text }]}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View onLayout={(e) => { const y = e.nativeEvent.layout.y; setSectionY(v => ({ ...v, photos: y })); }} style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Photos</Text>
          <Text style={[styles.cardHint, { color: theme.muted }]}>Use clear photos. Your first photo becomes the cover.</Text>
          {photos.length > 0 ? (
            <>
              <Pressable onPress={openPhotoPicker} style={[styles.photoCoverImage, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Image source={{ uri: photos[0].uri }} style={styles.photoCoverImageFill} />
                <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>COVER PHOTO</Text></View>
                {uploadStatus[photos[0].uri] === "uploading" && (
                  <View style={styles.uploadOverlay}><ActivityIndicator size="large" color="#fff" /><Text style={styles.uploadOverlayText}>Uploading…</Text></View>
                )}
                {uploadStatus[photos[0].uri] === "done" && <View style={styles.uploadDoneBadge}><Check size={14} color="#fff" /></View>}
                <View style={styles.coverEditHint}><ImageIcon size={14} color="#fff" /><Text style={styles.coverEditText}>Tap to add more</Text></View>
              </Pressable>
              <Text style={[styles.coverHelper, { color: theme.muted }]}>The first photo is your cover. Tap another photo below to make it the cover.</Text>
              <View style={styles.photoThumbRowWide}>
                {photos.slice(1).map((photo, index) => {
                  const actualIndex = index + 1;
                  const status = uploadStatus[photo.uri];
                  return (
                    <Pressable key={`${photo.uri}-${actualIndex}`} onPress={() => makeCover(actualIndex)} style={[styles.photoThumbLarge, { backgroundColor: theme.background, borderColor: theme.border }]}>
                      <Image source={{ uri: photo.uri }} style={styles.photoThumbImage} />
                      {status === "uploading" && <View style={styles.thumbnailUploadOverlay}><ActivityIndicator size="small" color="#fff" /></View>}
                      {status === "done" && <View style={styles.thumbnailDoneBadge}><Check size={11} color="#fff" /></View>}
                      <Pressable onPress={() => removePhoto(actualIndex)} style={styles.photoRemoveButton}><Text style={styles.photoRemoveText}>×</Text></Pressable>
                    </Pressable>
                  );
                })}
                {photos.length < 8 && (
                  <Pressable onPress={openPhotoPicker} style={[styles.photoThumbLarge, styles.photoAddThumb, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Plus size={20} color={theme.accent} />
                  </Pressable>
                )}
              </View>
            </>
          ) : (
            <Pressable onPress={openPhotoPicker} style={[styles.photoCover, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.photoAddedState}>
                <View style={[styles.photoUploadIcon, { backgroundColor: theme.accent + (theme.isDark ? "22" : "12") }]}><Plus size={24} color={theme.accent} /></View>
                <Text style={[styles.photoUploadTitle, { color: theme.text }]}>Add listing photos</Text>
                <Text style={[styles.photoHint, { color: theme.muted }]}>Up to 8 photos • JPG or PNG</Text>
              </View>
            </Pressable>
          )}
        </View>

        <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.inlineLabel}><Tag size={16} color={theme.accent} /><Text style={[styles.cardTitle, { color: theme.text }]}>Listing details</Text></View>
          <Field label="Title" value={title} onChangeText={setTitle} placeholder={kind === "Product" ? "e.g. Refurbished HP EliteBook 840" : "e.g. Professional portrait photography"} theme={theme} />
          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}><Field label="Price" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="KSh 0" theme={theme} /></View>
            <View style={styles.switchWrapModern}><Text style={[styles.switchLabel, { color: theme.text }]}>Negotiable</Text><Switch value={negotiable} onValueChange={setNegotiable} trackColor={{ false: theme.border, true: theme.accent }} thumbColor="#fff" /></View>
          </View>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPicker}>
            {categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryChip, { borderColor: theme.border, backgroundColor: theme.background }, category === item && { borderColor: theme.accent, backgroundColor: theme.accent }]}><Text style={[styles.categoryChipText, { color: category === item ? "#fff" : theme.text }]}>{item}</Text></Pressable>)}
          </ScrollView>
          {kind === "Product" && <><Text style={[styles.fieldLabel, { color: theme.text }]}>Condition</Text><View style={styles.optionRow}>{["New","Used"].map((item)=><Pressable key={item} onPress={()=>setCondition(item)} style={[styles.optionPill,{borderColor:theme.border,backgroundColor:theme.background},condition===item&&{backgroundColor:theme.accent,borderColor:theme.accent}]}><Text style={[styles.optionPillText,{color:condition===item?"#fff":theme.text}]}>{item}</Text></Pressable>)}</View></>}
          <View style={styles.inlineFieldLabel}><MapPin size={15} color={theme.muted}/><Text style={[styles.fieldLabelNoMargin,{color:theme.text}]}>Location</Text></View>
          <Field label="" value={location} onChangeText={setLocation} placeholder="Town, area or pickup point" theme={theme}/>
          <Text style={[styles.fieldLabel,{color:theme.text}]}>Description</Text>
          <TextInput value={description} onChangeText={setDescription} multiline maxLength={500} placeholder="Describe the item or service honestly. Mention condition, availability, what is included and anything a buyer should know." placeholderTextColor={theme.muted} style={[styles.descriptionInput,{color:theme.text,borderColor:theme.border,backgroundColor:theme.background}]}/>
          <Text style={[styles.characterHint,{color:theme.muted}]}>{description.length}/500</Text>
        </View>

        <View style={[styles.formCard,{backgroundColor:theme.card,borderColor:theme.border}]}>
          <View style={styles.inlineLabel}><Truck size={16} color={theme.accent}/><Text style={[styles.cardTitle,{color:theme.text}]}>Fulfilment</Text></View>
          <Text style={[styles.cardHint,{color:theme.muted}]}>Tell buyers how they can receive the item.</Text>
          <View style={styles.optionRow}>{["Pickup","Delivery","Both"].map((item)=><Pressable key={item} onPress={()=>setDelivery(item)} style={[styles.optionPill,{borderColor:theme.border,backgroundColor:theme.background},delivery===item&&{backgroundColor:theme.accent,borderColor:theme.accent}]}><Text style={[styles.optionPillText,{color:delivery===item?"#fff":theme.text}]}>{item}</Text></Pressable>)}</View>
        </View>

        <View onLayout={(e) => { const y = e.nativeEvent.layout.y; setSectionY(v => ({ ...v, publish: y })); }} style={[styles.tipCard,{backgroundColor:theme.accent+(theme.isDark?"18":"0D"),borderColor:theme.accent+"35"}]}>
          <Eye size={18} color={theme.accent}/><View style={{flex:1}}><Text style={[styles.tipTitle,{color:theme.text}]}>A strong listing gets noticed</Text><Text style={[styles.tipText,{color:theme.muted}]}>Clear photos, an honest description and a specific title help buyers feel confident.</Text></View>
        </View>
      </ScrollView>

      <View style={[styles.publishSheetFixed,{backgroundColor:theme.card,borderColor:theme.border}]}>
        <View style={{flex:1}}><Text style={[styles.publishSheetTitle,{color:theme.text}]}>{canPublish?"Ready to publish":"Finish the details"}</Text><Text style={[styles.publishSheetSub,{color:theme.muted}]}>You can save a draft and publish later.</Text></View>
        <Pressable onPress={()=>Alert.alert("Draft saved","Your listing has been saved as a draft.")} style={[styles.secondaryButton,{backgroundColor:theme.background,borderColor:theme.border}]}><Text style={[styles.secondaryButtonText,{color:theme.text}]}>Draft</Text></Pressable>
        <Pressable disabled={!canPublish || publishing} onPress={() => { void publishListing(); }} style={[styles.primaryButton,{backgroundColor:canPublish && !publishing?BUTTON_BLUE:theme.border,minWidth:108}]}><Text style={styles.primaryButtonText}>{publishing ? "Publishing…" : "Publish"}</Text></Pressable>
      </View>
    </View>
  );
}

function PublishSuccessScreen({ theme, onBrowse, onHome }: { theme: Theme; onBrowse: () => void; onHome: () => void }) {
  const Animated = require("react-native").Animated;
  const badgeScale = useRef(new Animated.Value(0.25)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.72)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.35)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(0.25)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.spring(badgeScale, { toValue: 1, damping: 12, stiffness: 180, mass: 0.7, useNativeDriver: true }),
        Animated.timing(badgeOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, damping: 9, stiffness: 240, mass: 0.55, useNativeDriver: true }),
        Animated.timing(checkOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(sparkleScale, { toValue: 1, damping: 10, stiffness: 160, mass: 0.7, useNativeDriver: true }),
        Animated.timing(sparkleOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(checkScale, { toValue: 1.06, duration: 130, useNativeDriver: true }),
        Animated.timing(badgeScale, { toValue: 1.035, duration: 130, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, damping: 10, stiffness: 240, mass: 0.5, useNativeDriver: true }),
        Animated.spring(badgeScale, { toValue: 1, damping: 12, stiffness: 200, mass: 0.7, useNativeDriver: true }),
      ]),
    ]);

    sequence.start();
    return () => sequence.stop();
  }, [badgeScale, badgeOpacity, checkOpacity, checkScale, ringOpacity, ringScale, sparkleOpacity, sparkleScale]);

  return (
    <View style={[styles.successScreen, { backgroundColor: theme.background }]}> 
      <View style={styles.verifiedAnimationWrap}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.successHalo,
            {
              borderColor: theme.accent + "18",
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.successSparkle,
            styles.sparkleTop,
            { backgroundColor: theme.accent, opacity: sparkleOpacity, transform: [{ scale: sparkleScale }] },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.successSparkle,
            styles.sparkleRight,
            { backgroundColor: theme.accent, opacity: sparkleOpacity, transform: [{ scale: sparkleScale }] },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.successSparkle,
            styles.sparkleBottom,
            { backgroundColor: theme.accent, opacity: sparkleOpacity, transform: [{ scale: sparkleScale }] },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.successSparkle,
            styles.sparkleLeft,
            { backgroundColor: theme.accent, opacity: sparkleOpacity, transform: [{ scale: sparkleScale }] },
          ]}
        />

        <Animated.View
          style={[
            styles.verifiedBadge,
            {
              backgroundColor: theme.accent,
              opacity: badgeOpacity,
              transform: [{ scale: badgeScale }],
              shadowColor: theme.accent,
            },
          ]}
        >
          <Animated.View style={{ opacity: checkOpacity, transform: [{ scale: checkScale }] }}>
            <Check size={62} color="#fff" strokeWidth={3.2} />
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: checkOpacity, width: "100%" }}>
        <Text style={[styles.successTitle, { color: theme.text }]}>Listing published!</Text>
        <Text style={[styles.successSub, { color: theme.muted }]}>Your item is now live on Marketplace and ready to be discovered by buyers.</Text>
        <View style={styles.successActions}>
          <Pressable onPress={onBrowse} style={[styles.primaryButton, { backgroundColor: BUTTON_BLUE, flex: 1 }]}><Compass size={18} color="#fff" /><Text style={styles.primaryButtonText}>Browse marketplace</Text></Pressable>
          <Pressable onPress={onHome} style={[styles.secondaryButton, { backgroundColor: theme.card, borderColor: theme.border, flex: 1 }]}><HomeIcon size={18} color={theme.text} /><Text style={[styles.secondaryButtonText, { color: theme.text }]}>Go home</Text></Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

function MetaVerifiedBadge({ size = 18 }: { size?: number }) {
  const check = Math.max(8, Math.round(size * 0.52));
  return (
    <View accessibilityLabel="Verified" style={[styles.metaVerifiedBadge,{width:size,height:size,borderRadius:size/2}]}>
      <Check size={check} color="#fff" strokeWidth={3.2} />
    </View>
  );
}

function ProfileScreen({ theme, currentUser, isLoggedIn, onUserUpdated, onOrders, onSettings, onSecurity, onNotificationPreferences, onHelp, onSignIn, onSignUp, onGoogle, onStore, onMessages, savedCount = 0 }: { theme: Theme; currentUser: ApiUser | null; isLoggedIn: boolean; onUserUpdated: (user: ApiUser) => void; onOrders: () => void; onSettings: () => void; onSecurity: () => void; onNotificationPreferences: () => void; onHelp: () => void; onSignIn: () => void; onSignUp: () => void; onGoogle: () => void; onStore: () => void; onMessages: () => void; savedCount?: number }) {
  const insets = useSafeAreaInsets();
  const [profileMode, setProfileMode] = useState<"buyer" | "seller">("buyer");
  const [editing, setEditing] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [store, setStore] = useState<ProfileStore | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const initials = (currentUser?.full_name || currentUser?.email || "U").split(/\s+/).map((x) => x[0]).join("").slice(0,2).toUpperCase();
  const displayName = currentUser?.full_name || currentUser?.email?.split("@")[0] || "Marketplace member";

  useEffect(() => {
    if (!isLoggedIn || !globalThis.__MARKETPLACE_AUTH__?.access) return;
    let active = true;
    setStoreLoading(true);
    apiRequest("/api/stores/mine/", {}, globalThis.__MARKETPLACE_AUTH__)
      .then((data) => { if (active) setStore(data as ProfileStore); })
      .catch(() => { if (active) setStore(null); })
      .finally(() => { if (active) setStoreLoading(false); });
    return () => { active = false; };
  }, [isLoggedIn]);

  if (!isLoggedIn) return <ScreenScroll theme={theme} contentStyle={{ paddingBottom: 120 }}>
    <View style={[styles.profileAuthCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.profileAuthIcon, { backgroundColor: theme.isDark ? "rgba(96,165,250,.12)" : "#EFF6FF" }]}><User size={30} color={theme.accent} /></View>
      <Text style={[styles.profileAuthTitle, { color: theme.text }]}>Welcome to Marketplace</Text>
      <Text style={[styles.profileAuthText, { color: theme.muted }]}>Sign in to manage your profile, listings, orders, messages and preferences.</Text>
      <Pressable onPress={onGoogle} style={[styles.profileAuthButton, { backgroundColor: theme.card, borderColor: theme.border }]}><Text style={[styles.profileAuthButtonText, { color: theme.text }]}>Continue with Google</Text></Pressable>
      <Pressable onPress={onSignIn} style={[styles.profileAuthButton, { backgroundColor: BUTTON_BLUE, borderColor: BUTTON_BLUE }]}><Text style={[styles.profileAuthButtonText, { color: "#fff" }]}>Sign In</Text></Pressable>
      <Pressable onPress={onSignUp} style={[styles.profileAuthButton, { backgroundColor: theme.card, borderColor: theme.border }]}><Text style={[styles.profileAuthButtonText, { color: theme.text }]}>Create Account</Text></Pressable>
      <Pressable onPress={onSignIn} style={{ padding: 10 }}><Text style={{ color: theme.accent, fontSize: 12, fontWeight: "800" }}>Forgot Password?</Text></Pressable>
    </View>
  </ScreenScroll>;

  const buyerActions = [
    { icon: <ShoppingBag size={18} color={theme.accent} />, title: "My orders", text: "Track purchases & delivery", onPress: onOrders },
    { icon: <Bookmark size={18} color={theme.accent} />, title: "Saved items", text: `${savedCount} saved ${savedCount === 1 ? "item" : "items"}`, onPress: () => {} },
    { icon: <MessageCircle size={18} color={theme.accent} />, title: "Messages", text: "Chat with sellers", onPress: onMessages },
    { icon: <Store size={18} color={theme.accent} />, title: "Following", text: "Stores you follow", onPress: () => {} },
  ];
  const sellerActions = [
    { icon: <Store size={18} color={theme.accent} />, title: "Seller hub", text: "Manage your store", onPress: onStore },
    { icon: <Tag size={18} color={theme.accent} />, title: "Listings", text: "Create & manage listings", onPress: onStore },
    { icon: <ShoppingBag size={18} color={theme.accent} />, title: "Sales & orders", text: "Review customer orders", onPress: onOrders },
    { icon: <MessageCircle size={18} color={theme.accent} />, title: "Buyer messages", text: "Respond to enquiries", onPress: onMessages },
  ];
  const actions = profileMode === "buyer" ? buyerActions : sellerActions;

  return <>
    <ScreenScroll theme={theme} contentStyle={{ paddingBottom: 120 }}>
      <View style={[styles.profileHeroCard,{backgroundColor:theme.card,borderColor:theme.border}]}>
        <View style={styles.profileHeroTop}>
          <ProfileAvatar uri={currentUser?.avatar || currentUser?.avatar_url} initials={initials} size={78} theme={theme} />
          <View style={{flex:1,minWidth:0}}>
            <View style={styles.profileNameLine}>
              <Text style={[styles.profileName,{color:theme.text}]} numberOfLines={1}>{displayName}</Text>
              {currentUser?.is_community_verified && <MetaVerifiedBadge size={18} />}
            </View>
            <Text style={[styles.profileEmail,{color:theme.muted}]} numberOfLines={1}>{currentUser?.email}</Text>
            <Text style={[styles.profileMember,{color:theme.muted}]}>Marketplace member</Text>
          </View>

        </View>
        <View style={[styles.profileTrustRow,{borderTopColor:theme.border}]}>
          <View style={styles.profileTrustItem}><ShieldIcon theme={theme}/><View><Text style={[styles.profileTrustTitle,{color:theme.text}]}>Protected account</Text><Text style={[styles.profileTrustText,{color:theme.muted}]}>Secure marketplace access</Text></View></View>
          <View style={[styles.profileTrustDivider,{backgroundColor:theme.border}]} />
          <View style={styles.profileTrustItem}><Check size={17} color="#2B9E63"/><View><Text style={[styles.profileTrustTitle,{color:theme.text}]}>Good standing</Text><Text style={[styles.profileTrustText,{color:theme.muted}]}>No account issues</Text></View></View>
        </View>
      </View>

      <View style={[styles.profileModeSwitch,{backgroundColor:theme.card,borderColor:theme.border}]}>
        <Pressable onPress={() => setProfileMode("buyer")} style={[styles.profileModeButton, profileMode === "buyer" && {backgroundColor:BUTTON_BLUE}]}><ShoppingBag size={15} color={profileMode === "buyer" ? "#fff" : theme.muted}/><Text style={[styles.profileModeText,{color:profileMode === "buyer" ? "#fff" : theme.muted}]}>Buyer</Text></Pressable>
        <Pressable onPress={() => setProfileMode("seller")} style={[styles.profileModeButton, profileMode === "seller" && {backgroundColor:BUTTON_BLUE}]}><Store size={15} color={profileMode === "seller" ? "#fff" : theme.muted}/><Text style={[styles.profileModeText,{color:profileMode === "seller" ? "#fff" : theme.muted}]}>Seller</Text></Pressable>
      </View>

      <View style={styles.profileSectionHeader}>
        <View><Text style={[styles.profileSectionTitle,{color:theme.text}]}>{profileMode === "buyer" ? "Buyer dashboard" : "Seller workspace"}</Text><Text style={[styles.profileSectionSub,{color:theme.muted}]}>{profileMode === "buyer" ? "Everything you need to shop with confidence." : "Everything you need to run a trusted store."}</Text></View>
        <View style={[styles.profileRoleBadge,{backgroundColor:theme.isDark?"rgba(96,165,250,.12)":"#EFF6FF"}]}><Text style={[styles.profileRoleBadgeText,{color:theme.accent}]}>{profileMode === "buyer" ? "SHOPPING" : "SELLING"}</Text></View>
      </View>

      <View style={styles.profileActionGrid}>
        {actions.map((item) => <ProfileActionTile key={item.title} theme={theme} icon={item.icon} title={item.title} text={item.text} onPress={item.onPress} />)}
      </View>

      {profileMode === "buyer" ? <>
        <View style={[styles.profileFeatureCard,{backgroundColor:theme.card,borderColor:theme.border}]}>
          <View style={[styles.profileFeatureIcon,{backgroundColor:theme.isDark?"rgba(96,165,250,.12)":"#EFF6FF"}]}><ShieldIcon theme={theme}/></View>
          <View style={{flex:1}}><Text style={[styles.profileFeatureTitle,{color:theme.text}]}>Shop with confidence</Text><Text style={[styles.profileFeatureText,{color:theme.muted}]}>Keep your account verified, review seller ratings, and use Marketplace messages before sharing payment or delivery details.</Text></View>
        </View>
        <ProfileRow theme={theme} icon={<Heart size={19} color={theme.text}/>} title="Wishlist & saved searches" onPress={() => {}} />
      </> : <>
        <View style={[styles.sellerSetupCard,{backgroundColor:theme.isDark ? "#172554" : "#EFF6FF", borderWidth:1, borderColor:theme.isDark ? "#1E3A8A" : "#BFDBFE"}]}>
          <View style={{flex:1}}><Text style={styles.sellerSetupEyebrow}>SELLER READINESS</Text><Text style={[styles.sellerSetupTitle,{color:theme.text}]}>Build a store buyers trust.</Text><Text style={[styles.sellerSetupText,{color:theme.muted}]}>Add your store details, listings, delivery options and payout information.</Text></View>
          <Pressable onPress={onStore} style={[styles.sellerSetupButton,{backgroundColor:BUTTON_BLUE}]}><Text style={styles.sellerSetupButtonText}>Set up</Text><ChevronRight size={16} color="#fff"/></Pressable>
        </View>
        <View style={styles.profileSectionHeader}><View><Text style={[styles.profileSectionTitle,{color:theme.text}]}>Seller essentials</Text><Text style={[styles.profileSectionSub,{color:theme.muted}]}>Tools to keep your business organized.</Text></View></View>
        <View style={styles.profileEssentialsRow}>
          <ProfileMiniFeature theme={theme} icon={<Tag size={17} color={theme.accent}/>} title="Listing quality" text="Photos, pricing & stock" />
          <ProfileMiniFeature theme={theme} icon={<Truck size={17} color={theme.accent}/>} title="Fulfilment" text="Delivery & pickup" />
        </View>
      </>}

      <View style={styles.profileSectionHeader}><View><Text style={[styles.profileSectionTitle,{color:theme.text}]}>Account</Text><Text style={[styles.profileSectionSub,{color:theme.muted}]}>Preferences, privacy and support.</Text></View></View>
      <ProfileRow theme={theme} icon={<Settings size={19} color={theme.text}/>} title="Settings & preferences" onPress={onSettings}/>
      <ProfileRow theme={theme} icon={<LockKeyhole size={19} color={theme.text}/>} title="Security & privacy" onPress={onSecurity} />
      <ProfileRow theme={theme} icon={<Bell size={19} color={theme.text}/>} title="Notifications" onPress={onNotificationPreferences} />
      <ProfileRow theme={theme} icon={<MessageCircle size={19} color={theme.text}/>} title="Help & support" onPress={onHelp} />
      {storeLoading && <Text style={[styles.profileLoading,{color:theme.muted}]}>Loading store profile…</Text>}
    </ScreenScroll>

  </>;
}

function EditProfileSheet({ theme, currentUser, store, insetsBottom, onClose, onUserUpdated, onStoreUpdated }: { theme: Theme; currentUser: ApiUser; store: ProfileStore | null; insetsBottom: number; onClose: () => void; onUserUpdated: (user: ApiUser) => void; onStoreUpdated: (store: ProfileStore) => void }) {
  const [fullName, setFullName] = useState(currentUser.full_name || "");
  const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [storeName, setStoreName] = useState(store?.name || "");
  const [storeDescription, setStoreDescription] = useState(store?.description || "");
  const [storeLocation, setStoreLocation] = useState(store?.location || "");
  const [storePhone, setStorePhone] = useState(store?.phone || "");
  const [logo, setLogo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [cover, setCover] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function chooseImage(kind: "avatar" | "logo" | "cover") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo permission needed", "Allow Marketplace to access your photos so you can update your profile or store images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: kind === "cover" ? [16, 7] : [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    if (kind === "avatar") setAvatar(result.assets[0]);
    if (kind === "logo") setLogo(result.assets[0]);
    if (kind === "cover") setCover(result.assets[0]);
  }

  function appendImage(form: FormData, field: string, asset: ImagePicker.ImagePickerAsset | null, fallbackName: string) {
    if (!asset) return;
    const uri = asset.uri;
    const extension = uri.split(".").pop()?.split("?")[0] || "jpg";
    const mime = asset.mimeType || (extension.toLowerCase() === "png" ? "image/png" : "image/jpeg");
    form.append(field, { uri, name: `${fallbackName}.${extension}`, type: mime } as any);
  }

  async function saveChanges() {
    if (!fullName.trim()) { setError("Please enter your name."); return; }
    if (!globalThis.__MARKETPLACE_AUTH__?.access) { setError("Please sign in again before editing your profile."); return; }
    setSaving(true); setError("");
    try {
      const activeAuth = globalThis.__MARKETPLACE_AUTH__!;
      let avatarUrl: string | undefined;
      let logoUrl: string | undefined;
      let coverUrl: string | undefined;
      if (avatar) avatarUrl = (await uploadAssetToCloudinary(avatar, activeAuth, "avatar")).secure_url;
      if (logo) logoUrl = (await uploadAssetToCloudinary(logo, activeAuth, "store_logo")).secure_url;
      if (cover) coverUrl = (await uploadAssetToCloudinary(cover, activeAuth, "store_cover")).secure_url;

      const userPayload: any = { full_name: fullName.trim() };
      if (avatarUrl) userPayload.avatar_url = avatarUrl;
      const updatedUser = await apiRequest("/api/auth/me/", { method: "PATCH", body: JSON.stringify(userPayload) }, activeAuth) as ApiUser;
      const nextAuth = { ...activeAuth, user: updatedUser };
      globalThis.__MARKETPLACE_AUTH__ = nextAuth;
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
      onUserUpdated(updatedUser);

      if (store) {
        const storePayload: any = {
          name: storeName.trim(),
          description: storeDescription.trim(),
          location: storeLocation.trim(),
          phone: storePhone.trim(),
        };
        if (logoUrl) storePayload.logo_url = logoUrl;
        if (coverUrl) storePayload.cover_url = coverUrl;
        const updatedStore = await apiRequest("/api/stores/mine/", { method: "PATCH", body: JSON.stringify(storePayload) }, globalThis.__MARKETPLACE_AUTH__) as ProfileStore;
        onStoreUpdated(updatedStore);
      }

      Alert.alert("Profile updated", "Your profile and store changes have been saved.", [{ text: "Done", onPress: onClose }]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  }

  return <View style={styles.profileSheetOverlay}>
    <Pressable style={styles.profileSheetBackdrop} onPress={saving ? undefined : onClose} />
    <View style={[styles.profileSheet,{backgroundColor:theme.card,paddingBottom:Math.max(insetsBottom,12)}]}>
      <View style={[styles.profileSheetHeader,{borderBottomColor:theme.border}]}>
        <View><Text style={[styles.profileSheetTitle,{color:theme.text}]}>Edit profile</Text><Text style={[styles.profileSheetSub,{color:theme.muted}]}>Update your profile and store appearance.</Text></View>
        <Pressable onPress={onClose} disabled={saving} style={[styles.profileSheetClose,{backgroundColor:theme.isDark?"#26222F":"#F1F5F9"}]}><X size={18} color={theme.text}/></Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{padding:16,paddingBottom:18}} keyboardShouldPersistTaps="handled">
        <Text style={[styles.profileEditSectionTitle,{color:theme.text}]}>Personal profile</Text>
        <View style={[styles.profileEditCard,{backgroundColor:theme.isDark?"#17141D":"#F8FAFF",borderColor:theme.border}]}>
          <View style={styles.profileEditAvatarRow}>
            {avatar ? (
              <Image source={{uri:avatar.uri}} style={styles.profileEditAvatar} />
            ) : (
              <ProfileAvatar
                uri={currentUser.avatar || currentUser.avatar_url}
                initials={(currentUser.full_name || "U").split(/\s+/).map((x) => x[0]).join("").slice(0,2).toUpperCase()}
                size={74}
                theme={theme}
              />
            )}
            <View style={{flex:1}}><Text style={[styles.profileEditLabel,{color:theme.text}]}>Profile photo</Text><Text style={[styles.profileEditHint,{color:theme.muted}]}>Choose a clear photo for your account.</Text><Pressable onPress={() => chooseImage("avatar")} style={[styles.profileBlueButton,{backgroundColor:BUTTON_BLUE}]}><Camera size={14} color="#fff"/><Text style={styles.profileBlueButtonText}>Choose photo</Text></Pressable></View>
          </View>
          <Field label="Profile name" value={fullName} onChangeText={setFullName} theme={theme} />
          <Text style={[styles.profileIdentityHint,{color:theme.muted}]}>Your personal name. This is separate from your store name.</Text>
          <View style={{marginBottom:2}}><Text style={[styles.fieldLabel,{color:theme.text}]}>Email address</Text><View style={[styles.profileLockedField,{backgroundColor:theme.isDark?"#24212B":"#EEF2F7",borderColor:theme.border}]}><Text style={[styles.profileLockedText,{color:theme.muted}]} numberOfLines={1}>{currentUser.email}</Text><LockKeyhole size={16} color={theme.muted}/></View><Text style={[styles.profileEditHint,{color:theme.muted}]}>Your email is tied to your account and cannot be changed.</Text></View>
        </View>

        {store && <>
          <Text style={[styles.profileEditSectionTitle,{color:theme.text,marginTop:18}]}>Store profile</Text>
          <View style={[styles.profileEditCard,{backgroundColor:theme.isDark?"#17141D":"#F8FAFF",borderColor:theme.border}]}>
            <View style={[styles.profileCoverPreview,{backgroundColor:theme.isDark?"#172554":"#DBEAFE",borderColor:theme.border}]}>
              {cover ? <Image source={{uri:cover.uri}} style={StyleSheet.absoluteFillObject} resizeMode="cover" /> : store.cover ? <Image source={{uri:store.cover}} style={StyleSheet.absoluteFillObject} resizeMode="cover" /> : <View style={{alignItems:"center"}}><ImageIcon size={24} color={theme.accent}/><Text style={[styles.profileEditHint,{color:theme.accent}]}>No store cover yet</Text></View>}
              <Pressable onPress={() => chooseImage("cover")} style={[styles.profileCoverButton,{backgroundColor:BUTTON_BLUE}]}><ImageIcon size={14} color="#fff"/><Text style={styles.profileBlueButtonText}>Change cover</Text></Pressable>
            </View>
            <View style={styles.profileStoreLogoRow}>
              {logo ? <Image source={{uri:logo.uri}} style={styles.profileStoreLogo} /> : store.logo ? <Image source={{uri:store.logo}} style={styles.profileStoreLogo} /> : <View style={[styles.profileStoreLogo,{backgroundColor:BUTTON_BLUE}]}><Store size={22} color="#fff"/></View>}
              <View style={{flex:1}}><Text style={[styles.profileEditLabel,{color:theme.text}]}>Store logo</Text><Pressable onPress={() => chooseImage("logo")} style={[styles.profileBlueButton,{backgroundColor:BUTTON_BLUE,alignSelf:"flex-start",marginTop:6}]}><Camera size={14} color="#fff"/><Text style={styles.profileBlueButtonText}>Change logo</Text></Pressable></View>
            </View>
            <Field label="Store name" value={storeName} onChangeText={setStoreName} theme={theme} />
            <Text style={[styles.profileIdentityHint,{color:theme.muted}]}>Your public storefront can use a different name from your personal profile.</Text>
            <Field label="Description" value={storeDescription} onChangeText={setStoreDescription} theme={theme} multiline />
            <Field label="Location" value={storeLocation} onChangeText={setStoreLocation} theme={theme} />
            <Field label="Phone" value={storePhone} onChangeText={setStorePhone} theme={theme} keyboardType="phone-pad" />
          </View>
        </>}

        {!!error && <View style={[styles.profileEditError,{backgroundColor:theme.isDark?"#3A1F25":"#FEF2F2",borderColor:theme.isDark?"#7F1D1D":"#FECACA"}]}><AlertCircle size={17} color="#DC2626"/><Text style={[styles.profileEditErrorText,{color:theme.isDark?"#FCA5A5":"#B91C1C"}]}>{error}</Text></View>}
      </ScrollView>

      <View style={[styles.profileSheetActions,{borderTopColor:theme.border,backgroundColor:theme.card,paddingBottom:Math.max(insetsBottom,12)}]}>
        <Pressable onPress={onClose} disabled={saving} style={[styles.profileCancelButton,{borderColor:theme.border,backgroundColor:theme.card}]}><Text style={[styles.profileCancelText,{color:theme.text}]}>Cancel</Text></Pressable>
        <Pressable onPress={saveChanges} disabled={saving} style={[styles.profileSaveButton,{backgroundColor:BUTTON_BLUE,opacity:saving?0.7:1}]}>{saving ? <RotateCcw size={16} color="#fff"/> : <Check size={16} color="#fff"/>}<Text style={styles.profileSaveText}>{saving ? "Saving…" : "Save changes"}</Text></Pressable>
      </View>
    </View>
  </View>;
}

function OrdersScreen({ theme, auth, currentUser }: { theme: Theme; auth: AuthPayload | null; currentUser: ApiUser | null }) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = async (refresh = false) => {
    if (!auth?.access) { setLoading(false); return; }
    refresh ? setRefreshing(true) : setLoading(true);
    try { setOrders(apiResults<OrderItem>(await apiRequest("/api/orders/", {}, auth))); }
    catch (e) { Alert.alert("Couldn't load orders", e instanceof Error ? e.message : "Please try again."); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { void load(); }, [auth?.access]);
  const transition = async (order: OrderItem, status: string) => {
    try {
      const updated = await apiRequest(`/api/orders/${order.id}/transition/`, { method: "POST", body: JSON.stringify({ status }) }, auth) as OrderItem;
      setOrders(items => items.map(x => x.id === order.id ? updated : x));
    } catch (e) { Alert.alert("Couldn't update order", e instanceof Error ? e.message : "Please try again."); }
  };
  const confirmReceived = async (order: OrderItem) => {
    try {
      const updated = await apiRequest(`/api/orders/${order.id}/confirm_received/`, { method: "POST" }, auth) as OrderItem;
      setOrders(items => items.map(x => x.id === order.id ? updated : x));
    } catch (e) { Alert.alert("Couldn't confirm receipt", e instanceof Error ? e.message : "Please try again."); }
  };
  if (!auth?.access) return <ScreenScroll theme={theme}><EmptyState theme={theme} title="Your orders are waiting" text="Sign in to request purchases and track them here." icon="orders" /></ScreenScroll>;
  return <ScreenScroll theme={theme}>
    <View style={styles.pageIntro}><Text style={[styles.pageTitle,{color:theme.text}]}>My orders</Text><Text style={[styles.subtle,{color:theme.muted}]}>Track purchases, seller requests and fulfilment progress.</Text></View>
    {loading ? <View style={{ padding: 40, alignItems: "center" }}><ActivityIndicator color={BUTTON_BLUE}/></View> : orders.length === 0 ? <EmptyState theme={theme} title="No orders yet" text="When you request a purchase, its status will appear here." icon="orders" /> :
      <View style={{ gap: 12 }}>{orders.map(order => {
        const mineAsBuyer = order.buyer === currentUser?.id;
        const item = order.listing_detail;
        const canAccept = !mineAsBuyer && order.status === "pending";
        const canPrepare = !mineAsBuyer && order.status === "accepted";
        const canReady = !mineAsBuyer && order.status === "preparing";
        const canComplete = !mineAsBuyer && order.status === "ready";
        return <View key={order.id} style={[styles.orderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.rowBetween}><View style={{flex:1}}><Text style={[styles.cardTitle,{color:theme.text}]} numberOfLines={1}>{item?.title || `Order #${order.id}`}</Text><Text style={[styles.subtle,{color:theme.muted}]}>{mineAsBuyer ? "Purchase request" : "Buyer request"} • Qty {order.quantity}</Text></View><Badge text={order.status.charAt(0).toUpperCase() + order.status.slice(1)} theme={theme}/></View>
          {!!order.message && <Text style={[styles.subtle,{color:theme.text, marginTop:8}]}>{order.message}</Text>}
          <Text style={[styles.subtle,{color:theme.muted, marginTop:8}]}>{order.fulfillment === "delivery" ? "Delivery" : "Pickup"} • {new Date(order.created_at).toLocaleDateString()}</Text>
          <View style={{flexDirection:"row", gap:8, flexWrap:"wrap", marginTop:12}}>
            {canAccept && <Pressable onPress={() => void transition(order,"accepted")} style={[styles.smallAction,{backgroundColor:BUTTON_BLUE}]}><Text style={styles.smallActionText}>Accept</Text></Pressable>}
            {canAccept && <Pressable onPress={() => void transition(order,"declined")} style={[styles.smallAction,{backgroundColor:"#FEE2E2"}]}><Text style={[styles.smallActionText,{color:"#B91C1C"}]}>Decline</Text></Pressable>}
            {canPrepare && <Pressable onPress={() => void transition(order,"preparing")} style={[styles.smallAction,{backgroundColor:BUTTON_BLUE}]}><Text style={styles.smallActionText}>Start preparing</Text></Pressable>}
            {canReady && <Pressable onPress={() => void transition(order,"ready")} style={[styles.smallAction,{backgroundColor:BUTTON_BLUE}]}><Text style={styles.smallActionText}>Mark ready</Text></Pressable>}
            {canComplete && <Pressable onPress={() => void transition(order,"completed")} style={[styles.smallAction,{backgroundColor:BUTTON_BLUE}]}><Text style={styles.smallActionText}>Complete</Text></Pressable>}
            {mineAsBuyer && order.status === "ready" && !order.buyer_confirmed && <Pressable onPress={() => void confirmReceived(order)} style={[styles.smallAction,{backgroundColor:"#16A34A"}]}><Text style={styles.smallActionText}>Confirm received</Text></Pressable>}
            {mineAsBuyer && order.status === "pending" && <Pressable onPress={() => void transition(order,"cancelled")} style={[styles.smallAction,{backgroundColor:theme.background,borderWidth:1,borderColor:theme.border}]}><Text style={[styles.smallActionText,{color:theme.text}]}>Cancel</Text></Pressable>}
          </View>
        </View>;
      })}</View>}
    <Pressable onPress={() => void load(true)} disabled={refreshing} style={{alignSelf:"center",padding:12,marginTop:12}}><Text style={{color:BUTTON_BLUE,fontWeight:"700"}}>{refreshing ? "Refreshing…" : "Refresh orders"}</Text></Pressable>
  </ScreenScroll>;
}

function NotificationsScreen({ theme, auth }: { theme: Theme; auth: AuthPayload | null }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!auth?.access) { setLoading(false); return; }
    setLoading(true);
    try { setItems(apiResults<NotificationItem>(await apiRequest("/api/notifications/", {}, auth))); }
    catch (e) { Alert.alert("Couldn't load notifications", e instanceof Error ? e.message : "Please try again."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [auth?.access]);
  const markRead = async (id: number) => { try { const updated = await apiRequest(`/api/notifications/${id}/read/`, { method:"POST" }, auth) as NotificationItem; setItems(x => x.map(n => n.id === id ? updated : n)); } catch {} };
  const markAll = async () => { try { await apiRequest("/api/notifications/mark_all_read/", { method:"POST" }, auth); setItems(x => x.map(n => ({...n,is_read:true}))); } catch (e) { Alert.alert("Couldn't update notifications", e instanceof Error ? e.message : "Please try again."); } };
  if (!auth?.access) return <ScreenScroll theme={theme}><EmptyState theme={theme} title="Notifications are waiting" text="Sign in to receive order, message and marketplace updates." icon="notifications" /></ScreenScroll>;
  return <ScreenScroll theme={theme}>
    <View style={styles.pageIntro}><View style={styles.rowBetween}><View><Text style={[styles.pageTitle,{color:theme.text}]}>Notifications</Text><Text style={[styles.subtle,{color:theme.muted}]}>Your latest marketplace activity.</Text></View>{items.some(x=>!x.is_read) && <Pressable onPress={() => void markAll()}><Text style={{color:BUTTON_BLUE,fontWeight:"700"}}>Mark all read</Text></Pressable>}</View></View>
    {loading ? <View style={{padding:40,alignItems:"center"}}><ActivityIndicator color={BUTTON_BLUE}/></View> : items.length === 0 ? <EmptyState theme={theme} title="You are all caught up" text="New orders, messages and important Marketplace updates will appear here." icon="notifications" /> :
      <View style={{gap:8}}>{items.map(n => <Pressable key={n.id} onPress={() => !n.is_read && void markRead(n.id)} style={[styles.notificationCard,{backgroundColor:theme.card,borderColor:theme.border,opacity:n.is_read?0.72:1}]}>
        <View style={[styles.notificationDot,{backgroundColor:n.is_read?theme.border:BUTTON_BLUE}]} /><View style={{flex:1}}><Text style={[styles.cardTitle,{color:theme.text}]}>{n.title}</Text><Text style={[styles.subtle,{color:theme.muted,marginTop:3}]}>{n.body}</Text><Text style={[styles.subtle,{color:theme.muted,marginTop:6}]}>{formatMessageTime(n.created_at)}</Text></View>
      </Pressable>)}</View>}
  </ScreenScroll>;
}
function formatMessageTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function MessagesScreen({ theme, auth, currentUser }: { theme: Theme; auth: AuthPayload | null; currentUser: ApiUser | null }) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const loadConversations = async (showSpinner = true) => {
    if (!auth?.access) { setLoading(false); return; }
    if (showSpinner) setLoading(true); else setRefreshing(true);
    try {
      const data = await apiRequest("/api/conversations/", {}, auth);
      setConversations(apiResults<ConversationItem>(data));
    } catch (error) {
      Alert.alert("Couldn't load messages", error instanceof Error ? error.message : "Please try again.");
    } finally { setLoading(false); setRefreshing(false); }
  };

  const loadMessages = async (conversation: ConversationItem) => {
    if (!auth?.access) return;
    setSelectedConversation(conversation);
    try {
      const data = await apiRequest(`/api/messages/?conversation=${conversation.id}`, {}, auth);
      const next = apiResults<MessageItem>(data);
      setMessages(next);
      const unread = next.filter((m) => !m.is_read && m.sender !== currentUser?.id);
      await Promise.all(unread.map((m) => apiRequest(`/api/messages/${m.id}/`, { method: "PATCH", body: JSON.stringify({ is_read: true }) }, auth).catch(() => null)));
      setConversations((items) => items.map((item) => item.id === conversation.id ? { ...item, unread_count: 0 } : item));
    } catch (error) {
      Alert.alert("Couldn't load conversation", error instanceof Error ? error.message : "Please try again.");
    }
  };

  useEffect(() => { void loadConversations(); }, [auth?.access]);

  const sendMessage = async () => {
    const body = messageText.trim();
    if (!body || !selectedConversation || !auth?.access || sending) return;
    setSending(true);
    try {
      const data = await apiRequest("/api/messages/", { method: "POST", body: JSON.stringify({ conversation: selectedConversation.id, body }) }, auth);
      const sent = data as MessageItem;
      setMessages((items) => [...items, sent]);
      setMessageText("");
      setConversations((items) => items.map((item) => item.id === selectedConversation.id ? {
        ...item,
        updated_at: sent.created_at,
        last_message: { id: sent.id, sender: sent.sender, sender_name: sent.sender_name, body: sent.body, created_at: sent.created_at },
      } : item));
    } catch (error) {
      Alert.alert("Couldn't send message", error instanceof Error ? error.message : "Please try again.");
    } finally { setSending(false); }
  };

  if (!auth?.access) {
    return <ScreenScroll theme={theme}><EmptyState theme={theme} title="Your inbox is waiting" text="Sign in to chat with buyers and sellers, ask questions and keep every conversation in one place." icon="messages" /></ScreenScroll>;
  }

  if (selectedConversation) {
    const isBuyer = selectedConversation.buyer === currentUser?.id;
    const otherName = isBuyer ? (selectedConversation.seller_name || "Seller") : (selectedConversation.buyer_name || "Buyer");
    const otherAvatar = isBuyer ? selectedConversation.seller_avatar : selectedConversation.buyer_avatar;
    const initials = otherName.split(/\s+/).map((x) => x[0]).join("").slice(0,2).toUpperCase();
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <View style={[styles.chatHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable onPress={() => setSelectedConversation(null)} style={[styles.chatBackButton, { backgroundColor: theme.isDark ? "#24212B" : "#F3F4F6" }]}><ArrowLeft size={19} color={theme.text} /></Pressable>
          <View style={[styles.chatAvatar, { backgroundColor: theme.isDark ? "#24212B" : "#EFF6FF" }]}>
            {otherAvatar ? <Image source={{ uri: otherAvatar }} style={styles.chatAvatarImage} /> : <Text style={[styles.chatAvatarText, { color: theme.accent }]}>{initials}</Text>}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.chatName, { color: theme.text }]} numberOfLines={1}>{otherName}</Text>
            {!!selectedConversation.store_name && <Text style={[styles.chatStore, { color: theme.muted }]} numberOfLines={1}>{selectedConversation.store_name}</Text>}
          </View>
          <View style={[styles.chatOnlineDot, { backgroundColor: "#22C55E" }]} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 18 }} keyboardShouldPersistTaps="handled">
          {messages.length === 0 ? (
            <View style={styles.chatEmpty}>
              <View style={[styles.chatEmptyIcon, { backgroundColor: theme.isDark ? "rgba(37,99,235,.14)" : "#EFF6FF" }]}><MessageCircle size={25} color={theme.accent} /></View>
              <Text style={[styles.chatEmptyTitle, { color: theme.text }]}>Start the conversation</Text>
              <Text style={[styles.chatEmptyText, { color: theme.muted }]}>Ask about availability, condition, delivery or anything else about this listing.</Text>
            </View>
          ) : messages.map((message) => {
            const mine = message.sender === currentUser?.id;
            return <View key={message.id} style={[styles.chatBubbleRow, { justifyContent: mine ? "flex-end" : "flex-start" }]}>
              <View style={[styles.chatBubble, { backgroundColor: mine ? BUTTON_BLUE : theme.card, borderColor: mine ? BUTTON_BLUE : theme.border, borderBottomRightRadius: mine ? 5 : 18, borderBottomLeftRadius: mine ? 18 : 5 }]}>
                <Text style={[styles.chatBubbleText, { color: mine ? "#fff" : theme.text }]}>{message.body}</Text>
                <Text style={[styles.chatTime, { color: mine ? "rgba(255,255,255,.72)" : theme.muted }]}>{formatMessageTime(message.created_at)}</Text>
              </View>
            </View>;
          })}
        </ScrollView>
        <View style={[styles.chatComposer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <Pressable style={[styles.chatAttach, { backgroundColor: theme.isDark ? "#24212B" : "#F3F4F6" }]} onPress={() => Alert.alert("Attachments", "Photo and document attachments can be added here.")}><Paperclip size={19} color={theme.muted} /></Pressable>
          <TextInput value={messageText} onChangeText={setMessageText} placeholder="Write a message..." placeholderTextColor={theme.muted} multiline style={[styles.chatInput, { color: theme.text, backgroundColor: theme.isDark ? "#24212B" : "#F7F8FA", borderColor: theme.border }]} />
          <Pressable onPress={sendMessage} disabled={!messageText.trim() || sending} style={[styles.chatSend, { backgroundColor: messageText.trim() && !sending ? BUTTON_BLUE : theme.border }]}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color={messageText.trim() ? "#fff" : theme.muted} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  const filtered = conversations.filter((conversation) => {
    const isBuyer = conversation.buyer === currentUser?.id;
    const name = isBuyer ? conversation.seller_name : conversation.buyer_name;
    const haystack = `${name || ""} ${conversation.store_name || ""} ${conversation.last_message?.body || ""}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  return <ScreenScroll theme={theme} contentStyle={{ paddingBottom: 120 }}>
    <View style={styles.messagesIntro}>
      <View><Text style={[styles.messagesTitle, { color: theme.text }]}>Messages</Text><Text style={[styles.messagesSubtitle, { color: theme.muted }]}>Chat safely with buyers and sellers.</Text></View>
      <Pressable onPress={() => loadConversations(false)} style={[styles.messagesRefresh, { borderColor: theme.border, backgroundColor: theme.card }]}>{refreshing ? <ActivityIndicator size="small" color={theme.accent} /> : <RotateCcw size={16} color={theme.accent} />}</Pressable>
    </View>
    <View style={[styles.messagesSearch, { backgroundColor: theme.card, borderColor: theme.border }]}><Search size={17} color={theme.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search conversations" placeholderTextColor={theme.muted} style={[styles.messagesSearchInput, { color: theme.text }]} /></View>
    {loading ? [1,2,3].map((id) => <View key={id} style={[styles.messageSkeleton, { backgroundColor: theme.card, borderColor: theme.border }]} />) : filtered.length === 0 ? (
      <View style={[styles.messagesEmptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.emptyOrb,{backgroundColor:theme.isDark?"rgba(96,165,250,.12)":"#EFF6FF"}]}><View style={styles.emptyOrbRing}/><MessageCircle size={29} color={BUTTON_BLUE}/></View>
        <Text style={[styles.messagesEmptyTitle, { color: theme.text }]}>{search ? "No conversations found" : "Your inbox is quiet"}</Text>
        <Text style={[styles.messagesEmptyText, { color: theme.muted }]}>{search ? "Try a different name, store or message." : "Contact a seller about a listing or wait for a buyer to reach out. Your conversations will appear here."}</Text>
      </View>
    ) : filtered.map((conversation) => {
      const isBuyer = conversation.buyer === currentUser?.id;
      const name = isBuyer ? (conversation.seller_name || "Seller") : (conversation.buyer_name || "Buyer");
      const avatar = isBuyer ? conversation.seller_avatar : conversation.buyer_avatar;
      const initials = name.split(/\s+/).map((x) => x[0]).join("").slice(0,2).toUpperCase();
      return <Pressable key={conversation.id} onPress={() => loadMessages(conversation)} style={({ pressed }) => [styles.messageConversationRow, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? .82 : 1 }]}>
        <View style={[styles.messageAvatar, { backgroundColor: theme.isDark ? "#24212B" : "#EFF6FF" }]}>{avatar ? <Image source={{ uri: avatar }} style={styles.messageAvatarImage} /> : <Text style={[styles.messageAvatarText, { color: theme.accent }]}>{initials}</Text>}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.messageRowTop}><Text style={[styles.messageConversationName, { color: theme.text }]} numberOfLines={1}>{name}</Text><Text style={[styles.messageTime, { color: theme.muted }]}>{formatMessageTime(conversation.last_message?.created_at || conversation.updated_at)}</Text></View>
          {!!conversation.store_name && <Text style={[styles.messageStoreName, { color: theme.accent }]} numberOfLines={1}>{conversation.store_name}</Text>}
          <Text style={[styles.messagePreview, { color: theme.muted, fontWeight: (conversation.unread_count || 0) > 0 ? "800" : "500" }]} numberOfLines={1}>{conversation.last_message?.body || "Start a conversation"}</Text>
        </View>
        {(conversation.unread_count || 0) > 0 && <View style={styles.messageUnread}><Text style={styles.messageUnreadText}>{conversation.unread_count! > 9 ? "9+" : conversation.unread_count}</Text></View>}
        <ChevronRight size={18} color={theme.muted} />
      </Pressable>;
    })}
  </ScreenScroll>;
}
function PreferenceSwitch({ theme, title, description, value, onValueChange }: { theme: Theme; title: string; description?: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={[styles.preferenceRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={{ flex: 1, paddingRight: 12 }}><Text style={[styles.preferenceTitle, { color: theme.text }]}>{title}</Text>{description && <Text style={[styles.preferenceDescription, { color: theme.muted }]}>{description}</Text>}</View>
    <Switch value={value} onValueChange={onValueChange} thumbColor={value ? "#fff" : "#f4f3f4"} trackColor={{ false: "#D5D1DB", true: theme.accent }} />
  </View>;
}

function SettingsPreferencesScreen({ theme, dark, setDark }: { theme: Theme; dark: boolean; setDark: (v:boolean)=>void }) {
  const [prefs, setPrefs] = useState<any>({ language: "English", region: "Kenya", currency: "KES", fulfillment: "Both", recommendations: true, recentlyViewed: true, recommendedListings: true, autoplay: true, highQuality: true, dataSaver: false, confirmDelete: true, confirmSignOut: true });
  useEffect(() => { AsyncStorage.getItem("marketplace_settings").then(raw => { if (raw) setPrefs((p:any) => ({ ...p, ...JSON.parse(raw) })); }).catch(() => {}); }, []);
  const update = (patch: any) => { const next = { ...prefs, ...patch }; setPrefs(next); void AsyncStorage.setItem("marketplace_settings", JSON.stringify(next)); };
  return <ScreenScroll theme={theme} contentStyle={{ paddingBottom: 120 }}>
    <SettingsSection theme={theme} title="Appearance"><SettingRow theme={theme} icon={<Moon size={19} color={theme.text}/>} title="Theme" trailing={<View style={{ flexDirection: "row", gap: 5 }}><ChoiceChip theme={theme} label="System" selected={!dark && prefs.theme !== "light"} onPress={() => { setDark(false); update({ theme: "system" }); }} /><ChoiceChip theme={theme} label="Light" selected={!dark && prefs.theme === "light"} onPress={() => { setDark(false); update({ theme: "light" }); }} /><ChoiceChip theme={theme} label="Dark" selected={dark} onPress={() => { setDark(true); update({ theme: "dark" }); }} /></View>} /></SettingsSection>
    <SettingsSection theme={theme} title="Language"><SettingRow theme={theme} icon={<Compass size={19} color={theme.text}/>} title="App language" trailing={<Text style={[styles.preferenceValue,{color:theme.accent}]}>{prefs.language}</Text>} /></SettingsSection>
    <SettingsSection theme={theme} title="Region & Currency"><SettingRow theme={theme} icon={<MapPin size={19} color={theme.text}/>} title="Country / Region" trailing={<Text style={[styles.preferenceValue,{color:theme.accent}]}>{prefs.region}</Text>} /><SettingRow theme={theme} icon={<Tag size={19} color={theme.text}/>} title="Currency" trailing={<Text style={[styles.preferenceValue,{color:theme.accent}]}>{prefs.currency}</Text>} /></SettingsSection>
    <SettingsSection theme={theme} title="Marketplace Preferences"><ChoiceRow theme={theme} title="Preferred fulfillment" options={["Pickup","Delivery","Both"]} value={prefs.fulfillment} onChange={(v)=>update({fulfillment:v})} /><PreferenceSwitch theme={theme} title="Personalized recommendations" value={prefs.recommendations} onValueChange={(v)=>update({recommendations:v})} /><PreferenceSwitch theme={theme} title="Recently viewed items" value={prefs.recentlyViewed} onValueChange={(v)=>update({recentlyViewed:v})} /><PreferenceSwitch theme={theme} title="Show recommended listings" value={prefs.recommendedListings} onValueChange={(v)=>update({recommendedListings:v})} /></SettingsSection>
    <SettingsSection theme={theme} title="Media & Data"><PreferenceSwitch theme={theme} title="Autoplay listing videos" value={prefs.autoplay} onValueChange={(v)=>update({autoplay:v})} /><PreferenceSwitch theme={theme} title="Load high-quality images" value={prefs.highQuality} onValueChange={(v)=>update({highQuality:v})} /><PreferenceSwitch theme={theme} title="Data saver mode" value={prefs.dataSaver} onValueChange={(v)=>update({dataSaver:v})} /><Pressable onPress={() => Alert.alert("Clear cached data", "No separate app cache is currently exposed by the existing storage system.")} style={[styles.preferenceAction,{backgroundColor:theme.card,borderColor:theme.border}]}><RotateCcw size={18} color={theme.text}/><Text style={[styles.preferenceActionText,{color:theme.text}]}>Clear cached data</Text></Pressable></SettingsSection>
    <SettingsSection theme={theme} title="App Behavior"><PreferenceSwitch theme={theme} title="Confirm before deleting a listing" value={prefs.confirmDelete} onValueChange={(v)=>update({confirmDelete:v})} /><PreferenceSwitch theme={theme} title="Confirm before signing out" value={prefs.confirmSignOut} onValueChange={(v)=>update({confirmSignOut:v})} /><Pressable onPress={() => Alert.alert("Reset app preferences", "Reset all locally stored Marketplace preferences?", [{text:"Cancel",style:"cancel"},{text:"Reset",style:"destructive",onPress:async()=>{await AsyncStorage.removeItem("marketplace_settings");setPrefs({ language:"English",region:"Kenya",currency:"KES",fulfillment:"Both",recommendations:true,recentlyViewed:true,recommendedListings:true,autoplay:true,highQuality:true,dataSaver:false,confirmDelete:true,confirmSignOut:true });setDark(false);}}])} style={[styles.preferenceAction,{backgroundColor:theme.card,borderColor:theme.border}]}><RotateCcw size={18} color={theme.text}/><Text style={[styles.preferenceActionText,{color:theme.text}]}>Reset app preferences</Text></Pressable></SettingsSection>
  </ScreenScroll>;
}

function SecurityPrivacyScreen({ theme, auth, onSignOut }: { theme: Theme; auth: AuthPayload | null; onSignOut: () => void }) {
  const [prefs, setPrefs] = useState<any>({ profileVisibility: true, contact: true, activity: true, recommendations: true, sharing: false });
  useEffect(() => { AsyncStorage.getItem("marketplace_privacy").then(raw => { if(raw) setPrefs((p:any)=>({...p,...JSON.parse(raw)})); }).catch(()=>{}); }, []);
  const update=(patch:any)=>{const next={...prefs,...patch};setPrefs(next);void AsyncStorage.setItem("marketplace_privacy",JSON.stringify(next));};
  return <ScreenScroll theme={theme} contentStyle={{paddingBottom:120}}>
    <SettingsSection theme={theme} title="Account Security"><PreferenceActionRow theme={theme} icon={<LockKeyhole size={18} color={theme.text}/>} title="Change password" description="Use the existing password recovery flow." onPress={() => Alert.alert("Change password", "Password change requires backend support. You can use Forgot Password from the login screen while the account endpoint is unavailable.")} /><PreferenceActionRow theme={theme} icon={<RotateCcw size={18} color={theme.text}/>} title="Forgot / reset password" description="Start the existing recovery flow." onPress={() => Alert.alert("Password recovery", "Sign out and use Forgot Password from the existing login screen.")} /><PreferenceActionRow theme={theme} icon={<Check size={18} color={theme.text}/>} title="Google account connection" description={"Google authentication is configured through the existing OAuth flow."} /><PreferenceActionRow theme={theme} icon={<LogOut size={18} color={theme.text}/>} title="Sign out of this device" onPress={onSignOut} /><PreferenceActionRow theme={theme} icon={<Users size={18} color={theme.text}/>} title="Sign out of all devices" description="No backend endpoint is exposed for this operation." onPress={() => Alert.alert("Unavailable", "Sign out of all devices is not available because the current backend does not expose that endpoint.")} /></SettingsSection>
    <SettingsSection theme={theme} title="Privacy"><PreferenceSwitch theme={theme} title="Profile visibility" value={prefs.profileVisibility} onValueChange={(v)=>update({profileVisibility:v})} /><PreferenceSwitch theme={theme} title="Who can contact me" value={prefs.contact} onValueChange={(v)=>update({contact:v})} /><PreferenceSwitch theme={theme} title="Show online / activity status" value={prefs.activity} onValueChange={(v)=>update({activity:v})} /><PreferenceSwitch theme={theme} title="Personalized recommendations" value={prefs.recommendations} onValueChange={(v)=>update({recommendations:v})} /><PreferenceSwitch theme={theme} title="Data sharing / preferences" value={prefs.sharing} onValueChange={(v)=>update({sharing:v})} /></SettingsSection>
    <SettingsSection theme={theme} title="Account Management"><PreferenceActionRow theme={theme} icon={<Share2 size={18} color={theme.text}/>} title="Download / export account data" description="Backend export endpoint is not currently available." onPress={() => Alert.alert("Unavailable", "Account data export is not currently supported by the backend." )} /><PreferenceActionRow theme={theme} icon={<Trash2 size={18} color="#D33D3D"/>} title="Delete account" description="This is permanent and destructive." destructive onPress={() => Alert.alert("Delete account", "Deleting your account is permanent. No deletion endpoint is currently available, so nothing will be changed.", [{text:"Cancel",style:"cancel"},{text:"I understand",style:"destructive"}])} /></SettingsSection>
  </ScreenScroll>;
}

function NotificationPreferencesScreen({ theme }: { theme: Theme }) {
  const defaults={allow:true,sound:true,vibration:true,messages:true,purchases:true,orders:true,listings:true,saved:true,seller:true,security:true,account:true,promotions:false,recommendations:true,offers:false,quiet:false};
  const [prefs,setPrefs]=useState<any>(defaults);
  useEffect(()=>{AsyncStorage.getItem("marketplace_notification_preferences").then(raw=>{if(raw)setPrefs((p:any)=>({...p,...JSON.parse(raw)}));}).catch(()=>{});},[]);
  const update=(patch:any)=>{const next={...prefs,...patch};setPrefs(next);void AsyncStorage.setItem("marketplace_notification_preferences",JSON.stringify(next));};
  return <ScreenScroll theme={theme} contentStyle={{paddingBottom:120}}><SettingsSection theme={theme} title="Global"><PreferenceSwitch theme={theme} title="Allow notifications" value={prefs.allow} onValueChange={(v)=>update({allow:v})}/><PreferenceSwitch theme={theme} title="Notification sound" value={prefs.sound} onValueChange={(v)=>update({sound:v})}/><PreferenceSwitch theme={theme} title="Notification vibration" value={prefs.vibration} onValueChange={(v)=>update({vibration:v})}/></SettingsSection><SettingsSection theme={theme} title="Marketplace Activity"><PreferenceSwitch theme={theme} title="New messages" value={prefs.messages} onValueChange={(v)=>update({messages:v})}/><PreferenceSwitch theme={theme} title="Purchase requests" value={prefs.purchases} onValueChange={(v)=>update({purchases:v})}/><PreferenceSwitch theme={theme} title="Order updates" value={prefs.orders} onValueChange={(v)=>update({orders:v})}/><PreferenceSwitch theme={theme} title="Listing activity" value={prefs.listings} onValueChange={(v)=>update({listings:v})}/><PreferenceSwitch theme={theme} title="Saved listing updates" value={prefs.saved} onValueChange={(v)=>update({saved:v})}/><PreferenceSwitch theme={theme} title="Seller activity" value={prefs.seller} onValueChange={(v)=>update({seller:v})}/></SettingsSection><SettingsSection theme={theme} title="Security"><PreferenceSwitch theme={theme} title="Login / security alerts" value={prefs.security} onValueChange={(v)=>update({security:v})}/><PreferenceSwitch theme={theme} title="Account changes" value={prefs.account} onValueChange={(v)=>update({account:v})}/></SettingsSection><SettingsSection theme={theme} title="Marketing"><PreferenceSwitch theme={theme} title="Promotions" value={prefs.promotions} onValueChange={(v)=>update({promotions:v})}/><PreferenceSwitch theme={theme} title="Marketplace recommendations" value={prefs.recommendations} onValueChange={(v)=>update({recommendations:v})}/><PreferenceSwitch theme={theme} title="Special offers" value={prefs.offers} onValueChange={(v)=>update({offers:v})}/></SettingsSection><SettingsSection theme={theme} title="Quiet Hours"><PreferenceSwitch theme={theme} title="Enable quiet hours" value={prefs.quiet} onValueChange={(v)=>update({quiet:v})}/><Text style={[styles.preferenceDescription,{color:theme.muted,padding:14}]}>Start and end time controls can be connected to the Android notification scheduler when one is available; no second notification system is introduced here.</Text></SettingsSection><Pressable onPress={()=>Alert.alert("Mark all as read","This action is supported by the existing notifications feed when authenticated.")} style={[styles.preferenceAction,{backgroundColor:theme.card,borderColor:theme.border}]}><Check size={18} color={theme.accent}/><Text style={[styles.preferenceActionText,{color:theme.text}]}>Mark all notifications as read</Text></Pressable><Pressable onPress={()=>Alert.alert("Notification history","History clearing is only available if the backend/feed exposes that operation.")} style={[styles.preferenceAction,{backgroundColor:theme.card,borderColor:theme.border}]}><Trash2 size={18} color={theme.text}/><Text style={[styles.preferenceActionText,{color:theme.text}]}>Clear notification history</Text></Pressable></ScreenScroll>;
}

function HelpSupportScreen({ theme, onFAQ, onSafety, onReport, onTerms, onPrivacy }: { theme: Theme; onFAQ:()=>void; onSafety:()=>void; onReport:()=>void; onTerms:()=>void; onPrivacy:()=>void }) {
  return <ScreenScroll theme={theme} contentStyle={{paddingBottom:120}}><SettingsSection theme={theme} title="Help Center"><PreferenceActionRow theme={theme} icon={<MessageCircle size={18} color={theme.text}/>} title="Frequently Asked Questions" onPress={onFAQ}/><PreferenceActionRow theme={theme} icon={<ShoppingBag size={18} color={theme.text}/>} title="Buying on Marketplace" onPress={onFAQ}/><PreferenceActionRow theme={theme} icon={<Store size={18} color={theme.text}/>} title="Selling on Marketplace" onPress={onFAQ}/><PreferenceActionRow theme={theme} icon={<Tag size={18} color={theme.text}/>} title="Making / editing a listing" onPress={onFAQ}/><PreferenceActionRow theme={theme} icon={<ShoppingBag size={18} color={theme.text}/>} title="Managing orders" onPress={onFAQ}/><PreferenceActionRow theme={theme} icon={<MessageCircle size={18} color={theme.text}/>} title="Messages" onPress={onFAQ}/><PreferenceActionRow theme={theme} icon={<User size={18} color={theme.text}/>} title="Account & login help" onPress={onFAQ}/></SettingsSection><SettingsSection theme={theme} title="Safety"><PreferenceActionRow theme={theme} icon={<LockKeyhole size={18} color={theme.text}/>} title="Marketplace safety tips" onPress={onSafety}/><PreferenceActionRow theme={theme} icon={<AlertCircle size={18} color={theme.text}/>} title="Avoiding scams" onPress={onSafety}/><PreferenceActionRow theme={theme} icon={<Check size={18} color={theme.text}/>} title="Safe payments & meetups" onPress={onSafety}/><PreferenceActionRow theme={theme} icon={<AlertCircle size={18} color={theme.text}/>} title="Report suspicious users / listings" onPress={onReport}/></SettingsSection><SettingsSection theme={theme} title="Reporting"><PreferenceActionRow theme={theme} icon={<AlertCircle size={18} color={theme.text}/>} title="Report a listing" onPress={onReport}/><PreferenceActionRow theme={theme} icon={<User size={18} color={theme.text}/>} title="Report a user" onPress={onReport}/><PreferenceActionRow theme={theme} icon={<AlertCircle size={18} color={theme.text}/>} title="Report a problem" onPress={onReport}/></SettingsSection><SettingsSection theme={theme} title="Support"><PreferenceActionRow theme={theme} icon={<MessageCircle size={18} color={theme.text}/>} title="Contact Support" description="No dedicated support endpoint or contact address is configured in the current app." onPress={()=>Alert.alert("Contact Support","A support contact method has not been configured in the existing project.")}/></SettingsSection><SettingsSection theme={theme} title="Legal"><PreferenceActionRow theme={theme} icon={<LockKeyhole size={18} color={theme.text}/>} title="Terms of Service" onPress={onTerms}/><PreferenceActionRow theme={theme} icon={<LockKeyhole size={18} color={theme.text}/>} title="Privacy Policy" onPress={onPrivacy}/><PreferenceActionRow theme={theme} icon={<Check size={18} color={theme.text}/>} title="Community / Safety Guidelines" onPress={onSafety}/></SettingsSection><SettingsSection theme={theme} title="App Information"><Text style={[styles.appInfoText,{color:theme.muted}]}>Marketplace mobile application</Text><Text style={[styles.appInfoText,{color:theme.muted}]}>Version: 1.0.0</Text><Text style={[styles.appInfoText,{color:theme.muted}]}>Expo SDK 54 compatible project</Text></SettingsSection></ScreenScroll>;
}

const FAQ_DATA = [
  ["BUYING", ["How do I buy an item?","How do I contact a seller?","How do I save a listing?","How do I report a seller?"]],
  ["SELLING", ["How do I create a listing?","How do I edit a listing?","How do I remove a listing?","How do I respond to buyers?"]],
  ["ACCOUNT", ["How do I change my password?","How do I sign out?","How do I delete my account?"]],
  ["SAFETY", ["How do I avoid scams?","What should I do if a seller asks for unusual payment?","How do I report suspicious activity?"]],
] as const;
function FAQScreen({ theme }: { theme: Theme }) { const [open,setOpen]=useState<string|null>(null); const answers:any={"How do I buy an item?":"Open a listing, review the seller and order details, then use the purchase flow available for that listing.","How do I contact a seller?":"Open a listing and use the existing contact/messages action.","How do I save a listing?":"Use the save/bookmark action on a listing while signed in.","How do I report a seller?":"Use Report a Problem or the reporting flow from the relevant listing/user interface.","How do I create a listing?":"Use Sell from the bottom navigation while signed in.","How do I edit a listing?":"Open your Seller workspace and choose the listing you want to edit.","How do I remove a listing?":"Use the existing listing management controls. Destructive actions should be confirmed first.","How do I respond to buyers?":"Open Messages and reply to the buyer conversation.","How do I change my password?":"Use Forgot Password from the existing login flow. Direct password-change support depends on a backend endpoint.","How do I sign out?":"Open Security & Privacy and choose Sign out of this device.","How do I delete my account?":"The UI provides a destructive confirmation, but the current backend must expose a deletion endpoint before any deletion can occur.","How do I avoid scams?":"Keep conversations in Marketplace, verify listings and sellers, and avoid unusual payment requests.","What should I do if a seller asks for unusual payment?":"Do not send payment until the request is verified; report the listing or user if it appears suspicious.","How do I report suspicious activity?":"Use Report a Problem or Report Listing / Report User with a required reason and optional details."}; return <ScreenScroll theme={theme} contentStyle={{paddingBottom:120}}>{FAQ_DATA.map(([cat,items])=><SettingsSection key={cat} theme={theme} title={cat}>{items.map(q=><Pressable key={q} onPress={()=>setOpen(open===q?null:q)} style={[styles.faqRow,{borderBottomColor:theme.border}]}><View style={{flex:1}}><Text style={[styles.faqQuestion,{color:theme.text}]}>{q}</Text>{open===q&&<Text style={[styles.faqAnswer,{color:theme.muted}]}>{answers[q]}</Text>}</View>{open===q?<ChevronUp size={18} color={theme.muted}/>:<ChevronDown size={18} color={theme.muted}/>}</Pressable>)}</SettingsSection>)}</ScreenScroll>; }

function ReportProblemScreen({ theme, auth }: { theme: Theme; auth: AuthPayload | null }) { const [category,setCategory]=useState("Login problem"); const [description,setDescription]=useState(""); const [listingId,setListingId]=useState(""); const [reportId,setReportId]=useState(""); const categories=["Login problem","Payment problem","Listing problem","Messaging problem","App crash","Performance problem","Security concern","Other"]; const submit=()=>{if(!category||description.trim().length<10){Alert.alert("Check the form","Choose a category and enter at least 10 characters describing the problem.");return;} Alert.alert("Report ready","The current backend does not expose a support-report endpoint, so nothing was sent to the server. Your details can be connected to a real endpoint later.");}; return <ScreenScroll theme={theme} contentStyle={{paddingBottom:120}}><SettingsSection theme={theme} title="Problem category"><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{categories.map(c=><ChoiceChip key={c} theme={theme} label={c} selected={category===c} onPress={()=>setCategory(c)}/>)}</ScrollView></SettingsSection><SettingsSection theme={theme} title="Details"><TextInput value={description} onChangeText={setDescription} placeholder="Describe what happened..." placeholderTextColor={theme.muted} multiline style={[styles.reportInput,{color:theme.text,backgroundColor:theme.card,borderColor:theme.border}]}/><TextInput value={listingId} onChangeText={setListingId} placeholder="Optional listing ID" placeholderTextColor={theme.muted} style={[styles.reportInputSingle,{color:theme.text,backgroundColor:theme.card,borderColor:theme.border}]}/><TextInput value={reportId} onChangeText={setReportId} placeholder="Optional user / report ID" placeholderTextColor={theme.muted} style={[styles.reportInputSingle,{color:theme.text,backgroundColor:theme.card,borderColor:theme.border}]}/></SettingsSection><Pressable onPress={submit} style={[styles.authPrimary,{backgroundColor:BUTTON_BLUE}]}><Text style={styles.authPrimaryText}>Submit Report</Text><Send size={17} color="#fff"/></Pressable></ScreenScroll>; }

function SafetyTipsScreen({ theme }: { theme: Theme }) { const tips=["Keep conversations in Marketplace whenever possible.","Verify the listing, seller identity and item details before paying.","Avoid unusual payment requests, rushed transfers or requests for credentials.","For meetups, use a public place and let someone you trust know where you are.","Report suspicious listings, users, harassment, scams or prohibited items."]; return <ScreenScroll theme={theme} contentStyle={{paddingBottom:120}}><View style={[styles.safetyHero,{backgroundColor:theme.card,borderColor:theme.border}]}><LockKeyhole size={28} color={theme.accent}/><Text style={[styles.profileAuthTitle,{color:theme.text}]}>Marketplace Safety</Text><Text style={[styles.profileAuthText,{color:theme.muted}]}>Use these practical safeguards when buying, selling or meeting another marketplace member.</Text></View>{tips.map((tip,i)=><View key={tip} style={[styles.safetyTip,{backgroundColor:theme.card,borderColor:theme.border}]}><View style={[styles.safetyNumber,{backgroundColor:theme.accent}]}><Text style={{color:"#fff",fontWeight:"900"}}>{i+1}</Text></View><Text style={[styles.preferenceDescription,{color:theme.text,flex:1}]}>{tip}</Text></View>)}</ScreenScroll>; }

function LegalInfoScreen({ theme, kind }: { theme: Theme; kind: "terms" | "privacy" }) { const privacy=kind==="privacy"; return <ScreenScroll theme={theme} contentStyle={{paddingBottom:120}}><View style={[styles.legalCard,{backgroundColor:theme.card,borderColor:theme.border}]}><Text style={[styles.legalTitle,{color:theme.text}]}>{privacy?"Privacy Policy":"Terms of Service"}</Text><Text style={[styles.legalText,{color:theme.muted}]}>{privacy?"This screen provides the in-app privacy information currently supported by the project. Marketplace authentication and account data are used to provide the app's marketplace features. Preferences stored locally remain on the device unless an existing backend operation sends them.":"Use of Marketplace is subject to the rules and safeguards presented in the app. Users are responsible for accurate listings, lawful transactions and respectful communication. Existing backend capabilities determine which account and marketplace operations can be performed."}</Text><Text style={[styles.legalHeading,{color:theme.text}]}>Important</Text><Text style={[styles.legalText,{color:theme.muted}]}>No external legal URL was found in the current project, so this screen does not invent one. Replace or expand this content when the production legal documents are configured.</Text></View></ScreenScroll>; }

function SettingsSection({ theme, title, children }: { theme:Theme; title:string; children:React.ReactNode }) { return <View style={{marginBottom:14}}><Text style={[styles.settingsSectionTitle,{color:theme.text}]}>{title}</Text>{children}</View>; }
function ChoiceChip({ theme, label, selected, onPress }: { theme:Theme; label:string; selected:boolean; onPress:()=>void }) { return <Pressable onPress={onPress} style={[styles.choiceChip,{backgroundColor:selected?BUTTON_BLUE:theme.card,borderColor:selected?BUTTON_BLUE:theme.border}]}><Text style={{fontSize:10,fontWeight:"800",color:selected?"#fff":theme.text}}>{label}</Text></Pressable>; }
function ChoiceRow({ theme, title, options, value, onChange }: {theme:Theme;title:string;options:string[];value:string;onChange:(v:string)=>void}) { return <View style={[styles.preferenceBlock,{backgroundColor:theme.card,borderColor:theme.border}]}><Text style={[styles.preferenceTitle,{color:theme.text}]}>{title}</Text><View style={{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:9}}>{options.map(o=><ChoiceChip key={o} theme={theme} label={o} selected={value===o} onPress={()=>onChange(o)}/>)}</View></View>; }
function PreferenceActionRow({ theme, icon, title, description, onPress, destructive=false }: {theme:Theme;icon:React.ReactNode;title:string;description?:string;onPress:()=>void;destructive?:boolean}) { return <Pressable onPress={onPress} style={[styles.preferenceActionRow,{backgroundColor:theme.card,borderColor:theme.border}]}><View style={[styles.preferenceActionIcon,{backgroundColor:theme.isDark?"rgba(96,165,250,.12)":"#EFF6FF"}]}>{icon}</View><View style={{flex:1}}><Text style={[styles.preferenceTitle,{color:destructive?"#D33D3D":theme.text}]}>{title}</Text>{description&&<Text style={[styles.preferenceDescription,{color:theme.muted}]}>{description}</Text>}</View><ChevronRight size={18} color={theme.muted}/></Pressable>; }

function SettingsScreen({ theme, dark, setDark }: { theme: Theme; dark: boolean; setDark: (v:boolean)=>void }) { return <ScreenScroll theme={theme}><SettingRow theme={theme} icon={<Moon size={19} color={theme.text}/>} title="Dark mode" trailing={<Switch value={dark} onValueChange={setDark} thumbColor={dark?"#fff":"#f4f3f4"} trackColor={{false:"#D5D1DB",true:theme.accent}}/>}/><SettingRow theme={theme} icon={<Bell size={19} color={theme.text}/>} title="Notifications" trailing={<Check size={18} color={theme.accent}/>} /><SettingRow theme={theme} icon={<Users size={19} color={theme.text}/>} title="Privacy" trailing={<ChevronRight size={18} color={theme.muted}/>} /></ScreenScroll>; }
function StoreScreen({ theme, auth, onOpenProduct, onMarketplaceChanged, onUserUpdated }: { theme: Theme; auth: AuthPayload | null; onOpenProduct: (listing: Listing) => void; onMarketplaceChanged?: () => void; onUserUpdated?: (user: ApiUser) => void }) {
  const [store, setStore] = useState<ProfileStore | null>(null);
  const [mine, setMine] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  const loadStore = async (isRefresh = false) => {
    if (!auth?.access) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const [storeData, listingData] = await Promise.all([
        apiRequest("/api/stores/mine/", {}, auth),
        apiRequest("/api/listings/mine/", {}, auth),
      ]);
      setStore(storeData as ProfileStore);
      setMine(apiResults(listingData).map(mapApiListing));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load your store.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadStore();
  }, [auth?.access]);

  const activeListings = mine.length;
  const storeInitial = (store?.name || "My Store").trim().slice(0, 1).toUpperCase();
  const cover = store?.cover || "";
  const logo = store?.logo || "";

  return (
    <>
    <ScreenScroll theme={theme} contentStyle={{ paddingBottom: 124, paddingTop: 0 }}>
      {/* Store identity */}
      <View style={[styles.storePageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.storeCover}>
          {cover ? (
            <Image source={{ uri: cover }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.isDark ? "#172554" : "#DBEAFE" }]}>
              <View style={styles.storeCoverGlow} />
            </View>
          )}
          <View style={styles.storeCoverShade} />
          <View style={styles.storeCoverTopRow}>
            <View style={styles.storeStatusPill}>
              <View style={[styles.storeStatusDot, { backgroundColor: store?.is_active === false ? "#F59E0B" : "#22C55E" }]} />
              <Text style={styles.storeStatusText}>{store?.is_active === false ? "Setup needed" : "Store active"}</Text>
            </View>
            <Pressable onPress={() => void loadStore(true)} style={styles.storeCircleButton} disabled={refreshing}>
              {refreshing ? <ActivityIndicator size="small" color="#fff" /> : <RotateCcw size={16} color="#fff" />}
            </Pressable>
          </View>
        </View>

        <View style={styles.storeIdentityBlock}>
          <View style={[styles.storeLogoLarge, { backgroundColor: theme.isDark ? "#1D4ED8" : BUTTON_BLUE, borderColor: theme.card }]}>
            {logo ? <Image source={{ uri: logo }} style={styles.storeLogoImage} /> : <Text style={styles.storeLogoLetter}>{storeInitial}</Text>}
          </View>
          <View style={styles.storeIdentityText}>
            <View style={styles.storeNameRow}>
              <Text style={[styles.storePageTitle, { color: theme.text }]} numberOfLines={1}>{store?.name || "My Store"}</Text>
              {store?.verification && store.verification !== "new" ? <MetaVerifiedBadge size={19} /> : null}
            </View>
            <View style={styles.storeIdentityLabelRow}><Text style={[styles.storeIdentityLabel,{color:BUTTON_BLUE}]}>STORE IDENTITY</Text><Text style={[styles.storeOwnerLabel,{color:theme.muted}]}>Owned by your profile</Text></View>
            <Text style={[styles.storePageDescription, { color: theme.muted }]} numberOfLines={2}>
              {store?.description || "Create a trusted storefront and keep your products ready for buyers."}
            </Text>
            <View style={styles.storeMetaLine}>
              {store?.location ? <><MapPin size={12} color={theme.muted} /><Text style={[styles.storeMetaText, { color: theme.muted }]} numberOfLines={1}>{store.location}</Text></> : <Text style={[styles.storeMetaText, { color: theme.muted }]}>Your marketplace storefront</Text>}
            </View>
          </View>
        </View>

        <View style={[styles.storeStatsRow, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
          <View style={styles.storeStat}><Text style={[styles.storeStatValue, { color: theme.text }]}>{activeListings}</Text><Text style={[styles.storeStatLabel, { color: theme.muted }]}>Listings</Text></View>
          <View style={[styles.storeStatDivider, { backgroundColor: theme.border }]} />
          <View style={styles.storeStat}><Text style={[styles.storeStatValue, { color: theme.text }]}>{mine.filter(x => x.stock === undefined || (x.stock || 0) > 0).length}</Text><Text style={[styles.storeStatLabel, { color: theme.muted }]}>Available</Text></View>
          <View style={[styles.storeStatDivider, { backgroundColor: theme.border }]} />
          <View style={styles.storeStat}><Text style={[styles.storeStatValue, { color: theme.text }]}>—</Text><Text style={[styles.storeStatLabel, { color: theme.muted }]}>Sales</Text></View>
        </View>

        <View style={styles.storeQuickActions}>
          <Pressable onPress={() => setEditing(true)} style={[styles.storePrimaryAction, { backgroundColor: BUTTON_BLUE }]}>
            <Settings size={16} color="#fff" /><Text style={styles.storePrimaryActionText}>Manage store</Text>
          </Pressable>
          <Pressable onPress={() => Alert.alert("Store sharing", "Your public store sharing link will be available when store pages are enabled.")} style={[styles.storeSecondaryAction, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Share2 size={16} color={theme.text} /><Text style={[styles.storeSecondaryActionText, { color: theme.text }]}>Share</Text>
          </Pressable>
        </View>
      </View>

      {/* Seller shortcuts */}
      <View style={[styles.storeToolsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.storeToolsHeader}>
          <View>
            <Text style={[styles.storeToolsTitle, { color: theme.text }]}>Seller workspace</Text>
            <Text style={[styles.storeToolsSubtitle, { color: theme.muted }]}>Keep your storefront healthy and buyer-ready.</Text>
          </View>
          <View style={[styles.storeToolsIcon, { backgroundColor: theme.isDark ? "rgba(37,99,235,.16)" : "#EFF6FF" }]}><Sparkles size={17} color={BUTTON_BLUE} /></View>
        </View>
        <View style={styles.storeToolGrid}>
          <View style={[styles.storeToolItem, { backgroundColor: theme.isDark ? "#111827" : "#F8FAFC" }]}><Tag size={16} color={BUTTON_BLUE} /><Text style={[styles.storeToolTitle, { color: theme.text }]}>Listings</Text><Text style={[styles.storeToolText, { color: theme.muted }]}>Keep products fresh and accurate.</Text></View>
          <View style={[styles.storeToolItem, { backgroundColor: theme.isDark ? "#111827" : "#F8FAFC" }]}><MessageCircle size={16} color={BUTTON_BLUE} /><Text style={[styles.storeToolTitle, { color: theme.text }]}>Messages</Text><Text style={[styles.storeToolText, { color: theme.muted }]}>Respond quickly to buyers.</Text></View>
          <View style={[styles.storeToolItem, { backgroundColor: theme.isDark ? "#111827" : "#F8FAFC" }]}><Truck size={16} color={BUTTON_BLUE} /><Text style={[styles.storeToolTitle, { color: theme.text }]}>Fulfilment</Text><Text style={[styles.storeToolText, { color: theme.muted }]}>Keep delivery expectations clear.</Text></View>
          <View style={[styles.storeToolItem, { backgroundColor: theme.isDark ? "#111827" : "#F8FAFC" }]}><ShieldIcon theme={theme} /><Text style={[styles.storeToolTitle, { color: theme.text }]}>Trust</Text><Text style={[styles.storeToolText, { color: theme.muted }]}>Complete your store details.</Text></View>
        </View>
      </View>

      {/* Listings */}
      <View style={styles.storeListingsHeader}>
        <View>
          <Text style={[styles.storeListingsTitle, { color: theme.text }]}>Your listings</Text>
          <Text style={[styles.storeListingsSubtitle, { color: theme.muted }]}>{mine.length ? `${mine.length} live item${mine.length === 1 ? "" : "s"}` : "Your published products will appear here."}</Text>
        </View>
        <View style={[styles.storeCountPill, { backgroundColor: theme.isDark ? "rgba(37,99,235,.14)" : "#EFF6FF" }]}><Text style={[styles.storeCountText, { color: BUTTON_BLUE }]}>{mine.length}</Text></View>
      </View>

      {loading ? (
        <View style={[styles.storeLoadingCard, { backgroundColor: theme.card, borderColor: theme.border }]}><ActivityIndicator color={BUTTON_BLUE} /><Text style={[styles.storeLoadingText, { color: theme.muted }]}>Loading your store…</Text></View>
      ) : error ? (
        <View style={[styles.storeErrorCard, { backgroundColor: theme.card, borderColor: theme.border }]}><AlertCircle size={20} color="#EF4444" /><View style={{ flex: 1 }}><Text style={[styles.storeErrorTitle, { color: theme.text }]}>Couldn't load your store</Text><Text style={[styles.storeErrorText, { color: theme.muted }]}>{error}</Text></View><Pressable onPress={() => void loadStore()} style={[styles.storeRetryButton, { backgroundColor: BUTTON_BLUE }]}><Text style={styles.storeRetryText}>Retry</Text></Pressable></View>
      ) : mine.length === 0 ? (
        <View style={[styles.storeEmptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.storeEmptyIcon, { backgroundColor: theme.isDark ? "rgba(37,99,235,.14)" : "#EFF6FF" }]}><Store size={22} color={BUTTON_BLUE} /></View>
          <Text style={[styles.storeEmptyTitle, { color: theme.text }]}>Your store is ready for its first listing</Text>
          <Text style={[styles.storeEmptyText, { color: theme.muted }]}>Add a product or service to start building your storefront.</Text>
        </View>
      ) : (
        <View style={styles.storeListingGrid}>
          {mine.map((listing) => <StoreListingCard key={listing.id} listing={listing} theme={theme} onPress={() => onOpenProduct(listing)} onEdit={() => setEditingListing(listing)} />)}
        </View>
      )}
    </ScreenScroll>

    {editingListing && auth?.access && (
      <ListingEditorSheet
        theme={theme}
        auth={auth}
        listing={editingListing}
        onClose={() => setEditingListing(null)}
        onSaved={(updated) => {
          setMine((current) => current.map((item) => item.id === updated.id ? updated : item));
          listings = listings.map((item) => item.id === updated.id ? updated : item);
          setEditingListing(null);
          void onMarketplaceChanged?.();
        }}
        onDeleted={(id) => {
          setMine((current) => current.filter((item) => item.id !== id));
          listings = listings.filter((item) => item.id !== id);
          setEditingListing(null);
          void onMarketplaceChanged?.();
        }}
        onBoosted={(updated) => {
          setMine((current) => current.map((item) => item.id === updated.id ? updated : item));
          listings = listings.map((item) => item.id === updated.id ? updated : item);
          void onMarketplaceChanged?.();
        }}
      />
    )}

    {editing && auth?.user && (
      <EditProfileSheet
        theme={theme}
        currentUser={auth.user}
        store={store}
        insetsBottom={0}
        onClose={() => setEditing(false)}
        onUserUpdated={(user) => {
          onUserUpdated?.(user);
          const nextAuth = globalThis.__MARKETPLACE_AUTH__ ? { ...globalThis.__MARKETPLACE_AUTH__, user } : null;
          if (nextAuth) {
            globalThis.__MARKETPLACE_AUTH__ = nextAuth;
            void AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
          }
        }}
        onStoreUpdated={(updatedStore) => setStore(updatedStore)}
      />
    )}
    </>
  );
}

function StoreListingCard({ listing, theme, onPress, onEdit }: { listing: Listing; theme: Theme; onPress: () => void; onEdit: () => void }) {
  return <View style={[styles.storeListingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Pressable onPress={onPress} style={styles.storeListingImageWrap}>
      <Image source={{ uri: listing.image }} style={styles.storeListingImage} />
      <View style={styles.storeListingType}><Text style={styles.storeListingTypeText}>{listing.type}</Text></View>
      {listing.isOnOffer && <View style={styles.storeOfferPill}><BadgePercent size={11} color="#15803D" /><Text style={styles.storeOfferPillText}>OFFER</Text></View>}
      {listing.isFeatured && <View style={styles.storeBoostPill}><Zap size={10} color="#fff" fill="#fff" /><Text style={styles.storeBoostPillText}>BOOSTED</Text></View>}
    </Pressable>
    <View style={styles.storeListingBody}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <Text style={[styles.storeListingTitle, { color: theme.text, flex: 1 }]} numberOfLines={2}>{listing.title}</Text>
        <Pressable onPress={onEdit} hitSlop={8} style={[styles.storeListingEditButton, { backgroundColor: theme.isDark ? "rgba(37,99,235,.14)" : "#EFF6FF" }]}><Pencil size={14} color={BUTTON_BLUE} /></Pressable>
      </View>
      <Text style={[styles.storeListingPrice, { color: BUTTON_BLUE }]}>{listing.price}</Text>
      {listing.isOnOffer && listing.originalPrice != null && <Text style={[styles.storeListingOriginalPrice, { color: theme.muted }]}>Regular KES {listing.originalPrice.toLocaleString("en-KE")}</Text>}
      <View style={styles.storeListingMeta}><Text style={[styles.storeListingMetaText, { color: theme.muted }]} numberOfLines={1}>{listing.location || "Marketplace"}</Text><ChevronRight size={14} color={theme.muted} /></View>
    </View>
  </View>;
}

function ListingEditorSheet({ theme, auth, listing, onClose, onSaved, onDeleted, onBoosted }: { theme: Theme; auth: AuthPayload; listing: Listing; onClose: () => void; onSaved: (listing: Listing) => void; onDeleted: (id: string) => void; onBoosted: (listing: Listing) => void }) {
  const [title, setTitle] = useState(listing.title);
  const [price, setPrice] = useState(listing.originalPrice != null ? String(listing.originalPrice) : String(Number(listing.price.replace(/[^0-9.]/g, "")) || ""));
  const [description, setDescription] = useState(listing.description || "");
  const [location, setLocation] = useState(listing.location || "");
  const [negotiable, setNegotiable] = useState(!!listing.negotiable);
  const [isOnOffer, setIsOnOffer] = useState(!!listing.isOnOffer);
  const [offerPrice, setOfferPrice] = useState(listing.offerPrice != null ? String(listing.offerPrice) : "");
  const [photos, setPhotos] = useState<string[]>(listing.images?.length ? listing.images : (listing.image ? [listing.image] : []));
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [error, setError] = useState("");
  const isUploading = Object.keys(uploading).length > 0;

  const addPhotos = async () => {
    const remaining = Math.max(0, 8 - photos.length);
    if (!remaining) { Alert.alert("Photo limit reached", "A listing can have up to 8 photos."); return; }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Gallery permission needed", "Please allow photo library access to add listing photos."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: remaining, allowsEditing: false, quality: 0.85 });
    if (result.canceled) return;
    for (const asset of result.assets) {
      const key = asset.uri;
      setUploading((current) => ({ ...current, [key]: true }));
      try {
        const uploaded = await uploadAssetToCloudinary(asset, auth);
        setPhotos((current) => [...current, uploaded.secure_url].slice(0, 8));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not upload a photo.");
      } finally {
        setUploading((current) => { const next = { ...current }; delete next[key]; return next; });
      }
    }
  };
  const removePhoto = (index: number) => {
    if (photos.length === 1) { Alert.alert("Keep one photo", "A listing needs at least one photo. Add another photo before removing this one."); return; }
    setPhotos((current) => current.filter((_, i) => i !== index));
  };
  const movePhoto = (index: number, direction: -1 | 1) => setPhotos((current) => {
    const next = [...current]; const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const save = async () => {
    const regularPrice = Number(price.replace(/[^0-9.]/g, ""));
    const salePrice = Number(offerPrice.replace(/[^0-9.]/g, ""));
    if (title.trim().length < 3) { setError("Add a clear listing name."); return; }
    if (!regularPrice || regularPrice <= 0) { setError("Enter a valid price."); return; }
    if (isOnOffer && (!salePrice || salePrice >= regularPrice)) { setError("The offer price must be lower than the regular price."); return; }
    if (!photos.length) { setError("Add at least one photo."); return; }
    setSaving(true); setError("");
    try {
      const body = { title: title.trim(), description: description.trim(), price: regularPrice, original_price: regularPrice, offer_price: isOnOffer ? salePrice : null, is_on_offer: isOnOffer, negotiable, location: location.trim(), image_urls: photos };
      const data = await apiRequest(`/api/listings/${listing.id}/`, { method: "PATCH", body: JSON.stringify(body) }, auth);
      onSaved(mapApiListing(data));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save listing changes."); }
    finally { setSaving(false); }
  };
  const toggleBoost = async () => {
    setBoosting(true); setError("");
    try {
      const data = await apiRequest(`/api/listings/${listing.id}/boost/`, { method: "POST", body: JSON.stringify({ enabled: !listing.isFeatured }) }, auth);
      onBoosted({ ...listing, isFeatured: !!data.is_featured });
      Alert.alert(data.is_featured ? "Listing boosted" : "Boost removed", data.is_featured ? "Your listing is now marked for extra visibility." : "The listing is no longer boosted.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update the listing boost."); }
    finally { setBoosting(false); }
  };
  const deleteListing = () => Alert.alert("Delete listing?", "This permanently removes the listing from your store and the marketplace.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => { try { await apiRequest(`/api/listings/${listing.id}/`, { method: "DELETE" }, auth); onDeleted(listing.id); } catch (e) { setError(e instanceof Error ? e.message : "Could not delete listing."); } } },
  ]);
  return <View style={styles.profileSheetOverlay}>
    <Pressable style={styles.profileSheetBackdrop} onPress={saving || boosting ? undefined : onClose} />
    <View style={[styles.profileSheet, { backgroundColor: theme.card, maxHeight: "94%" }]}>
      <View style={[styles.profileSheetHeader, { borderBottomColor: theme.border }]}><View style={{ flex: 1 }}><Text style={[styles.profileSheetTitle, { color: theme.text }]}>Edit listing</Text><Text style={[styles.profileSheetSub, { color: theme.muted }]}>Update details, photos, offers and visibility.</Text></View><Pressable onPress={onClose} disabled={saving || boosting} style={[styles.profileSheetClose, { backgroundColor: theme.isDark ? "#26222F" : "#F1F5F9" }]}><X size={18} color={theme.text} /></Pressable></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Field label="Listing name" value={title} onChangeText={setTitle} theme={theme} />
        <Field label="Regular price (KES)" value={price} onChangeText={setPrice} theme={theme} keyboardType="decimal-pad" />
        <Field label="Description" value={description} onChangeText={setDescription} theme={theme} multiline />
        <Field label="Location" value={location} onChangeText={setLocation} theme={theme} />
        <Pressable onPress={() => setNegotiable(!negotiable)} style={[styles.listingEditorToggle, { backgroundColor: theme.background, borderColor: theme.border }]}><View><Text style={[styles.storeToolTitle, { color: theme.text }]}>Price is negotiable</Text><Text style={[styles.storeToolText, { color: theme.muted }]}>Let buyers know you are open to offers.</Text></View><View style={[styles.listingToggle, { backgroundColor: negotiable ? BUTTON_BLUE : theme.border }]}><View style={[styles.listingToggleKnob, { transform: [{ translateX: negotiable ? 18 : 2 }] }]} /></View></Pressable>
        <View style={[styles.listingEditorSection, { borderColor: theme.border, backgroundColor: theme.isDark ? "#17141D" : "#F8FAFF" }]}><View style={styles.listingEditorSectionHeader}><View><Text style={[styles.storeToolTitle, { color: theme.text }]}>Special offer</Text><Text style={[styles.storeToolText, { color: theme.muted }]}>Show a lower promotional price to buyers.</Text></View><Pressable onPress={() => setIsOnOffer(!isOnOffer)} style={[styles.listingToggle, { backgroundColor: isOnOffer ? "#16A34A" : theme.border }]}><View style={[styles.listingToggleKnob, { transform: [{ translateX: isOnOffer ? 18 : 2 }] }]} /></Pressable></View>{isOnOffer && <Field label="Offer price (KES)" value={offerPrice} onChangeText={setOfferPrice} theme={theme} keyboardType="decimal-pad" />}</View>
        <View style={[styles.listingEditorSection, { borderColor: theme.border, backgroundColor: theme.isDark ? "#17141D" : "#F8FAFF" }]}><View style={styles.listingEditorSectionHeader}><View style={{ flex: 1 }}><Text style={[styles.storeToolTitle, { color: theme.text }]}>Photos</Text><Text style={[styles.storeToolText, { color: theme.muted }]}>First photo is your cover. Rearrange with the arrows.</Text></View><Pressable onPress={() => void addPhotos()} disabled={isUploading || saving} style={[styles.profileBlueButton, { backgroundColor: BUTTON_BLUE, marginBottom: 0, opacity: isUploading || saving ? 0.7 : 1 }]}>{isUploading ? <ActivityIndicator size="small" color="#fff" /> : <Plus size={14} color="#fff" />}<Text style={styles.profileBlueButtonText}>{isUploading ? "Uploading…" : "Add"}</Text></Pressable></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 12 }}>{photos.map((uri, index) => <View key={`${uri}-${index}`} style={[styles.listingEditPhoto, { borderColor: index === 0 ? BUTTON_BLUE : theme.border }]}><Image source={{ uri }} style={styles.listingEditPhotoImage} />{index === 0 && <View style={styles.listingEditCover}><Text style={styles.coverBadgeText}>COVER</Text></View>}<View style={styles.listingEditPhotoActions}><Pressable disabled={index === 0} onPress={() => movePhoto(index, -1)} style={[styles.listingPhotoAction, { backgroundColor: theme.card, opacity: index === 0 ? 0.35 : 1 }]}><ChevronUp size={13} color={theme.text} /></Pressable><Pressable disabled={index === photos.length - 1} onPress={() => movePhoto(index, 1)} style={[styles.listingPhotoAction, { backgroundColor: theme.card, opacity: index === photos.length - 1 ? 0.35 : 1 }]}><ChevronDown size={13} color={theme.text} /></Pressable><Pressable onPress={() => removePhoto(index)} style={[styles.listingPhotoAction, { backgroundColor: "#FEE2E2" }]}><Trash2 size={13} color="#DC2626" /></Pressable></View></View>)}</ScrollView>
        </View>
        <View style={[styles.listingBoostCard, { backgroundColor: theme.isDark ? "#172554" : "#EFF6FF", borderColor: theme.isDark ? "#1E3A8A" : "#BFDBFE" }]}><View style={[styles.listingBoostIcon, { backgroundColor: BUTTON_BLUE }]}><Zap size={17} color="#fff" fill="#fff" /></View><View style={{ flex: 1 }}><Text style={[styles.storeToolTitle, { color: theme.text }]}>{listing.isFeatured ? "Listing is boosted" : "Boost this listing"}</Text><Text style={[styles.storeToolText, { color: theme.muted }]}>{listing.isFeatured ? "Your listing is marked for extra marketplace visibility." : "Highlight this item in your seller inventory for extra visibility."}</Text></View><Pressable onPress={() => void toggleBoost()} disabled={boosting} style={[styles.profileBlueButton, { backgroundColor: BUTTON_BLUE, marginBottom: 0, opacity: boosting ? 0.65 : 1 }]}>{boosting ? <ActivityIndicator size="small" color="#fff" /> : <><Zap size={13} color="#fff" fill="#fff" /><Text style={styles.profileBlueButtonText}>{listing.isFeatured ? "Remove" : "Boost"}</Text></>}</Pressable></View>
        {!!error && <View style={[styles.profileEditError, { backgroundColor: theme.isDark ? "#3A1F25" : "#FEF2F2", borderColor: theme.isDark ? "#7F1D1D" : "#FECACA" }]}><AlertCircle size={17} color="#DC2626" /><Text style={[styles.profileEditErrorText, { color: theme.isDark ? "#FCA5A5" : "#B91C1C" }]}>{error}</Text></View>}
      </ScrollView>
      <View style={[styles.profileSheetActions, { borderTopColor: theme.border, backgroundColor: theme.card }]}><Pressable onPress={deleteListing} disabled={saving || boosting} style={[styles.profileCancelButton, { borderColor: "#FECACA", backgroundColor: theme.card }]}><Trash2 size={15} color="#DC2626" /><Text style={[styles.profileCancelText, { color: "#DC2626" }]}>Delete</Text></Pressable><Pressable onPress={save} disabled={saving || boosting || isUploading} style={[styles.profileSaveButton, { backgroundColor: BUTTON_BLUE, opacity: saving || boosting ? 0.7 : 1 }]}>{saving ? <ActivityIndicator size="small" color="#fff" /> : <Check size={16} color="#fff" />}<Text style={styles.profileSaveText}>{saving ? "Saving…" : "Save changes"}</Text></Pressable></View>
    </View>
  </View>;
}

function CompactListing({ listing, theme, onPress }: { listing: Listing; theme: Theme; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.compactCard,{backgroundColor:theme.card,borderColor:theme.border}]}>
      <Image source={{uri:listing.image}} style={styles.compactImage}/>
      <View style={{flex:1,padding:12}}>
        <Text style={[styles.storeName,{color:theme.text}]} numberOfLines={1}>{listing.title}</Text>
        <View style={styles.compactStoreRow}>
          <View style={[styles.compactStoreAvatar,{backgroundColor:darken(theme.accent,theme.isDark ? 0.35 : 0.88)}]}>
            {listing.storeLogo ? <Image source={{uri:listing.storeLogo}} style={styles.compactStoreAvatarImage} resizeMode="cover" /> : <Text style={[styles.compactStoreAvatarText,{color:theme.accent}]}>{listing.store.slice(0,1).toUpperCase()}</Text>}
          </View>
          <Text style={[styles.subtle,{color:theme.muted,flex:1}]} numberOfLines={1}>{listing.store}</Text>
        </View>
        <Text style={[styles.priceSmall,{color:theme.text}]}>{listing.price}</Text>
      </View>
      <ChevronRight size={18} color={theme.muted} style={{marginRight:10}}/>
    </Pressable>
  );
}
function SectionHeader({ title, action, onPress, theme }: { title:string; action:string; onPress:()=>void; theme:Theme }) { return <View style={styles.sectionHeader}><Text style={[styles.sectionTitle,{color:theme.text}]}>{title}</Text><Pressable onPress={onPress}><Text style={[styles.sectionAction,{color:theme.accent}]}>{action}</Text></Pressable></View>; }
function Field({ label, value, onChangeText, theme, keyboardType, multiline=false, placeholder }: { label:string; value:string; onChangeText:(v:string)=>void; theme:Theme; keyboardType?:any; multiline?:boolean; placeholder?:string }) { return <View style={{marginBottom:14}}><Text style={[styles.fieldLabel,{color:theme.text}]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder || label} placeholderTextColor={theme.muted} keyboardType={keyboardType} multiline={multiline} style={[styles.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.card},multiline&&{minHeight:110,textAlignVertical:"top"}]}/></View>; }
function ShieldIcon({ theme }: { theme: Theme }) { return <View style={[styles.profileShieldIcon,{backgroundColor:theme.isDark?"rgba(43,158,99,.14)":"#ECFDF5"}]}><Check size={13} color="#2B9E63" strokeWidth={3}/></View>; }
function ProfileActionTile({ theme, icon, title, text, onPress }: { theme:Theme; icon:React.ReactNode; title:string; text:string; onPress:()=>void }) { return <Pressable onPress={onPress} style={[styles.profileActionTile,{backgroundColor:theme.card,borderColor:theme.border}]}><View style={[styles.profileActionIcon,{backgroundColor:theme.isDark?"rgba(96,165,250,.12)":"#EFF6FF"}]}>{icon}</View><View style={{flex:1,minWidth:0}}><Text style={[styles.profileActionTitle,{color:theme.text}]} numberOfLines={1}>{title}</Text><Text style={[styles.profileActionText,{color:theme.muted}]} numberOfLines={2}>{text}</Text></View><ChevronRight size={16} color={theme.muted}/></Pressable>; }
function ProfileMiniFeature({ theme, icon, title, text }: { theme:Theme; icon:React.ReactNode; title:string; text:string }) { return <View style={[styles.profileMiniFeature,{backgroundColor:theme.card,borderColor:theme.border}]}><View style={[styles.profileActionIcon,{backgroundColor:theme.isDark?"rgba(96,165,250,.12)":"#EFF6FF"}]}>{icon}</View><Text style={[styles.profileMiniTitle,{color:theme.text}]}>{title}</Text><Text style={[styles.profileMiniText,{color:theme.muted}]}>{text}</Text></View>; }
function ProfileRow({ theme, icon, title, onPress }: { theme:Theme; icon:React.ReactNode; title:string; onPress:()=>void }) { return <Pressable onPress={onPress} style={[styles.profileRow,{backgroundColor:theme.card,borderColor:theme.border}]}>{icon}<Text style={[styles.profileRowText,{color:theme.text}]}>{title}</Text><ChevronRight size={18} color={theme.muted}/></Pressable>; }
function SettingRow({ theme, icon, title, trailing }: { theme:Theme; icon:React.ReactNode; title:string; trailing:React.ReactNode }) { return <View style={[styles.settingRow,{backgroundColor:theme.card,borderColor:theme.border}]}>{icon}<Text style={[styles.profileRowText,{color:theme.text,flex:1}]}>{title}</Text>{trailing}</View>; }
function Badge({ text, theme }: { text:string; theme:Theme }) { const color=text==="Completed"?"#2B9E63":text==="Pending"?"#D77E00":"#3B82F6"; return <View style={[styles.badge,{backgroundColor:darken(color,0.9)}]}><Text style={[styles.badgeText,{color}]}>{text}</Text></View>; }
function EmptyState({ theme, title, text, actionLabel, onAction, icon = "sparkles" }: { theme:Theme; title:string; text:string; actionLabel?:string; onAction?:()=>void; icon?:"sparkles"|"search"|"bookmark"|"orders"|"notifications"|"messages" }) {
  const Icon = icon === "search" ? Search : icon === "bookmark" ? Bookmark : icon === "orders" ? ShoppingBag : icon === "notifications" ? Bell : icon === "messages" ? MessageCircle : Sparkles;
  return <View style={[styles.energyEmpty,{backgroundColor:theme.card,borderColor:theme.border}]}>
    <View style={[styles.energyEmptyGlow,{backgroundColor:theme.isDark?"rgba(96,165,250,.10)":"rgba(37,99,235,.07)"}]} />
    <View style={[styles.energyEmptyIcon,{backgroundColor:theme.isDark?"#24212B":"#EFF6FF"}]}><Icon size={30} color={BUTTON_BLUE} strokeWidth={2.2}/></View>
    <View style={styles.energyEmptyCopy}>
      <Text style={[styles.energyEmptyEyebrow,{color:BUTTON_BLUE}]}>MARKETPLACE</Text>
      <Text style={[styles.energyEmptyTitle,{color:theme.text}]}>{title}</Text>
      <Text style={[styles.energyEmptyText,{color:theme.muted}]}>{text}</Text>
      {!!actionLabel && !!onAction && <Pressable onPress={onAction} style={[styles.energyEmptyButton,{backgroundColor:BUTTON_BLUE}]}><Text style={styles.energyEmptyButtonText}>{actionLabel}</Text><ChevronRight size={16} color="#fff"/></Pressable>}
    </View>
  </View>;
}
function darken(hex: string, ratio: number) { return hex; }

type Theme = { isDark: boolean; background: string; card: string; nav: string; text: string; muted: string; border: string; accent: string; };
const lightTheme: Theme = { isDark:false, background:"#F8FAFF", card:"#FFFFFF", nav:"rgba(255,255,255,0.98)", text:"#16131F", muted:"#948FA0", border:"#DBEAFE", accent:"#2563EB" };
const darkTheme: Theme = { isDark:true, background:"#111016", card:"#1B1822", nav:"rgba(24,21,31,0.98)", text:"#F7F4FD", muted:"#AAA3B6", border:"#312C39", accent:"#60A5FA" };

const styles = StyleSheet.create({
  container:{flex:1,alignItems:"center",justifyContent:"center"},
  shell:{width:"100%",maxWidth:480,flex:1,paddingHorizontal:12,paddingBottom:8},
  topBar:{height:48,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:8},
  topIcon:{width:34,height:34,borderRadius:17,alignItems:"center",justifyContent:"center"},
  brand:{fontSize:21,fontWeight:"800",flex:1,marginHorizontal:8},
  headerActions:{flexDirection:"row",alignItems:"center",gap:6},
  avatar:{width:36,height:36,borderRadius:18,alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0},headerAvatarImage:{width:"100%",height:"100%"},
  loginHeaderButton:{minWidth:62,height:34,paddingHorizontal:12,borderWidth:1.2,borderRadius:17,alignItems:"center",justifyContent:"center"},
  loginHeaderButtonText:{fontSize:12,fontWeight:"800"},
  avatarText:{fontSize:10,fontWeight:"800",color:"#fff"}, dot:{position:"absolute",right:1,top:1,width:7,height:7,borderRadius:4,backgroundColor:"#DD3850"},
  validationRow:{flexDirection:"row",alignItems:"center",gap:7}, validationDot:{width:7,height:7,borderRadius:4}, validationText:{fontSize:11,fontWeight:"700"}, passwordQuality:{borderWidth:1,borderRadius:14,padding:12}, passwordQualityTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:8}, passwordQualityLabel:{fontSize:11,fontWeight:"900"}, passwordMeter:{height:5,borderRadius:3,overflow:"hidden"}, passwordMeterFill:{height:"100%",borderRadius:3}, passwordChecks:{flexDirection:"row",flexWrap:"wrap",columnGap:12,rowGap:6,marginTop:10}, passwordCheckRow:{flexDirection:"row",alignItems:"center",gap:5,minWidth:"46%"}, passwordCheckIcon:{fontSize:12,fontWeight:"900"}, passwordCheckText:{fontSize:10.5,fontWeight:"700"}, authScroll:{paddingHorizontal:20,paddingTop:10,paddingBottom:40}, authTopRow:{height:44,flexDirection:"row",alignItems:"center",justifyContent:"space-between"}, authHeaderLabel:{fontSize:16,fontWeight:"900",letterSpacing:-0.2}, authBack:{width:40,height:40,borderRadius:20,borderWidth:1,alignItems:"center",justifyContent:"center"}, authMark:{width:40,height:40,borderRadius:14,alignItems:"center",justifyContent:"center"}, authHero:{marginTop:32,marginBottom:22,position:"relative",overflow:"hidden"}, authGlow:{position:"absolute",width:160,height:160,borderRadius:80,right:-60,top:-55}, authEyebrow:{fontSize:11,fontWeight:"900",letterSpacing:2.2,marginBottom:8}, authTitle:{fontSize:36,fontWeight:"900",letterSpacing:-1.2,lineHeight:42}, authSubtitle:{fontSize:14,lineHeight:21,marginTop:10,maxWidth:340}, authMode:{height:50,borderWidth:1,borderRadius:15,padding:4,flexDirection:"row",gap:4,marginBottom:14}, authModeItem:{flex:1,borderRadius:11,alignItems:"center",justifyContent:"center"}, authModeText:{fontSize:13,fontWeight:"900"}, googleButton:{height:54,borderWidth:1,borderRadius:16,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10}, googleIcon:{width:28,height:28,borderRadius:14,backgroundColor:"#fff",alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"#E1E1E1"}, googleButtonText:{fontSize:14,fontWeight:"900"}, authDivider:{flexDirection:"row",alignItems:"center",gap:10,marginVertical:18}, authLine:{height:1,flex:1}, authOr:{fontSize:10,fontWeight:"900",letterSpacing:1}, forgotButton:{alignSelf:"flex-end",marginTop:-5,marginBottom:12}, forgotText:{fontSize:12,fontWeight:"800"}, resetSecondary:{height:50,borderRadius:15,borderWidth:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginTop:10}, resetSecondaryText:{fontSize:13,fontWeight:"800"}, resetSuccessCard:{borderWidth:1,borderRadius:20,padding:22,alignItems:"center",marginTop:8}, resetSuccessIcon:{width:64,height:64,borderRadius:32,alignItems:"center",justifyContent:"center",marginBottom:14}, resetSuccessTitle:{fontSize:21,fontWeight:"900",marginBottom:7}, resetSuccessText:{fontSize:13,lineHeight:20,textAlign:"center"}, authPrimary:{height:54,borderRadius:16,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginTop:2}, authPrimaryText:{fontSize:15,fontWeight:"900",color:"#fff"}, authTrust:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginTop:18,paddingHorizontal:8}, authTrustText:{fontSize:11,lineHeight:16,textAlign:"center",flex:1}, authFootnote:{fontSize:10,lineHeight:15,textAlign:"center",marginTop:18,paddingHorizontal:8}, authErrorCard:{flexDirection:"row",alignItems:"flex-start",gap:11,borderWidth:1,borderRadius:16,padding:13,marginTop:12}, authErrorIcon:{width:28,height:28,borderRadius:14,alignItems:"center",justifyContent:"center"}, authErrorTitle:{fontSize:13,fontWeight:"900",marginBottom:3}, authErrorMessage:{fontSize:11.5,lineHeight:17}, authToastWrap:{position:"absolute",left:16,right:16,bottom:18,alignItems:"center"}, authToast:{minHeight:46,maxWidth:420,borderRadius:14,paddingHorizontal:14,paddingVertical:11,flexDirection:"row",alignItems:"center",gap:9,shadowColor:"#000",shadowOpacity:0.18,shadowRadius:12,shadowOffset:{width:0,height:6},elevation:8}, authToastDot:{width:7,height:7,borderRadius:4,backgroundColor:"#F2B84B"}, authToastText:{flex:1,color:"#fff",fontSize:12,fontWeight:"700"}, authToastClose:{color:"#C9C9C9",fontSize:18,lineHeight:18},
  menu:{position:"absolute",top:50,left:8,right:8,zIndex:50,borderWidth:1,borderRadius:18,padding:8,shadowColor:"#000",shadowOpacity:.12,shadowRadius:16,elevation:8},
  menuItem:{height:46,flexDirection:"row",alignItems:"center",gap:12,paddingHorizontal:10}, menuItemText:{flex:1,fontSize:14,fontWeight:"700"},
  scrollContent:{paddingTop:10,paddingBottom:100,gap:10},
  welcome:{fontSize:27,fontWeight:"800",marginTop:5}, subtle:{fontSize:13,lineHeight:19},

  hero:{borderRadius:22,padding:18,flexDirection:"row",alignItems:"center",gap:14,marginTop:4}, heroTitle:{fontSize:21,fontWeight:"800"}, heroSub:{fontSize:12,lineHeight:18,marginVertical:8}, heroIcon:{width:72,height:72,borderRadius:22,backgroundColor:"rgba(255,255,255,.65)",alignItems:"center",justifyContent:"center"},
  primaryButton:{height:44,borderRadius:13,alignItems:"center",justifyContent:"center",paddingHorizontal:16,flexDirection:"row",gap:8}, primaryButtonText:{color:"#fff",fontSize:14,fontWeight:"800"}, secondaryButton:{height:44,borderRadius:13,alignItems:"center",justifyContent:"center",paddingHorizontal:12,flexDirection:"row",gap:8,borderWidth:1}, secondaryButtonText:{fontSize:13,fontWeight:"800"},
  sectionHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:10}, sectionTitle:{fontSize:18,fontWeight:"800"}, sectionAction:{fontSize:13,fontWeight:"800"},
  categoryTile:{width:88,height:88,borderRadius:18,borderWidth:1,alignItems:"center",justifyContent:"center",gap:6}, categoryEmoji:{fontSize:26}, categoryText:{fontSize:11,fontWeight:"700"},
  compactCard:{borderWidth:1,borderRadius:16,flexDirection:"row",alignItems:"center",overflow:"hidden"},compactImage:{width:82,height:82},compactStoreRow:{flexDirection:"row",alignItems:"center",gap:6,marginTop:4},compactStoreAvatar:{width:20,height:20,borderRadius:10,alignItems:"center",justifyContent:"center",overflow:"hidden"},compactStoreAvatarImage:{width:"100%",height:"100%"},compactStoreAvatarText:{fontSize:8,fontWeight:"900"},priceSmall:{fontSize:15,fontWeight:"800",marginTop:6},
  sellBanner:{borderWidth:1,borderRadius:18,padding:14,flexDirection:"row",alignItems:"center",gap:12,marginTop:8},sellBannerTitle:{fontSize:15,fontWeight:"800",marginBottom:3},
  searchBox:{height:48,borderWidth:1,borderRadius:16,flexDirection:"row",alignItems:"center",paddingHorizontal:13,gap:8}, searchInput:{flex:1,fontSize:14,paddingVertical:0},
  filterRow:{paddingVertical:6,gap:8,paddingRight:10},filterChip:{paddingHorizontal:14,paddingVertical:8,borderRadius:999,borderWidth:1,minHeight:34,justifyContent:"center"},filterText:{fontSize:11,fontWeight:"800"},
  pageTitle:{fontSize:28,fontWeight:"800",marginTop:5}, dataNotice:{marginHorizontal:12,marginTop:4,marginBottom:2,borderWidth:1,borderRadius:12,paddingHorizontal:10,paddingVertical:7,flexDirection:"row",alignItems:"center",gap:7}, dataNoticeDot:{width:7,height:7,borderRadius:4,backgroundColor:"#F2B84B"}, dataNoticeText:{fontSize:11.5,flex:1}, dataNoticeRetry:{fontSize:11.5,fontWeight:"900",color:"#2563EB"},
  pageIntro:{marginBottom:12},
  energyEmpty:{borderWidth:1,borderRadius:28,padding:24,marginTop:18,overflow:"hidden",position:"relative",minHeight:290,alignItems:"center",justifyContent:"center"},
  energyEmptyGlow:{position:"absolute",width:210,height:210,borderRadius:105,right:-70,top:-80},
  energyEmptyIcon:{width:72,height:72,borderRadius:24,alignItems:"center",justifyContent:"center",marginBottom:17,borderWidth:1,borderColor:"rgba(37,99,235,.12)"},
  energyEmptyCopy:{alignItems:"center",maxWidth:340},
  energyEmptyEyebrow:{fontSize:9,fontWeight:"900",letterSpacing:1.6,marginBottom:6},
  energyEmptyTitle:{fontSize:21,fontWeight:"900",letterSpacing:-.35,textAlign:"center"},
  energyEmptyText:{fontSize:12,lineHeight:18,textAlign:"center",marginTop:7,maxWidth:310},
  energyEmptyButton:{height:42,paddingHorizontal:16,borderRadius:13,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5,marginTop:17},
  energyEmptyButtonText:{fontSize:12,fontWeight:"900",color:"#fff"},
  emptyOrb:{width:64,height:64,borderRadius:22,alignItems:"center",justifyContent:"center",position:"relative",marginBottom:14},
  emptyOrbRing:{position:"absolute",width:76,height:76,borderRadius:38,borderWidth:1,borderColor:"rgba(37,99,235,.10)"},
  card:{width:"100%",borderRadius:18,borderWidth:1,overflow:"hidden",marginTop:6},
  cardHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:12}, storeMeta:{flexDirection:"row",alignItems:"center",flex:1,minWidth:0},storeAvatar:{width:36,height:36,borderRadius:18,alignItems:"center",justifyContent:"center",marginRight:10,overflow:"hidden"},storeAvatarImage:{width:"100%",height:"100%"},storeAvatarText:{fontSize:13,fontWeight:"800"},storeTextWrap:{flex:1,minWidth:0},storeName:{fontSize:14,fontWeight:"800"},location:{fontSize:11,marginTop:2},listingImage:{width:"100%",height:330,backgroundColor:"#EEE"},productGallery:{height:330,position:"relative",overflow:"hidden"},productGalleryPlaceholder:{alignItems:"center",justifyContent:"center"},galleryDots:{position:"absolute",left:0,right:0,bottom:12,flexDirection:"row",justifyContent:"center",alignItems:"center",gap:5},galleryDot:{width:5,height:5,borderRadius:3,backgroundColor:"rgba(255,255,255,.55)"},galleryDotActive:{width:7,height:7,borderRadius:4,backgroundColor:"#fff"},galleryCount:{position:"absolute",right:10,top:10,paddingHorizontal:8,paddingVertical:4,borderRadius:999,backgroundColor:"rgba(0,0,0,.52)"},galleryCountText:{fontSize:9,fontWeight:"900",color:"#fff"},generalOfferBadge:{position:"absolute",left:10,top:10,paddingHorizontal:8,paddingVertical:5,borderRadius:999,backgroundColor:"#DCFCE7",flexDirection:"row",alignItems:"center",gap:3},generalOfferBadgeText:{fontSize:8,fontWeight:"900",color:"#15803D"},generalBoostBadge:{position:"absolute",right:10,top:10,paddingHorizontal:8,paddingVertical:5,borderRadius:999,backgroundColor:BUTTON_BLUE,flexDirection:"row",alignItems:"center",gap:3},generalBoostBadgeText:{fontSize:8,fontWeight:"900",color:"#fff"},cardBody:{padding:12},actionRow:{flexDirection:"row",alignItems:"center",gap:14},actionButton:{flexDirection:"row",alignItems:"center",gap:4},whatsappActionButton:{width:28,height:28,alignItems:"center",justifyContent:"center"},whatsappIconCircle:{width:25,height:25,borderRadius:13,backgroundColor:"#25D366",alignItems:"center",justifyContent:"center"},whatsappPhoneMark:{position:"absolute",left:8.5,top:8.5},actionCount:{fontSize:11},saveAlign:{marginLeft:"auto"},metaText:{fontSize:11,marginTop:8},itemText:{fontSize:14,lineHeight:20,marginTop:8},itemStore:{fontWeight:"800"},price:{fontSize:24,fontWeight:"800",marginTop:8},itemMeta:{fontSize:11,marginTop:7},
  bottomNav:{flexDirection:"row",justifyContent:"space-around",alignItems:"center",borderTopWidth:1,paddingHorizontal:8,position:"absolute",bottom:0,left:0,right:0},navItem:{alignItems:"center",justifyContent:"center",flex:1,minHeight:46},navIconCreate:{width:44,height:44,borderRadius:15,alignItems:"center",justifyContent:"center"},navLabel:{fontSize:9,marginTop:3},navLabelActive:{fontWeight:"800"},
  detailImage:{width:"100%",height:330,borderRadius:20,backgroundColor:"#EEE"},detailGallery:{height:420,borderRadius:24,overflow:"hidden",position:"relative",alignSelf:"center",marginBottom:2},detailGalleryImage:{height:420,backgroundColor:"#EEE"},detailGalleryDots:{position:"absolute",left:0,right:0,bottom:12,flexDirection:"row",justifyContent:"center",alignItems:"center",gap:5},productTitle:{fontSize:20,fontWeight:"800",lineHeight:26},bigPrice:{fontSize:28,fontWeight:"900",marginTop:8},storePill:{borderWidth:1,borderRadius:999,paddingHorizontal:9,paddingVertical:6,alignSelf:"flex-start",marginTop:12,flexDirection:"row",alignItems:"center",gap:7,maxWidth:"90%"},detailStoreAvatar:{width:24,height:24,borderRadius:12,alignItems:"center",justifyContent:"center",overflow:"hidden"},detailStoreAvatarImage:{width:"100%",height:"100%"},detailStoreAvatarText:{fontSize:9,fontWeight:"900"},storePillText:{fontSize:12,fontWeight:"800",flexShrink:1},detailText:{fontSize:14,lineHeight:22,marginTop:14},detailButtons:{flexDirection:"row",gap:8,marginTop:18},rowBetween:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12},
  formHint:{fontSize:13,lineHeight:19,marginBottom:8},fieldLabel:{fontSize:12,fontWeight:"800",marginBottom:7},input:{height:46,borderWidth:1,borderRadius:13,paddingHorizontal:12,fontSize:14},uploadBox:{height:120,borderWidth:1,borderStyle:"dashed",borderRadius:18,alignItems:"center",justifyContent:"center",gap:8,marginBottom:14},
  createHeader:{flexDirection:"row",alignItems:"flex-start",gap:12,marginTop:4},createTitle:{fontSize:28,fontWeight:"900",letterSpacing:-0.5},createSub:{fontSize:12,lineHeight:18,marginTop:4,maxWidth:280},createStepBadge:{paddingHorizontal:10,paddingVertical:7,borderRadius:999},createStepText:{fontSize:11,fontWeight:"900"},progressRail:{marginTop:14,marginBottom:2},progressTrack:{height:5,borderRadius:999,overflow:"hidden"},progressFill:{height:5,borderRadius:999},progressLabels:{flexDirection:"row",justifyContent:"space-between",marginTop:7},progressLabel:{fontSize:10,fontWeight:"700"},progressLabelActive:{fontSize:10,fontWeight:"900"},progressStepButton:{paddingHorizontal:6,paddingVertical:4},typeCard:{borderWidth:1,borderRadius:20,padding:14},inlineLabel:{flexDirection:"row",alignItems:"center",gap:8},cardTitle:{fontSize:15,fontWeight:"900"},cardHint:{fontSize:11,lineHeight:17,marginTop:4,marginBottom:12},segmented:{borderWidth:1,borderRadius:16,padding:4,flexDirection:"row",gap:4},segment:{flex:1,height:42,borderRadius:12,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:7},segmentText:{fontSize:13,fontWeight:"800"},formCard:{borderWidth:1,borderRadius:20,padding:14},photoCover:{height:174,borderWidth:1,borderStyle:"dashed",borderRadius:18,alignItems:"center",justifyContent:"center",padding:14},photoCoverImage:{height:210,borderWidth:1,borderRadius:18,overflow:"hidden",position:"relative"},photoCoverImageFill:{width:"100%",height:"100%"},coverBadge:{position:"absolute",top:10,left:10,backgroundColor:"rgba(37,99,235,.95)",paddingHorizontal:9,paddingVertical:5,borderRadius:999},coverBadgeText:{color:"#fff",fontSize:9,fontWeight:"900",letterSpacing:.7},coverEditHint:{position:"absolute",bottom:10,left:10,right:10,flexDirection:"row",alignItems:"center",gap:5},coverEditText:{color:"#fff",fontSize:10,fontWeight:"800",textShadowColor:"rgba(0,0,0,.7)",textShadowOffset:{width:0,height:1},textShadowRadius:3},coverHelper:{fontSize:10,lineHeight:15,marginTop:6},uploadOverlay:{position:"absolute",inset:0,backgroundColor:"rgba(0,0,0,.52)",alignItems:"center",justifyContent:"center",gap:7},uploadOverlayText:{color:"#fff",fontSize:11,fontWeight:"800"},uploadDoneBadge:{position:"absolute",right:10,bottom:10,width:27,height:27,borderRadius:14,backgroundColor:"#16A34A",alignItems:"center",justifyContent:"center"},photoThumbRowWide:{flexDirection:"row",gap:8,marginTop:10,flexWrap:"wrap"},photoThumbLarge:{width:62,height:62,borderWidth:1,borderRadius:13,overflow:"hidden",position:"relative"},photoThumbImage:{width:"100%",height:"100%"},photoAddThumb:{alignItems:"center",justifyContent:"center",borderStyle:"dashed"},thumbnailUploadOverlay:{position:"absolute",inset:0,backgroundColor:"rgba(0,0,0,.5)",alignItems:"center",justifyContent:"center"},thumbnailDoneBadge:{position:"absolute",right:4,bottom:4,width:19,height:19,borderRadius:10,backgroundColor:"#16A34A",alignItems:"center",justifyContent:"center"},photoAddedState:{alignItems:"center",justifyContent:"center"},photoUploadIcon:{width:48,height:48,borderRadius:16,alignItems:"center",justifyContent:"center"},photoUploadTitle:{fontSize:14,fontWeight:"900",marginTop:10},photoAddedText:{fontSize:14,fontWeight:"900",marginTop:9},photoHint:{fontSize:11,marginTop:4,textAlign:"center"},photoThumbRow:{flexDirection:"row",gap:8,marginTop:9},photoThumb:{height:50,flex:1,borderWidth:1,borderRadius:13,alignItems:"center",justifyContent:"center"},fieldRow:{flexDirection:"row",gap:12,alignItems:"center"},switchWrapModern:{width:96,alignItems:"center",justifyContent:"center",marginBottom:10},switchLabel:{fontSize:10,fontWeight:"800",marginBottom:2},categoryPicker:{gap:8,paddingBottom:10},categoryChip:{borderWidth:1,borderRadius:999,paddingHorizontal:11,paddingVertical:8},categoryChipText:{fontSize:11,fontWeight:"800"},optionRow:{flexDirection:"row",gap:8,marginBottom:12},optionPill:{minHeight:38,borderWidth:1,borderRadius:12,paddingHorizontal:14,alignItems:"center",justifyContent:"center"},optionPillText:{fontSize:12,fontWeight:"800"},inlineFieldLabel:{flexDirection:"row",alignItems:"center",gap:6,marginBottom:7},fieldLabelNoMargin:{fontSize:12,fontWeight:"800"},descriptionInput:{minHeight:118,borderWidth:1,borderRadius:14,padding:12,fontSize:14,lineHeight:20,textAlignVertical:"top"},characterHint:{fontSize:10,textAlign:"right",marginTop:5},tipCard:{borderWidth:1,borderRadius:18,padding:13,flexDirection:"row",alignItems:"flex-start",gap:10},tipTitle:{fontSize:13,fontWeight:"800"},tipText:{fontSize:11,lineHeight:17,marginTop:3},publishSheet:{borderWidth:1,borderRadius:18,padding:10,flexDirection:"row",alignItems:"center",gap:8,marginTop:2}, publishSheetFixed:{position:"absolute",left:0,right:0,bottom:0,borderTopWidth:1,paddingHorizontal:12,paddingTop:10,paddingBottom:14,flexDirection:"row",alignItems:"center",gap:8,zIndex:50,elevation:12},publishSheetTitle:{fontSize:12,fontWeight:"900"},publishSheetSub:{fontSize:10,lineHeight:15,marginTop:2},  photoRemoveButton:{position:"absolute",top:2,right:2,width:22,height:22,borderRadius:11,backgroundColor:"rgba(0,0,0,.65)",alignItems:"center",justifyContent:"center"}, photoRemoveText:{color:"#fff",fontSize:14,fontWeight:"800"}, successScreen:{flex:1,alignItems:"center",justifyContent:"center",paddingHorizontal:20,gap:26}, verifiedAnimationWrap:{width:190,height:190,alignItems:"center",justifyContent:"center",position:"relative"}, successHalo:{position:"absolute",width:178,height:178,borderRadius:89,borderWidth:8}, verifiedBadge:{width:126,height:126,borderRadius:63,alignItems:"center",justifyContent:"center",elevation:10,shadowOpacity:0.2,shadowRadius:18,shadowOffset:{width:0,height:8}}, successSparkle:{position:"absolute",width:10,height:10,borderRadius:5}, sparkleTop:{top:12},sparkleRight:{right:14},sparkleBottom:{bottom:18},sparkleLeft:{left:14}, successCheckOuter:{width:170,height:170,borderRadius:85,alignItems:"center",justifyContent:"center",borderWidth:1}, successCheckCircle:{width:118,height:118,borderRadius:59,alignItems:"center",justifyContent:"center"}, successTitle:{fontSize:30,fontWeight:"900",textAlign:"center",letterSpacing:-0.5}, successSub:{fontSize:14,lineHeight:21,textAlign:"center",marginTop:8,paddingHorizontal:10}, successActions:{flexDirection:"row",gap:10,marginTop:24}, profileAuthCard:{borderWidth:1,borderRadius:28,padding:24,marginTop:12,marginHorizontal:2,alignItems:"center",shadowColor:"#000",shadowOpacity:.08,shadowRadius:18,shadowOffset:{width:0,height:8},elevation:5},profileAuthIcon:{width:72,height:72,borderRadius:24,alignItems:"center",justifyContent:"center",marginBottom:16},profileAuthTitle:{fontSize:25,fontWeight:"900",letterSpacing:-.6,textAlign:"center"},profileAuthText:{fontSize:13,lineHeight:20,textAlign:"center",marginTop:8,maxWidth:340},profileAuthButton:{width:"100%",minHeight:52,borderWidth:1,borderRadius:16,alignItems:"center",justifyContent:"center",marginTop:10,paddingHorizontal:16},profileAuthButtonText:{fontSize:14,fontWeight:"900"},
 settingsSectionTitle:{fontSize:13,fontWeight:"900",letterSpacing:.8,textTransform:"uppercase",marginBottom:8,marginTop:6},preferenceBlock:{borderWidth:1,borderRadius:18,padding:14,marginBottom:9,shadowColor:"#000",shadowOpacity:.04,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:2},preferenceActionRow:{minHeight:68,borderWidth:1,borderRadius:18,padding:13,flexDirection:"row",alignItems:"center",gap:11,marginBottom:9,shadowColor:"#000",shadowOpacity:.04,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:2},preferenceActionIcon:{width:40,height:40,borderRadius:13,alignItems:"center",justifyContent:"center"},preferenceTitle:{fontSize:13,fontWeight:"900"},preferenceDescription:{fontSize:10.5,lineHeight:16,marginTop:3},choiceChip:{minHeight:38,borderWidth:1,borderRadius:12,paddingHorizontal:13,alignItems:"center",justifyContent:"center"},faqRow:{minHeight:58,borderBottomWidth:1,flexDirection:"row",alignItems:"center",gap:12,paddingVertical:11,paddingHorizontal:4},faqQuestion:{fontSize:13,fontWeight:"800",lineHeight:19},faqAnswer:{fontSize:11.5,lineHeight:18,marginTop:7},reportInput:{minHeight:120,borderWidth:1,borderRadius:16,padding:13,fontSize:13,textAlignVertical:"top",marginBottom:9},reportInputSingle:{height:48,borderWidth:1,borderRadius:14,paddingHorizontal:13,fontSize:13,marginBottom:9},safetyHero:{borderWidth:1,borderRadius:24,padding:20,alignItems:"flex-start",marginBottom:10},safetyTip:{borderWidth:1,borderRadius:18,padding:14,flexDirection:"row",alignItems:"flex-start",gap:11,marginBottom:9},safetyNumber:{width:30,height:30,borderRadius:10,alignItems:"center",justifyContent:"center"},legalCard:{borderWidth:1,borderRadius:24,padding:20,marginTop:8},legalTitle:{fontSize:25,fontWeight:"900",letterSpacing:-.5},legalHeading:{fontSize:14,fontWeight:"900",marginTop:20,marginBottom:6},legalText:{fontSize:12.5,lineHeight:20}, profileHeader:{flexDirection:"row",alignItems:"center",gap:14,paddingVertical:8},profileAvatar:{width:76,height:76,borderRadius:38,alignItems:"center",justifyContent:"center"},profileAvatarText:{fontSize:18,fontWeight:"900",color:"#fff"},profileHeroCard:{borderWidth:1,borderRadius:26,padding:18,marginBottom:13,shadowColor:"#000",shadowOpacity:.07,shadowRadius:16,shadowOffset:{width:0,height:7},elevation:4},profileHeroTop:{flexDirection:"row",alignItems:"center",gap:12},profileAvatarLarge:{width:64,height:64,borderRadius:22,alignItems:"center",justifyContent:"center"},profileAvatarTextLarge:{fontSize:20,fontWeight:"900",color:"#fff"},profileNameLine:{flexDirection:"row",alignItems:"center",gap:7},profileName:{fontSize:18,fontWeight:"900",letterSpacing:-0.3,flexShrink:1},profileEmail:{fontSize:11,marginTop:3},profileMember:{fontSize:10,marginTop:3},profileVerified:{flexDirection:"row",alignItems:"center",gap:3,paddingHorizontal:7,paddingVertical:4,borderRadius:999},profileVerifiedText:{fontSize:9,fontWeight:"900"},metaVerifiedBadge:{backgroundColor:BUTTON_BLUE,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"rgba(255,255,255,.55)"},profileIdentityHint:{fontSize:9.5,lineHeight:14,marginTop:-4,marginBottom:10},profileEditButton:{width:34,height:34,borderWidth:1,borderRadius:12,alignItems:"center",justifyContent:"center"},profileTrustRow:{borderTopWidth:1,marginTop:14,paddingTop:12,flexDirection:"row",alignItems:"center",gap:10},profileTrustItem:{flex:1,flexDirection:"row",alignItems:"center",gap:8},profileShieldIcon:{width:26,height:26,borderRadius:9,alignItems:"center",justifyContent:"center"},profileTrustDivider:{width:1,height:28},profileTrustTitle:{fontSize:10,fontWeight:"900"},profileTrustText:{fontSize:8.5,marginTop:2},profileModeSwitch:{height:52,borderWidth:1,borderRadius:17,padding:4,flexDirection:"row",gap:4,marginBottom:16},profileModeButton:{flex:1,borderRadius:12,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:6},profileModeText:{fontSize:12,fontWeight:"900"},profileSectionHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:5,marginBottom:10},profileSectionTitle:{fontSize:18,fontWeight:"900",letterSpacing:-0.2},profileSectionSub:{fontSize:10,lineHeight:15,marginTop:3,maxWidth:290},profileRoleBadge:{paddingHorizontal:8,paddingVertical:5,borderRadius:999},profileRoleBadgeText:{fontSize:8,fontWeight:"900",letterSpacing:1},profileActionGrid:{flexDirection:"row",flexWrap:"wrap",gap:9},profileActionTile:{flexBasis:"48%",flexGrow:1,minWidth:145,minHeight:100,borderWidth:1,borderRadius:18,padding:11,flexDirection:"row",alignItems:"center",gap:9},profileActionIcon:{width:40,height:40,borderRadius:11,alignItems:"center",justifyContent:"center"},profileActionTitle:{fontSize:13,fontWeight:"900",letterSpacing:-.1},profileActionText:{fontSize:10.5,lineHeight:15,marginTop:4},profileFeatureCard:{borderWidth:1,borderRadius:18,padding:13,marginTop:12,flexDirection:"row",alignItems:"flex-start",gap:10},profileFeatureIcon:{width:34,height:34,borderRadius:11,alignItems:"center",justifyContent:"center"},profileFeatureTitle:{fontSize:12,fontWeight:"900"},profileFeatureText:{fontSize:9.5,lineHeight:15,marginTop:4},sellerSetupCard:{borderRadius:20,padding:15,marginTop:12,flexDirection:"row",alignItems:"center",gap:12},sellerSetupEyebrow:{fontSize:8,fontWeight:"900",letterSpacing:1.4,color:"#93C5FD"},sellerSetupTitle:{fontSize:17,fontWeight:"900",color:"#FFFFFF",marginTop:5,letterSpacing:-0.3},sellerSetupText:{fontSize:9.5,lineHeight:15,color:"#CBD5E1",marginTop:4},sellerSetupButton:{height:38,paddingHorizontal:12,borderRadius:12,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:3},sellerSetupButtonText:{fontSize:11,fontWeight:"900"},profileEssentialsRow:{flexDirection:"row",gap:9,alignItems:"stretch"},profileMiniFeature:{flex:1,minWidth:0,borderWidth:1,borderRadius:18,padding:13,shadowColor:"#000",shadowOpacity:.04,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:2},profileMiniTitle:{fontSize:11,fontWeight:"900",marginTop:8},profileMiniText:{fontSize:9,lineHeight:14,marginTop:3},profileRow:{minHeight:62,borderWidth:1,borderRadius:18,flexDirection:"row",alignItems:"center",paddingHorizontal:14,gap:12,marginBottom:8},profileRowText:{fontSize:14,fontWeight:"700"},logoutRow:{minHeight:54,borderWidth:1,borderRadius:16,flexDirection:"row",alignItems:"center",paddingHorizontal:14,gap:12},logoutText:{color:"#D33D3D",fontSize:14,fontWeight:"800"},
  profileLoading:{fontSize:10,textAlign:"center",marginTop:2,marginBottom:4},profileSheetOverlay:{position:"absolute",left:0,right:0,top:0,bottom:0,zIndex:100,elevation:100,justifyContent:"flex-end"},profileSheetBackdrop:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(0,0,0,.58)"},profileSheet:{maxHeight:"92%",borderTopLeftRadius:24,borderTopRightRadius:24,overflow:"hidden",shadowColor:"#000",shadowOpacity:.25,shadowRadius:22,shadowOffset:{width:0,height:-8},elevation:24},profileSheetHeader:{minHeight:68,borderBottomWidth:1,paddingHorizontal:16,paddingVertical:12,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},profileSheetTitle:{fontSize:20,fontWeight:"900",letterSpacing:-.4},profileSheetSub:{fontSize:10,marginTop:3},profileSheetClose:{width:34,height:34,borderRadius:17,alignItems:"center",justifyContent:"center"},profileEditSectionTitle:{fontSize:13,fontWeight:"900",marginBottom:8},profileEditCard:{borderWidth:1,borderRadius:18,padding:13},profileEditAvatarRow:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:14},profileEditAvatar:{width:64,height:64,borderRadius:20,alignItems:"center",justifyContent:"center"},profileEditLabel:{fontSize:12,fontWeight:"900"},profileEditHint:{fontSize:9.5,lineHeight:14,marginTop:3},profileBlueButton:{height:34,borderRadius:10,paddingHorizontal:11,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:5,alignSelf:"flex-start",marginTop:7},profileBlueButtonText:{fontSize:10.5,fontWeight:"900",color:"#fff"},profileLockedField:{height:46,borderWidth:1,borderRadius:13,paddingHorizontal:12,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:7},profileLockedText:{fontSize:13,flex:1,marginRight:8},profileCoverPreview:{height:138,borderWidth:1,borderRadius:16,overflow:"hidden",alignItems:"center",justifyContent:"center",marginBottom:13},profileCoverButton:{position:"absolute",right:10,bottom:10,height:34,borderRadius:10,paddingHorizontal:11,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:5},profileStoreLogoRow:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:14},profileStoreLogo:{width:58,height:58,borderRadius:16,alignItems:"center",justifyContent:"center"},profileEditError:{borderWidth:1,borderRadius:14,padding:11,marginTop:12,flexDirection:"row",alignItems:"flex-start",gap:8},profileEditErrorText:{flex:1,fontSize:10.5,lineHeight:16,fontWeight:"700"},profileSheetActions:{borderTopWidth:1,paddingHorizontal:16,paddingTop:10,flexDirection:"row",gap:9},profileCancelButton:{height:46,borderWidth:1,borderRadius:13,flex:1,alignItems:"center",justifyContent:"center"},profileCancelText:{fontSize:13,fontWeight:"900"},profileSaveButton:{height:46,borderRadius:13,flex:1,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:7},profileSaveText:{fontSize:13,fontWeight:"900",color:"#fff"},
  storePageCard:{borderWidth:1,borderRadius:26,overflow:"hidden",marginBottom:12},storeCover:{height:150,position:"relative",overflow:"hidden"},storeCoverGlow:{position:"absolute",width:230,height:230,borderRadius:115,backgroundColor:"rgba(37,99,235,.28)",right:-70,top:-110},storeCoverShade:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(2,6,23,.18)"},storeCoverTopRow:{position:"absolute",left:12,right:12,top:12,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},storeStatusPill:{height:30,paddingHorizontal:10,borderRadius:999,backgroundColor:"rgba(2,6,23,.48)",flexDirection:"row",alignItems:"center",gap:6},storeStatusDot:{width:7,height:7,borderRadius:4},storeStatusText:{fontSize:10,fontWeight:"900",color:"#fff"},storeCircleButton:{width:34,height:34,borderRadius:17,backgroundColor:"rgba(2,6,23,.48)",alignItems:"center",justifyContent:"center"},storeIdentityBlock:{paddingHorizontal:16,paddingTop:0,paddingBottom:14,flexDirection:"row",gap:12},storeLogoLarge:{width:72,height:72,borderRadius:22,borderWidth:4,alignItems:"center",justifyContent:"center",marginTop:-34,overflow:"hidden"},storeLogoImage:{width:"100%",height:"100%"},storeLogoLetter:{fontSize:24,fontWeight:"900",color:"#fff"},storeIdentityText:{flex:1,paddingTop:8,minWidth:0},storeNameRow:{flexDirection:"row",alignItems:"center",gap:7},storePageTitle:{fontSize:20,fontWeight:"900",letterSpacing:-.4,flexShrink:1},storeVerifiedBadge:{width:19,height:19,borderRadius:10,backgroundColor:BUTTON_BLUE,alignItems:"center",justifyContent:"center"},storeIdentityLabelRow:{flexDirection:"row",alignItems:"center",gap:7,marginBottom:4},storeIdentityLabel:{fontSize:8,fontWeight:"900",letterSpacing:1.2},storeOwnerLabel:{fontSize:8.5},storePageDescription:{fontSize:11,lineHeight:17,marginTop:4},storeMetaLine:{flexDirection:"row",alignItems:"center",gap:4,marginTop:6},storeMetaText:{fontSize:10,flexShrink:1},storeStatsRow:{marginHorizontal:16,borderTopWidth:1,borderBottomWidth:1,minHeight:62,flexDirection:"row",alignItems:"center",justifyContent:"space-around"},storeStat:{flex:1,alignItems:"center"},storeStatValue:{fontSize:17,fontWeight:"900"},storeStatLabel:{fontSize:9,fontWeight:"700",marginTop:2},storeStatDivider:{width:1,height:28},storeQuickActions:{padding:12,flexDirection:"row",gap:8},storePrimaryAction:{height:44,borderRadius:13,flex:1,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:7},storePrimaryActionText:{color:"#fff",fontSize:12,fontWeight:"900"},storeSecondaryAction:{height:44,borderRadius:13,paddingHorizontal:15,borderWidth:1,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:7},storeSecondaryActionText:{fontSize:12,fontWeight:"900"},storeToolsCard:{borderWidth:1,borderRadius:22,padding:14,marginBottom:14},storeToolsHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:12},storeToolsTitle:{fontSize:15,fontWeight:"900"},storeToolsSubtitle:{fontSize:10,lineHeight:15,marginTop:3},storeToolsIcon:{width:36,height:36,borderRadius:12,alignItems:"center",justifyContent:"center"},storeToolGrid:{flexDirection:"row",flexWrap:"wrap",gap:8},storeToolItem:{width:"48.5%",minHeight:100,borderRadius:15,padding:11},storeToolTitle:{fontSize:11,fontWeight:"900",marginTop:8},storeToolText:{fontSize:9,lineHeight:14,marginTop:3},storeListingsHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:4,marginBottom:10},storeListingsTitle:{fontSize:17,fontWeight:"900",letterSpacing:-.2},storeListingsSubtitle:{fontSize:10,marginTop:3},storeCountPill:{minWidth:32,height:30,paddingHorizontal:9,borderRadius:999,alignItems:"center",justifyContent:"center"},storeCountText:{fontSize:12,fontWeight:"900"},storeLoadingCard:{minHeight:150,borderWidth:1,borderRadius:20,alignItems:"center",justifyContent:"center",gap:9},storeLoadingText:{fontSize:11,fontWeight:"700"},storeErrorCard:{borderWidth:1,borderRadius:18,padding:13,flexDirection:"row",alignItems:"center",gap:10},storeErrorTitle:{fontSize:12,fontWeight:"900"},storeErrorText:{fontSize:9.5,lineHeight:14,marginTop:3},storeRetryButton:{height:34,paddingHorizontal:12,borderRadius:10,alignItems:"center",justifyContent:"center"},storeRetryText:{fontSize:10,fontWeight:"900",color:"#fff"},storeEmptyCard:{borderWidth:1,borderRadius:20,padding:22,alignItems:"center",justifyContent:"center",minHeight:200},storeEmptyIcon:{width:52,height:52,borderRadius:17,alignItems:"center",justifyContent:"center",marginBottom:12},storeEmptyTitle:{fontSize:14,fontWeight:"900",textAlign:"center"},storeEmptyText:{fontSize:10.5,lineHeight:16,textAlign:"center",marginTop:5,maxWidth:280},storeListingGrid:{flexDirection:"row",flexWrap:"wrap",gap:10},storeListingCard:{width:"48.6%",borderWidth:1,borderRadius:18,overflow:"hidden"},storeListingImageWrap:{height:145,position:"relative"},storeListingImage:{width:"100%",height:"100%",backgroundColor:"#E5E7EB"},storeListingType:{position:"absolute",left:8,bottom:8,paddingHorizontal:7,paddingVertical:4,borderRadius:999,backgroundColor:"rgba(2,6,23,.58)"},storeListingTypeText:{fontSize:8,fontWeight:"900",color:"#fff"},storeListingBody:{padding:10},storeOfferPill:{position:"absolute",left:8,top:8,paddingHorizontal:7,paddingVertical:4,borderRadius:999,flexDirection:"row",alignItems:"center",gap:3,backgroundColor:"#DCFCE7"},storeOfferPillText:{fontSize:8,fontWeight:"900",color:"#15803D"},storeBoostPill:{position:"absolute",right:8,top:8,paddingHorizontal:7,paddingVertical:4,borderRadius:999,flexDirection:"row",alignItems:"center",gap:3,backgroundColor:BUTTON_BLUE},storeBoostPillText:{fontSize:8,fontWeight:"900",color:"#fff"},storeListingEditButton:{width:30,height:30,borderRadius:10,alignItems:"center",justifyContent:"center"},storeListingOriginalPrice:{fontSize:9,textDecorationLine:"line-through",marginTop:2},listingEditorToggle:{minHeight:62,borderWidth:1,borderRadius:16,paddingHorizontal:12,paddingVertical:10,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:12},listingToggle:{width:40,height:23,borderRadius:999,justifyContent:"center"},listingToggleKnob:{width:19,height:19,borderRadius:10,backgroundColor:"#fff"},listingEditorSection:{borderWidth:1,borderRadius:18,padding:12,marginBottom:12},listingEditorSectionHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},listingEditPhoto:{width:118,height:150,borderWidth:2,borderRadius:14,overflow:"hidden",position:"relative"},listingEditPhotoImage:{width:"100%",height:"100%"},listingEditCover:{position:"absolute",left:6,top:6,paddingHorizontal:6,paddingVertical:4,borderRadius:7,backgroundColor:"rgba(37,99,235,.92)"},listingEditPhotoActions:{position:"absolute",left:5,right:5,bottom:5,flexDirection:"row",justifyContent:"center",gap:5},listingPhotoAction:{width:28,height:28,borderRadius:9,alignItems:"center",justifyContent:"center"},listingBoostCard:{borderWidth:1,borderRadius:18,padding:12,flexDirection:"row",alignItems:"center",gap:9,marginBottom:12},listingBoostIcon:{width:36,height:36,borderRadius:11,alignItems:"center",justifyContent:"center"},storeListingTitle:{fontSize:11.5,fontWeight:"900",lineHeight:16,minHeight:32},storeListingPrice:{fontSize:15,fontWeight:"900",marginTop:6},storeListingMeta:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:6},storeListingMetaText:{fontSize:8.5,flex:1,marginRight:4},  messagesIntro:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:14},messagesTitle:{fontSize:26,fontWeight:"900",letterSpacing:-.5},messagesSubtitle:{fontSize:11,marginTop:3},messagesRefresh:{width:38,height:38,borderRadius:12,borderWidth:1,alignItems:"center",justifyContent:"center"},messagesSearch:{height:48,borderWidth:1,borderRadius:15,flexDirection:"row",alignItems:"center",paddingHorizontal:13,gap:9,marginBottom:12},messagesSearchInput:{flex:1,fontSize:13},messageSkeleton:{height:82,borderWidth:1,borderRadius:18,marginBottom:9,opacity:.65},messagesEmptyCard:{borderWidth:1,borderRadius:22,padding:28,alignItems:"center",justifyContent:"center",marginTop:26,minHeight:250},messagesEmptyIcon:{width:58,height:58,borderRadius:19,alignItems:"center",justifyContent:"center",marginBottom:13},messagesEmptyTitle:{fontSize:16,fontWeight:"900"},messagesEmptyText:{fontSize:11,lineHeight:17,textAlign:"center",maxWidth:300,marginTop:5},messageConversationRow:{minHeight:78,borderWidth:1,borderRadius:18,padding:11,flexDirection:"row",alignItems:"center",gap:11,marginBottom:9},messageAvatar:{width:48,height:48,borderRadius:16,alignItems:"center",justifyContent:"center",overflow:"hidden"},messageAvatarImage:{width:"100%",height:"100%"},messageAvatarText:{fontSize:14,fontWeight:"900"},messageRowTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:7},messageConversationName:{fontSize:13,fontWeight:"900",flex:1},messageTime:{fontSize:9},messageStoreName:{fontSize:9.5,fontWeight:"800",marginTop:2},messagePreview:{fontSize:10.5,marginTop:4},messageUnread:{minWidth:22,height:22,paddingHorizontal:6,borderRadius:11,backgroundColor:BUTTON_BLUE,alignItems:"center",justifyContent:"center"},messageUnreadText:{fontSize:9,fontWeight:"900",color:"#fff"},chatHeader:{minHeight:64,borderWidth:1,borderRadius:18,marginBottom:8,padding:9,flexDirection:"row",alignItems:"center",gap:9},chatBackButton:{width:38,height:38,borderRadius:12,alignItems:"center",justifyContent:"center"},chatAvatar:{width:42,height:42,borderRadius:14,alignItems:"center",justifyContent:"center",overflow:"hidden"},chatAvatarImage:{width:"100%",height:"100%"},chatAvatarText:{fontSize:12,fontWeight:"900"},chatName:{fontSize:13,fontWeight:"900"},chatStore:{fontSize:9.5,marginTop:2},chatOnlineDot:{width:8,height:8,borderRadius:4,marginRight:3},chatEmpty:{alignItems:"center",justifyContent:"center",paddingTop:90,paddingHorizontal:30},chatEmptyIcon:{width:58,height:58,borderRadius:19,alignItems:"center",justifyContent:"center",marginBottom:13},chatEmptyTitle:{fontSize:16,fontWeight:"900"},chatEmptyText:{fontSize:11,lineHeight:17,textAlign:"center",marginTop:5},chatBubbleRow:{flexDirection:"row",marginBottom:8},chatBubble:{maxWidth:"82%",borderWidth:1,borderRadius:18,paddingHorizontal:12,paddingVertical:9},chatBubbleText:{fontSize:12,lineHeight:18},chatTime:{fontSize:8,alignSelf:"flex-end",marginTop:4},chatComposer:{borderTopWidth:1,paddingTop:8,paddingBottom:8,flexDirection:"row",alignItems:"flex-end",gap:7},chatAttach:{width:40,height:40,borderRadius:12,alignItems:"center",justifyContent:"center"},chatInput:{flex:1,minHeight:40,maxHeight:105,borderWidth:1,borderRadius:13,paddingHorizontal:11,paddingVertical:9,fontSize:12},chatSend:{width:40,height:40,borderRadius:13,alignItems:"center",justifyContent:"center"},  orderCard:{minHeight:68,borderWidth:1,borderRadius:16,padding:13,flexDirection:"row",alignItems:"center",gap:10},badge:{paddingHorizontal:10,paddingVertical:6,borderRadius:999},badgeText:{fontSize:11,fontWeight:"800"},notificationCard:{borderWidth:1,borderRadius:16,padding:13,flexDirection:"row",alignItems:"center",gap:12},notificationIcon:{width:38,height:38,borderRadius:19,alignItems:"center",justifyContent:"center"},messageRow:{borderWidth:1,borderRadius:16,padding:12,flexDirection:"row",alignItems:"center",gap:12},settingRow:{borderWidth:1,borderRadius:18,marginBottom:9,paddingHorizontal:14,minHeight:58,flexDirection:"row",alignItems:"center",gap:12},smallAction:{borderRadius:10,paddingHorizontal:13,paddingVertical:9},smallActionText:{color:"#fff",fontWeight:"800",fontSize:12},notificationDot:{width:8,height:8,borderRadius:4,marginTop:6},empty:{borderWidth:1,borderRadius:20,padding:28,alignItems:"center",justifyContent:"center",gap:8,marginTop:40},
});
