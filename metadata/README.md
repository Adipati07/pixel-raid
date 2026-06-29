# `metadata/` — NFT tokenURI host files

> Self-hosted JSON for the BSC testnet NFT contract.
> Served at `https://pixel.brebross.xyz/metadata/{tokenId}` by nginx.

---

## File layout

| File | Purpose | Audience |
|------|---------|----------|
| `schema.json` | JSON-Schema for ERC-721 + OpenSea-compatible metadata | reference |
| `hero-catalog.json` | Source-of-truth for hero classes × rarities + distribution weights | game logic |
| `example-warrior-common.json` | Static example for "Iron Warrior (Common)" — pre-bake / test fixture | template |
| `example-mage-rare.json` | Same, for "Crystal Mage (Rare)" | template |
| `1.json` | **Live deployed sample** — corresponds to tokenId=1 minted on-chain | marketplace |

---

## How to add a new token's metadata

After minting a new NFT on BSC testnet (via game-server-side relayer), write a JSON file at `metadata/{tokenId}.json`. The file should:

1. Follow `schema.json` structure
2. Reference the actual hero art in `assets/characters/{class}-{rarity}.png` (URL absolute `https://pixel.brebross.xyz/assets/characters/...`)
3. Be served by nginx `location /metadata/ { ... }` (already configured in production)

Token URL pattern:
```
baseURI  = https://pixel.brebross.xyz/metadata/
tokenURI = baseURI + tokenId
         = https://pixel.brebross.xyz/metadata/{tokenId}  (no .json extension)
            └─ nginx try_files falls through to .../metadata/{tokenId}.json → 200 application/json
```

---

## Live vs template files

- `example-*.json`: hypothetical heroes defined pre-deploy. Use as templates for content generation.
- `1.json`: actually minted sample. Mirror copy of `/var/www/pixel-raid/metadata/1.json`. Don't manually edit here without updating production.

## Trust model

- All files in this directory are static (read-only) JSON metadata for on-chain minted NFTs.
- NGINX serves them via the `/metadata/` location rule.
- If you `setBaseURI(new_url)` on the contract, this directory needs to either:
  - Be relocated/duplicated to the new host
  - Or rely on a content-hash proxy (IPFS is a future option)

---

## gitignore hints (deployed production mirror)

Production mirror at `/var/www/pixel-raid/metadata/*.json` is the live serving dir for nginx.
This repo's `metadata/` is the source-of-truth / reference, kept in sync manually.

For hackathon scope: keep them in sync via PR commits like this one.
