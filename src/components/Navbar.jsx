import { Link } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import logo from "../assets/logonavbar.png";

function Navbar() {
  const [open, setOpen] = useState(false);
  const [walletModal, setWalletModal] = useState(false);
  const [account, setAccount] = useState(null);
  const [frogsHeld, setFrogsHeld] = useState(0);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [walletHover, setWalletHover] = useState(false);
  const [socialsHover, setSocialsHover] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Scroll behavior - updated for blur and hide
  const updateNavbar = useCallback(() => {
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    if (currentScrollY > 10) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }

    if (currentScrollY <= 60 || currentScrollY < lastScrollY.current) {
      setShowNavbar(true);
    } else if (currentScrollY > 60 && currentScrollY > lastScrollY.current) {
      setShowNavbar(false);
    }
    lastScrollY.current = currentScrollY;
    ticking.current = false;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(updateNavbar);
        ticking.current = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [updateNavbar]);

  const CONTRACT_ADDRESS = "0x13e2a004ea4c77412c9806daadafd09de65645a3";

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        fetchNFTBalance(accounts[0]);
      }
    }
  };

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
        setWalletModal(false);
        fetchNFTBalance(accounts[0]);
      }
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setFrogsHeld(0);
    setWalletHover(false);
  };

  const fetchNFTBalance = async (walletAddress) => {
    setLoadingNFTs(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contractABI = ["function balanceOf(address owner) view returns (uint256)"];
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
      const balance = await contract.balanceOf(walletAddress);
      setFrogsHeld(balance.toString());
    } catch (error) {
      console.error("Failed to fetch NFT balance:", error);
    } finally {
      setLoadingNFTs(false);
    }
  };

  const shortenAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const navItem = "relative font-bold text-[13px] uppercase tracking-[0.2em] text-black hover:text-black/60 transition-all duration-300 hover:scale-[1.05] flex items-center gap-1 group";

  return (
    <>
      <nav className={`fixed left-0 right-0 top-0 z-[100] transition-all duration-500 ease-in-out ${
        isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-black/5' : 'bg-transparent'
      } ${
        showNavbar ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between transition-all duration-500 ${isScrolled ? 'h-16 lg:h-16 py-2' : 'h-20 lg:h-24 py-4'}`}>
            
            {/* Logo - Hard Left */}
            <Link to="/" className="flex-shrink-0 hover:scale-110 transition-transform duration-300">
              <img src={logo} alt="Bad Frogs" className="w-10 h-10 lg:w-12 lg:h-12 object-contain" />
            </Link>

            {/* Center Menu - Perfectly Centered */}
            <div className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2 items-center space-x-12">
              <Link to="/about" className={navItem}>About</Link>
              <Link to="/gallery" className={navItem}>Gallery</Link>
              
              {/* Socials Dropdown with Arrow */}
              <div 
                className="relative group" 
                onMouseEnter={() => setSocialsHover(true)} 
                onMouseLeave={() => setSocialsHover(false)}
              >
                <span className={navItem}>
                  Socials
                  <svg className={`w-3 h-3 transition-transform duration-300 group-hover:rotate-180 ${socialsHover ? 'rotate-0' : '-rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 bg-white/95 backdrop-blur-xl border border-black/20 shadow-xl rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 py-3 border-opacity-50 overflow-hidden">
                  <a href="https://discord.gg/badfrogs" target="_blank" rel="noopener noreferrer" className="block px-6 py-3 text-sm font-medium hover:bg-black/5 rounded-xl transition-all duration-200 flex items-center gap-3 group/item">
                    <span className="text-xl">💬</span>
                    Discord
                  </a>
                  <a href="https://x.com/BadFrogs1744" target="_blank" rel="noopener noreferrer" className="block px-6 py-3 text-sm font-medium hover:bg-black/5 rounded-xl transition-all duration-200 flex items-center gap-3 group/item">
                    <span className="text-xl">🐦</span>
                    X
                  </a>
                </div>
              </div>
              
              <a href="https://opensea.io/collection/badfrogs" target="_blank" rel="noopener noreferrer" className={navItem}>Collect</a>
            </div>

            {/* Connect/Profile - Hard Right */}
            <div className="flex items-center space-x-4 ml-auto">
              {account ? (
                <div className="relative group" onMouseEnter={() => setWalletHover(true)} onMouseLeave={() => setWalletHover(false)}>
                  <span className={`${navItem} text-xs px-4 py-2.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white/90 hover:shadow-md border border-black/20 font-semibold min-w-[140px] justify-center`}>
                    {shortenAddress(account)}
                    <svg className={`w-3 h-3 ml-1 transition-transform duration-300 group-hover:rotate-180 ${walletHover ? 'rotate-0' : '-rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                  <div className={`absolute top-full right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl border border-black/20 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 rounded-3xl overflow-hidden`}>
                    <div className="p-6">
                      <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-black/10">
                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                          <span className="text-2xl">🐸</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm tracking-wide">{shortenAddress(account)}</p>
                          <button onClick={() => navigator.clipboard.writeText(account)} className="text-xs uppercase tracking-wider text-black/60 hover:text-black hover:underline mt-1 transition-all duration-200">Copy</button>
                        </div>
                      </div>
                      <div className="mb-6 pb-6 border-b border-black/10">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-semibold uppercase tracking-wider">Bad Frogs</span>
                          <Link to={`/profile/${account}`} className="text-xs uppercase tracking-wider text-black/60 hover:text-black hover:underline">View →</Link>
                        </div>
                        <div className="flex items-center space-x-4 p-4 bg-black/5 border border-black/10 rounded-2xl hover:bg-black/10 transition-all duration-200">
                          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">{frogsHeld || 0}</span>
                          </div>
                          <div>
                            <p className="text-3xl font-bold">{frogsHeld || 0}</p>
                            <p className="text-xs uppercase tracking-wider font-semibold text-black/70">Bad Frogs</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 pt-4">
                        <Link to={`/profile/${account}`} className="block w-full text-center py-3 px-6 text-sm uppercase tracking-wider font-semibold bg-black text-white hover:bg-black/90 rounded-2xl transition-all duration-300 hover:scale-[1.02]">
                          View Profile
                        </Link>
                        <button onClick={disconnectWallet} className="w-full py-3 px-6 text-sm uppercase tracking-wider font-semibold text-black hover:bg-black hover:text-white border border-black rounded-2xl transition-all duration-300 hover:scale-[1.02]">
                          Disconnect
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setWalletModal(true)}
                  className="group relative inline-flex items-center justify-center text-xs lg:text-sm px-6 py-3 rounded-2xl bg-black text-white hover:bg-black/80 transition-all duration-500 hover:scale-[1.03] font-bold uppercase tracking-[0.1em] shadow-[0_4px_14px_0_rgba(0,0,0,0.25)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] backdrop-blur-sm"
                >
                  Connect
                </button>
              )}

              {/* Mobile Menu Button */}
              <button className="lg:hidden p-2 rounded-xl hover:bg-white/50 backdrop-blur-sm transition-all duration-300 hover:scale-110" onClick={() => setOpen(!open)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu - Updated with transparent style */}
      {open && (
        <div className={`fixed top-20 left-0 right-0 lg:hidden z-40 backdrop-blur-md bg-white/80 border-b-2 border-black/10 shadow-xl transition-all duration-500`}>
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex flex-col space-y-8 text-center">
              <Link to="/about" onClick={() => setOpen(false)} className={`${navItem} text-xl py-3 font-semibold`}>About</Link>
              <Link to="/gallery" onClick={() => setOpen(false)} className={`${navItem} text-xl py-3 font-semibold`}>Gallery</Link>
              <div className="relative group">
                <span className={`${navItem} text-xl py-3 font-semibold justify-center`}>Socials</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 bg-white/95 backdrop-blur-xl border border-black/20 shadow-xl rounded-2xl py-4 z-10">
                  <a href="https://discord.gg/badfrogs" target="_blank" rel="noopener noreferrer" className="block px-6 py-4 text-lg font-semibold hover:bg-black/5 rounded-xl flex items-center gap-4 mx-auto w-fit">💬 Discord</a>
                  <a href="https://x.com/BadFrogs1744" target="_blank" rel="noopener noreferrer" className="block px-6 py-4 text-lg font-semibold hover:bg-black/5 rounded-xl flex items-center gap-4 mx-auto w-fit mt-2">🐦 X</a>
                </div>
              </div>
              <a href="https://opensea.io/collection/badfrogs" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={`${navItem} text-xl py-3 font-semibold`}>Collect</a>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Modal - unchanged */}
      {walletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4">
          <div className="bg-white border-4 border-black max-w-md w-full shadow-2xl rounded-3xl overflow-hidden">
            <div className="p-8 text-center">
              <h3 className="text-2xl font-bold uppercase tracking-[0.1em] mb-8">Connect Wallet</h3>
              <button
                onClick={connectWallet}
                className="w-full flex items-center justify-center gap-3 py-6 text-lg font-semibold uppercase tracking-[0.05em] border-4 border-black hover:bg-black hover:text-white transition-all duration-300 hover:scale-[1.02] rounded-3xl mb-6 bg-white"
              >
                <span className="text-2xl">🦊</span>
                <span>Metamask</span>
              </button>
              <button
                onClick={() => setWalletModal(false)}
                className="w-full py-4 text-lg font-semibold uppercase tracking-[0.05em] border-t-2 border-black hover:bg-black hover:text-white transition-all duration-300 hover:scale-[1.02] bg-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;