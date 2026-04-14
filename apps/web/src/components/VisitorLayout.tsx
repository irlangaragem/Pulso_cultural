import React from 'react';
import { LanguageSelector } from './LanguageSelector';
import '../visitor.css';

interface VisitorLayoutProps {
  children: React.ReactNode;
}

export function VisitorLayout({ children }: VisitorLayoutProps) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="visitor-viewport">
      <div className="visitor-phone">
        <LanguageSelector />
        {/* Status Bar */}
        <div className="visitor-status-bar">
          <span style={{ fontSize: 11, fontWeight: 600 }}>{timeStr}</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {/* Wi-Fi icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#F5ECE4">
              <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.24 4.24 0 0 0-6 0zm-4-4l2 2a7.07 7.07 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
            </svg>
            {/* Signal icon */}
            <svg width="16" height="14" viewBox="0 0 24 14" fill="#F5ECE4">
              <rect x="0" y="8" width="4" height="6" rx="0.5" opacity=".4" />
              <rect x="6" y="5" width="4" height="9" rx="0.5" opacity=".6" />
              <rect x="12" y="2" width="4" height="12" rx="0.5" opacity=".8" />
              <rect x="18" y="0" width="4" height="14" rx="0.5" />
            </svg>
          </div>
        </div>

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
