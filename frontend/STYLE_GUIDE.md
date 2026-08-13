# Marketplace design system

This is the visual language for Marketplace's UI shell. It's implemented as
Tailwind tokens (`tailwind.config.ts`) plus a small set of primitives in
`src/components/ui/`. Everything else in the product should be built from
these — new one-off colors or type sizes are a sign something belongs here
instead.

## Why these choices

**Violet, used sparingly.** Slate and white carry ~95% of the interface.
Violet (`accent`) is reserved for things the person should notice: primary
actions, the Sell button, active nav state, links, focus rings, saved/liked
states. When violet shows up, it means "you can act here" — diluting it into
decoration would blunt that signal.

**Serif for the human moments, sans for the system.** `font-display`
(Fraunces) appears only for greetings, prices, and big dashboard numbers —
the moments where the product is talking to a person about their stuff.
`font-sans` (Inter) runs everything functional: buttons, labels, body copy,
forms. The pairing reflects what Marketplace actually is — a system for
trust and logistics (sans) wrapped around a community of individual sellers
and their goods (serif) — rather than being an aesthetic default.

**Restrained corners, one deliberate exception.** Every card, button, input,
and badge uses the same small radius scale (6–18px). The single fully-round
element in the system is the Sell button in the mobile bottom nav — it's
allowed to be bold and circular precisely because nothing else is, so it
stays legible as *the* primary action at a glance.

**Verification is a language, not a color.** All four trust levels
(`VerificationBadge`) share one icon-and-label pattern instead of a
traffic-light of badge colors. This keeps trust legible without ever
implying Marketplace guarantees a transaction — copy stays at "verified
identity" / "trusted seller," never "guaranteed" or "protected."

## Tokens

| Token | Hex | Use |
|---|---|---|
| `ink` | `#16131F` | Primary text |
| `ink-soft` | `#5B5567` | Secondary text |
| `ink-faint` | `#948FA0` | Placeholder, metadata |
| `surface` | `#FFFFFF` | Cards, inputs |
| `surface-alt` | `#F7F5FB` | App background |
| `surface-sunken` | `#F1EEF8` | Recessed fields, image placeholders |
| `border` | `#E6E2F0` | Default hairline |
| `border-strong` | `#D3CDE3` | Input borders, emphasis |
| `accent` | `#6C46E0` | Primary actions, links, active state |
| `accent-strong` | `#5433B8` | Hover/active on accent |
| `accent-soft` | `#F0EBFD` | Tinted backgrounds for accent content |
| `success` / `success-soft` | `#16855A` / `#E5F5ED` | Completed, positive states |
| `warning` / `warning-soft` | `#A8631A` / `#FBF1E1` | Ratings (star fill), pending states |
| `danger` / `danger-soft` | `#C1403F` / `#FBEAEA` | Destructive actions, errors |

Type: `font-display` (Fraunces Variable), `font-sans` (Inter, default),
`font-mono` (IBM Plex Mono — reserve for order IDs, timestamps, receipts).

Radius: `rounded-sm` 6px · `rounded` 8px · `rounded-md` 10px · `rounded-lg`
14px · `rounded-xl` 18px · `rounded-pill` — the Sell button only.

## Component inventory (`src/components/ui/`)

- `Button` — primary / secondary / ghost / danger, sm / md / lg, loading state
- `Input`, `Textarea` — labeled fields with error/hint slots, wired for React Hook Form
- `Badge` — neutral / accent / success / warning / danger tone
- `Avatar` — image with initials fallback
- `RatingStars` — consistent rating display with review count
- `VerificationBadge` — the four seller trust levels
- `ListingCard` — product/service card used in grids and rails
- `StoreCard` — store summary used in horizontal rails
- `Skeleton`, `ListingCardSkeleton` — loading states, no blank screens
- `EmptyState` — consistent "invitation to act" pattern for empty lists

## Layout shell (`src/layouts/`, `src/components/nav/`)

- `Sidebar` — desktop navigation, ≥768px
- `BottomNav` — mobile navigation, <768px, with the raised Sell action
- `TopBar` — search, notifications, profile — present at all breakpoints
- `AppShell` — composes the above around routed page content

Breakpoint to design at: 360, 390, 430 (mobile) → 768 (tablet, sidebar
appears) → 1024, 1440 (desktop, multi-column grids).

## What's next

This phase covers the shell and three real screens (Home, Browse, Product
detail) so the system proves itself against real content. Auth, Sell flow,
Seller dashboard, Messaging, and Admin are separate build phases that reuse
these same primitives.
