import React from 'react';

interface CategoryFilterProps {
  selected: string;
  onSelect: (filter: string) => void;
  showLikedOnly: boolean;
  onToggleLiked: () => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = (props) => {
  return <div className="p-2">Category Filter</div>;
};

export default CategoryFilter;