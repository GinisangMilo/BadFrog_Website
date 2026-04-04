import React, { useState } from 'react';
import { ethers } from 'ethers';
import { LORE_ABI, LORE_BYTECODE, BASE_CHAIN_ID } from '../contracts/DeployConfig';

export default function DeployLoreContract() {
  const [deploying, setDeploying] = useState(false);
  const [contractAddress, setContractAddress] = useState(null);

  const switchToBaseMainnet = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID }], // 8453
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: BASE_CHAIN_ID,
              chainName: 'Base Mainnet',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org/'],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  };

  const handleDeploy = async () => {
    if (!window.ethereum) return alert("MetaMask not found!");
    try {
      setDeploying(true);
      await switchToBaseMainnet();
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const factory = new ethers.ContractFactory(LORE_ABI, LORE_BYTECODE, signer);
      const contract = await factory.deploy();
      
      alert("Deploying... Please wait for confirmation.");
      await contract.waitForDeployment();
      
      const addr = await contract.getAddress();
      setContractAddress(addr);
      setDeploying(false);
      
    } catch(err) {
      console.error(err);
      alert("Deploy failed: " + err.message);
      setDeploying(false);
    }
  };

  return (
    <div className="p-4 bg-[#c0c0c0] font-sans border-2 border-white border-r-gray-500 border-b-gray-500 max-w-[500px] m-4 shadow-lg absolute right-10 top-10 z-[100000]">
      <div className="bg-[#000080] text-white px-2 py-1 font-bold flex justify-between">
        <span>Admin Lore Registry Deployer.exe</span>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <p>You need to deploy the Relational Lore Registry to Base Mainnet.</p>
        <button 
          onClick={handleDeploy}
          disabled={deploying}
          className="bg-[#c0c0c0] border-2 border-white border-r-gray-500 border-b-gray-500 active:border-r-white active:border-b-white active:border-l-gray-500 active:border-t-gray-500 px-4 py-2 font-bold"
        >
          {deploying ? 'Deploying to Base...' : 'Deploy Smart Contract'}
        </button>
        
        {contractAddress && (
          <div className="bg-white border-2 border-l-gray-500 border-t-gray-500 border-r-white border-b-white p-2">
            <p className="font-bold text-green-600">Success!</p>
            <p className="text-xs break-all selectable">Add this to NftViewer.jsx:<br/>const LORE_CONTRACT = "{contractAddress}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
