# Squeeklings design system

## Overview

Squeeklings is a small Sepolia NFT app for Squeekchain’s community. A cream canvas, indigo type, and one gold action put the contract’s art first. The visual motif is a slightly tilted nursery portrait, paired with a gold underline on “growth.” The site mark is decorative; NFT portraits always come from the contract.

The single page follows the care cycle: hatch, visit your companion, preview growth, explore the nursery, then read the rules. At 390 CSS pixels the product, live on-chain context, and Hatch action appear on the first screen. `src/App.tsx` assembles the page; `src/styles.css` defines the system.

## Colors

Values are defined in `src/styles.css` using hex primitives and role tokens. This is a single light theme; the indigo time-machine panel is an intentional surface within that theme.

| Token | Value | Role |
| --- | --- | --- |
| `--cream` / `--color-bg` | `#FFF1DE` | Page canvas and on-chain art palette |
| `--indigo` / `--color-text` | `#1F1D3D` | Main text, selected filter, time-machine background |
| `--gold` / `--color-accent` | `#F5C542` | Hatch/feed actions, growth fill, slider and signature underline |
| `--color-surface` | `#FFF9F0` | Companion, nursery cards, dialogs |
| `--color-surface-warm` | `#F6E5CE` | Portrait frame, icon backing, napping pill, progress track |
| `--color-muted` | `#686073` | Supporting text and labels on cream surfaces |
| `--color-border` | `#DECFBB` | Quiet structural borders |
| `--color-border-hover` | `#A99A87` | Nursery card hover border |
| `--color-accent-hover` | `#E9B52C` | Filled action hover |
| `--color-accent-ink` | `#9D6A13` | Decorative gold-toned icons and logo punctuation |
| `--color-link-hover` | `#795317` | Navigation/footer hover |
| `--color-inverse` | `#FFF1DE` | Main text on indigo |
| `--color-inverse-muted` | `#D4CFE0` | Supporting text on indigo |
| `--color-focus` | `#654FC5` | Focus outline on light surfaces |
| `--color-positive` / `--color-positive-bg` | `#3C6746` / `#E5EBD8` | Success, excited mood, running indicator |
| `--color-error` / `--color-error-bg` | `#93422F` / `#FAE5D5` | Recoverable errors and hungry mood |

Status always includes words, not just color. Buttons in the time machine use a gold focus outline; other controls use a 3px focus outline with a 4px offset. Forced-colors mode uses system `Highlight` and `ButtonText`. Actual measured contrast pairs and scan coverage are recorded in `artifacts/validation.md` and `artifacts/contrast.json`.

## Typography

Two local Latin variable WOFF2 files live in `src/assets/`. Bricolage Grotesque is used for headings, the brand, and the preview stage; DM Sans is used for prose, controls, and data. Both have a `sans-serif` fallback, `font-display: swap`, and declared weights 400–700. The interface uses only 400, 600, and 700. Both intended fonts were observed loaded in Chromium.

| Token | Desktop | Use |
| --- | --- | --- |
| `--text-small` | 14px / `.875rem` | Captions, supporting copy, status and metadata |
| `--text-body` | 16px / `1rem` | Body and actions |
| `--text-card` | 20px / `1.25rem` | Card headings and stats |
| `--text-subhead` | 28px / `1.75rem` | Brand, dialog title, companion name |
| `--text-heading` | 40px / `2.5rem` | Section headings |
| `--text-display` | 72px / `4.5rem` | Hero heading |

At 68rem and below, display type becomes 64px. At 52rem and below it becomes 48px, and section headings become 28px. Some components share smaller roles on narrow screens, keeping five repeated sizes at 390px and six at 1440px.

Body line-height is 1.6; buttons use 1.5. Headings use 1.15 and the mobile hero uses 1.04. Tracking is natural in body copy, with heading tracking of −.055em for display, −.035em for sections, and −.02em for card headings. Headings use balanced wrapping; descriptions use pretty wrapping and limited measure. The hero description is capped at 26rem. Addresses can wrap, and the connected wallet dialog exposes the full address. Changing counters and timers use tabular numbers globally.

## Layout

The spacing rhythm is based on 4px. Named spacing tokens cover 4, 8, 12, 16, 24, 32, 48, 64 and 80px; intermediate component values also follow the rhythm where possible. `--space-12` controls the desktop shell inset and `--space-20` the main section rhythm.

`.site-shell` has a maximum width of 1248px. Its inset is 48px by default, 32px below 68rem, 20px below 38rem, and 16px below 22rem. Major sections are separated by 80px on desktop and 48px on phones. Controls stay within the content edges.

- Hero: two columns, then a stacked composition below 38rem. The phone action is full width. The portrait is at most 270px wide on phones; the static 2° tilt is decorative.
- Companion: art and care controls side by side, stacking below 38rem. Stats become two columns on smaller widths; action buttons become full width on phones.
- Time machine: indigo two-column panel, stacking below 38rem. The native range control has proportionally positioned marks at 20, 150, 500 and 1500 blocks, plus readable milestone shortcut buttons. Shortcuts wrap to two columns at tight widths.
- Nursery: four columns by default, three below 68rem, two below 52rem, and one below 22rem. Filters wrap instead of creating horizontal scrolling. Pagination is 24 entries per batch and clearly states how many entries have been loaded.
- Rules: three columns, then two, then six compact icon rows on phones. The five-stage ladder becomes vertical below 38rem.
- Navigation: brand on the leading edge, wallet utility on the trailing edge. Secondary navigation is hidden below 52rem; all destinations remain in the page flow.
- Dialogs: centered, at most 460px wide on desktop; bottom sheets below 38rem, with safe-area bottom padding and scrollable content.

The production export was inspected at 320, 390, 768 and 1440 CSS pixels. No horizontal overflow was measured. Native browser zoom, physical devices, and localization variants were not verified; see validation limitations.

## Elevation & Depth

Cards use tonal surfaces and structural borders without shadows. The portrait’s warm frame separates the on-chain image from the page. Only the native modal uses elevation: `0 24px 80px #1F1D3D30`, a `#1F1D3D80` backdrop, and 4px backdrop blur. Native `showModal()` makes the page behind it inert. There are no fixed floating action bars or animated page entrances.

## Shapes

`--radius-small` is 12px for actions, notes and inner surfaces; `--radius-card` is 24px for cards and dialogs; `--radius-large` is 32px for the large portrait and care/preview panels. `--radius-pill` is 999px for status and filters. Local inner portrait radii follow their padding: 32px outside/18px inside on desktop, 24px outside/12px inside on phones. Small nursery cards use 16px outer/10px inner radii on phones.

## Components

| Source / pattern | Purpose and states |
| --- | --- |
| `src/icons.tsx`: `Icon`, `HamsterMark` | Shared outline icons use `currentColor`, consistent stroke and decorative ARIA hiding. The mark identifies the site and is not NFT art. |
| `src/styles.css`: `.button` | `.primary` is gold; `.secondary` and `.wallet-button` are outlined. Rest, hover, press, focus and unavailable states are distinct. Touch targets are normally at least 44px. The primary Hatch button retains focus with `aria-disabled` during connection; its handler explicitly blocks repeated activation. |
| `src/Modal.tsx`: `Modal` | Native dialog, unique accessible title, close control, Escape/backdrop dismissal, Tab/Shift+Tab wrap, body-scroll lock, and trigger focus restoration. Used by the wallet picker and token details. |
| `src/wallet.tsx`: `WalletContext`, `useWallet` | One wallet picker lists discovered EIP-6963 names/icons, `window.ethereum` fallback, Coinbase, and phone wallet-browser links. Connected state exposes address, network and disconnect. Pending rows and inline recoverable errors remain in the sheet. |
| `src/components.tsx`: `SqueekArt` | Reads and renders contract SVG only through a base64 image URL. Keeps a square footprint during loading, clears prior art on failure, offers retry, and announces busy state. `retryEnabled={false}` prevents a nested button inside gallery controls. |
| `src/components.tsx`: `Mood`, `Progress`, `Stat` | Worded mood, accessible progress values, and semantic `dl` statistics. Fully grown tokens show completion rather than dividing by a zero next-stage threshold. |
| `src/components.tsx`: `ErrorNote` | Inline status with a plain recovery action. Errors are persistent until recovery, not transient toasts. |
| `src/App.tsx`: transaction region | Stable polite live region for wallet confirmation, pending transaction link, success and errors. Values refresh after confirmation. |
| `src/Nursery.tsx`: nursery card / detail dialog | Real enumerated token IDs, stage and blocks. Stage controls use `aria-pressed`; card activation loads fresh `info()`. Empty filters offer a clear exit; more pages remain reachable. |

Interactive CSS transitions name only background color and transform, take 150ms, and run only when reduced motion is not requested. A pressed action scales to .96. Reduced motion stops spinners and removes SMIL/CSS animation from the image copy of the on-chain SVG; trait and growth values remain untouched. The visible Pause/Play art control lets anyone make the same choice.

## Do’s and Don’ts

- Start new content inside `.site-shell` and reuse the section rhythm and type roles.
- Use one gold action for the next care step; use outlined actions for peers and indigo for selected filters.
- Keep copy brief and action labels explicit. Pair errors with recovery and unknown values with loading/unavailable states.
- Keep art and metadata grounded in contract reads. Never replace a failed read with a plausible number or a fabricated NFT.
- Use `Modal` for overlays and `SqueekArt` for token images. Keep controls native and preserve keyboard focus.
- Preserve the relative asset base, local fonts, and hash navigation when adding a view. Do not insert raw contract SVG into the document or add a new font/type scale for one component.

Design guidance and font/icon attributions are in `THIRD_PARTY_NOTICES.md` and `artifacts/licenses/`.
