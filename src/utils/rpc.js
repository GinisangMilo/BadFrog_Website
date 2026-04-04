import { ethers } from "ethers";

const ETH_MAINNET_NETWORK = ethers.Network.from(1);

const ETH_RPC_LIST = [
  "https://1rpc.io/eth",
  "https://eth-mainnet.public.blastapi.io",
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com",
  "https://rpc.mevblocker.io",
  "https://cloudflare-eth.com",
];

let rpcIndex = 0;

function makeProvider(url) {
  return new ethers.JsonRpcProvider(
    url,
    ETH_MAINNET_NETWORK,
    { staticNetwork: ETH_MAINNET_NETWORK }
  );
}

export function getEthProvider() {
  const url = ETH_RPC_LIST[rpcIndex % ETH_RPC_LIST.length];
  rpcIndex++;
  return makeProvider(url);
}

export async function getEthProviderWithFallback() {
  for (const url of ETH_RPC_LIST) {
    try {
      const provider = makeProvider(url);
      await provider.getBlockNumber();
      return provider;
    } catch {
      continue;
    }
  }
  throw new Error("All Ethereum RPC endpoints are down.");
}

