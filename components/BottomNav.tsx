import React from 'react';

interface BottomNavProps {
  activeTab: 'home' | 'saved';
  onTabChange: (tab: 'home' | 'saved') => void;
  className?: string;
}

const BottomNav: React.FC<BottomNavProps> = (props) => {
  return <div className={`h-16 bg-white border-t ${props.className || ''}`}>Bottom Nav</div>;
};

export default BottomNav;