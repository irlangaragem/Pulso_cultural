import React from 'react';
import { LanguageSelector } from './LanguageSelector';
import '../visitor.css';

interface VisitorLayoutProps {
  children: React.ReactNode;
}

export function VisitorLayout({ children }: VisitorLayoutProps) {
  return (
    <div className="visitor-viewport">
      <div className="visitor-phone">
        {/*
          Top immersive fade — visually blends the device status bar into the
          app background. Works on both browsers and PWA/fullscreen mode.
        */}
        <div className="visitor-top-fade" aria-hidden="true" />

        {/* Language selector sits below the safe-area, inside the fade */}
        <LanguageSelector />

        {/* Page Content */}
        <div className="visitor-content">
          {children}
        </div>

        {/* Home Indicator */}
        <div className="visitor-home-indicator">
          <div className="visitor-home-bar" />
        </div>
      </div>
    </div>
  );
}
