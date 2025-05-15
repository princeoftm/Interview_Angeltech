import { useState, useEffect } from 'react'
import { Row, Col, Card } from 'react-bootstrap'
const { ethers }= require('ethers')

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
      <Row xs={1} md={2} lg={4} className="g-4 py-3">
        {items.map((item, idx) => (
          <Col key={idx} className="overflow-hidden">
            <Card>
              <Card.Img variant="top" src={ipfsToPinataGateway(item.image)} />
              <Card.Footer>
                For {ethers.formatEther(item.totalPrice)} ETH - Received {ethers.formatEther(item.price)} ETH
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  )
}

export default function MyListedItems({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true)
  const [listedItems, setListedItems] = useState([])
  const [soldItems, setSoldItems] = useState([])

  const loadListedItems = async () => {
    try {
      const itemCount = await marketplace.itemCount()
      const listed = []
      const sold = []

      for (let i = 1; i <= itemCount; i++) {
        const item = await marketplace.items(i)

        if (item.seller.toLowerCase() === account.toLowerCase()) {
          const tokenURI = await nft.tokenURI(item.tokenId)
          const metadataUrl = ipfsToPinataGateway(tokenURI)

          const response = await fetch(metadataUrl)
          const metadata = await response.json()

          const imageUrl = ipfsToPinataGateway(metadata.image)
          const totalPrice = await marketplace.getTotalPrice(item.itemId)

          const structuredItem = {
            totalPrice,
            price: item.price,
            itemId: item.itemId,
            name: metadata.name,
            description: metadata.description,
            image: imageUrl,
          }

          listed.push(structuredItem)
          if (item.sold) sold.push(structuredItem)
        }
      }

      setListedItems(listed)
      setSoldItems(sold)
    } catch (err) {
      console.error("Failed to load listed items:", err)
    } finally {
      setLoading(false)
    }
  }

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
          <Row xs={1} md={2} lg={4} className="g-4 py-3">
            {listedItems.map((item, idx) => (
              <Col key={idx} className="overflow-hidden">
                <Card>
                  <Card.Img variant="top" src={ipfsToPinataGateway(item.image)} />
                  <Card.Footer>{ethers.formatEther(item.totalPrice)} ETH</Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
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
