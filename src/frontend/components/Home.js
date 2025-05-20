import { useState, useEffect } from 'react'
import { Row, Col, Card, Button, Badge, Container } from 'react-bootstrap'
import axios from 'axios'
const { ethers } = require('ethers')

const Home = ({ marketplace, nft }) => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [cart, setCart] = useState([])
  const [processingCheckout, setProcessingCheckout] = useState(false)

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
      const itemCount = await marketplace.itemCounter()
      const loadedItems = []

      for (let i = 1; i <= itemCount; i++) {
        const item = await marketplace.listings(i)
        if (!item.sold) {
          const tokenURI = await nft.tokenURI(item.tokenId)
          const cid = tokenURI.split("/").pop()
          const metadata = await fetchPinataMetadata(cid)
          if (!metadata) continue

          const imageCID = metadata.image.split("/").pop()
          const imageURL = `https://gateway.pinata.cloud/ipfs/${imageCID}`
          const totalPrice = await marketplace.getTotalPrice(item.id)

          loadedItems.push({
            totalPrice,
            itemId: item.id,
            seller: item.seller,
            tokenId: item.tokenId,
            nftAddress: item.nft,
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
      return;
    }
    setCart([...cart, item])
  }

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.itemId !== itemId))
  }

  const buyCartItems = async () => {
    if (processingCheckout || cart.length === 0) return
    setProcessingCheckout(true)

    const successfulPurchases = []

    for (const item of cart) {
      try {
        const tx = await marketplace.buyItem(item.itemId, {
          value: item.totalPrice
        })
        await tx.wait()
        successfulPurchases.push(item.itemId)
      } catch (err) {
        console.error(`Failed to purchase item ID ${item.itemId}:`, err)
        alert(`Purchase failed for item: ${item.name}`)
      }
    }

    setCart(cart.filter(item => !successfulPurchases.includes(item.itemId)))

    if (successfulPurchases.length > 0) {
      loadMarketplaceItems()
      alert("Checkout completed for some items.")
    } else {
      alert("No items were purchased.")
    }

    setProcessingCheckout(false)
  }

  useEffect(() => {
    if (marketplace && nft) loadMarketplaceItems()
  }, [marketplace, nft])

  if (loading) {
    return (
      <main className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h2 className="mt-3 text-primary">Loading Marketplace Items...</h2>
      </main>
    )
  }

  return (
    <Container className="my-5">
      {/* Floating Cart Button */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
        {cart.length > 0 && (
          <Button
            variant="info"
            className="shadow-lg"
            onClick={buyCartItems}
            disabled={processingCheckout}
          >
            <i className="bi bi-cart-fill me-2"></i> Cart{' '}
            <Badge bg="light" text="dark" className="ms-1">
              {cart.length}
            </Badge>
          </Button>
        )}
      </div>

      {items.length > 0 ? (
        <>
          <h2 className="text-center mb-5 text-primary">Explore Our Digital Collection</h2>
          <Row xs={1} md={2} lg={3} xl={4} className="g-4 justify-content-center">
            {items.map((item, idx) => (
              <Col key={idx}>
                <Card className="h-100 shadow-sm border-0 transform-on-hover">
                  <Card.Img variant="top" src={item.image} style={{ height: '150px', objectFit: 'cover', margin: 50 }} />
                  <Card.Body className="d-flex flex-column">
                    <Card.Title className="text-truncate mb-1">{item.name}</Card.Title>
                    <Card.Text className="text-muted flex-grow-1" style={{ margin: 50, fontSize: '0.9rem' }}>
                      {item.description.length > 70 ? item.description.substring(0, 67) + '...' : item.description}
                    </Card.Text>
                    <div className="mt-auto pt-2 border-top">
                      <p className="fw-bold fs-5 text-success mb-2">
                        {ethers.formatEther(item.totalPrice)} ETH
                      </p>
                      {!cart.some(cartItem => cartItem.itemId === item.itemId) ? (
                        <Button
                          onClick={() => addToCart(item)}
                          variant="primary"
                          className="w-100 d-flex align-items-center justify-content-center"
                        >
                          <i className="bi bi-plus-circle-fill me-2"></i> Add to Cart
                        </Button>
                      ) : (
                        <Button
                          onClick={() => removeFromCart(item.itemId)}
                          variant="outline-danger"
                          className="w-100 d-flex align-items-center justify-content-center"
                        >
                          <i className="bi bi-x-circle-fill me-2"></i> Remove from Cart
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      ) : (
        <main className="text-center py-5">
          <h2 className="text-muted">No NFTs are currently listed for sale. Check back soon!</h2>
          <p className="mt-3">Consider <a href="/create" className="text-decoration-none">creating your own NFT</a> to list!</p>
        </main>
      )}

      {/* Persistent Shopping Cart */}
      {cart.length > 0 && (
        <Card
          className="fixed-bottom bg-white shadow-lg p-3 rounded-top"
          style={{ zIndex: 999, borderTopLeftRadius: '15px', borderTopRightRadius: '15px' }}
        >
          <Card.Body>
            <h4 className="mb-3 text-secondary">
              Your Shopping Cart <Badge bg="primary">{cart.length}</Badge>
            </h4>
            <ul className="list-group list-group-flush mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {cart.map((item) => (
                <li key={item.itemId} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <span className="fw-bold">{item.name}</span> - {ethers.formatEther(item.totalPrice)} ETH
                  </div>
                  <Button onClick={() => removeFromCart(item.itemId)} variant="outline-danger" size="sm">
                    <i className="bi bi-trash-fill"></i> Remove
                  </Button>
                </li>
              ))}
            </ul>
            <div className="d-grid">
              <Button
                variant="success"
                size="lg"
                onClick={buyCartItems}
                disabled={processingCheckout}
              >
                {processingCheckout ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-wallet-fill me-2"></i>
                    Checkout Total:{' '}
                    {ethers.formatEther(
                      cart.reduce(
                        (total, item) => total + item.totalPrice,
                        ethers.parseEther("0")
                      )
                    )}{' '}
                    ETH
                  </>
                )}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  )
}

export default Home
