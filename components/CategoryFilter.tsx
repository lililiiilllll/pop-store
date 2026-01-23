// components/CategoryFilter.tsx
import React from 'react';

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

const categories = ["전체", "무료입장", "이벤트", "체험/전시", "게임", "캐릭터", "패션"];

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selected, onSelect }) => {
  return (
    <div className="bg-white">
      <div className="flex items-center gap-2 overflow-x-auto px-5 py-3 no-scrollbar active:cursor-grabbing">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`px-4 py-2 rounded-full text-[14px] font-semibold whitespace-nowrap transition-all duration-200
              ${selected === cat 
                ? 'bg-[#3182f6] text-white shadow-sm' // 토스 메인 블루 컬러
                : 'bg-[#f2f4f6] text-[#4e5968] hover:bg-[#ebedf0]' // 토스 연회색 배경 및 텍스트 컬러
              }`}
          >
            {cat}
          </button>
        ))}
        {/* 우측 끝 여백 확보를 위한 더미 div */}
        <div className="min-w-[20px] h-1" />
      </div>
    </div>
  );
};

export default CategoryFilter;
