import { ethers } from "ethers";

const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
const MULTICALL3_ABI = [
  {
    inputs: [{ components: [{ name: "target", type: "address" }, { name: "allowFailure", type: "bool" }, { name: "callData", type: "bytes" }], name: "calls", type: "tuple[]" }],
    name: "aggregate3",
    outputs: [{ components: [{ name: "success", type: "bool" }, { name: "returnData", type: "bytes" }], name: "returnData", type: "tuple[]" }],
    stateMutability: "payable",
    type: "function"
  }
];

/**
 * Execute batched multicall3 requests, rotating across multiple providers
 * to avoid 429 rate limits. Adds small delays between batches.
 *
 * @param {ethers.Provider|ethers.Provider[]} providers - Single or array of providers (rotated per batch)
 * @param {Array} calls - Array of { target, allowFailure, callData }
 * @param {number} batchSize - Max calls per multicall request
 * @param {Function} onProgress - Optional callback(completedCount)
 */
export async function multicallBatch(providers, calls, batchSize = 200, onProgress) {
  const providerList = Array.isArray(providers) ? providers : [providers];
  const contracts = providerList.map(p =>
    new ethers.Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, p)
  );

  const allResults = [];
  let providerIdx = 0;

  for (let i = 0; i < calls.length; i += batchSize) {
    const batch = calls.slice(i, i + batchSize);
    let success = false;

    // Try each provider for this batch (rotate starting point)
    for (let attempt = 0; attempt < contracts.length; attempt++) {
      const idx = (providerIdx + attempt) % contracts.length;
      try {
        const batchResults = await contracts[idx].aggregate3.staticCall(batch);
        allResults.push(...batchResults);
        success = true;
        providerIdx = (idx + 1) % contracts.length; // rotate for next batch
        break;
      } catch (err) {
        console.warn(`Multicall provider ${idx} failed, trying next...`, err.message);
        continue;
      }
    }

    if (!success) {
      // All providers failed for this batch — try splitting into smaller chunks
      const smallerSize = Math.max(10, Math.floor(batch.length / 4));
      for (let j = 0; j < batch.length; j += smallerSize) {
        const smallBatch = batch.slice(j, j + smallerSize);
        let smallSuccess = false;
        for (let attempt = 0; attempt < contracts.length; attempt++) {
          const idx = (providerIdx + attempt) % contracts.length;
          try {
            const results = await contracts[idx].aggregate3.staticCall(smallBatch);
            allResults.push(...results);
            smallSuccess = true;
            providerIdx = (idx + 1) % contracts.length;
            break;
          } catch { continue; }
        }
        if (!smallSuccess) {
          allResults.push(...smallBatch.map(() => ({ success: false, returnData: "0x" })));
        }
        await new Promise(r => setTimeout(r, 150));
      }
    }

    if (onProgress) onProgress(allResults.length);

    // Small delay between batches to respect rate limits
    if (i + batchSize < calls.length) {
      await new Promise(r => setTimeout(r, 120));
    }
  }

  return allResults;
}
