# PixelRaidCardsV2 — Design Rationale

> Sharded design doc for the Renaiss Hackathon S1 submission.
> Audience: hackathon judges, future contributors/auditors.

---

## TL;DR

Upgrade v1 contract (deployed at `0xB96eF…3AC`) was missing **NFT metadata plumbing**. We deployed **v2** to a fresh address with:

1. Mutable **baseURI** so metadata host can change without redeploying
2. Constructor takes **baseURI as arg** so deploy captures host atomically
3. Cleaner inheritance: drop `ERC721URIStorage`, keep only `ERC721 + ERC721Enumerable + Ownable`
4. Identical marketplace API surface to v1 (no breaking changes for off-chain indexers)
5. Same trust model (onlyOwner minting) — server-side relayer wallet = deployer = Bre

The orphan v1 stays on-chain at `0xB96eF…3AC` (not used by game UI).

---

## Why v2?

### v1 problems

The v1 contract `pixel-raid/contracts/PixelRaidCards.sol` inherits `ERC721URIStorage`, expecting per-token URI to be set at mint time. The `mintCard()` function **never calls `_setTokenURI`**, so every minted NFT has empty metadata. **Marketplaces can render basic ownership, but no hero art / stats / rarity**.

Additionally:
- `_baseURI()` returns the OpenZeppelin default empty string.
- No way to update metadata host without a full redeploy.

### v2 fixes

| v1 issue | v2 fix |
|----------|--------|
| Empty tokenURI | Override `_baseURI()` to return our host prefix; default OZ behavior concatenates with `tokenId` → `/metadata/{tokenId}.json` |
| Can't change metadata host | Add `setBaseURI(string)` owner-only setter + `BaseURIUpdated` event |
| Per-token URI not used at mint | Drop `ERC721URIStorage` inheritance entirely; rely on `baseURI + tokenId` combo |
| No constructor baseURI | Constructor now takes `baseURI_` as third arg; captured atomically |

---

## Architecture: Why Minting = `onlyOwner` + Server-Side Relayer

Pattern chosen: **onlyOwner + trusted server-side relayer**.

```
┌──────────────────┐                    ┌────────────────────┐
│ User browser     │  ──── PG/Laravel ────│ Game Server        │
│  (game.html)     │       POST /api/   │  (relayer)         │
│                  │       mint          │  Bre's admin       │
└────────┬─────────┘                    │  wallet 0xf6a15..  │
         │                              └────────┬───────────┘
         │ win battle                            │ tx
         │ (game state update)                   ▼
         ▲                              ┌────────────────────┐
         │                              │ PixelRaidCardsV2   │
         │ NFT arrives in user wallet   │ (BSC testnet)      │
         └──────────────────────────────│  owner mintCard    │
                                        └────────────────────┘
```

**Why this pattern?**
- Hackathon scope: limited contributors, no need for full EIP-712 off-chain voucher infra.
- Server holds admin private key (VPS) — guards against random users minting spam NFTs.
- User never pays gas for minting → great UX for Telegram/Discord audiences.
- Future upgrade path: add EIP-712 signature voucher if needed → user pays own gas.

Source: Per Bre's explicit answer in pre-implementation Q&A (asked 29 Jun 2026):
> Minting strategy → A (onlyOwner + server relayer, simple & aman buat hackathon)

---

## Files in PR #3 (`feat/v2-contract`)

```
contracts/PixelRaidCardsV2.sol    ← contract (~220 lines)
blockchain/hardhat.config.js      ← compile + deploy config
blockchain/scripts/deploy-v2.js   ← deploy script (template, not run yet)
metadata/schema.json              ← ERC-721/OpenSea-compatible JSON Schema
metadata/example-warrior-common.json  ← sample 1
metadata/example-mage-rare.json       ← sample 2
metadata/hero-catalog.json        ← 5×5 hero × rarity matrix + distribution
docs/v2-design.md                 ← THIS file
```

---

## How to Deploy (when approved)

```bash
cd /root/pixel-raid/blockchain
npx hardhat run scripts/deploy-v2.js --network bscTestnet
# → outputs: V2_CONTRACT_ADDRESS=0xNEW...
```

Then update:
- `js/systems/blockchain.js` → `CONTRACT_ADDRESS` to new V2 address
- BSCscan verification:
  ```
  npx hardhat verify --network bscTestnet <V2_ADDR> "Pixel Raid Cards" "PRC" "https://pixel.brebross.xyz/metadata/"
  ```

---

## Metadata Hosting & Nginx Snippet

After deploy, V2 tokenURI returns `https://pixel.brebross.xyz/metadata/{tokenId}.json`.

Static serve via nginx:

```nginx
location /metadata/ {
    root /var/www/pixel-raid/metadata;
    add_header Cache-Control "public, max-age=3600";
    add_header Access-Control-Allow-Origin "*";
    try_files $uri $uri/ =404;
}
```

Pre-bake JSON files at deploy-time using `hero-catalog.json` as source-of-truth:
- 5 classes × 5 rarities × 4 variants (artSeed) = 100 sample files
- Or generate dynamically on first request via PHP/Node (deferred).

---

## Risk Recap

| Risk | Mitigation |
|------|-----------|
| Orphan v1 contract (still on-chain) | Empty, no funds, no users pointing to it. Leave alone — gas cost is 0 to leave. |
| Deploy fails mid-deploy | Hardhat will revert; gas used but no contract deployed. ~0.005 tBNB lost. |
| Server wallet compromised | Burn `transferOwnership(address(0))` or call `renounceOwnership()` — but mint would fail entirely. Better to rotate admin wallet after deploy. |
| baseURI hosting site goes down | NFTs render as "no metadata" — visible trait shell but no images. Resilient to transient outages. |
| MintMetaData race (token URI not yet on host when user views) | Server-side metadata file written **before** tx submit; small latency window. Acceptable for hackathon scope. |

---

## Future Roadmap (post-hackathon)

- [ ] EIP-712 voucher system for user-paid mints
- [ ] Staking rewards (deposit NFT → earn $PRIDE)
- [ ] Cross-chain bridge to Polygon testnet
- [ ] On-chain treasury for marketplace fees
- [ ] Upgradeable proxy for v3 if needed
