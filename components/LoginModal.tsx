import React from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <div className="fixed inset-0 bg-black/50 z-50">Login Modal</div>;
};

export default LoginModal;