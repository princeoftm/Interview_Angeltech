// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Marketplace is  AccessControl, ERC721Holder {
    // Constants
    uint256 public constant FEE_PERCENT = 10;
    uint256 public constant MIN_PRICE = 0.00001 ether;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // State
    address payable public  feeReceiver;
    address public  owner;
    uint256 public itemCounter;
    uint256 public totalVolume;
    uint256 public totalSales;

    // Structs
    struct MarketItem {
        uint256 id;
        IERC721 nft;
        uint256 tokenId;
        uint256 price;
        address payable seller;
        bool sold;
        uint256 expiry;
    }

    // Mappings
    mapping(uint256 => MarketItem) public listings;

    // Events
    event ItemListed(
        uint256 indexed itemId,
        address indexed nft,
        uint256 indexed tokenId,
        uint256 price,
        address seller
    );

    event ItemPurchased(
        uint256 indexed itemId,
        address indexed nft,
        uint256 indexed tokenId,
        uint256 price,
        address seller,
        address buyer
    );

    event ItemCancelled(
        uint256 indexed itemId,
        address indexed nft,
        uint256 indexed tokenId,
        uint256 price,
        address seller
    );

    event ItemPriceUpdated(uint256 indexed itemId, uint256 oldPrice, uint256 newPrice);

    constructor() {
        feeReceiver = payable(msg.sender);
        owner = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    // Internal counter increment using assembly
    function _incrementItemCounter() internal {
        assembly {
            sstore(itemCounter.slot, add(sload(itemCounter.slot), 1))
        }
    }

    // List an NFT for sale
    function listItem(IERC721 _nft, uint256 _tokenId, uint256 _price, uint256 _expiry) external   {
        require(_price >= MIN_PRICE, "Price too low");

        _incrementItemCounter();
        _nft.transferFrom(msg.sender, address(this), _tokenId);

        listings[itemCounter] = MarketItem({
            id: itemCounter,
            nft: _nft,
            tokenId: _tokenId,
            price: _price,
            seller: payable(msg.sender),
            sold: false,
            expiry: _expiry
        });

        emit ItemListed(itemCounter, address(_nft), _tokenId, _price, msg.sender);
    }

    // Buy a listed NFT
    function buyItem(uint256 _itemId) external payable   {
        MarketItem storage item = listings[_itemId];
        require(_itemId > 0 && _itemId <= itemCounter, "Invalid item ID");
        require(!item.sold, "Item already sold");
        require(item.expiry == 0 || block.timestamp < item.expiry, "Listing expired");

        uint256 totalCost = getTotalPrice(_itemId);
        require(msg.value >= totalCost, "Insufficient ETH sent");

        item.sold = true;
        item.nft.safeTransferFrom(address(this), msg.sender, item.tokenId);
        item.seller.transfer(item.price);
        feeReceiver.transfer(totalCost - item.price);

        totalVolume += item.price;
        totalSales++;

        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        emit ItemPurchased(_itemId, address(item.nft), item.tokenId, item.price, item.seller, msg.sender);
    }

    // Buy multiple NFTs in a single transaction
    function buyMultipleItems(uint256[] calldata _itemIds) external payable   {
        uint256 total = 0;

        for (uint256 i = 0; i < _itemIds.length; i++) {
            uint256 id = _itemIds[i];
            require(id > 0 && id <= itemCounter, "Invalid item ID");
            MarketItem storage item = listings[id];
            require(!item.sold, "One or more items already sold");
            require(item.expiry == 0 || block.timestamp < item.expiry, "One or more listings expired");

            total += getTotalPrice(id);
        }

        require(msg.value >= total, "Insufficient ETH sent");

        for (uint256 i = 0; i < _itemIds.length; i++) {
            listings[_itemIds[i]].sold = true;
        }

        for (uint256 i = 0; i < _itemIds.length; i++) {
            uint256 id = _itemIds[i];
            MarketItem storage item = listings[id];

            item.nft.safeTransferFrom(address(this), msg.sender, item.tokenId);
            item.seller.transfer(item.price);
            feeReceiver.transfer(getTotalPrice(id) - item.price);

            totalVolume += item.price;
            totalSales++;

            emit ItemPurchased(id, address(item.nft), item.tokenId, item.price, item.seller, msg.sender);
        }

        if (msg.value > total) {
            payable(msg.sender).transfer(msg.value - total);
        }
    }

    // Cancel a listed item (only by seller and if unsold)
    function cancelListing(uint256 _itemId) external  {
        MarketItem storage item = listings[_itemId];
        require(msg.sender == item.seller, "Not the seller");
        require(!item.sold, "Item already sold");

        item.nft.safeTransferFrom(address(this), item.seller, item.tokenId);
        emit ItemCancelled(_itemId, address(item.nft), item.tokenId, item.price, item.seller);

        delete listings[_itemId];
    }

    // Admin-only force cancel
    function ownerRemoveListing(uint256 _itemId) external onlyOwner  {
        MarketItem storage item = listings[_itemId];
        require(!item.sold, "Item already sold");

        item.nft.safeTransferFrom(address(this), item.seller, item.tokenId);
        emit ItemCancelled(_itemId, address(item.nft), item.tokenId, item.price, item.seller);

        delete listings[_itemId];
    }

    // Update price of a listing
    function updatePrice(uint256 _itemId, uint256 _newPrice) external  {
        MarketItem storage item = listings[_itemId];
        require(msg.sender == item.seller, "Not the seller");
        require(!item.sold, "Already sold");
        require(_newPrice >= MIN_PRICE, "Price too low");

        uint256 oldPrice = item.price;
        item.price = _newPrice;
        emit ItemPriceUpdated(_itemId, oldPrice, _newPrice);
    }

    // Get unsold items with pagination
    function fetchUnsoldItems(uint256 offset, uint256 limit) external view returns (MarketItem[] memory) {
        uint256 count = 0;
        uint256 end = itemCounter < offset + limit ? itemCounter : offset + limit;

        for (uint256 i = offset + 1; i <= end; i++) {
            if (!listings[i].sold && (listings[i].expiry == 0 || block.timestamp < listings[i].expiry)) {
                count++;
            }
        }

        MarketItem[] memory result = new MarketItem[](count);
        uint256 index = 0;

        for (uint256 i = offset + 1; i <= end; i++) {
            if (!listings[i].sold && (listings[i].expiry == 0 || block.timestamp < listings[i].expiry)) {
                result[index++] = listings[i];
            }
        }

        return result;
    }

    // Calculate total cost with fee
    function getTotalPrice(uint256 _itemId) public view returns (uint256 totalPrice) {
        MarketItem storage item = listings[_itemId];
        uint256 price = item.price;

        assembly {
            totalPrice := div(mul(price, add(100, FEE_PERCENT)), 100)
        }
    }
function withdrawStuckETH() external onlyOwner {
    uint256 balance = address(this).balance;
    require(balance > 0, "Nothing to withdraw");
    feeReceiver.transfer(balance);
}
function setFeeReceiver(address payable newReceiver) external onlyOwner {
    require(newReceiver != address(0), "Invalid address");
    feeReceiver = newReceiver;
}

event AdminAdded(address indexed admin);
event AdminRemoved(address indexed admin);

function addAdmin(address admin) external onlyOwner {
    grantRole(ADMIN_ROLE, admin);
    emit AdminAdded(admin);
}

function removeAdmin(address admin) external onlyOwner {
    revokeRole(ADMIN_ROLE, admin);
    emit AdminRemoved(admin);
}
function clearExpired(uint256 _itemId) external {
    MarketItem storage item = listings[_itemId];
    require(item.expiry != 0 && block.timestamp >= item.expiry, "Not expired");
    require(!item.sold, "Already sold");

    item.nft.safeTransferFrom(address(this), item.seller, item.tokenId);
    emit ItemCancelled(_itemId, address(item.nft), item.tokenId, item.price, item.seller);
    delete listings[_itemId];
}

}
