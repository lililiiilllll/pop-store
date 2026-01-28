import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any; // 현재 로그인한 유저 정보
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState<'favorites' | 'reviews'>('favorites');
  const [nickname, setNickname] = useState(user?.name || '');
  const [canChangeNickname, setCanChangeNickname] = useState(true);
  const [myFavorites, setMyFavorites] = useState<any[]>([]);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      fetchUserData();
      fetchFavorites();
      fetchReviews();
    }
  }, [user, isOpen]);

  // 1. 유저 데이터 (닉네임 변경 여부) 확인
  const fetchUserData = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('nickname, is_nickname_changed')
      .eq('id', user.id)
      .single();

    if (data) {
      setNickname(data.nickname || user.name);
      setCanChangeNickname(!data.is_nickname_changed);
    }
  };

  // 2. 찜한 팝업 가져오기 (popup_stores 테이블과 조인)
  const fetchFavorites = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        id,
        popup_id,
        popup_stores (
          id,
          title,
          image_url,
          address,
          duration
        )
      `)
      .eq('user_id', user.id);

    if (data) setMyFavorites(data);
    setIsLoading(false);
  };

  // 3. 내가 작성한 리뷰 가져오기
  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setMyReviews(data);
  };

  // 4. 닉네임 변경 실행 (1회 제한)
  const updateNickname = async () => {
    if (!nickname.trim()) return alert("닉네임을 입력해주세요.");
    if (!canChangeNickname) return alert("닉네임은 1회만 변경 가능합니다.");
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        nickname: nickname, 
        is_nickname_changed: true 
      })
      .eq('id', user.id);
    
    if (!error) {
      alert("닉네임이 성공적으로 변경되었습니다.");
      setCanChangeNickname(false);
    } else {
      alert("변경에 실패했습니다.");
    }
  };

  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* 배경 오버레이 */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* 사이드 패널 */}
      <motion.div 
        initial={{ x: '100%' }} 
        animate={{ x: 0 }} 
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-extrabold text-[#191f28]">마이페이지</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* 닉네임 섹션 */}
        <div className="bg-gray-50 p-5 rounded-[24px] mb-8">
          <label className="text-[12px] font-bold text-gray-400 mb-3 block">닉네임 변경 (1회 한정)</label>
          <div className="flex gap-2">
            <input 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)}
              disabled={!canChangeNickname}
              className="flex-1 bg-white px-4 py-3 rounded-xl border border-gray-100 text-sm focus:ring-2 focus:ring-blue-500 transition-all disabled:text-gray-400"
              placeholder="새 닉네임 입력"
            />
            {canChangeNickname && (
              <button 
                onClick={updateNickname} 
                className="bg-[#3182f6] text-white px-5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
              >
                변경
              </button>
            )}
          </div>
          {!canChangeNickname && <p className="text-[11px] text-gray-400 mt-2 ml-1">이미 닉네임을 변경하셨습니다.</p>}
        </div>

        {/* 탭 메뉴 */}
        <div className="flex border-b border-gray-100 mb-6">
          <button 
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${activeTab === 'favorites' ? 'text-[#191f28] border-b-2 border-[#191f28]' : 'text-gray-400'}`}
          >
            찜한 팝업 {myFavorites.length > 0 && `(${myFavorites.length})`}
          </button>
          <button 
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${activeTab === 'reviews' ? 'text-[#191f28] border-b-2 border-[#191f28]' : 'text-gray-400'}`}
          >
            내 리뷰 {myReviews.length > 0 && `(${myReviews.length})`}
          </button>
        </div>

        {/* 리스트 영역 */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="text-center py-10 text-gray-400 text-sm">불러오는 중...</div>
          ) : activeTab === 'favorites' ? (
            myFavorites.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">찜한 팝업이 없습니다.</div>
            ) : (
              myFavorites.map(fav => (
                <div key={fav.id} className="flex gap-4 p-3 bg-white border border-gray-50 rounded-2xl shadow-sm">
                  <img src={fav.popup_stores?.image_url} className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{fav.popup_stores?.title}</h4>
                    <p className="text-xs text-gray-500 truncate">{fav.popup_stores?.address}</p>
                    <p className="text-[11px] text-blue-500 mt-1 font-medium">{fav.popup_stores?.duration}</p>
                  </div>
                </div>
              ))
            )
          ) : (
            myReviews.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">작성한 리뷰가 없습니다.</div>
            ) : (
              myReviews.map(rev => (
                <div key={rev.id} className="p-4 bg-gray-50 rounded-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-[10px] ${i < rev.rating ? 'text-orange-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-[#4e5968] leading-relaxed line-clamp-3">{rev.content}</p>
                </div>
              ))
            )}
          )}
        </div>

        <button 
          onClick={handleLogout} 
          className="w-full py-4 mt-6 text-[#f04452] font-bold bg-[#fff0f1] rounded-2xl active:scale-95 transition-all"
        >
          로그아웃
        </button>
      </motion.div>
    </div>
  );
};

export default ProfileModal;
