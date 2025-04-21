import React, { useState } from 'react';

interface IconButtonProps {
  onClick: () => void;
  ariaLabel: string;
  title?: string;
  className?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export const IconButton: React.FC<IconButtonProps & { children: React.ReactNode }> = ({ 
  onClick, 
  ariaLabel, 
  title, 
  className = '',
  tooltipPosition = 'bottom',
  children 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <button 
      className={`icon-button ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      {children}
      {title && showTooltip && (
        <span className={`custom-tooltip tooltip-${tooltipPosition}`}>
          {title}
        </span>
      )}
    </button>
  );
};

export default IconButton; 