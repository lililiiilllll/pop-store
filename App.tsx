import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAnimation, useDragControls, PanInfo, motion } from 'framer-motion';
import { Icons, POPUP_STORES, DEFAULT_POPUP_IMAGE } from './constants';
import Header from './components/Header';
import MapArea from './components/MapArea';
import PopupList from './components/PopupList';
import CategoryFilter from './components/CategoryFilter';
import ReportModal from './components/ReportModal';
import AdminDashboard from './components/AdminDashboard';
import DetailModal from './components/DetailModal';
import SearchOverlay from './components/SearchOverlay';
import LocationSelector from './components/LocationSelector';
import AlertModal from './components/AlertModal';
import SuccessModal from './components/SuccessModal';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
import NicknameModal from './components/NicknameModal';
import BottomNav from './components/BottomNav';
import SavedView from './components/SavedView';
import NotificationList from './components/NotificationList';
import AdminPinModal from './components/AdminPinModal';
import { PopupStore, UserProfile, AppNotification } from './types';
import { supabase, isSupabaseConfigured, getProfile, fetchNotifications, markNotificationAsRead } from './lib/supabase';

// 서울역 기본 좌표
const DEFAULT_LOCATION = { lat: 37.5547, lng: 126.9706 };

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const checkIsOpenNow = (store: PopupStore) => {
  if (!store?.openTime || !store?.closeTime) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  try {
    const [openH, openM] = store.openTime.split(':').map(Number);
    const [closeH, closeM] = store.closeTime.split(':').map(Number);
    return currentMinutes >= (openH * 60 + openM) && currentMinutes < (closeH * 60 + closeM);
  } catch (e) {
    return false;
  }
};

const checkIsEnded = (store: PopupStore) => {
  if (store?.isPermanent) return false;
  if (!store?.
