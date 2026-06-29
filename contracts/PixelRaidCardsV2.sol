// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title PixelRaidCardsV2
 * @dev ERC-721 NFT contract for Pixel Raid game cards — v2 with mutable baseURI
 *
 * What's new vs v1 (deployed at 0xB96e…3AC):
 *  - Mutable baseURI via setBaseURI() — host metadata anywhere, update anytime (no redeploy needed)
 *  - Constructor accepts baseURI (so deployment captures the host URL atomically)
 *  - Drops ERC721URIStorage (per-token URI) in favor of baseURI pattern (cleaner schema: /metadata/{id}.json)
 *  - Renamed/upgraded contract name: launches fresh on new BSC testnet address
 *  - All other marketplace logic kept identical to v1
 *
 * Trust model:
 *  - mintCard / levelUp / updateCardExp remain onlyOwner — game-side server wallet (Bre's admin) is the owner
 *  - Game UI from browser calls POST /api/mint (server-side relayer) which submits tx from server wallet
 *  - User never directly touches tBNB for minting
 *  - listCard / buyCard / cancelListing: public, escrow enforced by contract
 */
contract PixelRaidCardsV2 is ERC721, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Mutable base URI for NFT metadata hosting.
    // Defaults to constructor param, can be updated by owner without redeploy.
    string private _customBaseURI;

    // ─── Card data struct (one NFT per card) ───
    struct CardData {
        string name;       // display name (e.g. "Iron Warrior")
        string className;  // warrior | mage | archer | healer | assassin
        string rarity;     // common | rare | epic | legendary | mythic
        uint256 hp;
        uint256 atk;
        uint256 def;
        uint256 spd;
        uint256 crit;
        string skillName;
        string skillType;
        uint256 skillValue;
        uint256 level;
        uint256 exp;
        uint256 artSeed;
        uint256 createdAt;
    }

    // ─── Marketplace listing struct ───
    struct Listing {
        uint256 price;
        address seller;
        bool active;
    }

    // ─── State ───
    mapping(uint256 => CardData) public cards;
    mapping(uint256 => Listing) public listings;

    // ─── Events ───
    event CardMinted(uint256 indexed tokenId, address indexed owner, string name, string rarity);
    event CardLeveledUp(uint256 indexed tokenId, uint256 newLevel);
    event CardListed(uint256 indexed tokenId, uint256 price, address seller);
    event CardSold(uint256 indexed tokenId, uint256 price, address seller, address buyer);
    event CardListingCancelled(uint256 indexed tokenId);
    event BaseURIUpdated(string newBaseURI);

    constructor(
        string memory name_,       // token name: "Pixel Raid Cards"
        string memory symbol_,     // token symbol: "PRC"
        string memory baseURI_     // metadata host prefix
    ) ERC721(name_, symbol_) Ownable() {
        _customBaseURI = baseURI_;
        emit BaseURIUpdated(baseURI_);
    }

    // ─── Metadata plumbing ───
    /// @dev Returns the per-host prefix; concat with tokenId to get final URI.
    function _baseURI() internal view override returns (string memory) {
        return _customBaseURI;
    }

    /// @notice Owner-only: change metadata host without redeploying the contract.
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _customBaseURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /// @notice Read current baseURI (for off-chain indexers/clients).
    function getBaseURI() external view returns (string memory) {
        return _customBaseURI;
    }

    // ─── Game logic (onlyOwner = server-side relayer wallet) ───

    /// @notice Mint a new card NFT to a player wallet after gameplay event.
    function mintCard(
        address to,
        string memory name,
        string memory className,
        string memory rarity,
        uint256 hp,
        uint256 atk,
        uint256 def,
        uint256 spd,
        uint256 crit,
        string memory skillName,
        string memory skillType,
        uint256 skillValue,
        uint256 artSeed
    ) public onlyOwner returns (uint256) {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(to, tokenId);

        cards[tokenId] = CardData({
            name:       name,
            className:  className,
            rarity:     rarity,
            hp:         hp,
            atk:        atk,
            def:        def,
            spd:        spd,
            crit:       crit,
            skillName:  skillName,
            skillType:  skillType,
            skillValue: skillValue,
            level:      1,
            exp:        0,
            artSeed:    artSeed,
            createdAt:  block.timestamp
        });

        emit CardMinted(tokenId, to, name, rarity);
        return tokenId;
    }

    function levelUpCard(uint256 tokenId) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Card does not exist");
        cards[tokenId].level += 1;
        emit CardLeveledUp(tokenId, cards[tokenId].level);
    }

    function updateCardExp(uint256 tokenId, uint256 newExp) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Card does not exist");
        cards[tokenId].exp = newExp;
    }

    // ─── Marketplace (public — any user) ───

    function listCard(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "Not card owner");
        require(price > 0, "Price must be > 0");
        // Escrow: transfer to contract
        transferFrom(msg.sender, address(this), tokenId);
        listings[tokenId] = Listing({
            price: price,
            seller: msg.sender,
            active: true
        });
        emit CardListed(tokenId, price, msg.sender);
    }

    function buyCard(uint256 tokenId) public payable {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Card not listed");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy own card");

        // Pay seller
        payable(listing.seller).transfer(msg.value);
        // Transfer NFT to buyer
        transferFrom(address(this), msg.sender, tokenId);
        // Close listing
        listing.active = false;

        emit CardSold(tokenId, listing.price, listing.seller, msg.sender);
    }

    function cancelListing(uint256 tokenId) public {
        Listing storage listing = listings[tokenId];
        require(listing.seller == msg.sender, "Not seller");
        require(listing.active, "Listing not active");
        transferFrom(address(this), msg.sender, tokenId);
        listing.active = false;
        emit CardListingCancelled(tokenId);
    }

    // ─── View helpers ───

    function getCardData(uint256 tokenId) public view returns (CardData memory) {
        require(_ownerOf(tokenId) != address(0), "Card does not exist");
        return cards[tokenId];
    }

    function totalCards() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    // ─── Required OpenZeppelin v4 overrides for multiple inheritance ───

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }
}
