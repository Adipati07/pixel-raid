# 🎮 Pixel Raid

> Auto-battle RPG **+ NFT collector** with procedurally-generated pixel art.
> Built for **[Renaiss Hackathon S1](https://renaiss.xyz)**.
> Live on **BNB Smart Chain (BSC) Testnet**.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![BscScan](https://img.shields.io/badge/contract-BSC%20testnet-orange.svg)](https://testnet.bscscan.com/address/0xB96eFfe282b5a8B71895CCF83fA4792A0f0933AC)
[![GitHub stars](https://img.shields.io/github/stars/Adipati07/pixel-raid.svg)](https://github.com/Adipati07/pixel-raid/stargazers)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-contributing)

---

## ✨ What is this game

Pixel Raid is a **Telegram-friendly, browser-based RPG** with three loops:

| Loop | Mechanic |
|------|----------|
| 🎴 **Collect** | Mint hero cards from a roster of 20 procedurally-generated hero classes (warrior, mage, archer, healer, assassin) × 5 rarities (common → mythic) |
| ⚔️ **Battle** | Auto-battle PVE/PVP; rewards gold + EXP; cards level up and gain stats |
| 🛒 **Trade** | In-game marketplace: list / buy / cancel NFT cards on-chain in tBNB |

Every card is an **ERC-721 NFT** on BSC testnet — owned by you, tradable in-game and on-chain.

---

## 🚀 Play Now

| Channel | URL |
|---------|-----|
| 🌐 Web (live) | **<https://pixel.brebross.xyz>** |
| 📜 Smart contract | `0xB96eFfe282b5a8B71895CCF83fA4792A0f0933AC` (BSC testnet) |
| 🔍 Explorer | <https://testnet.bscscan.com/address/0xB96eFfe282b5a8B71895CCF83fA4792A0f0933AC> |

To play locally: clone the repo and open `index.html` in a desktop browser (Chrome/Firefox/Brave).
Connect MetaMask → switch to BSC Testnet → start earning hero cards.

---

## 🛠 Tech Stack

**Frontend (no framework, vanilla JS for hackathon stretch goals of fast load)**
- HTML5 + CSS (game canvas + responsive UI)
- Vanilla ES6 JS — single-file modules under `js/`
- ethers.js v6 — wallet connect, BSC RPC calls

**Smart Contract**
- Solidity `^0.8.20` + OpenZeppelin `ERC721 + ERC721URIStorage + ERC721Enumerable + Ownable`
- Hardhat for compilation & deployment
- Compiled artifact ~20 KB; bytecode + ABI in `blockchain/artifacts/`

**Backend (off-chain indexing)**
- PocketBase (`pb_data/`) — leaderboard, user progress, hero pool

**Hosting**
- nginx on VPS (`pixel.brebross.xyz`)
- Cloudflare DNS + proxy + cache

**Procedural Pixel Art**
- Python (Pillow) scripts `generate_assets.py` + `generate_hero_sprites.py` — seedable sprite generation

---

## 📂 Project Layout

```
Adipati07/pixel-raid/
├── index.html              ← Landing page (rad-first experience)
├── game.html               ← Game canvas + gameplay loop
├── landing.html            ← (legacy copy, kept for fallback)
├── contracts/
│   └── PixelRaidCards.sol  ← ERC-721 NFT contract, all marketplace logic
├── js/
│   ├── core/               ← game, heroes, items, sound
│   ├── ui/                 ← animations, renderer, screens, tutorial
│   └── systems/            ← battle, blockchain, economy, formation
├── assets/                 ← backgrounds/, characters/, heroes/, sprites/, tilesets/
├── blockchain/
│   ├── artifacts/          ← Hardhat compiled bytecode + ABI
│   ├── cache/              ← Hardhat compile cache
│   └── .env                ← PRIVATE_KEY (deployer wallet)
├── pocketbase/             ← backend collections bootstrap
└── generate_*.py           ← sprite generation tooling
```

---

## 🎮 Gameplay Overview

1. **Connect wallet** → game reads your BSC testnet address.
2. **Tutorial** → 6-step guided flow (now keyboard-navigable + resumable, see "Recent Updates" below).
3. **Battle board** → form a party of up to 5 heroes; fight PVE stages for tBNB + XP.
4. **Level up** → cards gain stats; rarity stays constant but level cap rises per rarity.
5. **Marketplace** → list any of your cards; buyers pay in tBNB; escrow enforced by contract.

---

## 📰 Recent Updates

- **v0.40 — UX polish** (`534cfcd`): tutorial now has progress dots, skip-all, keyboard nav, reduced-motion support, localStorage-based resume.
- **v0.41 — Contract wiring** (`3ab2be5`): NFT contract address finalized in `js/systems/blockchain.js`. Frontend ready for first mint.
- **v0.42 — README** ← (this update).

---

## 🧪 Hacker Quickstart

```bash
git clone https://github.com/Adipati07/pixel-raid
cd pixel-raid
# open index.html in browser
xdg-open index.html  # Linux
open index.html       # macOS
```

Connect MetaMask (use BSC testnet, request faucet tBNB from
<https://www.bnbchain.org/en/testnet-faucet>), reload, play.

### Developer Setup

```bash
# install node deps
cd blockchain && npm install

# compile contracts
npx hardhat compile

# deploy to BSC testnet (your wallet must have tBNB)
npx hardhat run scripts/deploy.js --network bscTestnet
```

### Updating NFT Address

Single source of truth: `js/systems/blockchain.js::BlockchainBridge.CONTRACT_ADDRESS`.

---

## 🤝 Contributing

- **Owner**: [@Lil-Vorsex](https://github.com/Lil-Vorsex) (Adipati07 / Raden) — manages `main`
- **Active contributor**: [@brebros](https://github.com/brebros) (Bre) — frontend polish, contract wiring
- **PRs welcome** — fork → feature branch → PR. We squash-merge to `main`.

---

## 🔭 Roadmap (pre-hackathon)

- [x] ERC-721 contract deployed on BSC testnet
- [x] Wallet → marketplace flow (BSC testnet)
- [x] Tutorial UX polish + accessibility
- [ ] Public mint flow (server-side trusted relayer)
- [ ] BSCscan contract source verification
- [ ] Demo video + hackathon submission packet

---

## ⚠️ Caveats

- This runs on **BSC testnet** — no real-money value. The deployed contract is for demo only.
- The Pinion-verified NFT metadata URL pattern: `https://pixel.brebross.xyz/metadata/{tokenId}.json`
- Trust model: `mintCard` is `onlyOwner` (admin wallet). Users acquire cards via gameplay events triggered by server-side relayer; this is intentional for hackathon scope.

---

## 📄 License

[MIT](LICENSE) © 2026 — Adipati07, brebros, contributors.

---

## 🙏 Credits

- **Raden "Lil-Vorsex"** for the original game architecture + web3 integration
- **Bre "brebros"** for the frontend polish + this README
- **OpenZeppelin** for battle-tested ERC-721 contracts
- **PocketBase** for the lightweight backend stack
