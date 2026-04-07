import React from 'react';
import { PulseSymbol } from './PulseSymbol';

interface ShareCardProps {
  visitorName: string;
  exhibitionTitle: string;
  date: string;
  idRef: React.RefObject<HTMLDivElement | null>;
}

export function ShareCard({ visitorName, exhibitionTitle, date, idRef }: ShareCardProps) {
  return (
    <div 
      ref={idRef}
      style={{
        width: '320px',
        height: '420px',
        background: '#0D090A',
        color: '#F5ECE4',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        fontFamily: 'Sora, sans-serif'
      }}
    >
      {/* Decorative glow */}
      <div 
        style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(232, 85, 78, 0.15) 0%, transparent 70%)',
          filter: 'blur(20px)',
          pointerEvents: 'none'
        }} 
      />

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
          <PulseSymbol size={24} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>PULSO</span>
            <span style={{ fontWeight: 300, fontSize: 8, color: '#A8969A', letterSpacing: 3 }}>CULTURAL</span>
          </div>
        </div>

        <p style={{ 
          fontFamily: "'Space Mono', monospace", 
          fontSize: 10, 
          color: '#E8554E', 
          letterSpacing: 3, 
          marginBottom: 12 
        }}>
          VISITA REGISTRADA
        </p>
        
        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 700, 
          lineHeight: 1.1, 
          marginBottom: 16,
          background: 'linear-gradient(135deg, #F5ECE4 0%, #A8969A 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {visitorName.split(' ')[0]} fez a cultura pulsar.
        </h1>
        
        <p style={{ fontSize: 14, color: '#A8969A', lineHeight: 1.5 }}>
          No Museu de Arte Moderna da Bahia, mergulhando em:
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#F5ECE4', marginTop: 4 }}>
          {exhibitionTitle}
        </p>
      </div>

      {/* Footer */}
      <div>
        <div style={{ 
          height: '1px', 
          background: 'linear-gradient(90deg, rgba(232, 85, 78, 0.4), transparent)', 
          marginBottom: 20 
        }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#6B5A60', marginBottom: 4 }}>
              DATA
            </p>
            <p style={{ fontSize: 13, fontWeight: 500 }}>{date}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#6B5A60', marginBottom: 4 }}>
              LOCAL
            </p>
            <p style={{ fontSize: 13, fontWeight: 500 }}>MAM Bahia</p>
          </div>
        </div>
      </div>
    </div>
  );
}
