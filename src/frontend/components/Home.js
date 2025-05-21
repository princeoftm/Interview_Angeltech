import { useState, useEffect } from 'react'
import { Card, Button, Badge, Container } from 'react-bootstrap'
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
      const itemCount = Number(await marketplace.itemCounter())
      const itemsArray = Array.from({ length: itemCount }, (_, i) => i + 1)

      const listings = await Promise.all(
        itemsArray.map(i => marketplace.listings(i))
      )

      const unsoldListings = listings.filter(item => !item.sold)

      const itemsData = await Promise.all(
        unsoldListings.map(async (item) => {
          try {
            const tokenURI = await nft.tokenURI(item.tokenId)
            const cid = tokenURI.split("/").pop()
            const metadata = await fetchPinataMetadata(cid)
            if (!metadata) return null

            const imageCID = metadata.image.split("/").pop()
            const imageURL = `https://gateway.pinata.cloud/ipfs/${imageCID}`
            const totalPrice = await marketplace.getTotalPrice(item.id)

            return {
              totalPrice,
              itemId: item.id,
              seller: item.seller,
              tokenId: item.tokenId,
              nftAddress: item.nft,
              name: metadata.name,
              description: metadata.description,
              image: imageURL,
            }
          } catch (err) {
            console.error(`Error processing item ${item.id}:`, err)
            return null
          }
        })
      )

      setItems(itemsData.filter(item => item !== null))
    } catch (err) {
      console.error("Failed to load marketplace items:", err)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (item) => {
    if (cart.some(cartItem => cartItem.itemId === item.itemId)) {
      alert("This item is already in your cart!")
      return
    }
    setCart([...cart, item])
  }

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.itemId !== itemId))
  }

  const buyCartItems = async () => {
  if (processingCheckout || cart.length === 0) return
  setProcessingCheckout(true)

  try {
    const itemIds = cart.map(item => item.itemId)
    const totalPrice = cart.reduce(
      (sum, item) => sum + item.totalPrice,
      ethers.parseEther("0")
    )

    const tx = await marketplace.buyMultipleItems(itemIds, { value: totalPrice })
    await tx.wait()

    alert("Successfully purchased all items in cart!")
    setCart([])
    loadMarketplaceItems()
  } catch (err) {
    console.error("Failed to purchase cart items:", err)
    alert("Checkout failed. Please try again.")
  }

  setProcessingCheckout(false)
}


  const buySingleItem = async (item) => {
    if (processingCheckout) return
    setProcessingCheckout(true)

    try {
      const tx = await marketplace.buyItem(item.itemId, {
        value: item.totalPrice
      })
      await tx.wait()
      alert(`Successfully purchased: ${item.name}`)
      loadMarketplaceItems()
      setCart(cart.filter(cartItem => cartItem.itemId !== item.itemId))
    } catch (err) {
      console.error(`Failed to purchase item ID ${item.itemId}:`, err)
      alert(`Purchase failed for item: ${item.name}`)
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
    <Container className="my-5" style={{ position: 'relative' }}>
      {/* Cart fixed on the right side */}
      {cart.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: 0,
            width: '320px',
            height: '80vh',
            overflowY: 'auto',
            backgroundColor: 'white',
            boxShadow: '-3px 0 10px rgba(0,0,0,0.1)',
            padding: '15px',
            zIndex: 1050,
            borderLeft: '1px solid #ddd',
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
          }}
        >
          <h4 className="mb-3 text-secondary">
            Your Shopping Cart <Badge bg="primary">{cart.length}</Badge>
          </h4>
          <ul className="list-group list-group-flush mb-3">
            {cart.map((item) => (
              <li
                key={item.itemId}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <span className="fw-bold">{item.name}</span> -{' '}
                  {ethers.formatEther(item.totalPrice)} ETH
                </div>
                <Button
                  onClick={() => removeFromCart(item.itemId)}
                  variant="outline-danger"
                  size="sm"
                >
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
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
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
        </div>
      )}

      {/* NFT Cards grid */}
      {items.length > 0 ? (
        <>
          <h2 className="text-center mb-5 text-primary">
            Explore Our Digital Collection
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)', // 3 columns exactly
              gap: '20px',
              marginRight: cart.length > 0 ? '340px' : '0', // leave space for cart
            }}
          >
            {items.map((item) => (
              <Card key={item.itemId} className="h-100 shadow-sm border-0">
                <Card.Img
                  variant="top"
                  src={item.image}
                  style={{ height: '150px', objectFit: 'cover' }}
                />
                <Card.Body className="d-flex flex-column">
                  <Card.Title className="text-truncate mb-1">{item.name}</Card.Title>
                  <Card.Text className="text-muted flex-grow-1" style={{ fontSize: '0.9rem' }}>
                    {item.description.length > 70
                      ? item.description.substring(0, 67) + '...'
                      : item.description}
                  </Card.Text>
                  <div className="mt-auto pt-2 border-top">
                    <p className="fw-bold fs-5 text-success mb-2">
                      {ethers.formatEther(item.totalPrice)} ETH
                    </p>
                    <div className="d-flex flex-column gap-2">
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
                      <Button
                        onClick={() => buySingleItem(item)}
                        variant="success"
                        className="w-100 d-flex align-items-center justify-content-center"
                        disabled={processingCheckout}
                      >
                        <i className="bi bi-cash-coin me-2"></i> Buy Now
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <main className="text-center py-5">
          <h2 className="text-muted">No NFTs are currently listed for sale. Check back soon!</h2>
          <p className="mt-3">
            Consider{' '}
            <a href="/create" className="text-decoration-none">
              creating your own NFT
            </a>{' '}
            to list!
          </p>
        </main>
      )}
    </Container>
  )
}

export default Home
