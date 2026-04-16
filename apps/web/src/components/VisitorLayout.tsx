import React from 'react';
import { SmartLanguageFAB } from './SmartLanguageFAB';
import '../visitor.css';

interface VisitorLayoutProps {
  children: React.ReactNode;
  hideLanguage?: boolean;
}

export function VisitorLayout({ children, hideLanguage = false }: VisitorLayoutProps) {
  return (
    <div className="visitor-viewport">
      <div className="visitor-phone">
        {/*
          Top immersive fade — visually blends the device status bar into the
          app background. Works on both browsers and PWA/fullscreen mode.
        */}
        <div className="visitor-top-fade" aria-hidden="true" />

        {/* Floating Language FAB - Draggable and Persistent */}
        {!hideLanguage && <SmartLanguageFAB />}



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
