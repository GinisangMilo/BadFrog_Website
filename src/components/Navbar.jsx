import { Link } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logonavbar.png";

function Navbar() {
  const [open, setOpen] = useState(false);

  const navItem =
    "relative cursor-pointer text-sm after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-0 after:h-[2px] after:bg-green-500 after:transition-all after:duration-300 hover:after:w-full";

  return (
    <div className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-200">
      
      {/* ⬇️ Reduced height here */}
      <div className="flex items-center justify-between px-6 py-2">
        
        {/* Logo (UNCHANGED SIZE) */}
        <div className="flex items-center">
          <img
            src={logo}
            alt="Bad Frogs"
            className="w-40 h-30 object-cover"
          />
        </div>

        {/* Centered Menu */}
        <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center gap-8 text-black font-medium">
          
          <Link to="/" className={navItem}>
            Home
          </Link>

          <Link to="/about" className={navItem}>
            About
          </Link>

          <Link to="/gallery" className={navItem}>
            Gallery
          </Link>

          {/* Socials */}
          <div className="relative group">
            <button className={navItem}>Socials</button>

            <div className="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200 mt-2 bg-white border border-gray-200 rounded-md shadow-lg">
              <a
                href="https://x.com/BadFrogs1744"
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2 hover:bg-gray-100 whitespace-nowrap"
              >
                x.com
              </a>
            </div>
          </div>

          <a
            href="https://opensea.io/collection/badfrogs"
            target="_blank"
            rel="noopener noreferrer"
            className={navItem}
          >
            Collect
          </a>
        </div>

        {/* Mobile Button */}
        <button
          className="md:hidden text-xl text-black"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col items-center gap-3 py-3 bg-white text-black text-sm">
          
          <Link to="/" onClick={() => setOpen(false)} className={navItem}>
            Home
          </Link>

          <Link to="/about" onClick={() => setOpen(false)} className={navItem}>
            About
          </Link>

          <Link to="/gallery" onClick={() => setOpen(false)} className={navItem}>
            Gallery
          </Link>

          <a
            href="https://x.com/BadFrogs1744"
            target="_blank"
            rel="noopener noreferrer"
            className={navItem}
          >
            Socials
          </a>

          <a
            href="https://opensea.io/collection/badfrogs"
            target="_blank"
            rel="noopener noreferrer"
            className={navItem}
          >
            Collect
          </a>
        </div>
      </div>
    </div>
  );
}

export default Navbar;