import { useEffect, useState, useRef, useCallback } from "react";
import { getCollectionStats } from "../api";
import FilterPanel from "../components/FilterPanel";
import NftViewer from "../components/NftViewer";
import { motion } from "framer-motion";
import { resolveDisplayName } from "../utils/displayName";

const MAX_SUPPLY = 4444;

// ✅ BADFROGS CONTRACT
const CONTRACT_ADDRESS = "0x13e2a004ea4c77412c9806daadafd09de65645a3";
const CHAIN = "ethereum";

function Gallery({ isWindowed, openWindow, globalNfts = [] }) {
  const [nfts, setNfts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [traits, setTraits] = useState({});
  const [selectedTraits, setSelectedTraits] = useState({});
  const [visibleCount, setVisibleCount] = useState(40);
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);

  const [baseSupply, setBaseSupply] = useState(0);
  const [burnedSupply, setBurnedSupply] = useState(0);

  const [searchId, setSearchId] = useState("");

  const galleryRef = useRef(null);

  useEffect(() => {
    setNfts(globalNfts);
    buildTraits(globalNfts);
    fetchStats();
  }, [globalNfts]);

  const fetchStats = async () => {
    try {
      const stats = await getCollectionStats();
      const openSeaSupply = stats.total_supply || 0;
      setBaseSupply(openSeaSupply);
      setBurnedSupply(MAX_SUPPLY - openSeaSupply);
    } catch (error) {
      console.error("Failed to fetch collection stats:", error);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [selectedTraits, nfts, searchId]);

  const observerRef = useRef();
  const lastElementRef = useCallback((node) => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 40);
      }
    });
    if (node) observerRef.current.observe(node);
  }, []);

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

  const applyFilters = () => {
    let result = [...nfts];

    if (searchId.trim() !== "") {
      const cleanSearch = searchId.replace("https:/badfrogs/gallery/", "").replace("#", "").trim();
      result = result.filter(
        (nft) => nft.identifier.toString().includes(cleanSearch)
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
    setVisibleCount(40);
  };

  const displayedNfts = filtered.slice(0, visibleCount);

  return (
    <div className="flex flex-col h-full bg-[#c0c0c0]">
      <div className="flex items-center gap-2 px-2 py-1 border-b shadow-sm border-gray-400 bg-[#c0c0c0]">
        <span className="text-sm font-semibold">Address:</span>
        <div className="flex-1 bg-white border border-gray-500 border-r-white border-b-white px-2 py-1 flex items-center">
          <span className="text-sm text-gray-500">https:/badfrogs/gallery/</span>
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder=""
            className="flex-1 outline-none text-sm text-black ml-1"
          />
        </div>
      </div>

    <motion.div className={`flex flex-1 overflow-hidden transition-colors duration-500 bg-[#c0c0c0] text-black ${isWindowed ? '' : 'pt-[60px] lg:pt-[80px]'}`}>

      <div className="hidden md:flex w-72 flex-col h-full bg-[#c0c0c0] sunken-panel m-2">
        <div className="p-4 sticky top-0 z-10 bg-[#c0c0c0] border-b border-gray-400">
          <h2 className="text-lg font-extrabold tracking-widest uppercase">FILTER</h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          <FilterPanel
            traits={traits}
            selectedTraits={selectedTraits}
            toggleTrait={toggleTrait}
          />
        </div>
      </div>

      <div
        ref={galleryRef}
        className="flex-1 overflow-y-auto no-scrollbar p-2 sunken-panel m-2 ml-0 bg-white"
      >
        <div className="mx-auto pt-4">

          <div className="border-b border-gray-400 pb-2 mb-4">
            <p className="text-sm">{filtered.length} object(s)</p>
          </div>

          {filtered.length === 0 ? (
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
            <div className="flex flex-wrap gap-4">
              {displayedNfts.map((nft, index) => (
                <div
                  ref={index === displayedNfts.length - 1 ? lastElementRef : null}
                  key={nft.identifier}
                  onClick={() => openWindow(`nft_${nft.identifier}`, `#${nft.identifier}.jpg`, <NftViewer nft={nft} isEditable={false} openWindow={openWindow} />)}
                  className="flex flex-col items-center justify-start w-[150px] p-2 cursor-pointer group"
                >
                  <div className="w-32 h-32 mb-1 border-2 border-gray-500 border-r-white border-b-white bg-white flex items-center justify-center p-1 pointer-events-none drop-shadow-md">
                    <img src={nft.image_url} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs text-center border-transparent border border-dotted px-1 group-active:bg-[#000080] group-active:text-white group-active:border-white w-full truncate">
                    #{nft.identifier}.jpg
                  </div>
                  {(nft._owner || (nft.owners && nft.owners[0])) && (() => {
                    const addr = nft._owner || nft.owners[0].address;
                    const dName = resolveDisplayName(addr).name;
                    return (
                      <span 
                        className="text-[9px] text-[#000080] uppercase font-bold truncate w-full px-1 text-center hover:underline z-10 block cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          openWindow(`profile_${addr}`, `${dName} - Profile`, <Profile account={addr} isWindowed={true} openWindow={openWindow} />);
                        }}
                        title={`Holder: ${addr}`}
                      >
                        {dName}
                      </span>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

    </motion.div>
   </div>
  );
}

export default Gallery;