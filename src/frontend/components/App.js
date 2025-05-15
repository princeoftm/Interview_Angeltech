import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Navigation from './Navbar';
import Home from './Home.js';
import Create from './Create.js';
import MyListedItems from './MyListedItems.js';
import MyPurchases from './MyPurchases.js';

import MarketplaceAbi from './ABI/Marketplace.json';
import MarketplaceAddress from './Address/Marketplace-address.json';
import NFTAbi from './ABI/NFT.json';
import NFTAddress from './Address/NFT-address.json';


import { useState } from 'react';
import { Spinner } from 'react-bootstrap';

import './App.css';

import { ethers } from "ethers";

function App() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [nft, setNFT] = useState(null);
  const [marketplace, setMarketplace] = useState(null);

  // MetaMask Login/Connect
  const web3Handler = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);

      // ethers v6: use BrowserProvider
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Handle network/account changes
      window.ethereum.on('chainChanged', () => window.location.reload());

      window.ethereum.on('accountsChanged', async (accounts) => {
        setAccount(accounts[0]);
        await web3Handler();
      });

      await loadContracts(signer);
    } catch (error) {
      console.error("Error connecting to MetaMask", error);
      setLoading(false);
    }
  };

  const loadContracts = async (signer) => {
    // Instantiate contracts with signer
    const marketplaceContract = new ethers.Contract(MarketplaceAddress.address, MarketplaceAbi.abi, signer);
    setMarketplace(marketplaceContract);

    const nftContract = new ethers.Contract(NFTAddress.address, NFTAbi.abi, signer);
    setNFT(nftContract);

    setLoading(false);
  };

  return (
    <BrowserRouter>
      <div className="App">
        <Navigation web3Handler={web3Handler} account={account} />
        <div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
              <Spinner animation="border" style={{ display: 'flex' }} />
              <p className='mx-3 my-0'>Awaiting Metamask Connection...</p>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Home marketplace={marketplace} nft={nft} />} />
              <Route path="/create" element={<Create marketplace={marketplace} nft={nft} />} />
              <Route path="/my-listed-items" element={<MyListedItems marketplace={marketplace} nft={nft} account={account} />} />
              <Route path="/my-purchases" element={<MyPurchases marketplace={marketplace} nft={nft} account={account} />} />
            </Routes>
          )}
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
