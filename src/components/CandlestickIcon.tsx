import React from 'react';

interface CandlestickIconProps {
  className?: string;
  size?: number;
}

export const CandlestickIcon: React.FC<CandlestickIconProps> = ({ 
  className = '', 
  size = 24 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Candlestick 1 - Red */}
      <rect x="2" y="8" width="2" height="6" fill="#ef4444" />
      <line x1="3" y1="6" x2="3" y2="8" stroke="#ef4444" strokeWidth="0.5" />
      <line x1="3" y1="14" x2="3" y2="16" stroke="#ef4444" strokeWidth="0.5" />
      
      {/* Candlestick 2 - Green */}
      <rect x="5" y="10" width="2" height="4" fill="#22c55e" />
      <line x1="6" y1="8" x2="6" y2="10" stroke="#22c55e" strokeWidth="0.5" />
      <line x1="6" y1="14" x2="6" y2="16" stroke="#22c55e" strokeWidth="0.5" />
      
      {/* Candlestick 3 - Red */}
      <rect x="8" y="9" width="2" height="5" fill="#ef4444" />
      <line x1="9" y1="7" x2="9" y2="9" stroke="#ef4444" strokeWidth="0.5" />
      <line x1="9" y1="14" x2="9" y2="16" stroke="#ef4444" strokeWidth="0.5" />
      
      {/* Candlestick 4 - Green (Tall) */}
      <rect x="11" y="4" width="2" height="10" fill="#22c55e" />
      <line x1="12" y1="2" x2="12" y2="4" stroke="#22c55e" strokeWidth="0.5" />
      <line x1="12" y1="14" x2="12" y2="16" stroke="#22c55e" strokeWidth="0.5" />
      
      {/* Candlestick 5 - Red */}
      <rect x="14" y="8" width="2" height="6" fill="#ef4444" />
      <line x1="15" y1="6" x2="15" y2="8" stroke="#ef4444" strokeWidth="0.5" />
      <line x1="15" y1="14" x2="15" y2="16" stroke="#ef4444" strokeWidth="0.5" />
      
      {/* Candlestick 6 - Green */}
      <rect x="17" y="10" width="2" height="4" fill="#22c55e" />
      <line x1="18" y1="8" x2="18" y2="10" stroke="#22c55e" strokeWidth="0.5" />
      <line x1="18" y1="14" x2="18" y2="16" stroke="#22c55e" strokeWidth="0.5" />
      
      {/* Trend line connecting data points */}
      <polyline
        points="3,7 6,12 9,8 12,3 15,7 18,11 21,11"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Data points (white circles) */}
      <circle cx="3" cy="7" r="1.5" fill="white" />
      <circle cx="6" cy="12" r="1.5" fill="white" />
      <circle cx="9" cy="8" r="1.5" fill="white" />
      <circle cx="12" cy="3" r="1.5" fill="white" />
      <circle cx="15" cy="7" r="1.5" fill="white" />
    </svg>
  );
};

export default CandlestickIcon;

