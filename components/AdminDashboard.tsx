import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import { PopupStore } from '../types';
import { supabase } from '../lib/supabase';

interface AdminDashboardProps {
  allStores: PopupStore[];
  onBack: () => void;
  onRefresh: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ allStores, onBack, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('approval');
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [searchLogs, setSearchLogs] = useState<any[]>([]); // search_logs 스키마 반영
  const [newKeyword, setNewKeyword] = useState('');

  // 아이콘 설정
  const { ChevronLeft, Trash, Check, AlertCircle, Search, Star, RotateCw, Edit } = Icons;

  useEffect(() => {
    if (activeTab === 'reviews') fetchReviews();
    if (activeTab === 'search') fetchSearchData();
  }, [activeTab]);

  // --- [데이터 페칭] 스키마 기반 ---
  const fetchReviews = async () => {
    // schema: reviews (id, popup_id, user_nickname, content, reports, is_blinded)
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('reports', { ascending: false });
    if (data) setReviews(data);
  };

  const fetchSearchData = async () => {
    // schema: search_logs (keyword, search_count) & recommended_keywords (keyword)
    const logs = await supabase.from('search_logs').select('*').order('search_count', { ascending: false });
    const recs = await supabase.from('recommended_keywords').select('*').eq('is_active', true);
    if (logs.data) setSearchLogs(logs.data);
    if (recs.data) setKeywords(recs.data);
  };

  // --- [액션] 승인 및 관리 ---
  const handleApprove = async (id: string) => {
    if (!confirm('해당 팝업을 승인하시겠습니까?')) return;
    setLoading(true);
    // schema: is_verified 필드 업데이트
    const { error } = await supabase
      .from('popup_stores')
      .update({ is_verified: true })
      .eq('id', id);

    if (!error) {
      alert('승인되었습니다.');
      onRefresh();
    }
    setLoading(false);
  };

  const handleReviewAction = async (id: number, action: 'blind' | 'delete' | 'unblind' | 'reset') => {
    if (action === 'delete' && !confirm('삭제하시겠습니까?')) return;

    let updateData = {};
    if (action === 'blind') updateData = { is_blinded: true };
    else if (action === 'unblind') updateData = { is_blinded: false };
    else if (action === 'reset') updateData = { reports: 0 };

    if (action === 'delete') {
      await supabase.from('reviews').delete().eq('id', id);
    } else {
      await supabase.from('reviews').update(updateData).eq('id', id);
    }
    fetchReviews();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#f2f4f6] flex flex-col overflow-hidden font-sans">
      {/* 상단 탭 네비게이션 (기획안 디자인 반영) */}
      <nav className="bg-white border-b border-gray-200 px-6 pt-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[18px] font-bold">
          <button onClick={onBack}><ChevronLeft size={24} /></button>
          관리자 대시보드
        </div>
        <div className="flex gap-6 text-[14px] font-medium text-gray-500">
          {[
            { id: 'approval', label: '팝업 승인/관리' },
            { id: 'search', label: '검색어 관리' },
            { id: 'request', label: '정보 수정 요청' },
            { id: 'reviews', label: '리뷰 관리' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 transition-all ${activeTab === tab.id ? 'text-[#3182f6] border-b-2 border-[#3182f6]' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          
          {/* 1. 팝업 승인/관리 (기획안 이미지 3번 반영) */}
          {activeTab === 'approval' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <button className="px-4 py-1.5 bg-[#3182f6] text-white rounded-full text-[13px] font-bold">대기중</button>
                <button className="px-4 py-1.5 bg-white text-gray-500 rounded-full text-[13px] font-medium border border-gray-200">승인됨</button>
              </div>
              {allStores.filter(s => !s.is_verified).map(store => (
                <div key={store.id} className="bg-white p-6 rounded-[24px] flex items-center justify-between shadow-sm">
                  <div className="flex gap-5">
                    <img src={store.imageUrl} className="w-24 h-24 rounded-2xl object-cover bg-gray-50" />
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{store.category}</span>
                        <span className="text-[12px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded font-bold">승인 대기</span>
                      </div>
                      <h3 className="text-[18px] font-bold text-[#191f28]">{store.title}</h3>
                      <p className="text-[14px] text-gray-500 mb-1">{store.address}</p>
                      <p className="text-[13px] text-gray-400">{store.start_date} ~ {store.end_date}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="px-5 py-2 bg-gray-50 text-gray-600 rounded-xl font-bold text-[13px] border border-gray-100">수정</button>
                    <button onClick={() => handleApprove(store.id)} className="px-5 py-2 bg-[#3182f6] text-white rounded-xl font-bold text-[13px]">승인</button>
                    <button className="px-5 py-2 bg-red-50 text-red-500 rounded-xl font-bold text-[13px]">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. 리뷰 관리 (기획안 이미지 5번 반영) */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[18px]">전체 리뷰 ({reviews.length})</h3>
                <div className="flex gap-4 items-center text-[13px]">
                  <label className="flex items-center gap-1"><input type="checkbox" /> 신고된 리뷰만 보기</label>
                  <select className="border-none bg-transparent font-bold"><option>신고 많은순</option></select>
                </div>
              </div>
              {reviews.map(review => (
                <div key={review.id} className={`bg-white p-6 rounded-[24px] shadow-sm border-2 ${review.reports > 0 ? 'border-red-100' : 'border-white'}`}>
                  {review.reports > 0 && (
                    <div className="flex justify-between items-center mb-4 p-3 bg-red-50 rounded-xl">
                      <span className="text-red-500 text-[13px] font-bold flex items-center gap-2"><AlertCircle size={16}/> 신고 {review.reports}건 접수됨</span>
                      <button onClick={() => handleReviewAction(review.id, 'reset')} className="text-red-400 text-[12px] font-bold underline">신고 초기화</button>
                    </div>
                  )}
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">★ {review.rating}</span>
                      <span className="font-bold text-[#191f28]">{review.popup_title || '팝업스토어'}</span>
                    </div>
                    <span className="text-gray-400 text-[13px]">{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[#4e5968] mb-4">{review.content}</p>
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-gray-400">작성자: {review.user_nickname}  좋아요: {review.likes}</span>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 bg-gray-50 rounded-lg font-bold">수정</button>
                      <button 
                        onClick={() => handleReviewAction(review.id, review.is_blinded ? 'unblind' : 'blind')}
                        className={`px-3 py-1.5 rounded-lg font-bold ${review.is_blinded ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}
                      >
                        {review.is_blinded ? '블라인드 해제' : '블라인드 처리'}
                      </button>
                      <button onClick={() => handleReviewAction(review.id, 'delete')} className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg font-bold">삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. 검색어 관리 (기획안 이미지 4번 반영) */}
          {activeTab === 'search' && (
             <div className="grid grid-cols-1 gap-6">
                <section className="bg-white p-8 rounded-[24px] shadow-sm">
                   <h3 className="font-bold text-[18px] mb-6 text-[#191f28]">추천 키워드 관리</h3>
                   <div className="flex gap-3 mb-4">
                      <input 
                        className="flex-1 bg-[#f2f4f6] px-5 py-3 rounded-xl outline-none" 
                        placeholder="#키워드 입력" 
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                      />
                      <button className="bg-[#3182f6] text-white px-8 py-3 rounded-xl font-bold">추가</button>
                   </div>
                   <div className="text-gray-400 text-[13px]">등록된 추천 키워드가 없습니다.</div>
                </section>

                <section className="bg-white rounded-[24px] shadow-sm overflow-hidden">
                   <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-[18px]">검색 통계</h3>
                      <button onClick={fetchSearchData} className="text-[#3182f6] text-[13px] font-bold flex items-center gap-1"><RotateCw size={14}/> 새로고침</button>
                   </div>
                   <table className="w-full text-left text-[14px]">
                      <thead className="bg-gray-50 text-gray-400 font-medium">
                         <tr>
                            <th className="px-6 py-4">키워드</th>
                            <th className="px-6 py-4">검색 횟수</th>
                            <th className="px-6 py-4">최근 검색</th>
                            <th className="px-6 py-4 text-center">관리</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {searchLogs.map(log => (
                           <tr key={log.keyword} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-bold">{log.keyword}</td>
                              <td className="px-6 py-4">{log.search_count}</td>
                              <td className="px-6 py-4 text-gray-400">{new Date(log.updated_at).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-center"><button className="text-gray-300 hover:text-red-500">삭제</button></td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </section>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
