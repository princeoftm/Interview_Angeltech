import { useState } from "react";
import { Row, Form, Button, Card, Col } from "react-bootstrap";
import axios from "axios";
const { ethers } = require("ethers");

const Create = ({ marketplace, nft }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [price, setPrice] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const pinataJWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyMDAyZTUxYS0yMjdmLTRlOTctOTcxZC0xODg1ODc4MDM4NWYiLCJlbWFpbCI6InJhb2FuaXJ1ZGRoOTJAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjZlMjE4Y2I0MWFjYTI5ZjAxZTY1Iiwic2NvcGVkS2V5U2VjcmV0IjoiZjZmM2MzYzZhZjA1NGZjZDM0MTgyMGYyMmM4NGQ5OTQ4NWM4ZGEzMTc0MDkyOTZiNmYzNWM0MzdkMDIzMzk3YyIsImV4cCI6MTc3ODgyODkyM30.7jCwk1g0wE1NbW27YPRDAenQqBlIEUvwPoz-RoExAiQ";
const uploadToPinata = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pinataMetadata", JSON.stringify({ name: file.name }));

    try {
      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          maxBodyLength: "Infinity",
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${pinataJWT}`
          }
        }
      );
      return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } catch (error) {
      console.error("Pinata file upload error:", error.response?.data || error.message);
      throw error;
    }
  };

  const uploadJSONToPinata = async (jsonData) => {
    try {
      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        { pinataContent: jsonData },
        {
          headers: {
            Authorization: `Bearer ${pinataJWT}`
          }
        }
      );
      return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } catch (error) {
      console.error("Pinata JSON upload error:", error.response?.data || error.message);
      throw error;
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

const createNFT = async () => {
  if (creating) return; // Prevent double submission
  if (!image || !price || !name || !description) {
    alert("Please fill in all fields before creating the NFT.");
    return;
  }

  if (!nft || !marketplace) {
    alert("Smart contracts not connected.");
    return;
  }

  setCreating(true); // Start process

  try {
  const imageUrl = await uploadToPinata(image);
  const metadata = { name, description, image: imageUrl };
  const metadataUrl = await uploadJSONToPinata(metadata);

  await mintThenList(metadataUrl);

  alert("🎉 Your NFT has been successfully created and listed!");

  // Reset form
  setImage(null);
  setPreview(null);
  setPrice(null);
  setName("");
  setDescription("");

  const fileInput = document.getElementById("formFile");
  if (fileInput) fileInput.value = "";

} catch (error) {
  console.error("Error creating NFT:", error);
  alert("❌ NFT creation failed or was cancelled.");
} finally {
  setCreating(false);
}

};



  const mintThenList = async (tokenURI) => {
  try {
    console.log("Minting NFT to contract:", nft.address);
    const mintTx = await nft.mint(tokenURI);
    await mintTx.wait();

    const tokenId = await nft.tokenCount();
    console.log("✅ Minted Token ID:", tokenId.toString());

    console.log("Approving Marketplace:", "0xaeD63662d1Ba5138653eebE15C15eB19ec504b23");
    const approvalTx = await nft.setApprovalForAll("0xaeD63662d1Ba5138653eebE15C15eB19ec504b23", true);
    await approvalTx.wait();

    const listingPrice = ethers.parseEther(price.toString());
    console.log("Listing NFT at price:", listingPrice.toString());

    const expiry = 0; // no expiry for now
    const listTx = await marketplace.listItem("0x2B1d284Da0A32182861492a6B1Ec004469D228Db", tokenId, listingPrice, expiry);
    await listTx.wait();

    console.log("✅ NFT Listed!");
  } catch (error) {
    console.error("❌ mintThenList error:", error);
    // Re-throw the error so createNFT() can catch it
    throw error;
  }
};


  return (
    <div className="container mt-5">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card className="shadow-lg p-4">
            <Card.Body>
              <h2 className="text-center mb-4 text-primary">Create Your Digital Collectible</h2>
              <Row>
                <Col md={6} className="d-flex flex-column align-items-center justify-content-center">
                  <Form.Group controlId="formFile" className="mb-4 w-100">
                    <Form.Label className="d-block text-center">Upload NFT Image</Form.Label>
                    <Form.Control type="file" required onChange={handleImageUpload} />
                  </Form.Group>
                  {preview && (
                    <div className="mt-3 text-center w-100">
                      <Card className="mx-auto" style={{ maxWidth: '300px' }}>
                        <Card.Img variant="top" src={preview} alt="NFT Preview" style={{ maxHeight: "250px", objectFit: "contain" }} />
                        <Card.Body>
                          <Card.Text className="text-muted">Image Preview</Card.Text>
                        </Card.Body>
                      </Card>
                    </div>
                  )}
                </Col>
                <Col md={6}>
                  <Form>
                    <Form.Group className="mb-4">
                      <Form.Label>NFT Name</Form.Label>
                      <Form.Control
                        onChange={(e) => setName(e.target.value)}
                        size="lg"
                        required
                        type="text"
                        placeholder="e.g., 'Rare CryptoKitten'"
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        onChange={(e) => setDescription(e.target.value)}
                        size="lg"
                        required
                        as="textarea"
                        rows={5}
                        placeholder="Provide a detailed description of your NFT's unique features and story."
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Price (ETH)</Form.Label>
                      <Form.Control
                        onChange={(e) => setPrice(e.target.value)}
                        size="lg"
                        required
                        type="number"
                        placeholder="e.g., 0.1, 2.5"
                        step="0.001"
                      />
                    </Form.Group>

<div className="d-grid mt-5">
  {!creating && (
    <Button onClick={createNFT} variant="primary" size="lg">
      Mint & List NFT!
    </Button>
  )}
  {creating && (
    <Button variant="secondary" size="lg" disabled>
      Minting in Progress...
    </Button>
  )}
</div>

                  </Form>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Create;