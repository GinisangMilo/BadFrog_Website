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
    <div className="h-full flex flex-col text-black">
      

      {/* SCROLL AREA */}
      <div className="flex-1 overflow-y-auto no-scrollbar pr-2 space-y-4">

        {Object.keys(traits)
          .sort()
          .map((type) => (
            <div key={type} className="border-b pb-3 border-gray-200">

              <div
                onClick={() => toggleSection(type)}
                className="flex justify-between items-center cursor-pointer"
              >
                <span className="uppercase text-xs font-bold tracking-widest text-gray-600">
                  {type}
                </span>
                <span>{open[type] ? "−" : "+"}</span>
              </div>

              {open[type] && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {traits[type]?.slice().sort().map((val) => {
                    const active = selectedTraits[type]?.has(val);

                    return (
                      <div
                        key={`${type}-${val}`}
                        onClick={() => toggleTrait(type, val)}
                        className={`text-xs px-2.5 py-1.5 rounded-md cursor-pointer transition-all duration-300 font-semibold border ${
                          active
                            ? "bg-black text-white border-black"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-black hover:text-white hover:border-black"
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
    </div>
  );
}

export default FilterPanel;