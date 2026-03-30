import { Link } from "react-router-dom";

function Navbar() {
  return (
    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
      <h1 className="text-xl font-bold">🐸 Bad Frogs</h1>

      <div className="space-x-6">
        <Link to="/" className="hover:text-green-400">
          Home
        </Link>
        <Link to="/gallery" className="hover:text-green-400">
          Gallery
        </Link>
        <Link to="/about" className="hover:text-green-400">
          About
        </Link>
      </div>
    </div>
  );
}

export default Navbar;