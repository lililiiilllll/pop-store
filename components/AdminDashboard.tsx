import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../constants';
import { PopupStore } from '../types';
import { supabase } from '../lib/supabase';

interface AdminDashboardProps {
  allStores: PopupStore[];
  onBack: () => void;
  onRefresh: () => void;
}

// 관리자 메뉴 타입
type AdminTab = 'approval' | 'search' | 'edit-request' | 'reviews';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ allStores, onBack, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('approval');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 리뷰 관리용 필터 상태
  const [reviewFilter, setReviewFilter] = useState('신고 많은순');
  const [showOnlyReported, setShowOnlyReported] = useState(false);

  // 아이콘 정의
  const { ChevronLeft, Trash, Edit, Check, EyeOff, AlertCircle, Search, Star, Heart, MessageSquare, RotateCw } = Icons;

  // --- 1. 팝업 승인/관리 로직 (대기중/승인됨 구분) ---
  const pendingStores = allStores.filter(s => s.description?.includes('[제보]')); // 임시로 설명글에 제보 문구 있는 것 필터링
  const activeStores = allStores.filter(s => !s.description?.includes('[제보]'));

  // --- 2. 리뷰 데이터 (임시 데이터 - 나중에 DB 연동) ---
  const [dummyReviews] = useState([
    { id: '1', author: '팝업러버', content: '정보가 좀 다르네요.', likes: 12, reports: 5, date: '2026.01.20', storeName: '무신사 팝업', isBlinded: false },
    { id: '2', author: '테스터', content: '너무 친절해요!', likes: 45, reports: 0, date: '2026.01.22', storeName: '발로란트 팝업', isBlinded: false },
  ]);

  // 리뷰 필터링 로직
  const filteredReviews = useMemo(() => {
    let list = [...dummyReviews];
    if (showOnlyReported) list = list.filter(r => r.reports > 0);
    
    if (reviewFilter === '신고 많은순') list.sort((a, b) => b.reports - a.reports);
    if (reviewFilter === '좋아요 많은순') list.sort((a, b) => b.likes - a.likes);
    if (reviewFilter === '최근 작성순') list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return list;
  }, [reviewFilter, showOnlyReported, dummyReviews]);

  return (
    <div className="fixed inset-0 z-[1000] bg-[#f2f4f6] flex flex-col overflow-hidden">
      {/* 글로벌 헤더 */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-all toss-active-scale">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-[20px] font-bold text-[#191f28]">관리자 대시보드</h1>
        </div>
        
        {/* 중앙 탭 메뉴 */}
        <div className="flex bg-[#f2f4f6] p-1 rounded-xl">
          {(['approval', 'search', 'edit-request', 'reviews'] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setIsAdding(false); }}
              className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
                activeTab === tab ? 'bg-white shadow-sm text-[#3182f6]' : 'text-[#8b95a1]'
              }`}
            >
              {tab === 'approval' && '팝업 승인/관리'}
              {tab === 'search' && '검색어/통계'}
              {tab === 'edit-request' && '수정요청'}
              {tab === 'reviews' && '리뷰관리'}
            </button>
          ))}
        </div>

        <button onClick={() => setIsAdding(!isAdding)} className="bg-[#3182f6] text-white px-5 py-2.5 rounded-xl text-[14px] font-bold shadow-sm">
          {isAdding ? '닫기' : '직접 등록'}
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-5xl mx-auto">
          
          {/* 1. 팝업 승인/관리 탭 */}
          {activeTab === 'approval' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <h2 className="text-[18px] font-bold">제보 및 운영 리스트</h2>
                  <span className="bg-[#3182f6] text-white px-2 py-0.5 rounded text-[12px] flex items-center">{allStores.length}</span>
                </div>
                <div className="relative">
                  <input 
                    type="text" placeholder="팝업 이름 검색" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white rounded-xl border-none shadow-sm text-[14px] w-64 focus:ring-2 focus:ring-[#3182f6]"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>
              </div>

              <div className="grid gap-4">
                {allStores.filter(s => s.title.includes(searchTerm)).map(store => (
                  <div key={store.id} className="bg-white p-5 rounded-[24px] flex items-center justify-between shadow-sm border border-white hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <img src={store.imageUrl} className="w-20 h-20 rounded-2xl object-cover shadow-inner" alt="" />
                        {store.description?.includes('[제보]') && (
                          <span className="absolute -top-2 -left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg">제보</span>
                        )}
                      </div>
                      <div>
                        <div className="flex gap-2 mb-1">
                          <span className="text-[11px] font-bold text-[#3182f6] bg-blue-50 px-2 py-0.5 rounded">{store.category}</span>
                        </div>
                        <h3 className="font-bold text-[17px] text-[#191f28]">{store.title}</h3>
                        <p className="text-[13px] text-[#8b95a1] line-clamp-1">{store.address || '주소 정보 없음'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-3 bg-[#f2f4f6] text-[#4e5968] rounded-xl hover:bg-gray-200 transition-all"><Edit size={18} /></button>
                      <button className="p-3 bg-red-50 text-[#f04452] rounded-xl hover:bg-red-100 transition-all"><Trash size={18} /></button>
                      {store.description?.includes('[제보]') && (
                        <button className="px-5 py-3 bg-[#3182f6] text-white rounded-xl font-bold text-[14px] shadow-lg shadow-blue-100">승인하기</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. 검색어 관리 탭 */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <section className="bg-white p-6 rounded-[28px] shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Star className="text-yellow-400" size={18} /> 추천 키워드 설정</h3>
                  <div className="flex gap-2 mb-4">
                    <input className="flex-1 bg-[#f2f4f6] border-none rounded-xl px-4 py-2 text-[14px]" placeholder="키워드 입력" />
                    <button className="bg-[#3182f6] text-white px-4 py-2 rounded-xl font-bold text-[13px]">추가</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['#성수동', '#무료전시', '#인생샷', '#팝업이벤트'].map(tag => (
                      <span key={tag} className="px-3 py-1.5 bg-gray-50 text-[#4e5968] text-[13px] rounded-lg border border-gray-100 flex items-center gap-1">
                        {tag} <button className="text-gray-400 hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                </section>
                <section className="bg-white p-6 rounded-[28px] shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><RotateCw className="text-blue-500" size={18} /> 실시간 검색 순위</h3>
                  <div className="space-y-3">
                    {[ {t: '발로란트', c: 128}, {t: '산리오', c: 95}, {t: '무신사', c: 84} ].map((item, i) => (
                      <div key={item.t} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                        <span className="text-[14px] font-bold text-[#4e5968]">{i+1}. {item.t}</span>
                        <span className="text-[13px] text-[#3182f6] font-medium">{item.c}회 검색</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* 3. 리뷰 관리 탭 */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-[20px] shadow-sm">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showOnlyReported} onChange={e => setShowOnlyReported(e.target.checked)} className="rounded text-[#3182f6]" />
                    <span className="text-[14px] font-bold text-red-500">신고된 리뷰만</span>
                  </label>
                  <select 
                    value={reviewFilter} onChange={e => setReviewFilter(e.target.value)}
                    className="bg-transparent border-none text-[14px] font-bold text-[#4e5968] focus:ring-0"
                  >
                    <option>신고 많은순</option>
                    <option>좋아요 많은순</option>
                    <option>최근 작성순</option>
                  </select>
                </div>
                <p className="text-[13px] text-[#8b95a1]">전체 리뷰 {dummyReviews.length}개</p>
              </div>

              <div className="grid gap-4">
                {filteredReviews.map(review => (
                  <div key={review.id} className={`bg-white p-6 rounded-[28px] shadow-sm border-2 ${review.reports > 0 ? 'border-red-100' : 'border-white'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-[15px]">{review.author}</span>
                          <span className="text-gray-300 text-[12px]">|</span>
                          <span className="text-[#8b95a1] text-[13px]">{review.storeName}</span>
                        </div>
                        <div className="flex gap-3 text-[12px] font-bold">
                          <span className="text-[#3182f6] flex items-center gap-1"><Heart size={14} /> {review.likes}</span>
                          <span className={`${review.reports > 0 ? 'text-red-500' : 'text-gray-400'} flex items-center gap-1`}>
                            <AlertCircle size={14} /> 신고 {review.reports}
                          </span>
                        </div>
                      </div>
                      <span className="text-[12px] text-gray-400">{review.date}</span>
                    </div>
                    <p className="text-[15px] text-[#4e5968] leading-relaxed mb-5">{review.content}</p>
                    <div className="flex justify-end gap-2 border-t pt-4 border-gray-50">
                      <button className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-[13px] font-bold">수정</button>
                      <button className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-[13px] font-bold flex items-center gap-1">
                        <EyeOff size={14} /> 블라인드
                      </button>
                      <button className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[13px] font-bold">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. 수정요청 탭 (간략 구현) */}
          {activeTab === 'edit-request' && (
            <div className="bg-white rounded-[28px] p-10 text-center space-y-4">
              <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-[#3182f6]">
                <MessageSquare size={32} />
              </div>
              <h3 className="font-bold text-[18px]">접수된 정보 수정 요청이 없습니다.</h3>
              <p className="text-[#8b95a1] text-[14px]">사용자들이 보낸 팝업 정보 오류 신고가 여기에 표시됩니다.</p>
            </div>
          )}

        </div>
      </main>

      {/* 직접 등록 모달 레이어 (기존 로직 유지) */}
      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1001] bg-black/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-xl rounded-[32px] p-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-[22px] font-bold mb-6">새로운 팝업 직접 등록</h2>
              {/* 기존 등록 폼 코드 생략 (디자인 맞춰서 유지 가능) */}
              <button onClick={() => setIsAdding(false)} className="w-full py-4 bg-[#f2f4f6] text-[#4e5968] rounded-2xl font-bold mt-4">닫기</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
