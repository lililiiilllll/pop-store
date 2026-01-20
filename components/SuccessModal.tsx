import React from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <div className="fixed inset-0 bg-black/50 z-50">Success Modal</div>;
};

export default SuccessModal;