import { useState, useEffect } from 'react'
import { Row, Col, Card, Button, Badge } from 'react-bootstrap'
import axios from 'axios'
const { ethers } = require('ethers')

const pinataJWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyMDAyZTUxYS0yMjdmLTRlOTctOTcxZC0xODg1ODc4MDM4NWYiLCJlbWFpbCI6InJhb2FuaXJ1ZGRoOTJAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiNmUyMThjYjQxYWNhMjlmMDFlNjUiLCJzY29wZWRLZXlTZWNyZXQiOiJmNmYzYzNjNmFmMDVmZmNkMzQxODIwZjIyYzg0ZDk5NDg1YzhkYTMxNzQwOTI5NmI2ZjM1YzQzN2QwMjMzOTdjIiwiZXhwIjoxNzc4ODI4OTIzfQ.7jCwk1g0wE1NbW27YPRDAenQqBlIEUvwPoz-RoExAiQ";

const Home = ({ marketplace, nft }) => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [cart, setCart] = useState([])

  const fetchPinataMetadata = async (cid) => {
    try {
      const url = `https://gateway.pinata.cloud/ipfs/${cid}`
      const response = await fetch(url)
      return await response.json()
    } catch (error) {
      console.error("Failed to fetch metadata from Pinata:", error)
      return null
    }
  }

  const loadMarketplaceItems = async () => {
    try {
      const itemCount = await marketplace.itemCount()
      const loadedItems = []

      for (let i = 1; i <= itemCount; i++) {
        const item = await marketplace.items(i)
        if (!item.sold) {
          const tokenURI = await nft.tokenURI(item.tokenId)

          // Extract CID from tokenURI
          const cid = tokenURI.split("/").pop()
          const metadata = await fetchPinataMetadata(cid)
          if (!metadata) continue

          const imageCID = metadata.image.split("/").pop()
          const imageURL = `https://gateway.pinata.cloud/ipfs/${imageCID}`

          const totalPrice = await marketplace.getTotalPrice(item.itemId)

          loadedItems.push({
            totalPrice,
            itemId: item.itemId,
            seller: item.seller,
            name: metadata.name,
            description: metadata.description,
            image: imageURL,
          })
        }
      }

      setItems(loadedItems)
    } catch (err) {
      console.error("Failed to load marketplace items:", err)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (item) => {
        if (cart.some(cartItem => cartItem.itemId === item.itemId)) {
      alert("This item is already in your cart!");
      return; // Don't add the item again
    }
    setCart([...cart, item])
  }

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.itemId !== itemId))
  }

  const buyCartItems = async () => {
    if (cart.length === 0) return

    try {
      for (const item of cart) {
        const tx = await marketplace.purchaseItem(item.itemId, {
          value: item.totalPrice
        })
        await tx.wait()
        console.log(`Purchased item with ID: ${item.itemId}`) // Optional: Log successful purchase
      }
      setCart([])
      loadMarketplaceItems() // Reload items to reflect purchases
      alert("Thank you for your purchase!") // Optional: Alert user of successful checkout
    } catch (err) {
      console.error("Failed to purchase cart items:", err)
      alert("An error occurred during checkout.") // Optional: Alert user of failure
    }
  }

  useEffect(() => {
    if (marketplace && nft) loadMarketplaceItems()
  }, [marketplace, nft])

  if (loading) {
    return (
      <main style={{ padding: "1rem 0" }}>
        <h2>Loading...</h2>
      </main>
    )
  }

  return (
    <div className="flex justify-center">
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
        {cart.length > 0 && (
          <Button variant="outline-primary" onClick={buyCartItems}>
            Cart <Badge bg="secondary">{cart.length}</Badge>
          </Button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="px-5 container">
          <Row xs={1} md={2} lg={4} className="g-4 py-5">
            {items.map((item, idx) => (
              <Col key={idx} className="overflow-hidden">
                <Card>
                  <Card.Img variant="top" src={item.image} />
                  <Card.Body>
                    <Card.Title>{item.name}</Card.Title>
                    <Card.Text>{item.description}</Card.Text>
                  </Card.Body>
                  <Card.Footer>
                    <div className="d-grid gap-2">
                      <Button onClick={() => addToCart(item)} variant="outline-success" size="lg">
                        Add to Cart for {ethers.formatEther(item.totalPrice)} ETH
                      </Button>
                      {cart.some(cartItem => cartItem.itemId === item.itemId) && (
                        <Button onClick={() => removeFromCart(item.itemId)} variant="outline-danger" size="sm">
                          Remove from Cart
                        </Button>
                      )}
                    </div>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ) : (
        <main style={{ padding: "1rem 0" }}>
          <h2>No listed assets</h2>
        </main>
      )}

      {cart.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-light p-4"
          style={{ borderTop: '1px solid #ccc' }}
        >
          <h3>Shopping Cart ({cart.length} items)</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {cart.map((item) => (
              <li key={item.itemId} className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  {item.name} - {ethers.formatEther(item.totalPrice)} ETH
                </div>
                <Button onClick={() => removeFromCart(item.itemId)} variant="outline-danger" size="sm">
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <div className="d-grid">
            <Button variant="primary" size="lg" onClick={buyCartItems}>
              Checkout - {ethers.formatEther(cart.reduce((total, item) => total + item.totalPrice, ethers.parseEther("0")))} ETH
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home