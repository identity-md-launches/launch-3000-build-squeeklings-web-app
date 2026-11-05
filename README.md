# Squeeklings

A static React + TypeScript app for the deployed Squeeklings NFT on **Ethereum Sepolia (11155111)**. Hatch a free companion, feed it, preview its growth, and browse the on-chain nursery. Source and the ready-to-serve production export are included.

## Install, preview, rebuild

Use Node 20.19+ and npm. This revision was built with Node 22.22.2 and npm 10.9.7.

```sh
npm ci
npm run typecheck
npm run build
npm run preview
```

Open the preview URL printed by Vite. `npm run dev` starts the source development server. Stop either server with Ctrl+C. `npm run build` writes `dist/`; after changing source, keep the newly built export alongside it.

To host the finished app, serve **the contents of `dist/`** from any static HTTP(S) host. Vite’s base is `./`; JS, CSS, fonts, images and wallet marks use relative export URLs. Every exported file was fetched successfully under `/preview/` with the live host’s CSP header. Navigation uses hashes, so gateway subpaths need no server-side route rewrites. Use HTTPS or localhost for wallet/passkey features. No application backend, API key, private key, or environment file is needed.

## Chain and data

- Contract: [`0xc42ce2d42684e7d7d5c29bf7fcc6fdf419c2771f`](https://sepolia.etherscan.io/address/0xc42ce2d42684e7d7d5c29bf7fcc6fdf419c2771f).
- [Verified source](https://eth-sepolia.blockscout.com/address/0xc42ce2d42684e7d7d5c29bf7fcc6fdf419c2771f?tab=contract).
- Read RPC rotation: `https://ethereum-sepolia-rpc.publicnode.com`, `https://1rpc.io/sepolia`, `https://sepolia.gateway.tenderly.co`.
- Physical hamster status: `https://api.squeekchain.com/v1/status`. ACTIVE means running; milli-RPM is divided by 1000 and displayed to one decimal place. API failures leave only on-chain block/round values.
- ethers **6.13.5** is imported statically (`Interface` in `src/chain.ts`, `getAddress` in `src/wallet.tsx`, `BrowserProvider` and `Contract` in `src/App.tsx`) and bundled by Vite. The host’s CSP is `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'`, so the app never loads a script from another origin. There is no CDN URL, `getEthers()` loader or remote `import()` in the source.

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
| `src/chain.ts` | Bundled ethers ABI interface, RPC queue/failover, reads, SVG cache/encoding, friendly errors |
| `src/wallet.tsx` | EIP-6963/fallback discovery, Coinbase, phone links, account/network events |
| `src/App.tsx` | Live header, hatch/feed flow, companion, time machine, rules and footer |
| `src/Nursery.tsx` | Enumerated gallery, stage filters, pagination and token detail |
| `src/components.tsx`, `src/Modal.tsx`, `src/icons.tsx` | Shared art, states, stats, accessible dialogs and icons |
| `src/styles.css`, `src/assets/` | Implemented design tokens, responsive CSS, local fonts |
| `public/` | Favicon, 1200×630 share image, wallet marks, font licenses |
| `dist/` | Finished production export, including its runtime assets |
| `DESIGN.md` | Final implemented typography, colors, components and responsive behavior |
| `artifacts/validation.md` | Review coverage, findings, fixes, actual checks and limitations |

## CSP fix: bundled ethers

The live host sends `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'`. That blocked the old `import()` of ethers from cdn.jsdelivr.net, so no on-chain reads or wallet actions worked. The source now imports ethers statically from the npm package. `ETHERS_CDN` and `getEthers()` are gone. Design, copy, sections, RPC rotation and caching are unchanged.

**Dependency classification remains unresolved.** The overriding assignment rules forbid edits to the existing `package.json` and lockfiles. Those files are unchanged, so ethers 6.13.5 remains under `devDependencies`. Finding `ba96dc0b…` is disputed in `.imd-responses.json` on that basis. Requester/IMD authorization to edit these two protected files is needed to move the entry. Use `npm ci` including development dependencies when rebuilding; the finished export contains ethers and needs no npm installation to serve it.

**The production export is rebuilt.** `dist/index.html` now selects `./assets/index-CRoHBTmp.js`, which contains ethers. The stale `index-CdpcfXBT.js` was removed. The complete local Coinbase chunk, CSS, fonts and public assets remain included, together with ethers’ MIT notice. Every JavaScript import in the export resolves locally; no shipped JavaScript contains `cdn.jsdelivr.net`, `ETHERS_CDN` or `getEthers`. CSS is byte-for-byte identical to the previous export. No application source, markup, copy, RPC configuration, caching or build configuration changed in this revision.

## Validation performed for this revision

`npm ci --ignore-scripts --no-audit --no-fund`, `npm run typecheck` (`tsc --noEmit`), and `npm run build` all passed using an identical source/configuration/manifest/lockfile copy in `test/scratch/build/`. Installation and caches stayed in scratch; the root dependency directory was not modified. The generated export was copied to `dist/` and checked file-for-file. The build transformed 687 modules. The complete export is 819,442 bytes.

Executing the actual production entry as an ES module in JSDOM passed **12 interaction checks**. Real RPC responses populated block/round, the hero and Nursery token #1 image sources, and distinct previews at 0 and 2,000 blocks. Checks also covered preview cache reuse, nursery filters and details, connect/cancel/disconnect, Sepolia switching, and the ABI-encoded Hatch and Feed wallet requests. A simulated provider rejected sending; the Hatch scenario alone supplied a controlled unhatched record, and transaction gas estimates were controlled. No signing, minting or feeding occurred on-chain. JSDOM does not render pixels or enforce CSP.

The deployed URL was fetched directly: [Squeeklings](https://squeeklings-small-paws-real-grow.imd.site/). It still served the old 230,704-byte entry with SHA-256 `cda8f827ba7e0cda954ddbb6152c16e22670cbe99ba63591f0e98c54cb7a1e52` and the restrictive CSP. This reproduces the reported stale export; this revision supplies its replacement. Publishing and a post-publication live-site check remain with the hosting pipeline.

**Browser limitations:** the supplied browser launcher failed with “Socket path too long.” Two separately installed Chromium headless versions exited with SIGTRAP before navigation; Firefox reported missing host libraries. The pinned taste probe was invoked and exited 2 before measurement. No current screenshot, rendered 390px first-screen/overflow check, browser console/CSP check, automated browser accessibility scan, physical wallet/passkey interaction, or real transaction confirmation is claimed. The established responsive CSS and design remain unchanged. The six-domain source/DOM review, actual results and remaining checks are in [`artifacts/validation.md`](artifacts/validation.md); structured evidence is in [`artifacts/check-results.json`](artifacts/check-results.json) and [`artifacts/export-check.json`](artifacts/export-check.json).

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
