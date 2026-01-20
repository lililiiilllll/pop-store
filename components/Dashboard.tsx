import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, AlertCircle } from 'lucide-react';
import { Task, ViewMode } from '../types';
import { TaskCard } from './TaskCard';
import { isSupabaseConfigured } from '../services/supabaseClient';

// Mock Data for Demo
const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Implement Authentication Flow with Supabase', status: 'in_progress', priority: 'high', created_at: '2023-10-01' },
  { id: '2', title: 'Design Dashboard Layout in Figma', status: 'done', priority: 'medium', created_at: '2023-10-02' },
  { id: '3', title: 'Integrate Framer Motion Animations', status: 'todo', priority: 'medium', created_at: '2023-10-03' },
  { id: '4', title: 'Refactor Context API to Zustand', status: 'todo', priority: 'low', created_at: '2023-10-04' },
  { id: '5', title: 'Update dependencies and audit security', status: 'todo', priority: 'high', created_at: '2023-10-05' },
  { id: '6', title: 'Create new landing page hero section', status: 'in_progress', priority: 'medium', created_at: '2023-10-06' },
];

export const Dashboard: React.FC = () => {
  const [tasks] = useState<Task[]>(MOCK_TASKS);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID);
  const [isConfigured] = useState(isSupabaseConfigured());

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Project Overview</h1>
          <p className="text-slate-500 mt-1">Manage your team's progress and upcoming deadlines.</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center space-x-2 bg-primary text-white px-5 py-2.5 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">New Task</span>
        </motion.button>
      </div>

      {!isConfigured && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-8 flex items-start space-x-3"
        >
          <AlertCircle className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-orange-800">Supabase Connection Missing</h3>
            <p className="text-sm text-orange-700 mt-1">
              You are currently viewing mock data. To connect to a real database, add your <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> to your environment variables.
            </p>
          </div>
        </motion.div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full sm:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
          />
        </div>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button className="flex items-center space-x-2 px-4 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filter</span>
          </button>
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          <button 
            onClick={() => setViewMode(ViewMode.GRID)}
            className={`p-2 rounded-lg transition-colors ${viewMode === ViewMode.GRID ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          </button>
          <button 
             onClick={() => setViewMode(ViewMode.LIST)}
             className={`p-2 rounded-lg transition-colors ${viewMode === ViewMode.LIST ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <motion.div 
        layout
        className={`grid gap-6 ${viewMode === ViewMode.GRID ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}
      >
        <AnimatePresence>
          {tasks.map((task, index) => (
            <TaskCard key={task.id} task={task} index={index} />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};