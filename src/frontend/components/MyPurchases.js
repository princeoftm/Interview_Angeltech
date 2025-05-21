import { useState, useEffect } from 'react';
import { Card, Spinner, Alert, Button } from 'react-bootstrap';
const ethers = require("ethers");

// Helper function to convert IPFS or HTTP(S) to Pinata gateway URL
const ipfsToPinataGateway = (uri) => {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  }
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }
  return `https://gateway.pinata.cloud/ipfs/${uri}`;
};

export default function MyPurchases({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [error, setError] = useState('');

  const loadPurchasedItems = async () => {
    setLoading(true);
    setError('');
    try {
      if (!marketplace || !nft || !account) {
        setError("Marketplace, NFT contract, or wallet account not loaded. Please connect your wallet.");
        setLoading(false);
        return;
      }

      const filter = marketplace.filters.ItemPurchased(null, null, null, null, null, null);
      const results = await marketplace.queryFilter(filter);

      const myPurchases = results.filter(i => i.args.buyer.toLowerCase() === account.toLowerCase());

      const items = await Promise.all(myPurchases.map(async i => {
        try {
          const tokenURI = await nft.tokenURI(i.args.tokenId);
          const metadataUrl = ipfsToPinataGateway(tokenURI);

          const response = await fetch(metadataUrl);
          if (!response.ok) {
            console.warn(`Could not fetch metadata for tokenURI: ${tokenURI}. Status: ${response.status}`);
            return null;
          }
          const metadata = await response.json();

          const imageUrl = ipfsToPinataGateway(metadata.image);
          const totalPrice = await marketplace.getTotalPrice(i.args.itemId);

          return {
            totalPrice,
            price: i.args.price,
            itemId: i.args.itemId,
            name: metadata.name,
            description: metadata.description,
            image: imageUrl
          };
        } catch (innerError) {
          console.error(`Error processing purchased item ${i.args.itemId}:`, innerError);
          return null;
        }
      }));

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
  }, [marketplace, nft, account]);

  return (
    <div className="container mt-5">
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading your NFTs...</span>
          </Spinner>
          <h2 className="mt-3 text-muted">Loading your purchased NFTs...</h2>
        </div>
      ) : (
        <>
          {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

          <h1 className="text-center mb-4 fw-bold">My Purchased NFTs</h1>

          {purchases.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)', // 3 cards per row
                gap: '20px',
                paddingBottom: '2rem',
              }}
            >
              {purchases.map((item) => (
                <Card
                  key={item.itemId}
                  className="shadow-sm h-100 animate__animated animate__fadeInUp"
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <Card.Img
                    variant="top"
                    src={item.image}
                    alt={item.name}
                    style={{ height: '250px', objectFit: 'cover' }}
                  />
                  <Card.Body className="d-flex flex-column flex-grow-1">
                    <Card.Title className="fw-bold text-truncate mb-2">{item.name}</Card.Title>
                    <Card.Text
                      className="text-muted"
                      style={{
                        fontSize: '0.9rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        flexGrow: 1,
                      }}
                    >
                      {item.description}
                    </Card.Text>
                  </Card.Body>
                  <Card.Footer className="bg-white border-top-0 pt-0">
                    <div className="text-center mb-2">
                      <small className="text-muted">Purchased for</small>
                      <p className="fs-5 fw-bold text-success mb-0">{ethers.formatEther(item.totalPrice)} ETH</p>
                    </div>
                    <div className="d-grid">
                      <Button
                        variant="outline-primary"
                        onClick={() => alert(`Viewing item ${item.name} details`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </Card.Footer>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center my-5 p-4 border rounded bg-light">
              <p className="lead mb-0 text-muted">You haven't purchased any NFTs yet.</p>
              <p className="text-muted">
                Explore the <a href="/" className="text-decoration-none">marketplace</a> to find your first digital collectible!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
