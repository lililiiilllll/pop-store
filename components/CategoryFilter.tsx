// components/CategoryFilter.tsx
import React from 'react';

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

const categories = ["전체", "무료입장", "이벤트", "체험/전시", "게임", "캐릭터", "패션"];

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selected, onSelect }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-5 py-3 no-scrollbar border-b border-gray-50 bg-white">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all
            ${selected === cat 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
