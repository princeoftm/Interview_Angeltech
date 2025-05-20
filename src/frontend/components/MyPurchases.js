import { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Alert, Button } from 'react-bootstrap';
const ethers = require("ethers");

// Helper function to convert IPFS or HTTP(S) to Pinata gateway URL
const ipfsToPinataGateway = (uri) => {
  if (!uri) return null;
  // Handle various IPFS URI formats
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  }
  // If it's already an HTTP(s) URL, return as is
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }
  // Assume it's just a CID and construct the URL
  return `https://gateway.pinata.cloud/ipfs/${uri}`;
};

export default function MyPurchases({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [error, setError] = useState('');

  const loadPurchasedItems = async () => {
    setLoading(true);
    setError(''); // Clear previous errors
    try {
      if (!marketplace || !nft || !account) {
        setError("Marketplace, NFT contract, or wallet account not loaded. Please connect your wallet.");
        setLoading(false);
        return;
      }

      // Get all ItemPurchased events
      const filter = marketplace.filters.ItemPurchased(null, null, null, null, null, null); // Match all arguments for filtering
      const results = await marketplace.queryFilter(filter);

      // Filter for events where the buyer is the current account
      const myPurchases = results.filter(i => i.args.buyer.toLowerCase() === account.toLowerCase());

      const items = await Promise.all(myPurchases.map(async i => {
        try {
          const tokenURI = await nft.tokenURI(i.args.tokenId);
          const metadataUrl = ipfsToPinataGateway(tokenURI);

          const response = await fetch(metadataUrl);
          if (!response.ok) {
            console.warn(`Could not fetch metadata for tokenURI: ${tokenURI}. Status: ${response.status}`);
            return null; // Return null to filter out later
          }
          const metadata = await response.json();

          const imageUrl = ipfsToPinataGateway(metadata.image);
          const totalPrice = await marketplace.getTotalPrice(i.args.itemId);

          return {
            totalPrice,
            price: i.args.price, // Price paid without marketplace fee
            itemId: i.args.itemId,
            name: metadata.name,
            description: metadata.description,
            image: imageUrl
          };
        } catch (innerError) {
          console.error(`Error processing purchased item ${i.args.itemId}:`, innerError);
          return null; // Return null if there's an error with a specific item
        }
      }));

      // Filter out any null items that failed to load
      setPurchases(items.filter(item => item !== null));
    } catch (err) {
      console.error("Failed to load purchased items:", err);
      setError(`Error loading your purchased NFTs: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchasedItems();
  }, [marketplace, nft, account]); // Reload when marketplace, nft, or account changes

  return (
    <div className="container mt-5">
      {/* Loading State */}
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading your NFTs...</span>
          </Spinner>
          <h2 className="mt-3 text-muted">Loading your purchased NFTs...</h2>
        </div>
      ) : (
        <>
          {/* Error Message */}
          {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

          <h1 className="text-center mb-4 fw-bold">My Purchased NFTs</h1>

          {purchases.length > 0 ? (
            <Row xs={1} md={2} lg={3} xl={4} className="g-4 pb-5">
              {purchases.map((item, idx) => (
                <Col key={idx} className="d-flex align-items-stretch">
                  <Card className="shadow-sm h-100 animate__animated animate__fadeInUp">
                    <Card.Img
                      variant="top"
                      src={item.image}
                      alt={item.name}
                      style={{ height: '250px', objectFit: 'cover' }}
                    />
                    <Card.Body className="d-flex flex-column">
                      <Card.Title className="fw-bold text-truncate mb-2">{item.name}</Card.Title>
                      <Card.Text className="text-muted flex-grow-1" style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        {item.description}
                      </Card.Text>
                    </Card.Body>
                    <Card.Footer className="bg-white border-top-0 pt-0">
                      <div className="text-center mb-2">
                        <small className="text-muted">Purchased for</small>
                        <p className="fs-5 fw-bold text-success mb-0">{ethers.formatEther(item.totalPrice)} ETH</p>
                      </div>
                      <div className="d-grid">
                        <Button variant="outline-primary" onClick={() => alert(`Viewing item ${item.name} details`)}>
                          View Details
                        </Button>
                      </div>
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <div className="text-center my-5 p-4 border rounded bg-light">
              <p className="lead mb-0 text-muted">You haven't purchased any NFTs yet.</p>
              <p className="text-muted">Explore the <a href="/" className="text-decoration-none">marketplace</a> to find your first digital collectible!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}