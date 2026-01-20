import React from 'react';
import { PopupStore, UserProfile } from '../types';

interface DetailModalProps {
  store: PopupStore | null;
  onClose: () => void;
  isLiked: boolean;
  onToggleLike: (id: string) => Promise<void>;
  isNotified: boolean;
  onToggleNotify: (id: string) => Promise<void>;
  userProfile: UserProfile | null;
  onLoginRequest: () => void;
  onShowSuccess: (title: string, message: string, onConfirm?: () => void) => void;
}

const DetailModal: React.FC<DetailModalProps> = (props) => {
  if (!props.store) return null;
  return <div className="fixed inset-0 bg-black/50 z-50">Detail Modal</div>;
};

export default DetailModal;