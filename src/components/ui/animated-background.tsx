import React from 'react';

interface AnimatedBackgroundProps {
  className?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ className = "" }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Animated grain texture */}
      <div className="absolute inset-0 opacity-30">
        <div 
          className="w-full h-full bg-repeat animate-pulse"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
            animation: 'grain 8s steps(10) infinite'
          }}
        />
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/20 via-background/10 to-background/30" />
    </div>
  );
};