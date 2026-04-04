import fetch from 'node-fetch';

const BASE_URL = "https://api.opensea.io/api/v2/collection/badfrogs/nfts";

async function test() {
  const res = await fetch(`${BASE_URL}?limit=5`, {
    headers: {
      "X-API-KEY": "517825296c364b1a99811ac036cc9d91",
    },
  });
  const data = await res.json();
  const owners = data.nfts.map(n => n.owners);
  console.log(JSON.stringify(owners, null, 2));
}

test();
