import React from 'react';

const Logo: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="logo-gradient" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="100%" stopColor="#C084FC" />
      </linearGradient>
    </defs>
    <path d="M3 13.5l3-3 4 4 5-5 3 3" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 8.5l3-3 4 4 5-5 3 3" stroke="url(#logo-gradient)" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default Logo;
