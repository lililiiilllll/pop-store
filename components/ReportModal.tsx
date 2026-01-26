import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

interface ReportModalProps {
  coord: { lat: number; lng: number };
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ coord, onClose }) => {
  // 상태 관리
  const [address, setAddress] = useState('주소를 불러오는 중...');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('기타');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [requiresReservation, setRequiresReservation] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 위경도를 주소로 변환 (역지오코딩)
  useEffect(() => {
    const { kakao } = window as any;
    if (kakao && kakao.maps.services) {
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.coord2Address(coord.lng, coord.lat, (result: any, status: any) => {
        if (status === kakao.maps.services.Status.OK) {
          setAddress(result[0].address.address_name);
        }
      });
    }
  }, [coord]);

  // 이미지 선택 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // 2. 최종 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('장소 이름과 상세 내용은 필수입니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = '';

      // 이미지 업로드 로직 (Storage 사용)
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('popup-images') // 생성한 버킷 이름
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('popup-images')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrlData.publicUrl;
      }

      // DB 저장 (popup_stores 테이블)
      const { error } = await supabase.from('popup_stores').insert([
        {
          title,
          category,
          description,
          address,
          lat: coord.lat,
          lng: coord.lng,
          start_date: startDate || null,
          end_date: endDate || null,
          operating_hours: operatingHours,
          is_free: isFree,
          requires_reservation: requiresReservation,
          image_url: imageUrl,
          link_url: linkUrl,
          is_verified: false, // 기본값 false (승인 대기)
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      alert('제보가 완료되었습니다. 관리자 승인 후 지도에 표시됩니다!');
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-[999999] overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-3xl z-10">
          <h2 className="text-xl font-bold text-gray-900">새로운 장소 제보</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 주소 표시 영역 */}
          <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3">
            <div className="text-blue-600 mt-0.5">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">선택된 위치 주소</p>
              <p className="text-sm font-semibold text-blue-900">{address}</p>
            </div>
          </div>

          {/* 대표 이미지 업로드 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">대표 이미지</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 rounded-xl border border-blue-100 bg-blue-50 text-blue-600 font-bold text-sm hover:bg-blue-100 transition-all"
              >
                이미지 교체
              </button>
            </div>
          </div>

          {/* 카테고리 선택 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">카테고리</label>
            <div className="flex flex-wrap gap-2">
              {['패션', '푸드', '아트', '엔터', '라이프스타일', '기타'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    category === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 border border-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 장소 이름 & 상세 설명 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">장소 이름 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="장소 이름을 입력해주세요"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">상세 내용 <span className="text-red-500">*</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="팝업스토어에 대한 상세 정보를 입력해주세요"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                required
              />
            </div>
          </div>

          {/* 입장료 & 예약 여부 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">입장료</label>
              <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                <button type="button" onClick={() => setIsFree(true)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isFree ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>무료</button>
                <button type="button" onClick={() => setIsFree(false)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isFree ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>유료</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">예약 유무</label>
              <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                <button type="button" onClick={() => setRequiresReservation(false)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!requiresReservation ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>현장입장</button>
                <button type="button" onClick={() => setRequiresReservation(true)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${requiresReservation ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>예약필수</button>
              </div>
            </div>
          </div>

          {/* 기간 & 시간 & 링크 */}
          <div className="space-y-4 border-t pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">시작 날짜</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">종료 날짜</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">오픈 시간</label>
              <input type="text" value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} placeholder="예: 11:00 - 20:00" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">공식 링크</label>
              <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !description.trim()}
            className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg ${
              isSubmitting || !title.trim() || !description.trim()
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? '등록 중...' : '제보 완료하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
