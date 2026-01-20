import React from 'react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStore: (formData: any) => Promise<boolean>;
  prefillData: { lat: number; lng: number; address: string } | null;
  onStartSelectLocation: () => void;
  onShowSuccess: (title: string, message: string, onConfirm?: () => void) => void;
}

const ReportModal: React.FC<ReportModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <div className="fixed inset-0 bg-black/50 z-50">Report Modal</div>;
};

export default ReportModal;