import React from 'react';

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <div className="fixed inset-0 bg-black/50 z-50">Alert Modal</div>;
};

export default AlertModal;