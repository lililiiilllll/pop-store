import React from 'react';
import { PopupStore } from '../types';

interface SavedViewProps {
  stores: PopupStore[];
  onStoreClick: (store: PopupStore) => void;
}

const SavedView: React.FC<SavedViewProps> = (props) => {
  return <div className="p-4">Saved View</div>;
};

export default SavedView;