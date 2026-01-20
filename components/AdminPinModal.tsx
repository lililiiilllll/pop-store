import React from 'react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AdminPinModal: React.FC<AdminPinModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <div className="fixed inset-0 bg-black/50 z-50">Admin Pin Modal</div>;
};

export default AdminPinModal;