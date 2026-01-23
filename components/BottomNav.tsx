import React from 'react';

interface BottomNavProps {
  activeTab: 'home' | 'saved';
  onTabChange: (tab: 'home' | 'saved') => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex justify-around items-center py-3 pb-6 z-50">
      <button 
        onClick={() => onTabChange('home')}
        className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-400'}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill={activeTab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span className="text-[11px] font-bold">홈</span>
      </button>

      <button 
        onClick={() => onTabChange('saved')}
        className={`flex flex-col items-center gap-1 ${activeTab === 'saved' ? 'text-blue-600' : 'text-gray-400'}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill={activeTab === 'saved' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        <span className="text-[11px] font-bold">저장됨</span>
      </button>
    </div>
  );
};

export default BottomNav;
