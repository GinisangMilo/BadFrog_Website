import axios from "axios";

const BASE_URL =
  "https://api.opensea.io/api/v2/collection/badfrogs/nfts";

export const getNFTs = async (cursor = null, limit = 20) => {
  let url = `${BASE_URL}?limit=${limit}`;

  if (cursor) {
    url += `&next=${cursor}`;
  }

  const res = await axios.get(url, {
    headers: {
      "X-API-KEY": "517825296c364b1a99811ac036cc9d91",
    },
  });

  return {
    nfts: res.data.nfts.map((nft) => ({
      ...nft,
      traits: nft.traits || [],
      owners: nft.owners || [],
    })),
    nextCursor: res.data.next || null,
  };
};

export const getCollectionStats = async () => {
  const url = "https://api.opensea.io/api/v2/collections/badfrogs";
  const res = await axios.get(url, {
    headers: {
      "X-API-KEY": "517825296c364b1a99811ac036cc9d91",
    },
  });
  return res.data;
};

export const getNFT = async (id) => {
  const url = `https://api.opensea.io/api/v2/chain/ethereum/contract/0x13e2a004ea4c77412c9806daadafd09de65645a3/nfts/${id}`;
  const res = await axios.get(url, {
    headers: {
      "X-API-KEY": "517825296c364b1a99811ac036cc9d91",
    },
  });
  return { ...res.data.nft, traits: res.data.nft.traits || [], owners: res.data.nft.owners || [], identifier: res.data.nft.identifier };
};