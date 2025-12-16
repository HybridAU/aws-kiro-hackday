import React from 'react';

interface SplitScreenLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  userRole: 'applicant' | 'admin';
}

export function SplitScreenLayout({ leftPanel, rightPanel }: SplitScreenLayoutProps) {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - AI Companion (scrolls internally) */}
      <div className="w-1/2 border-r border-dove-200 flex flex-col bg-white overflow-hidden">
        {leftPanel}
      </div>

      {/* Right Panel - Form or Dashboard (scrolls internally) */}
      <div className="w-1/2 flex flex-col bg-dove-50 overflow-y-auto">
        {rightPanel}
      </div>
    </div>
  );
}
