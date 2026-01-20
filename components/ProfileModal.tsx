import React from 'react';
import { PopupStore, UserProfile } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  likedStores: PopupStore[];
}

const ProfileModal: React.FC<ProfileModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <div className="fixed inset-0 bg-black/50 z-50">Profile Modal</div>;
};

export default ProfileModal;