import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Camera, Check, ImagePlus, Loader2, MapPin, Package, Sparkles, Wand2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "@/lib/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export default function Sell() {
  const navigate = useNavigate();
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<"product" | "service">("product");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [negotiable, setNegotiable] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const accepted = Array.from(incoming).filter((file) => file.type.startsWith("image/"));
    const next = [...files, ...accepted].slice(0, 8);
    setFiles(next);
    setPreviews(next.map((file) => URL.createObjectURL(file)));
    setMessage(null);
  };

  const removeImage = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    setPreviews(next.map((file) => URL.createObjectURL(file)));
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => addFiles(event.target.files);

  const publish = async () => {
    const token = getAccessToken();
    if (!token) {
      navigate("/login", { state: { from: "/sell" } });
      return;
    }
    if (!title.trim() || !category || !description.trim()) {
      setMessage("Add a title, category and description before publishing.");
      return;
    }
    if (files.length === 0) {
      setMessage("Add at least one image. You can choose from your device or take a photo.");
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const uploads = await Promise.all(files.map((file) => uploadImageToCloudinary(file, token)));
      const body = {
        kind: type,
        title: title.trim(),
        slug: `${title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
        description: description.trim(),
        price: price ? Number(price) : null,
        currency: "KES",
        negotiable,
        condition: type === "product" ? "new" : "na",
        stock: 1,
        location: location.trim(),
        tags: [],
        image_urls: uploads.map((upload) => upload.secure_url),
      };
      const response = await fetch(`${API_BASE}/listings/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not publish the listing.");
      navigate(`/products/${data.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong while publishing.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-8">
      <header className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Seller tools</p>
        <h1 className="mt-1 font-display text-3xl text-ink">Create a listing</h1>
        <p className="mt-1 text-sm text-ink-faint">Add clear photos from your device or capture them with your camera.</p>
      </header>

      {message && <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">{message}</div>}

      <form onSubmit={(event) => { event.preventDefault(); void publish(); }} className="space-y-5 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="inline-flex rounded-full border border-border p-1">
          <Toggle active={type === "product"} onClick={() => setType("product")} icon={Package}>Product</Toggle>
          <Toggle active={type === "service"} onClick={() => setType("service")} icon={Wand2}>Service</Toggle>
        </div>

        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} className="field" placeholder={type === "product" ? "e.g. Refurbished HP EliteBook" : "e.g. Laptop repair and maintenance"} /></Field>

        <Field label="Category"><select value={category} onChange={(e) => setCategory(e.target.value)} className="field"><option value="">Choose category</option><option>Electronics</option><option>Fashion</option><option>Home & Living</option><option>Services</option><option>Repairs</option><option>Food & Drinks</option><option>Books & Stationery</option></select></Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price"><input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} className="field" placeholder="KSh 0" inputMode="decimal" /></Field>
          <Field label="Location"><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"/><input value={location} onChange={(e) => setLocation(e.target.value)} className="field pl-9" placeholder="Town / area" /></div></Field>
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-surface-alt px-4 py-3">
          <div><p className="text-sm font-semibold text-ink">Price is negotiable</p><p className="text-xs text-ink-faint">Let buyers know you are open to offers.</p></div>
          <input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
        </label>

        <Field label="Description"><div><textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1200} className="field min-h-32 resize-y" placeholder="Describe what the buyer should know..."/><p className="mt-1 text-right text-xs text-ink-faint">{description.length}/1200</p></div></Field>

        <Field label="Photos">
          <input ref={galleryInput} type="file" accept="image/*" multiple className="hidden" onChange={onChange} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onChange} />

          {previews.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {previews.map((src, index) => <div key={`${src}-${index}`} className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface-alt"><img src={src} alt={`Selected ${index + 1}`} className="h-full w-full object-cover"/><button type="button" onClick={() => removeImage(index)} className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white" aria-label={`Remove image ${index + 1}`}><X className="h-4 w-4"/></button>{index === 0 && <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold text-white">Cover</span>}</div>)}
              {files.length < 8 && <ImagePickerButtons onGallery={() => galleryInput.current?.click()} onCamera={() => cameraInput.current?.click()} compact />}
            </div>
          ) : (
            <ImagePickerButtons onGallery={() => galleryInput.current?.click()} onCamera={() => cameraInput.current?.click()} />
          )}
          <p className="mt-2 text-xs text-ink-faint">Up to 8 images · JPG, PNG or WebP · max 10 MB each. Images are uploaded directly to Cloudinary.</p>
        </Field>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="h-11 rounded-xl border border-border px-5 text-sm font-semibold text-ink-soft">Save draft</button>
          <button disabled={uploading} type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70">{uploading ? <><Loader2 className="h-4 w-4 animate-spin"/> Uploading & publishing...</> : <><Check className="h-4 w-4"/> Publish listing</>}</button>
        </div>
      </form>

      <aside className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-center gap-2 text-accent"><Sparkles className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[0.16em]">Listing tips</span></div>
        <ul className="mt-4 space-y-3 text-sm text-ink-soft"><li>Use bright, original photos and make the first image your best one.</li><li>Capture all important angles so buyers know exactly what they are seeing.</li><li>Be accurate about condition, availability and location.</li></ul>
      </aside>
    </div>
  );
}

function ImagePickerButtons({ onGallery, onCamera, compact = false }: { onGallery: () => void; onCamera: () => void; compact?: boolean }) {
  if (compact) return <button type="button" onClick={onGallery} className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-strong bg-surface-alt text-center hover:bg-surface-sunken"><ImagePlus className="h-6 w-6 text-accent"/><span className="mt-1 text-[11px] font-semibold text-ink">Add</span></button>;
  return <div className="rounded-3xl border-2 border-dashed border-border-strong bg-surface-alt p-5 text-center">
    <ImagePlus className="mx-auto h-8 w-8 text-accent"/>
    <p className="mt-2 text-sm font-semibold text-ink">Add listing photos</p>
    <p className="mt-1 text-xs text-ink-faint">Choose existing photos or capture fresh ones.</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <button type="button" onClick={onGallery} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-sunken"><ImagePlus className="h-4 w-4"/> Choose from device</button>
      <button type="button" onClick={onCamera} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong"><Camera className="h-4 w-4"/> Take a photo</button>
    </div>
  </div>;
}

function Toggle({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Package; children: string }) { return <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${active ? "bg-accent text-white" : "text-ink-soft"}`}><Icon className="h-4 w-4"/>{children}</button>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-1.5"><span className="text-sm font-semibold text-ink">{label}</span>{children}</label>; }
