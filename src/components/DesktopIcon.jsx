import React from 'react';

export default function DesktopIcon({ icon, label, onClick, ...props }) {
  return (
    <div 
      className="flex flex-col items-center justify-center w-24 cursor-pointer group relative z-[5]"
      onClick={onClick}
      {...props}
    >
      <div className="mb-2 filter drop-shadow-md group-active:brightness-50 flex items-center justify-center pointer-events-none *:!w-16 *:!h-16" style={{ width: '64px', height: '64px' }}>
        {icon}
      </div>
      <div className="text-white text-xs text-center px-1 border border-transparent group-focus:border-dotted group-focus:border-white group-focus:bg-blue-600">
        {label}
      </div>
    </div>
  );
}
