import React, { useState, useRef, useCallback } from 'react';
import { Rnd } from 'react-rnd';

export default function WindowFrame({
  title,
  children,
  onClose,
  onFocus,
  onMinimize,
  zIndex,
  isMinimized = false,
  defaultWidth = 800,
  defaultHeight = 600,
}) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [prevBounds, setPrevBounds] = useState(null);
  const rndRef = useRef(null);

  const handleMinimize = useCallback(() => {
    if (onMinimize) onMinimize();
  }, [onMinimize]);

  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      // Restore
      setIsMaximized(false);
      if (rndRef.current && prevBounds) {
        rndRef.current.updatePosition({ x: prevBounds.x, y: prevBounds.y });
        rndRef.current.updateSize({ width: prevBounds.width, height: prevBounds.height });
      }
    } else {
      // Save current bounds before maximizing
      if (rndRef.current) {
        const el = rndRef.current.getSelfElement();
        if (el) {
          setPrevBounds({
            x: parseInt(el.style.left) || el.offsetLeft || 0,
            y: parseInt(el.style.top) || el.offsetTop || 0,
            width: el.offsetWidth,
            height: el.offsetHeight,
          });
        }
      }
      setIsMaximized(true);
      if (rndRef.current) {
        rndRef.current.updatePosition({ x: 0, y: 0 });
        rndRef.current.updateSize({
          width: window.innerWidth,
          height: window.innerHeight - 30, // leave room for taskbar
        });
      }
    }
  }, [isMaximized, prevBounds]);

  const handleTitleBarDoubleClick = useCallback((e) => {
    // Only trigger on the title bar itself, not the control buttons
    if (e.target.closest('.title-bar-controls')) return;
    handleMaximize();
  }, [handleMaximize]);

  if (isMinimized) return null;

  return (
    <Rnd
      ref={rndRef}
      default={{
        x: Math.max(0, window.innerWidth / 2 - defaultWidth / 2 + Math.random() * 40 - 20),
        y: Math.max(0, window.innerHeight / 2 - defaultHeight / 2 + Math.random() * 40 - 20),
        width: defaultWidth,
        height: defaultHeight,
      }}
      minWidth={300}
      minHeight={200}
      bounds="parent"
      dragHandleClassName="title-bar-drag"
      onMouseDown={onFocus}
      style={{ zIndex, display: isMinimized ? 'none' : 'flex' }}
      className="window shadow-md flex flex-col absolute"
      disableDragging={isMaximized}
      enableResizing={!isMaximized}
    >
      <div
        className="title-bar title-bar-drag"
        style={{ height: '25px', flexShrink: 0 }}
        onDoubleClick={handleTitleBarDoubleClick}
      >
        <div className="title-bar-text" style={{ pointerEvents: 'none' }}>{title}</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={handleMinimize} />
          <button aria-label="Maximize" onClick={handleMaximize} />
          <button aria-label="Close" onClick={onClose} />
        </div>
      </div>
      <div
        className="window-body m-0 p-0 flex flex-col"
        style={{
          height: 'calc(100% - 25px)',
          overflow: 'hidden',
          backgroundColor: '#c0c0c0',
        }}
      >
        {children}
      </div>
    </Rnd>
  );
}
