import React from 'react';
import { PopupStore } from '../types';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  stores: PopupStore[];
  onSelectResult: (store: PopupStore) => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = (props) => {
  if (!props.isOpen) return null;
  return <div className="fixed inset-0 bg-white z-50">Search Overlay</div>;
};

export default SearchOverlay;