import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { getNFTs } from "../api";
import { multicallBatch } from "../utils/multicall";
import { LORE_ABI } from "../contracts/DeployConfig";

const LORE_CONTRACT_ADDRESS = "0xdfbd14ebb6743abc7a87b77d3e55e29bd5a48289";
const TOTAL_NFTS = 4444;

const PHASE_LABELS = {
  COLLECTION: "Loading NFT collection data",
  OWNERSHIP: "Mapping NFT ownership",
  LORE: "Loading lore registry from Base",
  DONE: "Boot complete",
};

export default function BootScreen({ onBootComplete }) {
  const [phase, setPhase] = useState("COLLECTION");
  const [progress, setProgress] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalForPhase, setTotalForPhase] = useState(TOTAL_NFTS);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState(["Initializing Bad Frogs OS v1744..."]);
  const fetchedRef = useRef(false);

  const addLog = (msg) => setLogs(prev => [...prev.slice(-10), msg]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    runBootSequence();
  }, []);

  const runBootSequence = async () => {
    try {
      // ═══════════════════════════════════════════
      // PHASE 1: Fetch all NFTs from OpenSea
      // ═══════════════════════════════════════════
      addLog("BIOS: Memory check... OK");
      addLog("PHASE 1/3: Mapping collection via OpenSea...");
      setPhase("COLLECTION");

      let completeCollection = [];
      let cursor = null;
      let isFetching = true;

      while (isFetching) {
        const res = await getNFTs(cursor, 200);
        completeCollection = [...completeCollection, ...res.nfts];
        const currentCount = completeCollection.length;
        setLoadedCount(currentCount);
        setProgress(Math.min(100, Math.floor((currentCount / TOTAL_NFTS) * 100)));

        if (res.nextCursor && currentCount < TOTAL_NFTS) {
          cursor = res.nextCursor;
        } else {
          isFetching = false;
        }
      }

      addLog(`Collection mapped: ${completeCollection.length} NFTs cached.`);

      // ═══════════════════════════════════════════
      // PHASE 2: Extract ownership from OpenSea data
      // (No extra RPC calls needed — OpenSea already provides owners)
      // ═══════════════════════════════════════════
      addLog("PHASE 2/3: Mapping ownership from collection data...");
      setPhase("OWNERSHIP");
      setLoadedCount(0);
      setTotalForPhase(completeCollection.length);
      setProgress(0);

      let ownersFound = 0;
      completeCollection.forEach((nft, i) => {
        // OpenSea returns owners array on each NFT
        if (nft.owners && nft.owners[0] && nft.owners[0].address) {
          nft._owner = nft.owners[0].address;
          ownersFound++;
        } else {
          nft._owner = null;
        }
      });

      setLoadedCount(completeCollection.length);
      setProgress(100);
      addLog(`Ownership: ${ownersFound} holders mapped instantly.`);

      // ═══════════════════════════════════════════
      // PHASE 3: Batch getLore via Multicall3 on Base
      // ═══════════════════════════════════════════
      // PHASE 3: Loading lore from Base chain
      // ═══════════════════════════════════════════
      addLog("PHASE 3/3: Synchronizing lore updates...");
      setPhase("LORE");
      setLoadedCount(0);

      const nftsWithOwners = completeCollection.filter(nft => nft._owner);
      setTotalForPhase(nftsWithOwners.length);
      setProgress(0);

      if (LORE_CONTRACT_ADDRESS !== "TBD") {
        try {
          const baseProvider = new ethers.JsonRpcProvider("https://mainnet.base.org");
          const loreContract = new ethers.Contract(LORE_CONTRACT_ADDRESS, LORE_ABI, baseProvider);
          const LORE_DEPLOY_BLOCK = 44250000;
          const currentBlock = await baseProvider.getBlockNumber();
          const CHUNK = 1000; // Base RPCs are sensitive; 1000 blocks is the safe limit for queryFilter
          
          addLog("Scanning Base chain for lore history...");
          let allEvents = [];
          for (let from = LORE_DEPLOY_BLOCK; from <= currentBlock; from += CHUNK + 1) {
            const to = Math.min(from + CHUNK, currentBlock);
            try {
              const events = await loreContract.queryFilter(loreContract.filters.LoreUpdated(), from, to);
              allEvents.push(...events);
            } catch (rpcErr) {
              addLog(`WARN: Range ${from}-${to} failed, retrying smaller...`);
              // Emergency fallback for dense ranges
              const mid = from + Math.floor(CHUNK / 2);
              const e1 = await loreContract.queryFilter(loreContract.filters.LoreUpdated(), from, mid);
              const e2 = await loreContract.queryFilter(loreContract.filters.LoreUpdated(), mid + 1, to);
              allEvents.push(...e1, ...e2);
            }
          }

          // Build loreMap: tokenId -> Array of { writer, lore, blockNumber }
          const loreMap = {};
          for (const event of allEvents) {
            const tokenId = event.args[0].toString();
            const writer = event.args[1];
            const loreText = event.args[2];
            
            if (!loreMap[tokenId]) loreMap[tokenId] = [];
            loreMap[tokenId].push({
              writer,
              lore: loreText,
              blockNumber: event.blockNumber
            });
          }

          // Get unique block numbers to fetch timestamps
          const uniqueBlocks = [...new Set(allEvents.map(e => e.blockNumber))];
          addLog(`Syncing timestamps for ${uniqueBlocks.length} blocks...`);
          const blockTimestamps = {};
          for (const bn of uniqueBlocks) {
            try {
              const block = await baseProvider.getBlock(bn);
              blockTimestamps[bn] = block.timestamp;
            } catch {
              blockTimestamps[bn] = 0;
            }
          }

          // Enrich loreMap with timestamps
          Object.keys(loreMap).forEach(tid => {
            loreMap[tid] = loreMap[tid].map(entry => ({
              ...entry,
              timestamp: blockTimestamps[entry.blockNumber] || 0
            })).sort((a, b) => a.timestamp - b.timestamp);
          });

          addLog(`Lore history: ${allEvents.length} updates across ${Object.keys(loreMap).length} frogs.`);
          
          // Finish boot
          completeCollection.forEach(nft => {
            nft._loreHistory = loreMap[nft.identifier] || [];
            if (nft._owner === undefined) nft._owner = null;
          });
          
          onBootComplete(completeCollection, loreMap);
          return;

        } catch (err) {
          addLog("WARNING: Lore history sync failed. Features will fall back to on-demand.");
          console.warn("Lore sync failed:", err);
        }
      } else {
        addLog("Lore registry: Skipped (TBD).");
      }

      // Default fallback
      completeCollection.forEach(nft => {
        if (nft._owner === undefined) nft._owner = null;
        nft._loreHistory = [];
      });
      onBootComplete(completeCollection, {});

    } catch (err) {
      console.error("Boot Sequence Error:", err);
      setError("Boot failed: " + (err.message || "Unknown error"));
      addLog("FATAL: " + (err.message || "Unknown error"));
    }
  };

  const phaseIndex = { COLLECTION: 1, OWNERSHIP: 2, LORE: 3, DONE: 3 }[phase];

  return (
    <div className="fixed inset-0 bg-black text-[#c0c0c0] font-mono select-none z-[99999] p-8 flex flex-col">
      <div className="flex-1 flex flex-col justify-center items-center">
        <h1 className="text-5xl font-bold mb-4" style={{ textShadow: "4px 4px 0 #000080" }}>Bad Frogs 1744</h1>

        {/* Phase indicators */}
        <div className="flex gap-6 mt-4 mb-2 text-xs uppercase tracking-widest">
          <span className={phase === "COLLECTION" ? "text-white font-bold" : phaseIndex > 1 ? "text-green-400" : "text-gray-600"}>
            {phaseIndex > 1 ? "✓" : "►"} NFTs
          </span>
          <span className={phase === "OWNERSHIP" ? "text-white font-bold" : phaseIndex > 2 ? "text-green-400" : "text-gray-600"}>
            {phaseIndex > 2 ? "✓" : phase === "OWNERSHIP" ? "►" : "○"} Holders
          </span>
          <span className={phase === "LORE" || phase === "DONE" ? "text-white font-bold" : "text-gray-600"}>
            {phase === "DONE" ? "✓" : phase === "LORE" ? "►" : "○"} Lore
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-96 border-[2px] border-white border-r-gray-500 border-b-gray-500 bg-[#c0c0c0] p-1 mt-4 shadow-lg">
          <div className="h-6 flex">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`flex-1 mx-px bg-[#000080] transition-opacity duration-300 ${progress >= (i * 5) ? 'opacity-100' : 'opacity-0'}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="mb-2 uppercase font-bold tracking-widest text-[#000080]">
            {PHASE_LABELS[phase]}...
          </p>
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <p>{loadedCount} / {totalForPhase}</p>
          )}
        </div>

        {/* Boot log */}
        <div className="mt-6 w-[500px] max-h-40 overflow-hidden text-[10px] leading-relaxed border border-gray-800 bg-black/50 p-2">
          {logs.map((log, i) => (
            <div key={i} className={i === logs.length - 1 ? 'text-green-400' : 'text-green-400/50'}>
              &gt; {log}
            </div>
          ))}
          <span className="text-green-400 animate-pulse">█</span>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        (Beta)This is your website. OS Hijacked by Bad Frogs 2026.
      </div>
    </div>
  );
}
