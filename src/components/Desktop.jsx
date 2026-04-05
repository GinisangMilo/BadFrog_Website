import React, { useState, useMemo } from 'react';
import Draggable from 'react-draggable';
import DesktopIcon from './DesktopIcon';
import WindowFrame from './WindowFrame';
import Gallery from '../pages/Gallery';
import Profile from '../pages/Profile';
import MyFrogs from '../pages/MyFrogs';
import BurnFolder from '../pages/BurnFolder';
import NftTransfer from './NftTransfer';

import Taskbar from './Taskbar';
import { ethers } from "ethers";
import { useBootData } from '../context/BootDataContext';
import { Computer3, Folder, RecycleEmpty, RecycleFull, FolderExe, Ie, Network3 } from '@react95/icons';

const CONTRACT_ADDRESS = "0x13e2a004ea4c77412c9806daadafd09de65645a3";
const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";

export default function Desktop({ account, frogsHeld, connectWallet, disconnectWallet, walletModal, setWalletModal, globalNfts }) {
  const [windows, setWindows] = useState([]);
  const [minimizedWindows, setMinimizedWindows] = useState(new Set());
  const [burnTarget, setBurnTarget] = useState(null);
  const [burnQueue, setBurnQueue] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [openStart, setOpenStart] = useState(false);

  React.useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const focusWindow = (id) => {
    // Un-minimize if minimized
    setMinimizedWindows(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setWindows(prev => {
      const idx = prev.findIndex(w => w.id === id);
      if (idx === -1) return prev;
      const filtered = prev.filter(w => w.id !== id);
      return [...filtered, prev[idx]];
    });
  };

  const openWindow = (id, title, content, windowProps = {}) => {
    if (!windows.find(w => w.id === id)) {
      setWindows(prev => [...prev, { id, title, content, windowProps }]);
    } else {
      focusWindow(id);
    }
  };

  const closeWindow = (id) => {
    setWindows(prev => prev.filter(w => w.id !== id));
    setMinimizedWindows(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const minimizeWindow = (id) => {
    setMinimizedWindows(prev => new Set(prev).add(id));
  };

  const openGallery = () => {
    openWindow('gallery', 'Gallery', <Gallery isWindowed={true} openWindow={openWindow} globalNfts={globalNfts} />);
  };

  const openProfile = () => {
    openWindow('profile', 'My Computer - Profile', <Profile account={account} isWindowed={true} openWindow={openWindow} />);
  };

  const openMyFrogs = () => {
    openWindow('myfrogs', 'My Bad Frogs', null);
  };

  const openBurn = () => {
    openWindow('burn', 'Burn Bin', null);
  };

  const openTransfer = () => {
    openWindow('transfer', 'NFT Transfer', null);
  };



  const removeFromBurnQueue = (identifier) => {
    setBurnQueue(prev => prev.filter(item => item.identifier !== identifier));
  };

  const addToBurnQueue = (nft) => {
    setBurnQueue(prev => {
      if (prev.find(item => item.identifier === nft.identifier)) return prev;
      return [...prev, nft];
    });
  };

  const handleRecycleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('brightness-50');
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.action === 'burn' && data.nft) addToBurnQueue(data.nft);
    } catch (e) { }
  };

  const executeTrueBurn = async () => {
    if (!window.ethereum) return alert('No wallet connected!');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractABI = ["function safeTransferFrom(address from, address to, uint256 tokenId)"];
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      const txPromises = burnQueue.map(item => contract.safeTransferFrom(account, BURN_ADDRESS, item.identifier));
      await Promise.all(txPromises);

      setBurnQueue([]);
      closeWindow('burnConfirm');
      alert(`Queued ${burnQueue.length} destruction transactions to your wallet!`);
    } catch (err) {
      console.error(err);
      alert("Burn execution failed or was rejected: " + (err.shortMessage || err.message));
    }
  };

  const emptyBurnBin = () => {
    setContextMenu(null);
    if (burnQueue.length === 0) return;
    openWindow('burnConfirm', 'Caution: Empty Burn Bin', (
      <div className="p-4 bg-[#c0c0c0] font-sans h-full">
        <div className="flex gap-4 items-center">
          <span className="text-4xl">⚠️</span>
          <p className="font-bold pt-2 mb-4">Are you sure you want to permanently destroy {burnQueue.length} item(s)?</p>
        </div>
        <div className="flex justify-center mt-2">
          <button onClick={executeTrueBurn} className="px-6 py-2 border-[2px] bg-[#c0c0c0] font-bold active:pt-1 active:-mb-1 flex shadow-sm" style={{ boxShadow: 'inset -2px -2px #0a0a0a, inset 2px 2px #fff, inset -1px -1px grey, inset 1px 1px #dfdfdf' }}>Empty Bin</button>
        </div>
      </div>
    ), { defaultWidth: 400, defaultHeight: 200 });
  };

  // Desktop icon definitions with grid positions
  const desktopIcons = [
    {
      id: 'mycomputer',
      icon: <Computer3 variant="32x32_4" />,
      label: 'My Computer',
      onClick: openProfile,
      defaultPos: { x: 20, y: 20 },
      alwaysShow: true,
    },
    {
      id: 'gallery',
      icon: <Folder variant="32x32_4" />,
      label: 'Gallery',
      onClick: openGallery,
      defaultPos: { x: 20, y: 110 },
      alwaysShow: true,
    },
    {
      id: 'burnbin',
      icon: burnQueue.length > 0 ? <RecycleFull variant="32x32_4" /> : <RecycleEmpty variant="32x32_4" />,
      label: 'Burn Bin',
      onClick: openBurn,
      defaultPos: { x: 20, y: 200 },
      alwaysShow: true,
      onDrop: handleRecycleDrop,
      onContextMenu: (e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      },
    },
    {
      id: 'explorer',
      icon: <Ie variant="16x16_8" />,
      label: 'Bad Frogs Explorer',
      onClick: () => window.open('https://opensea.io/collection/badfrogs', '_blank'),
      defaultPos: { x: 20, y: 290 },
      alwaysShow: true,
    },
    {
      id: 'myfrogs',
      icon: <FolderExe variant="32x32_4" />,
      label: 'My Bad Frogs',
      onClick: openMyFrogs,
      defaultPos: { x: 20, y: 380 },
      alwaysShow: false,
      requiresAccount: true,
    },
    {
      id: 'transfer',
      icon: <Network3 variant="32x32_4" />,
      label: 'NFT Transfer',
      onClick: openTransfer,
      defaultPos: { x: 20, y: 470 },
      alwaysShow: false,
      requiresAccount: true,
    },
  ];

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundColor: '#008080' }}
    >
      {/* Desktop icons area */}
      <div className="absolute inset-0 z-0 select-none" style={{ paddingBottom: '30px' }}>
        {desktopIcons
          .filter(icon => icon.alwaysShow || (icon.requiresAccount && account))
          .map(icon => (
            <DraggableDesktopIcon
              key={icon.id}
              icon={icon.icon}
              label={icon.label}
              onClick={icon.onClick}
              defaultPos={icon.defaultPos}
              onDrop={icon.onDrop}
              onContextMenu={icon.onContextMenu}
            />
          ))}
      </div>

      {/* Windows */}
      {windows.map((win, idx) => (
        <WindowFrame
          key={win.id}
          title={win.title}
          onClose={() => closeWindow(win.id)}
          onFocus={() => focusWindow(win.id)}
          onMinimize={() => minimizeWindow(win.id)}
          isMinimized={minimizedWindows.has(win.id)}
          zIndex={10 + idx}
          {...(win.windowProps || {})}
        >
          {win.id === 'burn'
            ? <BurnFolder
                nfts={burnQueue}
                openWindow={openWindow}
                onRemove={removeFromBurnQueue}
                onDrop={addToBurnQueue}
              />
            : win.id === 'myfrogs'
            ? <MyFrogs
                account={account}
                isWindowed={true}
                openWindow={openWindow}
                burnQueue={burnQueue}
                onAddToBurn={addToBurnQueue}
              />
            : win.id === 'transfer'
            ? <NftTransfer
                account={account}
                openWindow={openWindow}
              />
            : win.content
          }
        </WindowFrame>
      ))}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="absolute bg-[#c0c0c0] border-2 border-white border-r-gray-500 border-b-gray-500 shadow-md p-1 min-w-[150px] z-[100]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div
            className={`px-4 py-1 text-sm cursor-pointer ${burnQueue.length > 0 ? 'hover:bg-[#000080] hover:text-white text-black' : 'text-gray-500'}`}
            onClick={emptyBurnBin}
          >
            Empty Burn Bin
          </div>
        </div>
      )}

      <Taskbar
        account={account}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        openStart={openStart}
        setOpenStart={setOpenStart}
        openWindow={openWindow}
        windows={windows}
        focusWindow={focusWindow}
        minimizedWindows={minimizedWindows}
      />
    </div>
  );
}

/* Draggable wrapper for desktop icons with click-vs-drag detection */
function DraggableDesktopIcon({ icon, label, onClick, defaultPos, onDrop, onContextMenu }) {
  const [dragged, setDragged] = useState(false);
  const nodeRef = React.useRef(null);

  const handleStart = () => setDragged(false);
  const handleDrag = () => setDragged(true);
  const handleStop = () => {
    // Small delay so onClick can check dragged state
    setTimeout(() => setDragged(false), 50);
  };

  const handleClick = (e) => {
    if (dragged) {
      e.stopPropagation();
      return;
    }
    onClick();
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      defaultPosition={defaultPos}
      bounds="parent"
      onStart={handleStart}
      onDrag={handleDrag}
      onStop={handleStop}
    >
      <div
        ref={nodeRef}
        className="absolute z-[5]"
        onDrop={onDrop}
        onDragOver={onDrop ? (e) => { e.preventDefault(); e.currentTarget.classList.add('brightness-50'); } : undefined}
        onDragLeave={onDrop ? (e) => { e.currentTarget.classList.remove('brightness-50'); } : undefined}
        onContextMenu={onContextMenu}
      >
        <DesktopIcon
          icon={icon}
          label={label}
          onClick={handleClick}
        />
      </div>
    </Draggable>
  );
}
