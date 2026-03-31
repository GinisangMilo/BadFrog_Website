import { useEffect, useState, useRef } from "react";
import { getNFTs } from "../api";
import FilterPanel from "../components/FilterPanel";
import { motion } from "framer-motion";

const MAX_SUPPLY = 4444;

// ✅ BADFROGS CONTRACT
const CONTRACT_ADDRESS = "0x13e2a004ea4c77412c9806daadafd09de65645a3";
const CHAIN = "ethereum";

function Gallery() {
  const [nfts, setNfts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [traits, setTraits] = useState({});
  const [selectedTraits, setSelectedTraits] = useState({});
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);

  const [baseSupply, setBaseSupply] = useState(0);

  // 🔎 SEARCH STATE (ADDED)
  const [searchId, setSearchId] = useState("");

  const loaderRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    loadNFTs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedTraits, nfts, searchId]);

  useEffect(() => {
    if (filtered.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor) {
          loadMore();
        }
      },
      {
        root: galleryRef.current,
        rootMargin: "200px",
      }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [cursor, nfts, filtered]);

  const loadNFTs = async () => {
    setLoading(true);
    const res = await getNFTs();

    setNfts(res.nfts);
    setCursor(res.nextCursor);

    buildTraits(res.nfts);
    calculateSupply(res.nfts);

    setLoading(false);
  };

  const loadMore = async () => {
    if (!cursor || loading) return;

    setLoading(true);
    const res = await getNFTs(cursor);

    const newNFTs = [...nfts, ...res.nfts];

    setNfts(newNFTs);
    setCursor(res.nextCursor);

    buildTraits(newNFTs);
    calculateSupply(newNFTs);

    setLoading(false);
  };

  const buildTraits = (data) => {
    let traitMap = {};

    data.forEach((nft) => {
      nft.traits?.forEach((trait) => {
        if (!traitMap[trait.trait_type]) {
          traitMap[trait.trait_type] = new Set();
        }
        traitMap[trait.trait_type].add(trait.value);
      });
    });

    const finalTraits = {};
    Object.keys(traitMap).forEach((key) => {
      finalTraits[key] = Array.from(traitMap[key]);
    });

    setTraits(finalTraits);
  };

  const calculateSupply = (data) => {
    const burned = data.filter(
      (nft) =>
        !nft.owner ||
        nft.owner === "0x000000000000000000000000000000000000dead"
    ).length;

    const alive = MAX_SUPPLY - burned;
    setBaseSupply(alive);
  };

  const toggleTrait = (type, value) => {
    setSelectedTraits((prev) => {
      const updated = { ...prev };

      if (!updated[type]) updated[type] = new Set();

      if (updated[type].has(value)) {
        updated[type].delete(value);
      } else {
        updated[type].add(value);
      }

      return updated;
    });
  };

  // 🔥 UPDATED FILTER (WITH SEARCH)
  const applyFilters = () => {
    let result = [...nfts];

    // 🔎 SEARCH BY NFT NUMBER
    if (searchId.trim() !== "") {
      result = result.filter(
        (nft) => nft.identifier.toString() === searchId
      );
    }

    Object.keys(selectedTraits).forEach((type) => {
      const values = selectedTraits[type];

      if (values.size > 0) {
        result = result.filter((nft) =>
          nft.traits?.some(
            (t) => t.trait_type === type && values.has(t.value)
          )
        );
      }
    });

    setFiltered(result);
  };

  const openOnOpenSea = (nft) => {
    const tokenId = nft.identifier;
    const url = `https://opensea.io/assets/${CHAIN}/${CONTRACT_ADDRESS}/${tokenId}`;
    window.open(url, "_blank");
  };

  return (
    <motion.div className="flex h-screen overflow-hidden bg-[#f5f5f5]">

      {/* SIDEBAR */}
      <div className="hidden md:flex w-72 border-r bg-white flex-col h-full">
        <div className="p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">FILTER</h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          <FilterPanel
            traits={traits}
            selectedTraits={selectedTraits}
            toggleTrait={toggleTrait}
            searchId={searchId}          // ✅ PASS
            setSearchId={setSearchId}    // ✅ PASS
          />
        </div>
      </div>

      {/* GALLERY */}
      <div
        ref={galleryRef}
        className="flex-1 overflow-y-auto no-scrollbar p-6"
      >
        <div className="max-w-[1400px] mx-auto">

          <div className="mb-6">
            <h1 className="text-xl font-bold">BADFROGS</h1>
            <p className="text-sm text-gray-500">
              {baseSupply} items
            </p>
          </div>

          {filtered.length === 0 && nfts.length > 0 ? (
            <div className="flex items-center justify-center h-[300px] text-center">
              <div>
                <p className="text-lg font-semibold mb-2">
                  No Bad Frogs matched your filter
                </p>
                <p className="text-sm text-gray-500">
                  Try adjusting your traits
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">

              {filtered.map((nft) => (
                <div
                  key={nft.identifier}
                  onClick={() => setSelectedNFT(nft)}
                  className="bg-[#eeeeee] rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.03] transition"
                >
                  <img
                    src={nft.image_url}
                    className="w-full aspect-square object-cover"
                  />

                  <div className="p-2 text-center">
                    <p className="text-xs text-gray-500">BADFROGS</p>
                    <p className="text-sm font-medium">
                      NO. {nft.identifier}
                    </p>
                  </div>
                </div>
              ))}

            </div>
          )}

        </div>

        <div ref={loaderRef} className="h-10"></div>
      </div>

      {/* MODAL */}
      {selectedNFT && (
        <div
          onClick={() => setSelectedNFT(null)}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#eaeaea] rounded-2xl max-w-5xl w-full flex overflow-hidden"
          >
            <div className="w-1/2 bg-gray-300 flex items-center justify-center">
              <img src={selectedNFT.image_url} className="max-h-[500px]" />
            </div>

            <div className="w-1/2 p-6 flex flex-col">
              <h2 className="text-2xl font-bold mb-6">
                BADFROG #{selectedNFT.identifier}
              </h2>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {selectedNFT.traits?.map((t, i) => (
                  <div key={i} className="bg-white/70 border rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase">
                      {t.trait_type}
                    </p>
                    <p className="font-semibold text-sm">{t.value}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => openOnOpenSea(selectedNFT)}
                className="mt-auto bg-black text-white py-3 rounded-xl font-semibold hover:opacity-90 transition"
              >
                View on OpenSea
              </button>

            </div>

          </div>
        </div>
      )}

    </motion.div>
  );
}

export default Gallery;