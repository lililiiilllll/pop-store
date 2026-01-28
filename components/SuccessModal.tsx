
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, title, message, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="relative bg-white w-full max-w-[320px] rounded-[24px] overflow-hidden shadow-2xl p-6 text-center z-[310]"
          >
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5 text-[#16a34a]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"/>
                </svg>
            </div>
            <h3 className="text-[20px] font-bold text-[#191f28] mb-3">{title}</h3>
            <p className="text-[15px] text-[#4e5968] mb-8 leading-relaxed whitespace-pre-wrap break-keep">
              {message}
            </p>
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-[#3182f6] text-white rounded-[16px] font-bold text-[16px] active:scale-[0.98] transition-all shadow-md shadow-blue-200"
            >
              확인
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SuccessModal;
