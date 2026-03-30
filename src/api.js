import axios from "axios";

const BASE_URL =
  "https://api.opensea.io/api/v2/collection/badfrogs/nfts";

export const getNFTs = async (cursor = null) => {
  let url = `${BASE_URL}?limit=20`;

  if (cursor) {
    url += `&next=${cursor}`;
  }

  const res = await axios.get(url, {
    headers: {
      "X-API-KEY": "517825296c364b1a99811ac036cc9d91",
    },
  });

  // ⚡ DO NOT fetch metadata here anymore (faster)
  return {
    nfts: res.data.nfts.map((nft) => ({
      ...nft,
      traits: nft.traits || [],
    })),
    nextCursor: res.data.next || null,
  };
};