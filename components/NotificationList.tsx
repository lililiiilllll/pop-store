import React from 'react';
import { AppNotification } from '../types';

interface NotificationListProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onNotificationClick: (n: AppNotification) => void;
}

const NotificationList: React.FC<NotificationListProps> = (props) => {
  if (!props.isOpen) return null;
  return <div className="fixed inset-0 bg-white z-50">Notification List</div>;
};

export default NotificationList;