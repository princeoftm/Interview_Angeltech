import { useState, useEffect } from 'react'
import { Card, Button, Form } from 'react-bootstrap'
const { ethers } = require('ethers')

// Converts IPFS or HTTP(S) to Pinata gateway URL
function ipfsToPinataGateway(uri) {
  if (!uri) return null
  return uri.startsWith("ipfs://")
    ? uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")
    : uri
}

function renderSoldItems(items) {
  return (
    <>
      <h2>Sold</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)', // 3 columns
          gap: '20px',
          padding: '1rem 0',
        }}
      >
        {items.map((item, idx) => (
          <Card key={idx} className="overflow-hidden h-100 shadow-sm border-0">
            <Card.Img variant="top" src={ipfsToPinataGateway(item.image)} />
            <Card.Footer>
              For {ethers.formatEther(item.totalPrice)} ETH - Received {ethers.formatEther(item.price)} ETH
            </Card.Footer>
          </Card>
        ))}
      </div>
    </>
  )
}

export default function MyListedItems({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true)
  const [listedItems, setListedItems] = useState([])
  const [soldItems, setSoldItems] = useState([])
  const [priceUpdates, setPriceUpdates] = useState({}) // Holds new price values per item

  const handlePriceChange = (itemId, value) => {
    setPriceUpdates(prev => ({ ...prev, [itemId]: value }))
  }

  const updatePrice = async (itemId) => {
    try {
      const newPrice = priceUpdates[itemId]
      if (!newPrice || isNaN(newPrice)) {
        alert("Enter a valid price in ETH")
        return
      }

      const priceInWei = ethers.parseEther(newPrice)
      const tx = await marketplace.updatePrice(itemId, priceInWei)
      await tx.wait()

      alert("Price updated successfully")
      loadListedItems() // Reload updated data
    } catch (err) {
      console.error("Failed to update price:", err)
      alert("Price update failed")
    }
  }

  const loadListedItems = async () => {
  try {
    setLoading(true);
    const itemCount = await marketplace.itemCounter();
    const listed = [];
    const sold = [];

    // Fetch all listings in parallel
    const listingPromises = [];
    for (let i = 1; i <= itemCount; i++) {
      listingPromises.push(marketplace.listings(i));
    }
    const listings = await Promise.all(listingPromises);

    // Filter items by seller first
    const myItems = listings.filter(
      item => item.seller.toLowerCase() === account.toLowerCase()
    );

    // Now fetch tokenURI and totalPrice for each item in parallel
    const itemsWithMetadata = await Promise.all(
      myItems.map(async (item) => {
        try {
          const tokenURI = await nft.tokenURI(item.tokenId);
          const metadataUrl = ipfsToPinataGateway(tokenURI);

          const response = await fetch(metadataUrl);
          const metadata = await response.json();

          const imageUrl = ipfsToPinataGateway(metadata.image);
          const totalPrice = await marketplace.getTotalPrice(item.id);

          return {
            totalPrice,
            price: item.price,
            itemId: item.id,
            name: metadata.name,
            description: metadata.description,
            image: imageUrl,
            sold: item.sold
          };
        } catch (err) {
          console.warn(`Failed to load metadata for item ${item.id}:`, err);
          return null;
        }
      })
    );

    // Separate sold and listed, ignoring failed fetches
    itemsWithMetadata.forEach(item => {
      if (!item) return;
      if (item.sold) sold.push(item);
      else listed.push(item);
    });

    setListedItems(listed);
    setSoldItems(sold);
  } catch (err) {
    console.error("Failed to load listed items:", err);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    if (marketplace && nft && account) {
      loadListedItems()
    }
  }, [marketplace, nft, account])

  if (loading) {
    return (
      <main style={{ padding: "1rem 0" }}>
        <h2>Loading...</h2>
      </main>
    )
  }

  return (
    <div className="flex justify-center">
      {listedItems.length > 0 ? (
        <div className="px-5 py-3 container">
          <h2>Listed</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)', // strict 3 columns grid
              gap: '20px',
              padding: '1rem 0',
            }}
          >
            {listedItems.map((item) => (
              <Card key={item.itemId} className="overflow-hidden h-100 shadow-sm border-0">
                <Card.Img variant="top" src={ipfsToPinataGateway(item.image)} />
                <Card.Body>
                  <Card.Text>Current: {ethers.formatEther(item.totalPrice)} ETH</Card.Text>
                  <Form.Control
                    type="text"
                    placeholder="New price in ETH"
                    value={priceUpdates[item.itemId] || ""}
                    onChange={(e) => handlePriceChange(item.itemId, e.target.value)}
                  />
                  <Button
                    className="mt-2 w-100"
                    variant="primary"
                    onClick={() => updatePrice(item.itemId)}
                  >
                    Update Price
                  </Button>
                </Card.Body>
              </Card>
            ))}
          </div>

          {soldItems.length > 0 && renderSoldItems(soldItems)}
        </div>
      ) : (
        <main style={{ padding: "1rem 0" }}>
          <h2>No listed assets</h2>
        </main>
      )}
    </div>
  )
}
