import { Link } from "react-router-dom";
import { useState } from "react";

function Navbar() {
  const [open, setOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50 backdrop-blur-md bg-black/60 border-b border-gray-800">
      <div className="flex justify-between items-center px-6 py-4">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/logonavbar.jpg"
            alt="Bad Frogs"
            className="w-10 h-10 rounded-lg object-cover"
          />
          <h1 className="text-xl font-bold">Bad Frogs</h1>
        </div>

        {/* Mobile Button */}
        <button
          className="md:hidden text-2xl"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="hover:text-green-400 transition">
            Home
          </Link>

          <Link to="/gallery" className="hover:text-green-400 transition">
            Gallery
          </Link>

          <Link to="/about" className="hover:text-green-400 transition">
            About
          </Link>

          {/* Social Dropdown */}
          <div className="relative group">
            <button className="hover:text-green-400 transition">
              Social ▾
            </button>

            <div className="absolute opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200 mt-2 bg-gray-900 border border-gray-700 rounded-md shadow-lg">
              <a
                href="https://x.com/BadFrogs1744"
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2 hover:bg-gray-800"
              >
                x.com
              </a>
            </div>
          </div>

          {/* Buy Button */}
          <a
            href="https://opensea.io/collection/badfrogs"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-400 text-black px-4 py-2 rounded-lg font-semibold hover:opacity-80 transition"
          >
            Buy
          </a>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col items-center gap-4 py-4 bg-black/90">
          <Link to="/" onClick={() => setOpen(false)}>
            Home
          </Link>

          <Link to="/gallery" onClick={() => setOpen(false)}>
            Gallery
          </Link>

          <Link to="/about" onClick={() => setOpen(false)}>
            About
          </Link>

          {/* Mobile Social */}
          <a
            href="https://x.com/BadFrogs1744"
            target="_blank"
            rel="noopener noreferrer"
          >
            x.com
          </a>

          {/* Buy */}
          <a
            href="https://opensea.io/collection/badfrogs"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-400 text-black px-4 py-2 rounded-lg font-semibold"
          >
            Buy
          </a>
        </div>
      </div>
    </div>
  );
}

export default Navbar;