import { useState } from "react";

function FilterPanel({ traits, selectedTraits, toggleTrait }) {
  const [open, setOpen] = useState({});

  const toggleSection = (type) => {
    setOpen((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">FILTER</h2>

      {Object.keys(traits).map((type) => (
        <div key={type} className="border-b border-gray-200 py-2">
          {/* Header */}
          <div
            onClick={() => toggleSection(type)}
            className="flex justify-between items-center cursor-pointer"
          >
            <span className="uppercase text-sm">{type}</span>
            <span>{open[type] ? "−" : "+"}</span>
          </div>

          {/* Options */}
          {open[type] && (
            <div className="mt-2 space-y-1">
              {[...traits[type]].map((val) => {
                const active = selectedTraits[type]?.has(val);

                return (
                  <div
                    key={val}
                    onClick={() => toggleTrait(type, val)}
                    className={`text-sm cursor-pointer px-2 py-1 rounded transition
                      ${
                        active
                          ? "bg-green-600 text-white"
                          : "text-gray-700 hover:bg-green-600 hover:text-white"
                      }`}
                  >
                    {val}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default FilterPanel;