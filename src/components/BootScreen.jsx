import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { getNFTs } from "../api";
import { multicallBatch } from "../utils/multicall";
import { LORE_ABI } from "../contracts/DeployConfig";

const LORE_CONTRACT_ADDRESS = "0xdfbd14ebb6743abc7a87b77d3e55e29bd5a48289";
const TOTAL_NFTS = 4444;

export default function BootScreen({ onBootComplete }) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState(["Initializing Bad Frogs OS v1744..."]);
  const fetchedRef = useRef(false);

  const addLog = (msg) => setLogs(prev => [...prev.slice(-8), msg]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    runBootSequence();
  }, []);

  const runBootSequence = async () => {
    try {
      // ═══════════════════════════════════════════
      // Boot Phase 1: Load collection data
      // ═══════════════════════════════════════════
      addLog("BIOS: Memory check... OK");
      addLog("Loading system data...");

      let completeCollection = [];
      let cursor = null;
      let isFetching = true;

      while (isFetching) {
        const res = await getNFTs(cursor, 200);
        completeCollection = [...completeCollection, ...res.nfts];
        const currentCount = completeCollection.length;
        setProgress(Math.min(60, Math.floor((currentCount / TOTAL_NFTS) * 60)));

        if (res.nextCursor && currentCount < TOTAL_NFTS) {
          cursor = res.nextCursor;
        } else {
          isFetching = false;
        }
      }

      addLog(`System data loaded: ${completeCollection.length} entries cached.`);

      // ═══════════════════════════════════════════
      // Boot Phase 2: Map ownership
      // ═══════════════════════════════════════════
      addLog("Verifying system integrity...");
      setProgress(65);

      let ownersFound = 0;
      completeCollection.forEach((nft) => {
        if (nft.owners && nft.owners[0] && nft.owners[0].address) {
          nft._owner = nft.owners[0].address;
          ownersFound++;
        } else {
          nft._owner = null;
        }
      });

      setProgress(70);
      addLog(`Integrity check passed.`);

      // ═══════════════════════════════════════════
      // Boot Phase 3: Load lore from Base
      // ═══════════════════════════════════════════
      addLog("Synchronizing extensions...");

      const nftsWithOwners = completeCollection.filter(nft => nft._owner);

      if (LORE_CONTRACT_ADDRESS !== "TBD") {
        try {
          const baseProvider = new ethers.JsonRpcProvider("https://mainnet.base.org");
          const loreContract = new ethers.Contract(LORE_CONTRACT_ADDRESS, LORE_ABI, baseProvider);
          const LORE_DEPLOY_BLOCK = 44250000;
          const currentBlock = await baseProvider.getBlockNumber();
          const CHUNK = 1000;

          let allEvents = [];
          const totalChunks = Math.ceil((currentBlock - LORE_DEPLOY_BLOCK) / (CHUNK + 1));
          let chunksDone = 0;

          for (let from = LORE_DEPLOY_BLOCK; from <= currentBlock; from += CHUNK + 1) {
            const to = Math.min(from + CHUNK, currentBlock);
            try {
              const events = await loreContract.queryFilter(loreContract.filters.LoreUpdated(), from, to);
              allEvents.push(...events);
            } catch (rpcErr) {
              const mid = from + Math.floor(CHUNK / 2);
              const e1 = await loreContract.queryFilter(loreContract.filters.LoreUpdated(), from, mid);
              const e2 = await loreContract.queryFilter(loreContract.filters.LoreUpdated(), mid + 1, to);
              allEvents.push(...e1, ...e2);
            }
            chunksDone++;
            setProgress(70 + Math.floor((chunksDone / totalChunks) * 25));
          }

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

          const uniqueBlocks = [...new Set(allEvents.map(e => e.blockNumber))];
          addLog(`Syncing timestamps...`);
          const blockTimestamps = {};
          for (const bn of uniqueBlocks) {
            try {
              const block = await baseProvider.getBlock(bn);
              blockTimestamps[bn] = block.timestamp;
            } catch {
              blockTimestamps[bn] = 0;
            }
          }

          Object.keys(loreMap).forEach(tid => {
            loreMap[tid] = loreMap[tid].map(entry => ({
              ...entry,
              timestamp: blockTimestamps[entry.blockNumber] || 0
            })).sort((a, b) => a.timestamp - b.timestamp);
          });

          addLog(`Extensions synchronized.`);
          setProgress(98);

          completeCollection.forEach(nft => {
            nft._loreHistory = loreMap[nft.identifier] || [];
            if (nft._owner === undefined) nft._owner = null;
          });

          addLog("Boot complete. Welcome to Bad Frogs OS.");
          setProgress(100);

          // Small delay so user sees 100%
          await new Promise(r => setTimeout(r, 400));
          onBootComplete(completeCollection, loreMap);
          return;

        } catch (err) {
          addLog("WARNING: Extension sync failed. Some features may be limited.");
          console.warn("Lore sync failed:", err);
        }
      } else {
        addLog("Extensions: Skipped.");
      }

      // Default fallback
      completeCollection.forEach(nft => {
        if (nft._owner === undefined) nft._owner = null;
        nft._loreHistory = [];
      });

      addLog("Boot complete. Welcome to Bad Frogs OS.");
      setProgress(100);
      await new Promise(r => setTimeout(r, 400));
      onBootComplete(completeCollection, {});

    } catch (err) {
      console.error("Boot Sequence Error:", err);
      setError("Boot failed: " + (err.message || "Unknown error"));
      addLog("FATAL: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-[#c0c0c0] font-mono select-none z-[99999] p-8 flex flex-col">
      <div className="flex-1 flex flex-col justify-center items-center">
        <h1 className="text-5xl font-bold mb-4" style={{ textShadow: "4px 4px 0 #000080" }}>Bad Frogs 1744</h1>

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
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <p className="text-sm text-gray-400">
              {progress < 100 ? 'Starting up...' : 'Ready.'}
            </p>
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
        (v1.1) Bad Frogs OS 2026. All rights reserved.
      </div>
    </div>
  );
}
