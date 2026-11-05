# Third-party notices

- **React / React DOM 19.0.0**: Meta Platforms, Inc. and affiliates; MIT. Notices are in `artifacts/licenses/` and retained in the generated JavaScript.
- **Coinbase Wallet SDK 4.3.7**: Coinbase, Inc.; Apache-2.0. Dynamically loaded only when Coinbase is selected (or a previous Coinbase connection is restored). See `artifacts/licenses/coinbase-wallet-sdk.txt` and [upstream](https://github.com/coinbase/coinbase-wallet-sdk).
- **ethers 6.13.5**: Richard Moore; MIT. Imported statically from the npm package and bundled into the export by Vite, so no script is loaded from another origin. Its complete MIT notice is preserved in `public/ethers-LICENSE.txt` and exported as `dist/ethers-LICENSE.txt`. [Source and license](https://github.com/ethers-io/ethers.js/tree/v6.13.5).
- **Bricolage Grotesque**: Bricolage Grotesque Project Authors; SIL Open Font License 1.1. Latin variable WOFF2 from `@fontsource-variable/bricolage-grotesque@5.2.10`.
- **DM Sans**: DM Sans Project Authors; SIL Open Font License 1.1. Latin variable WOFF2 from `@fontsource-variable/dm-sans@5.2.8`. Font files are local in `src/assets/`; their full notices are in `public/` and included in `dist/`.
- **Wallet marks**: MetaMask, Rabby, and Phantom SVG marks are from RainbowKit’s wallet connector assets. RainbowKit is MIT licensed; see `artifacts/licenses/rainbowkit.txt`. Coinbase’s mark follows the pinned wallet connector reference. Marks identify their respective wallet products; no endorsement is implied.
- **Hamster NFT art**: fetched at runtime from the deployed, MIT-licensed Squeeklings contract. The share card uses the contract’s actual `previewSvg(1, 500)` result, captured on 2026-11-05, with a visible growth-preview caption. The decorative site mark is separate from the NFT art. [Verified contract source](https://eth-sepolia.blockscout.com/address/0xc42ce2d42684e7d7d5c29bf7fcc6fdf419c2771f?tab=contract).

## Design guidance attribution

The implementation applies the supplied Better Interface principles, adapted from Jakub Krehel’s Better Interface, MIT, commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`. Design documentation follows the supplied method adapted from Paul Bakaus’s Impeccable, Apache-2.0, commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`.

Sources: [Better Interface](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface), [Impeccable documentation method](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md). The supplied combined license texts are retained verbatim in `artifacts/licenses/interface-guides.txt`.
