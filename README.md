# Squeeklings

A static React + TypeScript app for the deployed Squeeklings NFT on **Ethereum Sepolia (11155111)**. Hatch a free companion, feed it, preview its growth, and browse the on-chain nursery. Source and the ready-to-serve production export are included.

## Install, preview, rebuild

Use Node 20.19+ and npm. This build was checked with Node 24.21.0 and npm 11.19.0.

```sh
npm ci
npm run typecheck
npm run build
npm run preview
```

Open the preview URL printed by Vite. `npm run dev` starts the source development server. Stop either server with Ctrl+C. `npm run build` writes `dist/`; after changing source, keep the newly built export alongside it.

To host the finished app, serve **the contents of `dist/`** from any static HTTP(S) host. Vite’s base is `./`; JS, CSS, fonts, images and wallet marks use relative export URLs and were checked under `/preview/`. Navigation uses hashes, so gateway subpaths need no server-side route rewrites. Use HTTPS or localhost for wallet/passkey features. No application backend, API key, private key, or environment file is needed.

## Chain and data

- Contract: [`0xc42ce2d42684e7d7d5c29bf7fcc6fdf419c2771f`](https://sepolia.etherscan.io/address/0xc42ce2d42684e7d7d5c29bf7fcc6fdf419c2771f).
- [Verified source](https://eth-sepolia.blockscout.com/address/0xc42ce2d42684e7d7d5c29bf7fcc6fdf419c2771f?tab=contract).
- Read RPC rotation: `https://ethereum-sepolia-rpc.publicnode.com`, `https://1rpc.io/sepolia`, `https://sepolia.gateway.tenderly.co`.
- Physical hamster status: `https://api.squeekchain.com/v1/status`. ACTIVE means running; milli-RPM is divided by 1000 and displayed to one decimal place. API failures leave only on-chain block/round values.
- ethers **6.13.5** is loaded from the pinned jsDelivr ES module URL in `src/config.ts`. The npm dev dependency supplies matching types; the runtime library is intentionally loaded from the CDN.

The page polls `hamster()` every 30 seconds, also refreshing on return to the tab. NFT details come from `info()`, current art from `svgOf()`, previews from `previewSvg()`, and gallery IDs from `totalSupply()` plus `tokenByIndex()`. No balances, NFTs, activity metrics or metadata are fabricated. A read failure produces a recoverable error; previously read chain values are marked when refresh is delayed.

All view calls share a four-slot queue. Failures, including HTTP 429 and RPC errors, try the next RPC. SVG results are deduplicated and cached by token ID, Squeek height, current feed/mood/holder signature, and preview block count; the cache is capped at 160 entries and cleared after a successful transaction. Slider changes are debounced by 320ms, and stale responses cannot replace the latest selected preview.

SVG is always displayed as an `img` with a UTF-8-safe base64 data URL. Raw on-chain markup is never inserted with `innerHTML`. A failed SVG read removes prior art and offers retry. SMIL plays normally, with an app-wide Pause art control and reduced-motion handling. The visitor preview uses token #1; if no token exists yet, the time machine waits for the first hatch.

## Wallet behavior

The connect sheet discovers browser wallets using EIP-6963 and supports `window.ethereum` when discovery is unavailable. It also offers Coinbase Wallet/Smart Wallet through its bundled SDK. On phones without a provider, the sheet links into MetaMask, Coinbase Wallet, Rabby and Phantom’s own browsers using the current page URL. No relay or project ID is configured.

The app requests Sepolia with `wallet_switchEthereumChain` (`0xaa36a7`), falling back to `wallet_addEthereumChain` with the supplied publicnode RPC, SepoliaETH currency and Sepolia explorer. A declined switch stays declined. The wallet controls keys and signing; the app sends only `hatch()` and `feed(id)` to the supplied contract.

Hatch checks `hatchedBy(account)` first. A wallet that already hatched gets “Visit my Squeekling.” Current `info().owner` determines whether Feed is available, including after transfers. Feeding shows a live countdown to `nextFeedAt`. All four specified contract reverts have friendly messages, including reasons nested inside wallet RPC errors. Submitted transactions display an explorer link while pending, then refresh on confirmation. Pending status is in page memory; after a reload, on-chain reads recover the confirmed state.

The nursery loads 24 entries per batch, newest first. Stage filters apply to loaded entries, state their scope through the loaded/shown count, and keep Load more available for older matches. Clicking a card loads a detail dialog. The X share link includes the requested stage/block sentence and the actual current site URL.

## Source map

| Path | Purpose |
| --- | --- |
| `src/config.ts` | Contract, ABI, chain, public sources, stage thresholds, types |
| `src/chain.ts` | ethers loader, RPC queue/failover, reads, SVG cache/encoding, friendly errors |
| `src/wallet.tsx` | EIP-6963/fallback discovery, Coinbase, phone links, account/network events |
| `src/App.tsx` | Live header, hatch/feed flow, companion, time machine, rules and footer |
| `src/Nursery.tsx` | Enumerated gallery, stage filters, pagination and token detail |
| `src/components.tsx`, `src/Modal.tsx`, `src/icons.tsx` | Shared art, states, stats, accessible dialogs and icons |
| `src/styles.css`, `src/assets/` | Implemented design tokens, responsive CSS, local fonts |
| `public/` | Favicon, 1200×630 share image, wallet marks, font licenses |
| `dist/` | Finished production export, including its runtime assets |
| `DESIGN.md` | Final implemented typography, colors, components and responsive behavior |
| `artifacts/validation.md` | Review coverage, findings, fixes, actual checks and limitations |

## Validation performed

The production build and `tsc --noEmit` passed. Live reads returned real hamster state, token #1 details/art and all milestone previews. Chromium interaction validation passed at 320, 390, 768 and 1440 CSS pixels with no measured horizontal overflow, no application console errors, and no failed resources in the live run. At 390×844, the Hatch action and on-chain portrait both appear on the first screen.

The final checks include 8 live-page interaction assertions, 20 controlled wallet/RPC scenarios, and 9 keyboard assertions. Axe reported zero WCAG A/AA violations in its scanned state; that is not a claim of complete accessibility compliance. The pinned taste@1 design probe passed 16/16 checks. Results, screenshots, six-domain Better Interface review and corrections are retained in `artifacts/`.

Transaction tests used simulated EIP-1193 providers and controlled confirmations; **no real signing or mint/feed transaction was performed**. The live collection had one token during validation, so pagination beyond 24 and later feeding states were validated with test-only responses outside the shipped source/export. The runtime contains none of those fixtures.

The provided browser launcher could not start because of an overlong Chromium socket path. A foreground Playwright harness inspected the actual export using Chromium headless shell; outbound responses were relayed through the machine’s permitted HTTP proxy without substituting chain data. WebKit could not launch because host libraries were missing. Physical wallet apps/passkeys, a screen reader, native 200% zoom and non-English variants were not verified. The app also depends on the public RPCs, status API and pinned ethers CDN being reachable.

## Explicit submission path budget

The assignment ceiling is 8,388,608 bytes. The following are upper budgets, not permission to omit source or runtime assets. Actual final bytes are recorded in `artifacts/export-check.json`.

| Added path | Budget |
| --- | ---: |
| `src/**` including local fonts | 524,288 bytes |
| `public/**` | 524,288 bytes |
| `dist/**` complete export | 2,097,152 bytes |
| `artifacts/**` including screenshots and licenses | 2,097,152 bytes |
| Root files: entry HTML, manifests, lockfile, configuration, Markdown and `.gitignore` | 524,288 bytes |
| Total allocated | 5,767,168 bytes |

Every generated pattern in `.gitignore` has a **0-byte submission budget**: `**/node_modules/`, `**/.cache/`, `**/.npm/`, `**/npm-cache/`, `**/.npm-cache/`, `**/.pnpm-store/`, `**/.yarn/cache/`, `**/.vite/`, `**/.vite-temp/`, `**/*.tsbuildinfo`, and `test/scratch/`. The ignore file deliberately includes no rule for `dist/`, source, public assets, or the lockfile. Dependency downloads, browser packages, temporary servers and test fixtures stay outside the submission. There is no vendored registry, dependency archive, or submodule.

Third-party attribution and preserved license notices are in `THIRD_PARTY_NOTICES.md` and `artifacts/licenses/`.
