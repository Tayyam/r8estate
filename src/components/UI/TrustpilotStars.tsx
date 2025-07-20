import React from 'react';

interface TrustpilotStarsProps {
  rating: number;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const TrustpilotStars: React.FC<TrustpilotStarsProps> = ({ 
  rating, 
  size = 'medium',
  className = ''
}) => {
  // Round rating to nearest integer for Trustpilot stars (1-5)
  const roundedRating = Math.max(1, Math.min(5, Math.round(rating)));
  
  // Size mapping
  const sizeMap = {
    small: '54px',
    medium: '108px', 
    large: '162px'
  };
  
  const width = sizeMap[size];
  const starUrl = `https://cdn.trustpilot.net/brand-assets/4.1.0/stars/stars-${roundedRating}.svg`;
  
  return (
    <img
      src={starUrl}
      alt={`Rated ${roundedRating} out of 5 stars`}
      width={width}
      className={`inline-block ${className}`}
      style={{ height: 'auto' }}
      loading="lazy"
    />
  );
};

export default TrustpilotStars;