import { useState } from "react";
import { Row, Form, Button } from "react-bootstrap";
import axios from "axios";
const { ethers } = require("ethers");

const Create = ({ marketplace, nft }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [price, setPrice] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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
    if (!image || !price || !name || !description) {
      console.error("Missing required fields.");
      return;
    }

    if (!nft || !marketplace) {
      console.error("Contract not loaded.");
      return;
    }

    try {
      const imageUrl = await uploadToPinata(image);
      console.log("✅ Uploaded image:", imageUrl);

      const metadata = { name, description, image: imageUrl };
      const metadataUrl = await uploadJSONToPinata(metadata);
      console.log("✅ Uploaded metadata:", metadataUrl);

      await mintThenList(metadataUrl);
    } catch (error) {
      console.error("❌ Error creating NFT:", error);
    }
  };

  const mintThenList = async (tokenURI) => {
    try {
      console.log("Minting NFT to contract:", nft.address);
      const mintTx = await nft.mint(tokenURI);
      await mintTx.wait();

      const tokenId = await nft.tokenCount();
      console.log("✅ Minted Token ID:", tokenId.toString());

      console.log("Approving Marketplace:", "0xC2524608FeCC93128bBB4DfE9B9bb80557f96eB8");
      const approvalTx = await nft.setApprovalForAll("0xC2524608FeCC93128bBB4DfE9B9bb80557f96eB8", true);
      await approvalTx.wait();

      const listingPrice = ethers.parseEther(price.toString());
      console.log("Listing NFT at price:", listingPrice.toString());

      const listTx = await marketplace.makeItem("0x2B1d284Da0A32182861492a6B1Ec004469D228Db", tokenId, listingPrice);
      await listTx.wait();

      console.log("✅ NFT Listed!");
    } catch (error) {
      console.error("❌ mintThenList error:", error);
    }
  };

  return (
    <div className="container-fluid mt-5">
      <div className="row">
        <main className="col-lg-12 mx-auto" style={{ maxWidth: "1000px" }}>
          <div className="content mx-auto">
            <Row className="g-4">
              <Form.Control type="file" required onChange={handleImageUpload} />
              {preview && (
                <img src={preview} alt="Preview" className="mt-3" style={{ maxHeight: "200px" }} />
              )}
              <Form.Control
                onChange={(e) => setName(e.target.value)}
                size="lg"
                required
                type="text"
                placeholder="Name"
              />
              <Form.Control
                onChange={(e) => setDescription(e.target.value)}
                size="lg"
                required
                as="textarea"
                placeholder="Description"
              />
              <Form.Control
                onChange={(e) => setPrice(e.target.value)}
                size="lg"
                required
                type="number"
                placeholder="Price in ETH"
              />
              <div className="d-grid px-0">
                <Button onClick={createNFT} variant="primary" size="lg">
                  Create & List NFT!
                </Button>
              </div>
            </Row>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Create;
