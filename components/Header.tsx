import React from 'react';
import { UserProfile } from '../types';

interface HeaderProps {
  location: string;
  onAdminClick: () => void;
  onLocationClick: () => void;
  onSearchClick: () => void;
  onReportClick: () => void;
  userProfile: UserProfile | null;
  onProfileClick: () => void;
  onNotificationClick: () => void;
  hasUnreadNotifications: boolean;
}

const Header: React.FC<HeaderProps> = (props) => {
  return <div className="p-4 border-b bg-white">Header</div>;
};

export default Header;