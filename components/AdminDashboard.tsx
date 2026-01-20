import React from 'react';
import { PopupStore } from '../types';

interface AdminDashboardProps {
  allStores: PopupStore[];
  isAdmin: boolean;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onBack: () => void;
  onRefresh: (retryCount?: number) => Promise<void>;
  onShowSuccess: (title: string, message: string, onConfirm?: () => void) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  return <div className="fixed inset-0 bg-white z-50">Admin Dashboard</div>;
};

export default AdminDashboard;