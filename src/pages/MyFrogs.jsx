import { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import NftViewer from '../components/NftViewer';
import { useBootData } from '../context/BootDataContext';
import { getEthProvider } from '../utils/rpc';

const CONTRACT_ADDRESS = "0x13e2a004ea4c77412c9806daadafd09de65645a3";

function MyFrogs({ account, isWindowed, openWindow, burnQueue = [], onAddToBurn }) {
  const { nfts: globalNfts } = useBootData();
  const [frogs, setFrogs] = useState([]);
  const [frogsHeld, setFrogsHeld] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Build a fast lookup map from globalNfts
  const nftMap = useMemo(() => {
    const map = {};
    globalNfts.forEach(nft => { map[nft.identifier] = nft; });
    return map;
  }, [globalNfts]);

  const fetchMyFrogs = async (walletAddress) => {
    setFrogs([]);
    setFrogsHeld(0);
    setError(null);
    setLoading(true);

    try {
      if (!ethers.isAddress(walletAddress)) throw new Error("Invalid address");

      // 1. Get balance from chain
      const provider = getEthProvider();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ["function balanceOf(address) view returns (uint256)"],
        provider
      );
      const balance = await contract.balanceOf(walletAddress);
      const balanceNum = Number(balance);
      setFrogsHeld(balanceNum);

      if (balanceNum === 0) {
        setLoading(false);
        return;
      }

      // 2. Get token IDs from Etherscan
      let tokenIds = [];
      try {
        const ETHERSCAN_API_KEY = "3ZWTT1H97TJ1H6R6VM1YT8IPTFU4MMHYZ1";
        const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokennfttx&contractaddress=${CONTRACT_ADDRESS}&address=${walletAddress}&page=1&offset=10000&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        let tokenIdsSet = new Set();
        if (data.status === "1" && data.result) {
          data.result.forEach(tx => {
            if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
              tokenIdsSet.add(tx.tokenID);
            } else if (tx.from.toLowerCase() === walletAddress.toLowerCase()) {
              tokenIdsSet.delete(tx.tokenID);
            }
          });
        }
        tokenIds = Array.from(tokenIdsSet).slice(0, balanceNum).sort((a, b) => Number(a) - Number(b));
      } catch (err) {
        console.error("Etherscan API fetch failed:", err);
      }

      // 3. Look up NFTs from preloaded boot cache (instant!)
      if (tokenIds.length > 0) {
        const myNfts = tokenIds
          .map(id => nftMap[id])
          .filter(Boolean); // filter out any not found in cache
        setFrogs(myNfts);
      } else {
        setError(`Balance ${balanceNum} | Token scan unavailable`);
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error.shortMessage || error.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account) {
      fetchMyFrogs(account);
    } else {
      setError("No account connected!");
      setLoading(false);
    }
  }, [account]);

  if (loading) return (
    <div className={`h-full ${isWindowed ? '' : 'min-h-screen pt-24'} bg-[#c0c0c0] flex items-center justify-center`}>
      <div className="text-center font-bold text-lg">
        Loading My Frogs...
        <div className="mt-2"><div className="w-48 h-4 border-2 border-white border-r-gray-500 border-b-gray-500 bg-[#000080]" /></div>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-full overflow-hidden bg-[#c0c0c0] text-black ${isWindowed ? '' : 'pt-24'}`}>
      
      {/* File System Address Bar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-400 bg-[#c0c0c0]">
        <span className="text-sm font-semibold">Address:</span>
        <div className="flex-1 bg-white border border-gray-500 border-r-white border-b-white px-2 py-1 text-sm text-gray-700">
          C:\My Computer\My Bad Frogs
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-2 sunken-panel m-2 bg-white">
        <div className="mx-auto p-4 flex flex-wrap gap-4">
          
          {error && (
            <div className="w-full bg-red-100 border-2 border-red-400 text-red-800 px-6 py-4 rounded-xl mb-4 font-semibold text-sm">
              ⚠️ {error} <button onClick={() => fetchMyFrogs(account)} className="ml-2 underline">Refresh</button>
            </div>
          )}

          {/* Filter out frogs currently staged in the Burn Bin */}
          {frogs.filter(nft => !burnQueue.find(b => b.identifier === nft.identifier)).length > 0 ? (
            frogs
              .filter(nft => !burnQueue.find(b => b.identifier === nft.identifier))
              .map((nft) => (
              <div
                key={nft.identifier}
                onClick={() => openWindow(`nft_${nft.identifier}`, `#${nft.identifier}.jpg`, <NftViewer nft={nft} isEditable={true} openWindow={openWindow} />)}
                className="flex flex-col items-center justify-start w-[150px] p-2 cursor-pointer group"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", JSON.stringify({ id: nft.identifier, displayId: nft.identifier, action: 'burn', nft: nft }));
                }}
                title="Drag to Burn Bin to stage for destruction"
              >
                <div className="w-32 h-32 mb-1 border-2 border-gray-500 border-r-white border-b-white bg-white flex items-center justify-center p-1 pointer-events-none drop-shadow-md">
                  <img src={nft.image_url} className="w-full h-full object-cover" />
                </div>
                <div className="text-xs text-center border-transparent border border-dotted px-1 group-active:bg-[#000080] group-active:text-white group-active:border-white">
                  #{nft.identifier}.jpg
                </div>
              </div>
            ))
          ) : frogsHeld > 0 && frogs.length > 0 && frogs.every(nft => burnQueue.find(b => b.identifier === nft.identifier)) ? (
            <div className="w-full text-center p-8 bg-[#c0c0c0] border-2 border-white border-r-gray-500 border-b-gray-500">
              <p className="font-bold text-xl mb-2">All frogs are in the Burn Bin!</p>
              <p className="text-sm text-gray-600">Remove them from the Burn Bin to see them here again.</p>
            </div>
          ) : (
            <div className="w-full text-center p-8 bg-[#c0c0c0] border-2 border-white border-r-gray-500 border-b-gray-500">
              <p className="font-bold text-xl mb-4">You don't own any Bad Frogs!</p>
              <button onClick={() => window.open('https://opensea.io/collection/badfrogs', '_blank')} className="px-4 py-2 border-2 active:border-white">Buy a Frog</button>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

export default MyFrogs;
