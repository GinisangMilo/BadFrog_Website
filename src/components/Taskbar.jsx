import React from 'react';
import { ethers } from 'ethers';
import { Logo } from '@react95/icons';
import { resolveDisplayName } from '../utils/displayName';

export default function Taskbar({ account, connectWallet, disconnectWallet, openStart, setOpenStart, openWindow, windows = [], focusWindow, minimizedWindows = new Set() }) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Determine which window is "active" (topmost, non-minimized)
  const activeWindowId = (() => {
    for (let i = windows.length - 1; i >= 0; i--) {
      if (!minimizedWindows.has(windows[i].id)) return windows[i].id;
    }
    return null;
  })();

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[30px] bg-[#c0c0c0] border-t-2 border-white flex items-center justify-between px-1 z-[9999]" style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf, inset -2px -2px grey, inset 2px 2px #fff' }}>

      <div className="relative">
        <button
          className="font-bold px-2 py-1 flex items-center justify-center gap-2"
          onClick={() => setOpenStart(!openStart)}
          style={{ height: '22px' }}
        >
          <span className="flex items-center justify-center -mt-1"><Logo variant="16x16_4" /></span> Start
        </button>

        {openStart && (
          <div className="absolute bottom-full left-0 mb-1 w-64 bg-[#c0c0c0] border-[2px]" style={{ boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf, inset -2px -2px grey, inset 2px 2px #fff' }}>
            <div className="flex">
              <div className="w-10 bg-[#000080] flex items-end justify-center pb-2 min-h-[250px]">
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-white font-bold text-lg tracking-widest whitespace-nowrap">
                  Bad Frogs 1744
                </div>
              </div>
              <div className="flex-1 py-1">
                <div className="border-b border-gray-400 pb-1 mb-1">
                  <button className="w-full text-left px-4 py-2 hover:bg-[#000080] hover:text-white flex gap-2 items-center" onClick={() => { window.open('https://x.com/BadFrogs1744', '_blank'); setOpenStart(false); }}>
                    <span>X (Twitter)</span>
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-[#000080] hover:text-white flex gap-2 items-center" onClick={() => { openWindow('discord', 'Discord', <div className="p-8 text-center text-lg font-bold">Coming Soon...</div>); setOpenStart(false); }}>
                    <span>Discord</span>
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-[#000080] hover:text-white flex gap-2 items-center" onClick={() => { openWindow('voting', 'Voting', <div className="p-8 text-center text-lg font-bold">Coming Soon...</div>); setOpenStart(false); }}>
                    <span>Voting</span>
                  </button>
                </div>
                {!account ? (
                  <button className="w-full text-left px-4 py-2 hover:bg-[#000080] hover:text-white" onClick={connectWallet}>
                    Connect Wallet
                  </button>
                ) : (
                  <>
                    <div className="mx-2 my-1 px-4 py-2 text-xs truncate border-[2px] bg-white font-bold text-[#000080]" style={{ boxShadow: 'inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey' }}>
                      {`${account.slice(0, 6)}...${account.slice(-4)}`}
                    </div>
                    <button className="w-full text-left px-4 py-2 hover:bg-[#000080] hover:text-white flex gap-2 items-center" onClick={disconnectWallet}>
                      🔌 <span className="font-bold border-b border-transparent">Log Off</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex px-2 gap-1 items-center overflow-x-hidden ml-2 h-[24px]">
        {windows.map(win => {
          const isActive = win.id === activeWindowId;
          const isMin = minimizedWindows.has(win.id);

          return (
            <button
              key={win.id}
              onClick={() => focusWindow(win.id)}
              className={`flex-1 max-w-[150px] px-2 py-1 text-xs truncate border-[2px] font-bold bg-[#c0c0c0] ${
                isActive
                  ? 'active:pt-1'
                  : ''
              }`}
              style={{
                boxShadow: isActive
                  ? 'inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey'
                  : 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf',
                fontWeight: isActive ? 'bold' : 'normal',
              }}
              title={win.title}
            >
              {win.title}
            </button>
          );
        })}
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0">
        <div className="px-2 py-1 border-[2px] text-xs h-[24px] flex items-center bg-[#c0c0c0]" style={{ boxShadow: 'inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey' }}>
          {time}
        </div>
      </div>
    </div>
  );
}
