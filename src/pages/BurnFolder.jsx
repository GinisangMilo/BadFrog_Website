import React from "react";
import NftViewer from "../components/NftViewer";

function BurnFolder({ nfts, openWindow, onRemove, onDrop }) {
  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.dataset.dragover = "true";
  };

  const handleDragLeave = (e) => {
    delete e.currentTarget.dataset.dragover;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    delete e.currentTarget.dataset.dragover;
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.action === "burn" && data.nft && onDrop) {
        onDrop(data.nft);
      }
    } catch (_) {}
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden bg-[#c0c0c0] text-black"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Address Bar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-400 bg-[#c0c0c0]">
        <span className="text-sm font-semibold">Address:</span>
        <div className="flex-1 bg-white border border-gray-500 border-r-white border-b-white px-2 py-1 text-sm text-gray-700">
          C:\Desktop\Burn Bin
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-2 sunken-panel m-2 bg-white">
        <div className="mx-auto p-4">

          <div className="border-b border-gray-400 pb-2 mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-red-600">
              ⚠ Queued for destruction: {nfts.length}
            </p>
            {nfts.length > 0 && (
              <p className="text-xs text-gray-500 italic">Click an NFT to remove it</p>
            )}
          </div>

          {nfts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center gap-3 text-gray-500">
              <span className="text-5xl select-none">🗑️</span>
              <p className="font-bold text-base">Burn Bin is empty!</p>
              <p className="text-sm">Drag your NFTs here to stage them for burning.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 justify-center">
              {nfts.map((nft) => (
                <div
                  key={nft.identifier}
                  className="flex flex-col items-center justify-start w-[120px] p-2 cursor-pointer group relative"
                  title="Click to remove from Burn Bin"
                  onClick={() => onRemove && onRemove(nft.identifier)}
                >
                  {/* Red X badge */}
                  <div className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 leading-none">
                    ✕
                  </div>
                  <div className="w-24 h-24 mb-1 border-2 border-gray-500 border-r-white border-b-white bg-white flex items-center justify-center p-1 pointer-events-none drop-shadow-md group-hover:opacity-60 transition-opacity">
                    <img src={nft.image_url} className="w-full h-full object-cover grayscale opacity-80" />
                  </div>
                  <div className="text-xs text-center border-transparent border border-dotted px-1 group-hover:bg-red-100 group-hover:border-red-400 transition-colors">
                    #{nft.identifier}.jpg
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BurnFolder;
