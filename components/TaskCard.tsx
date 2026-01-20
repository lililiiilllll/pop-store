import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Tag, MoreHorizontal } from 'lucide-react';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  index: number;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, index }) => {
  const priorityColors = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        <button className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      
      <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{task.title}</h3>
      
      <div className="flex items-center text-slate-400 text-sm space-x-4 mt-4">
        <div className="flex items-center space-x-1.5">
          <Clock className="w-4 h-4" />
          <span>2 days left</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Tag className="w-4 h-4" />
          <span>Design</span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
        <div className="flex -space-x-2">
           <div className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium">JD</div>
           <div className="w-8 h-8 rounded-full bg-pink-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium">AL</div>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
      </div>
    </motion.div>
  );
};