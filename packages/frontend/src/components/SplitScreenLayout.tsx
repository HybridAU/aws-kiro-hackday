import React, { useState, useCallback } from 'react';

interface SplitScreenLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  userRole: 'applicant' | 'admin';
}

export function SplitScreenLayout({ leftPanel, rightPanel }: SplitScreenLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(35); // percentage
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const container = e.currentTarget as HTMLElement;
      const rect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      // Clamp between 20% and 80%
      setLeftWidth(Math.min(80, Math.max(20, newWidth)));
    },
    [isDragging]
  );

  return (
    <div
      className="flex-1 flex overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Left Panel - AI Companion */}
      <div
        className="flex flex-col bg-white overflow-hidden"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPanel}
      </div>

      {/* Resizable Divider */}
      <div
        className={`w-1 cursor-col-resize hover:bg-dove-400 transition-colors ${
          isDragging ? 'bg-dove-500' : 'bg-dove-200'
        }`}
        onMouseDown={handleMouseDown}
      />

      {/* Right Panel - Form or Dashboard */}
      <div
        className="flex flex-col bg-dove-50 overflow-y-auto"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightPanel}
      </div>
    </div>
  );
}
