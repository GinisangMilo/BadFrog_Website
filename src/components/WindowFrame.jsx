import React from 'react';
import { Rnd } from 'react-rnd';

export default function WindowFrame({ title, children, onClose, onFocus, zIndex, defaultWidth = 800, defaultHeight = 600 }) {
  return (
    <Rnd
      default={{
        x: window.innerWidth / 2 - (defaultWidth / 2),
        y: window.innerHeight / 2 - (defaultHeight / 2),
        width: defaultWidth,
        height: defaultHeight,
      }}
      minWidth={400}
      minHeight={300}
      bounds="window"
      dragHandleClassName="title-bar"
      onMouseDown={onFocus}
      style={{ zIndex }}
      className="window shadow-md flex flex-col absolute"
    >
      <div className="title-bar" style={{ height: '25px', flexShrink: 0 }}>
        <div className="title-bar-text">{title}</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" />
          <button aria-label="Maximize" />
          <button aria-label="Close" onClick={onClose} />
        </div>
      </div>
      <div className="window-body bg-[#c3d6ca] m-0 p-0 flex flex-col" style={{ height: 'calc(100% - 25px)', overflow: 'hidden' }}>
        {children}
      </div>
    </Rnd>
  );
}
