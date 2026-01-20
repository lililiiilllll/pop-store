import React from 'react';
import { PopupStore } from '../types';

interface PopupListProps {
  stores: PopupStore[];
  selectedStoreId: string | null;
  onStoreSelect: (id: string) => void;
}

const PopupList: React.FC<PopupListProps> = (props) => {
  return <div className="p-4">Popup List</div>;
};

export default PopupList;