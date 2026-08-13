export type VerificationLevel =
  | "new_seller"
  | "verified_identity"
  | "verified_community"
  | "trusted_seller";

export interface Seller {
  id: string;
  name: string;
  avatarUrl?: string;
  verification: VerificationLevel;
  responseRate: number; // 0-100
  memberSince: string; // ISO date
}

export interface Store {
  id: string;
  name: string;
  logoUrl?: string;
  coverUrl?: string;
  location: string;
  rating: number; // 0-5
  reviewCount: number;
  recommendCount: number;
  seller: Seller;
  categories: string[];
  isFollowing?: boolean;
}

export type ListingKind = "product" | "service";
export type ListingCondition = "new" | "used";

export interface Listing {
  id: string;
  kind: ListingKind;
  title: string;
  description: string;
  price: number;
  currency: string;
  negotiable: boolean;
  condition?: ListingCondition;
  location: string;
  imageUrl: string;
  category: string;
  store: Pick<Store, "id" | "name" | "logoUrl" | "rating">;
  rating: number;
  reviewCount: number;
  savedCount: number;
  isSaved?: boolean;
}

export type OrderStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "preparing"
  | "ready"
  | "completed";

export interface OrderSummary {
  id: string;
  listingTitle: string;
  listingImageUrl: string;
  counterpartyName: string;
  status: OrderStatus;
  updatedAt: string;
}
