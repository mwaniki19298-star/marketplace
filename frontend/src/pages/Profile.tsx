import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronRight,
  Heart,
  ImagePlus,
  Loader2,
  LogOut,
  MapPin,
  Pencil,
  ShieldCheck,
  Star,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar } from "@/components/ui/Avatar";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { mockSellers } from "@/data/mock";
import {
  clearAuth,
  getCurrentStore,
  getStoredUser,
  persistUser,
  resolveMediaUrl,
  updateCurrentStore,
  updateCurrentUser,
  type AuthUser,
} from "@/lib/auth";

const seller = mockSellers.amara;

type StoreData = {
  id: number | string;
  name: string;
  logo?: string | null;
  cover?: string | null;
  description?: string;
  location?: string;
  phone?: string;
  verification?: string;
};

export default function Profile() {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [store, setStore] = useState<StoreData | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchCurrentUser().catch(() => getStoredUser()),
      getCurrentStore().catch(() => null),
    ]).then(([currentUser, currentStore]) => {
      if (!active) return;
      setUser(currentUser);
      setStore(currentStore);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const name = user?.full_name || "Marketplace user";
  const email = user?.email || "";
  const avatar = resolveMediaUrl(user?.avatar);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-8">
      <header className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar name={name} src={avatar} size="lg" className="h-20 w-20 text-lg" />
            <button
              type="button"
              aria-label="Edit profile photo"
              onClick={() => setEditing(true)}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-accent text-white shadow-sm"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate font-display text-2xl font-medium text-ink">{name}</h1>
                <p className="mt-1 truncate text-sm text-ink-faint">{email}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-faint">
                  <MapPin className="h-3.5 w-3.5" /> Nairobi
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-sunken"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface-alt">
          <Stat label="Orders" value="2" />
          <Stat label="Reviews" value="12" />
          <Stat label="Saved" value="9" />
        </div>
      </header>

      {store && (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="relative h-28 overflow-hidden bg-accent-soft">
            {store.cover ? (
              <img src={resolveMediaUrl(store.cover)} alt="Store cover" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-medium text-accent-strong">Your store cover photo</div>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-3 py-2 text-xs font-semibold text-white backdrop-blur"
            >
              <Camera className="h-3.5 w-3.5" /> Edit store
            </button>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Avatar name={store.name} src={resolveMediaUrl(store.logo)} size="md" className="h-12 w-12 border-2 border-surface" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{store.name}</p>
              <p className="text-xs text-ink-faint">Store profile & appearance</p>
            </div>
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-strong">
              Manage <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <Row to="/dashboard" icon={Store} title="My store" subtitle="Manage listings, requests and reputation" />
        <Row to="/orders" icon={ShieldCheck} title="Order history" subtitle="See active and completed requests" />
        <Row to="/following" icon={Heart} title="Following" subtitle="Stores you keep up with" />
        <Row to="/settings" icon={UserRound} title="Account & settings" subtitle="Privacy, appearance and preferences" />
      </section>

      <section className="rounded-2xl border border-accent/20 bg-accent-soft p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white/60 p-2 text-accent-strong dark:bg-black/10"><Star className="h-5 w-5" /></div>
          <div>
            <p className="font-semibold text-ink">Seller reputation</p>
            <p className="mt-1 text-sm text-ink-soft">You are currently a trusted seller with a 4.8 average rating.</p>
            <div className="mt-2"><VerificationBadge level={seller.verification} /></div>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => { clearAuth(); window.location.href = "/login"; }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-surface px-4 py-3 text-sm font-semibold text-danger hover:bg-danger-soft"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-xs text-ink-faint">
          <Loader2 className="h-4 w-4 animate-spin" /> Syncing your profile…
        </div>
      )}

      {editing && (
        <EditProfileModal
          user={user}
          store={store}
          onClose={() => setEditing(false)}
          onUserSaved={(next) => { setUser(next); persistUser(next); }}
          onStoreSaved={setStore}
        />
      )}
    </div>
  );
}

async function fetchCurrentUser() {
  const token = localStorage.getItem("marketplace-access");
  if (!token) return getStoredUser();
  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
  const response = await fetch(`${API_BASE}/auth/me/`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Could not load profile");
  const data = (await response.json()) as AuthUser;
  persistUser(data);
  return data;
}

function EditProfileModal({
  user,
  store,
  onClose,
  onUserSaved,
  onStoreSaved,
}: {
  user: AuthUser | null;
  store: StoreData | null;
  onClose: () => void;
  onUserSaved: (user: AuthUser) => void;
  onStoreSaved: (store: StoreData) => void;
}) {
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [storeName, setStoreName] = useState(store?.name || "");
  const [description, setDescription] = useState(store?.description || "");
  const [location, setLocation] = useState(store?.location || "");
  const [phone, setPhone] = useState(store?.phone || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const avatarPreview = useMemo(() => avatarFile ? URL.createObjectURL(avatarFile) : resolveMediaUrl(user?.avatar), [avatarFile, user?.avatar]);
  const logoPreview = useMemo(() => logoFile ? URL.createObjectURL(logoFile) : resolveMediaUrl(store?.logo), [logoFile, store?.logo]);
  const coverPreview = useMemo(() => coverFile ? URL.createObjectURL(coverFile) : resolveMediaUrl(store?.cover), [coverFile, store?.cover]);

  useEffect(() => () => {
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
  }, [avatarPreview, logoPreview, coverPreview]);

  async function save() {
    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updatedUser = await updateCurrentUser({ full_name: fullName, avatar: avatarFile });
      onUserSaved(updatedUser);

      if (store) {
        const updatedStore = await updateCurrentStore({
          name: storeName || store.name,
          description,
          location,
          phone,
          logo: logoFile,
          cover: coverFile,
        });
        onStoreSaved(updatedStore);
      }
      setSaved(true);
      window.setTimeout(onClose, 650);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="edit-profile-title" className="font-display text-xl font-medium text-ink">Edit profile</h2>
            <p className="mt-0.5 text-xs text-ink-faint">Update your personal details and store appearance.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-ink-faint hover:bg-surface-sunken hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><UserRound className="h-4 w-4 text-accent" /> Personal profile</div>
            <div className="rounded-2xl border border-border bg-surface-alt p-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar name={fullName || "User"} src={avatarPreview} size="lg" className="h-16 w-16" />
                  <button type="button" onClick={() => avatarInput.current?.click()} className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white" aria-label="Upload profile photo"><Camera className="h-3.5 w-3.5" /></button>
                  <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Profile photo</p>
                  <p className="mt-1 text-xs text-ink-faint">JPG, PNG or WEBP · up to 10 MB</p>
                  <button type="button" onClick={() => avatarInput.current?.click()} className="mt-2 text-xs font-semibold text-accent-strong">Choose photo</button>
                </div>
              </div>
              <label className="mt-4 block text-sm font-medium text-ink" htmlFor="profile-name">Full name</label>
              <input id="profile-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-ink outline-none focus:border-accent" />
              <label className="mt-4 block text-sm font-medium text-ink" htmlFor="profile-email">Email address</label>
              <div className="relative mt-1.5">
                <input id="profile-email" value={user?.email || ""} disabled className="h-11 w-full rounded-md border border-border bg-surface-sunken px-3 pr-10 text-sm text-ink-faint" />
                <ShieldCheck className="absolute right-3 top-3 h-5 w-5 text-ink-faint" />
              </div>
              <p className="mt-1.5 text-xs text-ink-faint">Your email is tied to your account and cannot be changed here.</p>
            </div>
          </section>

          {store && (
            <section className="mt-6">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Store className="h-4 w-4 text-accent" /> Store profile</div>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface-alt">
                <div className="relative h-32 bg-accent-soft">
                  {coverPreview ? <img src={coverPreview} alt="Store cover preview" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs font-medium text-accent-strong">Add a cover photo</div>}
                  <button type="button" onClick={() => coverInput.current?.click()} className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-3 py-2 text-xs font-semibold text-white backdrop-blur"><ImagePlus className="h-3.5 w-3.5" /> Change cover</button>
                  <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar name={storeName || "Store"} src={logoPreview} size="md" className="h-14 w-14" />
                      <button type="button" onClick={() => logoInput.current?.click()} className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white" aria-label="Upload store logo"><Camera className="h-3 w-3" /></button>
                      <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-ink-faint">Store logo</p>
                      <p className="text-sm font-semibold text-ink">{storeName || "Your store"}</p>
                    </div>
                  </div>
                  <label className="mt-4 block text-sm font-medium text-ink" htmlFor="store-name">Store name</label>
                  <input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="mt-1.5 h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-ink outline-none focus:border-accent" />
                  <label className="mt-4 block text-sm font-medium text-ink" htmlFor="store-description">Store description</label>
                  <textarea id="store-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent" />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div><label className="block text-sm font-medium text-ink" htmlFor="store-location">Location</label><input id="store-location" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1.5 h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-ink outline-none focus:border-accent" /></div>
                    <div><label className="block text-sm font-medium text-ink" htmlFor="store-phone">Phone</label><input id="store-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-ink outline-none focus:border-accent" /></div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {error && <div className="mt-5 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>}
        </div>

        <div className="flex gap-3 border-t border-border bg-surface px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-ink hover:bg-surface-sunken">Cancel</button>
          <button type="button" onClick={save} disabled={saving || saved} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-70">
            {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="px-3 py-3 text-center"><p className="font-display text-lg font-semibold text-ink">{value}</p><p className="text-xs text-ink-faint">{label}</p></div>;
}
function Row({ to, icon: Icon, title, subtitle }: { to: string; icon: typeof Store; title: string; subtitle: string }) {
  return <Link to={to} className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-b-0 hover:bg-surface-sunken"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{title}</span><span className="block text-xs text-ink-faint">{subtitle}</span></span><ChevronRight className="h-4 w-4 text-ink-faint" /></Link>;
}
