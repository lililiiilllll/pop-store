import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

const ProfileModal = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState<'favorites' | 'reviews'>('favorites');
  const [nickname, setNickname] = useState(user?.name || '');
  const [canChangeNickname, setCanChangeNickname] = useState(true); // DB에서 가져올 데이터
  const [myFavorites, setMyFavorites] = useState([]);
  const [myReviews, setMyReviews] = useState([]);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchFavorites();
      fetchReviews();
    }
  }, [user]);

  const fetchUserData = async () => {
    const { data } = await supabase.from('profiles').select('is_nickname_changed').eq('id', user.id).single();
    if (data?.is_nickname_changed) setCanChangeNickname(false);
  };

  const updateNickname = async () => {
    if (!canChangeNickname) return alert("닉네임은 1회만 변경 가능합니다.");
    const { error } = await supabase.from('profiles').update({ 
      nickname: nickname, 
      is_nickname_changed: true 
    }).eq('id', user.id);
    
    if (!error) {
      alert("닉네임이 변경되었습니다.");
      setCanChangeNickname(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto">
        {/* 헤더: 이름 및 로그아웃 */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">마이페이지</h2>
          <button onClick={onClose}>닫기</button>
        </div>

        {/* 닉네임 변경 섹션 */}
        <div className="bg-gray-50 p-4 rounded-2xl mb-8">
          <label className="text-xs text-gray-400 mb-2 block">닉네임 변경 (1회 한정)</label>
          <div className="flex gap-2">
            <input 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)}
              disabled={!canChangeNickname}
              className="flex-1 bg-white px-4 py-2 rounded-xl border-none text-sm"
            />
            {canChangeNickname && (
              <button onClick={updateNickname} className="bg-black text-white px-4 rounded-xl text-sm">변경</button>
            )}
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex border-b mb-6">
          <button 
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-3 font-bold ${activeTab === 'favorites' ? 'border-b-2 border-black' : 'text-gray-400'}`}
          >
            찜한 팝업
          </button>
          <button 
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-3 font-bold ${activeTab === 'reviews' ? 'border-b-2 border-black' : 'text-gray-400'}`}
          >
            내 리뷰
          </button>
        </div>

        {/* 탭 내용 영역 */}
        <div className="space-y-4">
          {activeTab === 'favorites' ? (
            myFavorites.map(fav => <FavoriteCard key={fav.id} item={fav} />)
          ) : (
            myReviews.map(rev => <ReviewCard key={rev.id} item={rev} />)
          )}
        </div>

        <button onClick={handleLogout} className="w-full py-4 mt-10 text-red-500 font-bold bg-red-50 rounded-2xl">
          로그아웃
        </button>
      </motion.div>
    </div>
  );
};
