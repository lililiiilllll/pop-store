import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Settings, 
  LogOut, 
  Database,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
  { id: 'database', icon: Database, label: 'Data' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-slate-200 flex flex-col shadow-sm z-20 hidden md:flex">
      <div className="p-6 flex items-center space-x-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Activity className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xl font-bold text-slate-800 tracking-tight">MotionBase</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                isActive 
                  ? 'text-primary bg-primary/5' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'stroke-2' : 'stroke-[1.5]'}`} />
              <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
              
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button className="flex items-center space-x-3 text-slate-500 hover:text-red-500 w-full px-4 py-3 rounded-xl hover:bg-red-50 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};