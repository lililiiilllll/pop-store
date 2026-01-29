import {
  MapPin,
  Search,
  User,
  Heart,
  Menu,
  Filter,
  Bell,
  ChevronLeft,
  Share2,
  Calendar,
  Clock,
  X,
  CheckCircle2,
  MoreHorizontal,
  Navigation,
  Star,
  Info,
  Crosshair,
  List
} from 'lucide-react';
import { PopupStore } from './types';

export const APP_NAME = 'Map App';

export const API_KEYS = {
  KAKAO_SDK: 'fc77c8038bee1ed7394555078cad0f37',
  KAKAO_REST: '288d3a04a588770fc54ac5c2a55b9421'
};

// 아이콘 매핑 객체
export const Icons = {
  MapPin,
  Search,
  User,
  Heart,
  Menu,
  Filter,
  Bell,
  ChevronLeft,
  Share2,
  Calendar,
  Clock,
  X,
  CheckCircle2,
  MoreHorizontal,
  Navigation,
  Star,
  Info,
  Crosshair,
  List
};

// 기본 이미지 URL
export const DEFAULT_IMAGES = {
  USER_AVATAR: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80',
  STORE_THUMBNAIL: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80',
  PLACEHOLDER: 'https://images.unsplash.com/photo-1572916198730-798b375b4306?q=80&w=600&auto=format&fit=crop'
};

export const DEFAULT_POPUP_IMAGE = "https://images.unsplash.com/photo-1531050171669-0101272b1416?q=80&w=800&auto=format&fit=crop"; 
// 또는 프로젝트 public 폴더에 이미지를 넣고 "/default-popup.png" 로 설정하세요.

// 팝업 스토어 카테고리
export const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'fashion', label: '패션' },
  { id: 'food', label: '푸드/음료' },
  { id: 'art', label: '예술/전시' },
  { id: 'tech', label: '테크/가전' },
  { id: 'character', label: '캐릭터' },
];

export const REGIONS = [
  { name: '성수', lat: 37.5445, lng: 127.0560 },
  { name: '강남', lat: 37.4979, lng: 127.0276 },
  { name: '홍대', lat: 37.5562, lng: 126.9225 },
  { name: '잠실', lat: 37.5133, lng: 127.1028 },
  { name: '한남', lat: 37.5317, lng: 127.0025 },
  { name: '여의도', lat: 37.5259, lng: 126.9242 },
  { name: '부산', lat: 35.1796, lng: 129.0756 },
  { name: '대구', lat: 35.8714, lng: 128.6014 },
  { name: '인천', lat: 37.4563, lng: 126.7052 },
  { name: '광주', lat: 35.1595, lng: 126.8526 },
  { name: '대전', lat: 36.3504, lng: 127.3845 },
  { name: '제주', lat: 33.4890, lng: 126.4983 },
];

// 샘플 팝업 스토어 데이터 (App.tsx PopupStore 인터페이스에 맞춤)
export const POPUP_STORES: PopupStore[] = [
  {
    id: '1',
    title: '빈티지 레코드 팝업',
    category: '예술/전시',
    description: '7080 희귀 LP판과 턴테이블을 만나볼 수 있는 특별한 공간입니다.',
    location: '서울 성동구 연무장길 15',
    lat: 37.5445,
    lng: 127.0560,
    startDate: '2023-10-20',
    endDate: '2023-11-05',
    imageUrl: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=800&auto=format&fit=crop',
    period: '2023.10.20 ~ 2023.11.05',
    is_verified: true,
    isHot: true,
    isPermanent: false,
    openTime: '11:00',
    closeTime: '21:00',
    operatingHours: '11:00 - 21:00',
    nearbyStation: '성수역 3번 출구',
    walkingTime: 5,
    isFree: true,
    isReservationRequired: false,
    rating: 4.8,
    reviews: 124
  },
  {
    id: '2',
    title: '그린 라이프스타일 마켓',
    category: '패션',
    description: '지속 가능한 패션과 친환경 제품을 소개하는 라이프스타일 팝업입니다.',
    location: '서울 강남구 가로수길 45',
    lat: 37.5208,
    lng: 127.0227,
    startDate: '2023-10-25',
    endDate: '2023-11-10',
    imageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=800&auto=format&fit=crop',
    period: '2023.10.25 ~ 2023.11.10',
    is_verified: true,
    isHot: false,
    isPermanent: false,
    openTime: '10:30',
    closeTime: '20:30',
    operatingHours: '10:30 - 20:30',
    nearbyStation: '신사역 8번 출구',
    walkingTime: 10,
    isFree: true,
    isReservationRequired: false,
    rating: 4.5,
    reviews: 89
  },
  {
    id: '3',
    title: '스윗 디저트 페어',
    category: '푸드/음료',
    description: '전국 유명 디저트 카페가 한자리에 모였습니다. 달콤한 주말을 즐겨보세요.',
    location: '서울 마포구 양화로 160',
    lat: 37.5562,
    lng: 126.9225,
    startDate: '2023-11-01',
    endDate: '2023-11-03',
    imageUrl: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?q=80&w=800&auto=format&fit=crop',
    period: '2023.11.01 ~ 2023.11.03',
    is_verified: false,
    isHot: false,
    isPermanent: false,
    openTime: '12:00',
    closeTime: '19:00',
    operatingHours: '12:00 - 19:00',
    nearbyStation: '홍대입구역 9번 출구',
    walkingTime: 2,
    isFree: false,
    isReservationRequired: true,
    rating: 0,
    reviews: 0
  }
];
