import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LORE_ABI, BASE_CHAIN_ID } from '../contracts/DeployConfig';
import Profile from '../pages/Profile';
import { resolveDisplayName } from '../utils/displayName';
import { fetchProfile } from '../utils/profileService';
import { useBootData } from '../context/BootDataContext';

const LORE_CONTRACT_ADDRESS = "0xdfbd14ebb6743abc7a87b77d3e55e29bd5a48289";

export default function NftViewer({ nft, isEditable, openWindow }) {
  const { loreMap, account } = useBootData();
  const [loreEntries, setLoreEntries] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [loadingLore, setLoadingLore] = useState(true);
  const [ownerAddress, setOwnerAddress] = useState(null);
  const [ownerDisplayName, setOwnerDisplayName] = useState(null);

  const BAD_FROGS_CONTRACT_ADDRESS = "0x13e2a004ea4c77412c9806daadafd09de65645a3";

  useEffect(() => {
    fetchSessionsAndLore();
  }, [nft.identifier, loreMap, account]);

  const fetchSessionsAndLore = async () => {
    setLoadingLore(true);
    setOwnerAddress(null);

    try {
      const tid = nft.identifier;

      // ── Step 1: Get current owner (single ownerOf call, no log scanning) ──
      const ethRpcList = [
        "https://ethereum.publicnode.com",
        "https://1rpc.io/eth",
        "https://eth-mainnet.public.blastapi.io",
        "https://eth.llamarpc.com",
      ];

      let trueOwner = null;
      for (const rpc of ethRpcList) {
        try {
          const provider = new ethers.JsonRpcProvider(rpc, 1, { staticNetwork: true });
          const contract = new ethers.Contract(
            BAD_FROGS_CONTRACT_ADDRESS,
            ["function ownerOf(uint256) view returns (address)"],
            provider
          );
          trueOwner = (await contract.ownerOf(tid)).toLowerCase();
          break;
        } catch (e) { console.warn(`RPC ${rpc} failed for ownerOf`); }
      }

      if (!trueOwner) throw new Error("Could not determine owner.");

      setOwnerAddress(trueOwner);
      // Resolve owner name: try Supabase first, then cache/localStorage
      const ownerProfile = await fetchProfile(trueOwner);
      setOwnerDisplayName(
        ownerProfile?.name || resolveDisplayName(trueOwner).name
      );

      // ── Step 2: Live query Base chain for lore entries ──
      const loreEntries = [];
      try {
        const baseProvider = new ethers.JsonRpcProvider("https://mainnet.base.org");
        const loreContract = new ethers.Contract(LORE_CONTRACT_ADDRESS, LORE_ABI, baseProvider);
        const LORE_DEPLOY_BLOCK = 44250000;
        const baseBlock = await baseProvider.getBlockNumber();
        const BASE_CHUNK = 2000;

        let allLoreEvents = [];
        for (let from = LORE_DEPLOY_BLOCK; from <= baseBlock; from += BASE_CHUNK) {
          const to = Math.min(from + BASE_CHUNK - 1, baseBlock);
          try {
            const events = await loreContract.queryFilter(
              loreContract.filters.LoreUpdated(tid), from, to
            );
            allLoreEvents.push(...events);
          } catch (e) { /* skip failed chunk */ }
        }

        // Build entries with timestamps
        for (const evt of allLoreEvents) {
          let ts = Math.floor(Date.now() / 1000);
          try {
            const blk = await baseProvider.getBlock(evt.blockNumber);
            if (blk) ts = blk.timestamp;
          } catch (e) { /* use fallback ts */ }

          const writer = evt.args[1];
          // Resolve contributor name from Supabase
          const writerProfile = await fetchProfile(writer);
          loreEntries.push({
            writer,
            lore: evt.args[2],
            blockNumber: evt.blockNumber,
            timestamp: ts,
            displayName: writerProfile?.name || resolveDisplayName(writer).name,
            isCurrentSession: writer.toLowerCase() === trueOwner,
          });
        }

        loreEntries.sort((a, b) => a.timestamp - b.timestamp);
      } catch (e) {
        console.warn("Base lore query failed, falling back to cache:", e);
        // Fallback to boot cache
        const cached = nft._loreHistory || loreMap[String(tid)] || [];
        for (const h of cached) {
          const wp = await fetchProfile(h.writer);
          loreEntries.push({
            ...h,
            displayName: wp?.name || resolveDisplayName(h.writer).name,
            isCurrentSession: h.writer.toLowerCase() === trueOwner,
          });
        }
      }

      setLoreEntries(loreEntries);
    } catch (err) {
      console.error("Lore fetch failed:", err);
      // Last resort fallback
      try {
        const prov = new ethers.JsonRpcProvider("https://ethereum.publicnode.com", 1, { staticNetwork: true });
        const contract = new ethers.Contract(BAD_FROGS_CONTRACT_ADDRESS, ["function ownerOf(uint256) view returns (address)"], prov);
        const owner = await contract.ownerOf(nft.identifier);
        setOwnerAddress(owner.toLowerCase());
        setOwnerDisplayName(resolveDisplayName(owner).name);
      } catch (e) { }
    } finally {
      setLoadingLore(false);
    }
  };

  const currentAccount = account?.toLowerCase();
  const isCurrentOwner = currentAccount && ownerAddress &&
    currentAccount === ownerAddress.toLowerCase();

  const startEditing = () => {
    const myEntry = loreEntries.find(e => e.writer.toLowerCase() === currentAccount && e.isCurrentSession);
    setEditText(myEntry?.lore || "");
    setEditing(true);
  };

  const saveLore = async () => {
    if (!window.ethereum) return alert("Wallet required!");

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID }],
      }).catch(async (switchError) => {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_CHAIN_ID,
              chainName: 'Base Mainnet',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org/']
            }]
          });
        } else throw switchError;
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(LORE_CONTRACT_ADDRESS, LORE_ABI, signer);

      const tx = await contract.setLore(nft.identifier, editText);
      await tx.wait();

      alert("Lore synced to Base chain!");
      setEditing(false);
      fetchSessionsAndLore();
    } catch (err) {
      console.error(err);
      alert("Sync failed: " + err.message);
    }
  };

  return (
    <div className="flex h-full bg-[#c0c0c0] p-4 gap-6 font-sans">
      <div className="w-1/2 flex flex-col items-center justify-center border-[2px]" style={{ boxShadow: 'inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a, inset -1px -1px grey, inset 1px 1px #fff' }}>
        <img src={nft.image_url} alt={`Bad Frog ${nft.identifier}`} className="w-full h-full object-cover p-1 bg-white" />
      </div>

      <div className="w-1/2 flex flex-col h-full overflow-y-auto pr-2">
        <div className="border-b border-gray-400 pb-2 mb-4 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold font-sans">#{nft.identifier}</h2>
            {ownerAddress && (
              <div
                className="text-[10px] text-gray-600 mt-1 font-bold cursor-pointer hover:underline"
                title={ownerAddress}
                onClick={() => openWindow && openWindow(
                  `profile_${ownerAddress}`,
                  `${ownerDisplayName || ownerAddress.slice(0, 6) + '...' + ownerAddress.slice(-4)} - Profile`,
                  <Profile account={ownerAddress} isWindowed={true} openWindow={openWindow} />
                )}
              >
                Owned by:&nbsp;
                <span className="text-[#000080] uppercase">
                  {ownerDisplayName || `${ownerAddress.slice(0, 6)}...${ownerAddress.slice(-4)}`}
                </span>
              </div>
            )}
          </div>
          <button onClick={() => window.open(`https://opensea.io/assets/ethereum/0x13e2a004ea4c77412c9806daadafd09de65645a3/${nft.identifier}`, '_blank')} className="px-3 py-1 text-xs border-[2px] active:pt-1 active:-mb-1" style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}>
            OpenSea
          </button>
        </div>

        <h3 className="font-bold mb-2 uppercase text-xs tracking-widest text-[#000080]">Traits</h3>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {nft.traits?.map((t, i) => (
            <div key={i} className="border-[2px] p-2 bg-[#dfdfdf]" style={{ boxShadow: 'inset -1px -1px #cfcfcfff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey' }}>
              <div className="text-[9px] uppercase font-bold text-gray-600 leading-tight mb-1">{t.trait_type}</div>
              <div className="text-xs font-bold leading-tight truncate" title={t.value}>{t.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold uppercase text-xs tracking-widest text-[#000080]">Story and Lore:</h3>
          {isCurrentOwner && !editing && (
            <button
              onClick={startEditing}
              className="px-2 py-1 text-xs border-[2px] active:pt-1 active:-mb-1 select-none"
              style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}
            >
              {loreEntries.some(e => e.writer.toLowerCase() === currentAccount && e.isCurrentSession) ? 'Edit Lore' : 'Add Lore'}
            </button>
          )}
        </div>

        <div className="flex-1 min-h-[150px] flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
          {loadingLore ? (
            <div className="border-[2px] bg-white p-3 text-sm italic text-gray-400" style={{ boxShadow: 'inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey' }}>
              Checking wether or not theres a lore here...
            </div>
          ) : (
            <>
              {/* Lore Entries */}
              {loreEntries.map((entry, i) => {
                // Hide the entry being edited to avoid redundancy
                if (editing && entry.writer.toLowerCase() === currentAccount && entry.isCurrentSession) return null;

                return (
                  <div
                    key={i}
                    className={`border-[2px] bg-white p-3 shadow-md relative ${entry.isCurrentSession ? 'border-[#000080]' : 'border-gray-400 opacity-90'}`}
                    style={{ boxShadow: entry.isCurrentSession ? 'inset -1px -1px #fff, inset 1px 1px #000080' : 'inset -1px -1px #fff, inset 1px 1px #0a0a0a' }}
                  >
                    {/* Lore Text */}
                    <div className="text-xs text-black leading-relaxed whitespace-pre-wrap mb-4 font-sans">
                      {entry.lore}
                    </div>

                    {/* Metadata Footer: Author Left, Date Right */}
                    <div className="flex justify-between items-end border-t border-gray-100 pt-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-gray-400 uppercase tracking-tighter mb-0.5">Contributor</span>
                        <span
                          className="text-[10px] font-bold text-[#000080] hover:underline cursor-pointer"
                          onClick={() => openWindow(
                            `profile_${entry.writer}`,
                            `${entry.displayName || entry.writer.slice(0, 6) + '...' + entry.writer.slice(-4)} - Profile`,
                            <Profile account={entry.writer} isWindowed={true} openWindow={openWindow} />
                          )}
                        >
                          {entry.displayName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-gray-500 font-mono italic">
                          {new Date(entry.timestamp * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Editor for current session holder */}
              {editing && (
                <div className="border-[2px] bg-[#dfdfdf] p-3 shadow-md" style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}>
                  <div className="flex justify-between items-center mb-2 border-b border-gray-400 pb-1">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-[#000080] uppercase tracking-tighter mb-0.5">Contributor</span>
                      <span className="text-[10px] font-bold text-[#000080] uppercase">
                        ✍️ {ownerDisplayName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] text-gray-500 uppercase tracking-tighter block mb-0.5">Status</span>
                      <span className="text-[9px] text-red-600 font-bold uppercase animate-pulse">Writing...</span>
                    </div>
                  </div>

                  <textarea
                    className="w-full min-h-[140px] resize-none outline-none font-sans text-sm p-2 bg-white border-none"
                    style={{ boxShadow: 'inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a, inset -1px -1px grey, inset 1px 1px #fff' }}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="Describe how this Bad Frog came to be..."
                    autoFocus
                  />

                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-1 text-xs border-[2px] bg-[#dfdfdf] active:pt-1 active:-mb-1 select-none"
                      style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveLore}
                      disabled={!editText.trim()}
                      className="px-4 py-1 text-xs border-[2px] bg-[#dfdfdf] font-bold active:pt-1 active:-mb-1 select-none disabled:opacity-50"
                      style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {loreEntries.length === 0 && !editing && (
                <div
                  className="border-[2px] bg-white p-8 text-center flex flex-col items-center justify-center gap-4"
                  style={{ boxShadow: 'inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey' }}
                >
                  <p className="text-xs text-gray-500 font-sans leading-relaxed max-w-[200px] mx-auto italic">
                    "This Bad Frog is so bad it currently have no lore yet. Buy it and be the first to give it a story."
                  </p>
                  {isCurrentOwner && (
                    <button
                      onClick={startEditing}
                      className="px-6 py-2 text-[10px] bg-[#dfdfdf] border-[2px] font-bold active:pt-1 active:-mb-1 select-none"
                      style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}
                    >
                      ADD LORE HERE
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
