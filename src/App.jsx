import React, { useState, useEffect } from "react";
import Desktop from "./components/Desktop";
import Taskbar from "./components/Taskbar";
import BootScreen from "./components/BootScreen";
import { BootDataProvider } from "./context/BootDataContext";
import { ethers } from "ethers";
import { getEthProvider } from "./utils/rpc";
import { loadAllProfiles } from "./utils/profileService";

const CONTRACT_ADDRESS = "0x13e2a004ea4c77412c9806daadafd09de65645a3";

function App() {
  const [account, setAccount] = useState(null);
  const [frogsHeld, setFrogsHeld] = useState(0);
  const [walletModal, setWalletModal] = useState(false);
  const [globalNfts, setGlobalNfts] = useState([]);
  const [globalLoreMap, setGlobalLoreMap] = useState({});
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        fetchNFTBalance(accounts[0]);
      }
    }
  };

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
        setWalletModal(false);
        fetchNFTBalance(accounts[0]);
      }
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setFrogsHeld(0);
  };

  const fetchNFTBalance = async (walletAddress) => {
    const rpcList = [
      "https://1rpc.io/eth",
      "https://eth-mainnet.public.blastapi.io",
      "https://ethereum.publicnode.com",
      "https://eth.llamarpc.com",
      "https://rpc.mevblocker.io",
    ];
    const network = ethers.Network.from(1);
    const contractABI = ["function balanceOf(address owner) view returns (uint256)"];
    for (const rpc of rpcList) {
      try {
        const provider = new ethers.JsonRpcProvider(rpc, network, { staticNetwork: network });
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
        const balance = await contract.balanceOf(walletAddress);
        setFrogsHeld(balance.toString());
        return;
      } catch (err) {
        console.warn(`RPC ${rpc} failed, trying next...`, err.code);
      }
    }
    console.error("All RPCs failed for balanceOf");
  };

  return (
    <>
      {!booted ? (
        <BootScreen onBootComplete={async (nfts, loreMap) => {
          setGlobalNfts(nfts);
          setGlobalLoreMap(loreMap || {});
          // Load all shared profiles from Supabase into cache
          await loadAllProfiles().catch(e => console.warn('Profile load failed:', e));
          setBooted(true);
        }} />
      ) : (
        <BootDataProvider nfts={globalNfts} loreMap={globalLoreMap} account={account}>
          <Desktop 
            account={account} 
            frogsHeld={frogsHeld} 
            connectWallet={connectWallet} 
            disconnectWallet={disconnectWallet}
            walletModal={walletModal}
            setWalletModal={setWalletModal}
            globalNfts={globalNfts}
          />
        </BootDataProvider>
      )}

      {walletModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
          <div className="window" style={{ width: 300 }}>
            <div className="title-bar">
              <div className="title-bar-text">Connect Wallet</div>
              <div className="title-bar-controls">
                <button aria-label="Close" onClick={() => setWalletModal(false)}></button>
              </div>
            </div>
            <div className="window-body text-center">
              <p className="mb-4">Select your wallet provider to continue.</p>
              <button className="w-full mb-2" onClick={connectWallet}>MetaMask</button>
              <button className="w-full" onClick={() => setWalletModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;