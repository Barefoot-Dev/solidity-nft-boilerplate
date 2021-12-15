// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract CryptoArt is ERC721Enumerable, Ownable {
    uint256 public constant maxSupply = 1024;
    uint256 public constant mintPrice = 0.1 ether;
    string private currentBaseURI;

    constructor() ERC721("CryptoArt", "ART") {}

    /** @dev Mints NFTs
     * @param quantity The quantity of tokens to mint
     */
    function mint(uint256 quantity) public payable {
        /// block transactions that would exceed the maxSupply
        require(totalSupply() + quantity <= maxSupply, "Supply is exhausted");

        // block transactions that don't provide enough ether
        require(
            msg.value >= mintPrice * quantity,
            "Insufficient value for presale mint"
        );

        /// mint the requested quantity
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply();
            _safeMint(msg.sender, tokenId);
        }
    }

    /** @dev Get the current base URI
     * @return currentBaseURI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return currentBaseURI;
    }

    /** @dev Update the base URI
     * @param baseURI_ New value of the base URI
     */
    function setBaseURI(string memory baseURI_) public onlyOwner {
        currentBaseURI = baseURI_;
    }

    /**
     * @dev Withdraw ether to owner's wallet
     */
    function withdrawEth() public onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Withdraw failed");
    }
}
