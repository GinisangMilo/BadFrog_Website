// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BadFrogsLoreRegistry
 * @dev Highly optimized, unlinked relational mapping for cross-chain Lore deployment on Base.
 */
contract BadFrogsLoreRegistry {
    // tokenId => (walletAddress => Lore String)
    mapping(uint256 => mapping(address => string)) public userLore;

    event LoreUpdated(uint256 indexed tokenId, address indexed writer, string newLore);

    function setLore(uint256 tokenId, string memory newLore) public {
        userLore[tokenId][msg.sender] = newLore;
        emit LoreUpdated(tokenId, msg.sender, newLore);
    }

    function getLore(uint256 tokenId, address queryAddress) public view returns (string memory) {
        return userLore[tokenId][queryAddress];
    }
}
