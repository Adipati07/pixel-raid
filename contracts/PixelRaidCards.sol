// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title PixelRaidCards
 * @dev ERC-721 NFT contract for Pixel Raid game cards
 * Each card is a unique NFT with on-chain metadata
 */
contract PixelRaidCards is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Card metadata struct
    struct CardData {
        string name;
        string className;     // warrior, mage, archer, healer, assassin
        string rarity;        // common, rare, epic, legendary, mythic
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

    // Mapping from token ID to card data
    mapping(uint256 => CardData) public cards;

    // Events
    event CardMinted(uint256 indexed tokenId, address indexed owner, string name, string rarity);
    event CardLeveledUp(uint256 indexed tokenId, uint256 newLevel);
    event CardListed(uint256 indexed tokenId, uint256 price, address seller);
    event CardSold(uint256 indexed tokenId, uint256 price, address seller, address buyer);
    event CardListingCancelled(uint256 indexed tokenId);

    // Marketplace listing struct
    struct Listing {
        uint256 price;
        address seller;
        bool active;
    }

    // Marketplace state
    mapping(uint256 => Listing) public listings;

    constructor() ERC721("Pixel Raid Cards", "PRC") Ownable(msg.sender) {}

    /**
     * @dev Mint a new card NFT
     */
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
            name: name,
            className: className,
            rarity: rarity,
            hp: hp,
            atk: atk,
            def: def,
            spd: spd,
            crit: crit,
            skillName: skillName,
            skillType: skillType,
            skillValue: skillValue,
            level: 1,
            exp: 0,
            artSeed: artSeed,
            createdAt: block.timestamp
        });

        emit CardMinted(tokenId, to, name, rarity);
        return tokenId;
    }

    /**
     * @dev Level up a card (owner only, for game logic)
     */
    function levelUpCard(uint256 tokenId) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Card does not exist");
        cards[tokenId].level += 1;
        emit CardLeveledUp(tokenId, cards[tokenId].level);
    }

    /**
     * @dev Update card EXP (owner only, for game logic)
     */
    function updateCardExp(uint256 tokenId, uint256 newExp) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Card does not exist");
        cards[tokenId].exp = newExp;
    }

    /**
     * @dev List card for sale on marketplace
     */
    function listCard(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "Not card owner");
        require(price > 0, "Price must be > 0");

        // Transfer to contract for escrow
        transferFrom(msg.sender, address(this), tokenId);

        listings[tokenId] = Listing({
            price: price,
            seller: msg.sender,
            active: true
        });

        emit CardListed(tokenId, price, msg.sender);
    }

    /**
     * @dev Buy a listed card
     */
    function buyCard(uint256 tokenId) public payable {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Card not listed");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy own card");

        // Transfer payment to seller
        payable(listing.seller).transfer(msg.value);

        // Transfer card to buyer
        transferFrom(address(this), msg.sender, tokenId);

        // Remove listing
        listing.active = false;

        emit CardSold(tokenId, listing.price, listing.seller, msg.sender);
    }

    /**
     * @dev Cancel a listing
     */
    function cancelListing(uint256 tokenId) public {
        Listing storage listing = listings[tokenId];
        require(listing.seller == msg.sender, "Not seller");
        require(listing.active, "Listing not active");

        // Transfer card back to seller
        transferFrom(address(this), msg.sender, tokenId);

        listing.active = false;

        emit CardListingCancelled(tokenId);
    }

    /**
     * @dev Get card data
     */
    function getCardData(uint256 tokenId) public view returns (CardData memory) {
        require(_ownerOf(tokenId) != address(0), "Card does not exist");
        return cards[tokenId];
    }

    /**
     * @dev Get total cards minted
     */
    function totalCards() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    // Required overrides
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
}
