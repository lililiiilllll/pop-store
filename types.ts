// Existing types preserved
export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

export enum ViewMode {
  GRID = 'GRID',
  LIST = 'LIST'
}

export interface UserProfile {
  id: string;
  email: string;
  role?: string;
  name?: string;
  avatar_url?: string;
}

// New types for the Map App
export interface PopupStore {
  id: string;
  title: string;
  description: string;
  detailedContent?: string;
  period: string;
  category: string;
  location: string;
  lat: number;
  lng: number;
  imageUrl: string;
  instagramUrl?: string;
  is_verified: boolean;
  isHot: boolean;
  isPermanent: boolean;
  startDate?: string;
  endDate?: string;
  openTime?: string;
  closeTime?: string;
  operatingHours?: string;
  nearbyStation?: string;
  walkingTime?: number;
  isFree?: boolean;
  isReservationRequired?: boolean;
  distance?: number;
  isOpenNow?: boolean;
  isEnded?: boolean;
  rating?: number;
  reviews?: number;
}

export interface AppNotification {
  id: string;
  user_id: string;
  store_id?: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
