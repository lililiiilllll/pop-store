import React from 'react';

interface NicknameModalProps {
  isOpen: boolean;
  userId: string;
  onSuccess: () => void;
}

const NicknameModal: React.FC<NicknameModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <div className="fixed inset-0 bg-black/50 z-50">Nickname Modal</div>;
};

export default NicknameModal;