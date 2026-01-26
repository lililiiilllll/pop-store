import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient'; // supabase 설정 파일 경로에 맞게 수정하세요

interface ReportModalProps {
  coord: { lat: number; lng: number };
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ coord, onClose }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('팝업스토어');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('popup_stores') // 실제 테이블 이름으로 수정하세요
        .insert([
          {
            title,
            category,
            description,
            lat: coord.lat,
            lng: coord.lng,
            is_verified: false, // 제보 데이터이므로 검증 전 상태로 저장
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      alert('제보가 성공적으로 접수되었습니다!');
      onClose();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      alert('제보 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">새로운 장소 제보</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 위치 정보 표시 (읽기 전용) */}
          <div className="bg-blue-50 p-3 rounded-xl flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <div>
              <p className="text-[11px] text-blue-600 font-bold uppercase">선택된 위치</p>
              <p className="text-xs text-blue-900 font-medium">
                위도: {coord.lat.toFixed(6)}, 경도: {coord.lng.toFixed(6)}
              </p>
            </div>
          </div>

          {/* 카테고리 선택 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">카테고리</label>
            <div className="flex gap-2">
              {['팝업스토어', '전시회', '행사'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    category === cat 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 이름 입력 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 text-left">장소 이름</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="장소 이름을 입력해주세요"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* 설명 입력 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 text-left">상세 설명 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="장소에 대한 추가 정보를 입력해주세요"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-2xl font-bold text-white transition-all ${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-lg shadow-blue-100'
            }`}
          >
            {isSubmitting ? '제보 중...' : '제보 완료하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
