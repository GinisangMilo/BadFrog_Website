import { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import { useBootData } from "../context/BootDataContext";
import { getEthProvider } from "../utils/rpc";

const CONTRACT_ADDRESS = "0x13e2a004ea4c77412c9806daadafd09de65645a3";

export default function NftTransfer({ account, openWindow }) {
  const { nfts: globalNfts } = useBootData();
  const [frogs, setFrogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [recipient, setRecipient] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [confirmMode, setConfirmMode] = useState(false);
  const [txStatus, setTxStatus] = useState(""); // progress text

  const nftMap = useMemo(() => {
    const map = {};
    globalNfts.forEach(nft => { map[nft.identifier] = nft; });
    return map;
  }, [globalNfts]);

  const fetchMyFrogs = async (walletAddress) => {
    setFrogs([]);
    setError(null);
    setLoading(true);

    try {
      if (!ethers.isAddress(walletAddress)) throw new Error("Invalid address");

      const provider = getEthProvider();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ["function balanceOf(address) view returns (uint256)"],
        provider
      );
      const balance = await contract.balanceOf(walletAddress);
      const balanceNum = Number(balance);

      if (balanceNum === 0) {
        setLoading(false);
        return;
      }

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

      if (tokenIds.length > 0) {
        const myNfts = tokenIds.map(id => nftMap[id]).filter(Boolean);
        setFrogs(myNfts);
      } else {
        setError("Could not load your NFTs.");
      }
    } catch (error) {
      setError(error.shortMessage || error.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account) fetchMyFrogs(account);
    else { setError("Connect your wallet first!"); setLoading(false); }
  }, [account]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === frogs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(frogs.map(f => f.identifier)));
    }
  };

  const isValidRecipient = recipient && ethers.isAddress(recipient) && recipient.toLowerCase() !== account?.toLowerCase();

  const executeTransfer = async () => {
    if (!window.ethereum) return alert("No wallet detected!");
    if (!isValidRecipient) return alert("Invalid recipient address.");
    if (selected.size === 0) return alert("Select at least one NFT.");

    setTransferring(true);
    setTxStatus("Preparing transactions...");

    try {
      // ── Switch wallet to Ethereum Mainnet (NFTs live here, not Base) ──
      setTxStatus("Switching to Ethereum Mainnet...");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x1" }],
        });
      } catch (switchErr) {
        throw new Error("Please switch your wallet to Ethereum Mainnet to transfer NFTs.");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      console.log("Transfer from:", signerAddress, "to:", recipient);

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        [
          "function safeTransferFrom(address from, address to, uint256 tokenId)",
          "function transferFrom(address from, address to, uint256 tokenId)",
        ],
        signer
      );

      const ids = Array.from(selected);
      for (let i = 0; i < ids.length; i++) {
        setTxStatus(`Transferring ${i + 1}/${ids.length} — #${ids[i]}...`);
        try {
          const tx = await contract.safeTransferFrom(signerAddress, recipient, ids[i]);
          await tx.wait();
        } catch (safeErr) {
          // Fallback to transferFrom if safeTransferFrom fails
          console.warn("safeTransferFrom failed, trying transferFrom:", safeErr.message);
          const tx = await contract.transferFrom(signerAddress, recipient, ids[i]);
          await tx.wait();
        }
      }

      setTxStatus("");
      setTransferring(false);
      setConfirmMode(false);
      setSelected(new Set());
      setRecipient("");
      alert(`Successfully transferred ${ids.length} NFT(s)!`);
      fetchMyFrogs(account);
    } catch (err) {
      console.error(err);
      setTransferring(false);
      setTxStatus("");
      alert("Transfer failed: " + (err.shortMessage || err.message));
    }
  };

  // ── Confirmation overlay ──
  if (confirmMode) {
    const selectedFrogs = frogs.filter(f => selected.has(f.identifier));
    return (
      <div className="flex flex-col h-full bg-[#c0c0c0] font-sans overflow-hidden">
        <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-400 bg-[#c0c0c0]">
          <span className="text-sm font-semibold">Confirm Transfer</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-4 items-start mb-4">
            <span className="text-4xl">⚠️</span>
            <div>
              <p className="font-bold text-sm mb-1">
                You are about to transfer {selected.size} NFT(s) to:
              </p>
              <p className="text-xs font-mono bg-white border border-gray-500 px-2 py-1 break-all">
                {recipient}
              </p>
            </div>
          </div>

          <div className="border-[2px] bg-white p-2 mb-4" style={{ boxShadow: 'inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey' }}>
            <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
              {selectedFrogs.map(nft => (
                <div key={nft.identifier} className="flex flex-col items-center w-16">
                  <img src={nft.image_url} className="w-14 h-14 object-cover border border-gray-400" />
                  <span className="text-[9px] text-center mt-0.5">#{nft.identifier}</span>
                </div>
              ))}
            </div>
          </div>

          {txStatus && (
            <div className="mb-4 border-[2px] bg-[#ffffcc] p-2 text-xs font-bold text-center animate-pulse" style={{ boxShadow: 'inset -1px -1px #fff, inset 1px 1px #0a0a0a' }}>
              {txStatus}
            </div>
          )}

          <p className="text-[10px] text-red-700 font-bold text-center mb-4">
            ⚠ This action is irreversible. Make sure the recipient address is correct.
          </p>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => { setConfirmMode(false); setTxStatus(""); }}
              disabled={transferring}
              className="px-6 py-2 text-xs border-[2px] bg-[#c0c0c0] font-bold active:pt-1 active:-mb-1 select-none disabled:opacity-50"
              style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}
            >
              Cancel
            </button>
            <button
              onClick={executeTransfer}
              disabled={transferring}
              className="px-6 py-2 text-xs border-[2px] bg-[#c0c0c0] font-bold active:pt-1 active:-mb-1 select-none disabled:opacity-50"
              style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}
            >
              {transferring ? "Transferring..." : "Confirm Transfer"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ──
  return (
    <div className="flex flex-col h-full bg-[#c0c0c0] font-sans overflow-hidden">

      {/* Address bar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-400 bg-[#c0c0c0]">
        <span className="text-sm font-semibold">Address:</span>
        <div className="flex-1 bg-white border border-gray-500 border-r-white border-b-white px-2 py-1 text-sm text-gray-700">
          C:\My Computer\Network Neighborhood\NFT Transfer
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-400 bg-[#c0c0c0] flex-wrap">
        <button
          onClick={selectAll}
          className="px-3 py-1 text-xs border-[2px] bg-[#dfdfdf] active:pt-1 active:-mb-1 select-none"
          style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}
        >
          {selected.size === frogs.length && frogs.length > 0 ? "Deselect All" : "Select All"}
        </button>
        <span className="text-xs text-gray-600">
          {selected.size} of {frogs.length} selected
        </span>
        <div className="flex-1" />
        <span className="text-[10px] font-bold uppercase text-gray-500 mr-1">To:</span>
        <input
          type="text"
          placeholder="0x... recipient address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-[280px] bg-white border text-xs px-2 py-1 font-mono outline-none"
          style={{ boxShadow: 'inset -1px -1px #dfdfdf, inset 1px 1px #0a0a0a' }}
        />
        <button
          onClick={() => setConfirmMode(true)}
          disabled={selected.size === 0 || !isValidRecipient}
          className="px-4 py-1 text-xs border-[2px] bg-[#dfdfdf] font-bold active:pt-1 active:-mb-1 select-none disabled:opacity-40"
          style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}
        >
          Transfer →
        </button>
      </div>

      {/* Validation hint */}
      {recipient && !isValidRecipient && (
        <div className="px-3 py-1 text-[10px] text-red-700 bg-red-50 border-b border-red-200">
          {recipient.toLowerCase() === account?.toLowerCase()
            ? "⚠ Cannot transfer to your own wallet"
            : "⚠ Invalid Ethereum address"}
        </div>
      )}

      {/* NFT grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-2 sunken-panel m-2 bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center font-bold text-sm">
              Loading your NFTs...
              <div className="mt-2">
                <div className="w-48 h-4 border-2 border-white border-r-gray-500 border-b-gray-500 bg-[#000080]" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-red-100 border-2 border-red-400 text-red-800 px-6 py-4 font-semibold text-sm">
              ⚠️ {error}
            </div>
          </div>
        ) : frogs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <p className="font-bold text-lg mb-2">No NFTs found</p>
              <p className="text-sm text-gray-600">You don't own any Bad Frogs to transfer.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 p-2">
            {frogs.map(nft => {
              const isSelected = selected.has(nft.identifier);
              return (
                <div
                  key={nft.identifier}
                  onClick={() => toggleSelect(nft.identifier)}
                  className={`flex flex-col items-center justify-start w-[120px] p-2 cursor-pointer group transition-all duration-100
                    ${isSelected
                      ? 'bg-[#000080] text-white border-2 border-dotted border-white'
                      : 'border-2 border-transparent hover:bg-[#dfdfdf]'
                    }`}
                >
                  <div className={`w-24 h-24 mb-1 border-2 ${isSelected ? 'border-white' : 'border-gray-400 border-r-white border-b-white'} bg-white flex items-center justify-center p-0.5`}>
                    <img src={nft.image_url} className="w-full h-full object-cover" alt={`#${nft.identifier}`} />
                  </div>
                  <div className={`text-[10px] text-center px-1 font-bold ${isSelected ? 'text-white' : 'text-black'}`}>
                    #{nft.identifier}
                  </div>
                  {isSelected && (
                    <div className="text-[8px] uppercase tracking-wider mt-0.5 text-yellow-300 font-bold">
                      ✓ Selected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 px-2 py-1 border-t border-white bg-[#c0c0c0] text-[10px] text-gray-600">
        <div className="border border-gray-500 border-r-white border-b-white px-2 py-0.5 flex-1">
          {frogs.length} object(s) — {selected.size} selected
        </div>
        <div className="border border-gray-500 border-r-white border-b-white px-2 py-0.5">
          Network Neighborhood
        </div>
      </div>
    </div>
  );
}
