import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import NftViewer from '../components/NftViewer';
import { useBootData } from '../context/BootDataContext';
import { getEthProvider } from '../utils/rpc';
import { fetchProfile, saveDisplayName, saveProfilePfp } from '../utils/profileService';
import { resolvePfp } from '../utils/displayName';

const CONTRACT_ADDRESS = "0x13e2a004ea4c77412c9806daadafd09de65645a3";

function Profile({ account: propAccount, isWindowed, openWindow }) {
  const params = useParams();
  const account = isWindowed ? propAccount : params.account;
  const { nfts: globalNfts } = useBootData();

  const [frogs, setFrogs] = useState([]);
  const [frogsHeld, setFrogsHeld] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingPfp, setEditingPfp] = useState(false);
  const [customPfp, setCustomPfp] = useState("");
  const [customName, setCustomName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [isSelf, setIsSelf] = useState(false);

  // Build a fast lookup map from globalNfts
  const nftMap = useMemo(() => {
    const map = {};
    globalNfts.forEach(nft => { map[nft.identifier] = nft; });
    return map;
  }, [globalNfts]);

  const fetchNFTs = async (walletAddress) => {
    setFrogs([]);
    setFrogsHeld(0);
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
      setFrogsHeld(balanceNum);

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

      // Look up NFTs from preloaded boot cache (instant!)
      if (tokenIds.length > 0) {
        const myNfts = tokenIds
          .map(id => nftMap[id])
          .filter(Boolean);
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
      fetchNFTs(account);

      // Load profile from Supabase (shared), fallback to localStorage
      // If localStorage has data but Supabase doesn't, auto-migrate it
      fetchProfile(account).then(async (profile) => {
        const localName =
          localStorage.getItem(`profile_name_${account.toLowerCase()}`) ||
          localStorage.getItem(`profile_name_${account}`) || '';
        const localPfp =
          localStorage.getItem(`profile_pfp_${account.toLowerCase()}`) ||
          localStorage.getItem(`profile_pfp_${account}`) || '';

        // Use Supabase data if it exists
        if (profile?.name) {
          setCustomName(profile.name);
        } else if (localName) {
          setCustomName(localName);
          // Auto-migrate: push localStorage name to Supabase so others can see it
          saveDisplayName(account, localName).then(r => {
            if (r.success) console.log('Migrated name to Supabase:', localName);
            else console.warn('Name migration failed:', r.error);
          });
        }

        if (profile?.pfp) {
          setCustomPfp(profile.pfp);
        } else if (localPfp) {
          setCustomPfp(localPfp);
          // Auto-migrate: push localStorage PFP to Supabase so others can see it
          saveProfilePfp(account, localPfp).then(r => {
            if (r.success) console.log('Migrated PFP to Supabase:', localPfp);
            else console.warn('PFP migration failed:', r.error);
          });
        }
      });

      // Check if this is the current user's own profile
      if (window.ethereum) {
        window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
          if (accounts.length > 0 && accounts[0].toLowerCase() === account.toLowerCase()) {
            setIsSelf(true);
          }
        });
      }
    } else {
      setError("No account connected!");
      setLoading(false);
    }
  }, [account]);

  const shortenAddress = (address) => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  const saveCustomName = async () => {
    if (!customName.trim() || !account) return;
    setSavingName(true);
    setNameError("");

    const result = await saveDisplayName(account, customName);

    if (result.success) {
      setEditingName(false);
      setNameSaved(true);
      setNameError("");
      setTimeout(() => setNameSaved(false), 2000);
    } else {
      setNameError(result.error || "Failed to save name");
    }
    setSavingName(false);
  };

  const handleSavePfp = async (url) => {
    const result = await saveProfilePfp(account, url);
    if (result.success) {
      setCustomPfp(url);
      setEditingPfp(false);
    } else {
      alert("Failed to save PFP: " + (result.error || "Unknown error"));
    }
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

  if (loading) return (
    <div className={`h-full ${isWindowed ? '' : 'min-h-screen pt-24'} bg-[#c0c0c0] flex items-center justify-center`}>
      <div className="text-center font-bold text-lg">
        Loading Profile...
        <div className="mt-2"><div className="w-48 h-4 border-2 border-white border-r-gray-500 border-b-gray-500 bg-[#000080]" /></div>
      </div>
    </div>
  );

  return (
    <div className={`h-full bg-[#c0c0c0] font-sans text-black p-4 overflow-y-auto`}>
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* DASHBOARD BLOCK */}
        <div className="p-4 flex flex-col md:flex-row items-center gap-6 bg-white border-[2px]" style={{ boxShadow: 'inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey' }}>
          <div className="flex flex-col items-center">
            <div
              className={`w-32 h-32 flex items-center justify-center bg-white border-[2px] relative ${isSelf ? 'cursor-pointer group' : ''}`}
              style={{ boxShadow: 'inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a, inset -1px -1px grey, inset 1px 1px #fff' }}
              onClick={() => isSelf && setEditingPfp(!editingPfp)}
            >
              {customPfp || (frogs.length > 0) ? (
                <img src={customPfp || frogs[0]?.image_url} alt="Profile Avatar" className="w-full h-full object-cover p-1" />
              ) : (
                <div className="text-gray-400 text-xs">No PFP</div>
              )}
              {isSelf && (
                <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white font-bold text-sm">
                  Edit PFP
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
              {editingName && isSelf ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <input
                      value={customName}
                      onChange={(e) => { setCustomName(e.target.value); setNameError(""); }}
                      placeholder="Display name..."
                      className="px-2 py-1 border-[2px]"
                      style={{ boxShadow: 'inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a, inset -1px -1px grey, inset 1px 1px #fff' }}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && saveCustomName()}
                    />
                    <button
                      onClick={saveCustomName}
                      disabled={!customName.trim() || savingName}
                      className="px-4 py-1 text-xs border-[2px] active:pt-1 active:-mb-1 disabled:opacity-50"
                    >
                      {savingName ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditingName(false); setNameError(""); }}
                      className="px-3 py-1 text-xs border-[2px] active:pt-1 active:-mb-1"
                    >
                      Cancel
                    </button>
                  </div>
                  {nameError && (
                    <div className="text-xs text-red-600 font-bold px-1">
                      ⚠️ {nameError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <h1 className="text-3xl font-extrabold">{customName || shortenAddress(account)}</h1>
                  {isSelf && (
                    <button onClick={() => setEditingName(true)} className="px-2 py-1 text-xs border-[2px] active:pt-1 active:-mb-1" style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}>Edit Name</button>
                  )}
                </div>
              )}
              {nameSaved && <div className="text-sm font-bold text-[#000080]">Name saved!</div>}
            </div>

            <div className="text-sm flex items-center">
              <span className="font-bold mr-2">Wallet:</span>
              <span className="bg-white px-2 py-1 border-[2px]" style={{ boxShadow: 'inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey' }}>{account || "Not Connected"}</span>
              <button onClick={() => copyToClipboard(account)} className="ml-2 px-3 py-1 text-xs border-[2px] active:pt-1 active:-mb-1" style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}>Copy</button>
            </div>
            
            <div className="inline-flex px-4 py-1 rounded-xl text-xs font-semibold bg-green-100 border-2 border-green-400 text-green-800">
              Ethereum Mainnet ✅
            </div>
          </div>
        </div>

        {editingPfp && isSelf && (
           <div className="p-4 bg-[#c0c0c0] border-[2px]" style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}>
             <p className="font-bold mb-2">Select a Frog to use as your Profile Picture:</p>
             <div className="flex gap-2 overflow-x-auto p-2">
               {frogs.map((nft) => (
                 <img key={nft.identifier} src={nft.image_url} onClick={() => handleSavePfp(nft.image_url)} className="w-16 h-16 cursor-pointer border-2 hover:border-black" />
               ))}
             </div>
           </div>
        )}

        <div className="p-2 border-[2px] bg-white flex justify-between" style={{ boxShadow: 'inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey' }}>
           <div className="flex flex-col">
            <span className="text-xl font-bold">Bad Frogs Owned: {frogsHeld || 0}</span>
            <span className="text-sm">{frogsHeld > 0 ? `${frogs.length} shown below` : `Loading...`}</span>
           </div>
        </div>

        {/* GALLERY GRID */}
        <div className="p-2 sunken-panel bg-[#dfdfdf]">
            {error && (
              <div className="bg-red-100 border-2 border-red-400 text-red-800 px-6 py-4 mb-4 font-semibold text-sm">
                ⚠️ {error} <button onClick={() => fetchNFTs(account)} className="ml-2 underline">Refresh</button>
              </div>
            )}

            {frogs.length > 0 ? (
              <div className="flex flex-wrap gap-4 p-2 justify-center">
                {frogs.map((nft) => (
                  <div
                    key={nft.identifier}
                    onClick={() => openWindow(`nft_${nft.identifier}`, `#${nft.identifier}.jpg`, <NftViewer nft={nft} isEditable={isSelf} openWindow={openWindow} />)}
                    className="flex flex-col items-center justify-start w-[150px] p-2 cursor-pointer group"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", JSON.stringify({ id: nft.identifier, displayId: nft.identifier, action: 'burn', nft: nft }));
                    }}
                  >
                    <div className="w-32 h-32 mb-2 border-[2px] bg-white flex items-center justify-center p-1 pointer-events-none drop-shadow-md" style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf' }}>
                      <img src={nft.image_url} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs font-bold text-center border-transparent border px-1 group-active:bg-[#000080] group-active:text-white group-active:border-white truncate w-full">
                      #{nft.identifier}.jpg
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8">
                {frogsHeld > 0 ? "Loading images..." : "No Bad Frogs found for this wallet."}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default Profile;