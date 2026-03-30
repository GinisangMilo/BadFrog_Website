import { useEffect, useState, useRef } from "react";
import { getNFTs } from "../api";
import FilterPanel from "../components/FilterPanel";

function Gallery() {
  const [nfts, setNfts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [traits, setTraits] = useState({});
  const [selectedTraits, setSelectedTraits] = useState({});
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);

  const loaderRef = useRef(null);

  useEffect(() => {
    loadNFTs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedTraits, nfts]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && cursor) {
        loadMore();
      }
    });

    if (loaderRef.current) observer.observe(loaderRef.current);

    return () => observer.disconnect();
  }, [cursor, nfts]);

  const loadNFTs = async () => {
    setLoading(true);

    const res = await getNFTs();

    setNfts(res.nfts);
    setFiltered(res.nfts);
    setCursor(res.nextCursor);

    buildTraits(res.nfts);

    setLoading(false);
  };

  const loadMore = async () => {
    if (!cursor || loading) return;

    setLoading(true);

    const res = await getNFTs(cursor);

    const newNFTs = [...nfts, ...res.nfts];

    setNfts(newNFTs);
    setFiltered(newNFTs);
    setCursor(res.nextCursor);

    buildTraits(newNFTs);

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

    setTraits(traitMap);
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

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-200 p-4 bg-white">
        <FilterPanel
          traits={traits}
          selectedTraits={selectedTraits}
          toggleTrait={toggleTrait}
        />
      </div>

      {/* Gallery */}
      <div className="flex-1 p-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">

            {filtered.map((nft) => (
              <div
                key={nft.identifier}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:scale-105 transition duration-200"
              >
                <img
                  src={nft.image_url}
                  alt={nft.name}
                  className="w-full h-48 object-cover"
                />
                <p className="text-sm p-2 truncate">{nft.name}</p>
              </div>
            ))}

            {/* Skeleton loading */}
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-200 animate-pulse h-48 rounded-xl"
                />
              ))}
          </div>
        </div>

        {/* Infinite scroll trigger */}
        <div ref={loaderRef} className="h-10"></div>
      </div>
    </div>
  );
}

export default Gallery;