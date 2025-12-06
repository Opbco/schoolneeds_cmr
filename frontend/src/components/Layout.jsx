
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Users, Hourglass, Bell, Share2, School } from 'lucide-react';
import api from '../services/api';

const Layout = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600';

  // Fetch Retirement Stats (Mocked or Real)
  const { data: stats } = useQuery({
    queryKey: ['retirementStats'],
    queryFn: async () => (await api.get('/personnel/stats/retirement')).data,
    retry: false
  });

  const notificationCount = (stats?.retiring_this_year || 0) + (stats?.overdue_retirement || 0) + (stats?.abandonned || 0);

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 bg-white shadow-xl flex flex-col z-20">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <School size={24} />
            <h1 className="text-2xl font-bold tracking-tight">PNEDS</h1>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Ministry of Education</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Link to="/" className={`flex items-center p-3 rounded-lg transition-all font-medium ${isActive('/')}`}>
            <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
          </Link>
          
          <Link to="/networks" className={`flex items-center p-3 rounded-lg transition-all font-medium ${isActive('/networks')}`}>
            <Share2 className="w-5 h-5 mr-3" /> School Networks
          </Link>

          <Link to="/personnel" className={`flex items-center p-3 rounded-lg transition-all font-medium justify-between ${isActive('/personnel')}`}>
            <div className="flex items-center"><Users className="w-5 h-5 mr-3" /> Personnel</div>
            {notificationCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {notificationCount}
              </span>
            )}
          </Link>
          
          <Link to="/curricula" className={`flex items-center p-3 rounded-lg transition-all font-medium ${isActive('/curricula')}`}>
            <Hourglass className="w-5 h-5 mr-3" /> Curricula
          </Link>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col relative">
        <header className="bg-white shadow-sm h-16 flex justify-end items-center px-8 sticky top-0 z-10">
            <div className="flex items-center gap-4">
                {notificationCount > 0 && (
                    <div className="hidden md:flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 animate-pulse">
                        <span>⚠️ Action Required:</span>
                        <span>{stats.retiring_this_year} retiring soon</span>
                    </div>
                )}
                <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Bell className="text-gray-500 w-5 h-5" />
                    {notificationCount > 0 && (
                        <span className="absolute top-1.5 right-2 bg-red-500 w-2.5 h-2.5 rounded-full border-2 border-white"></span>
                    )}
                </button>
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                    AD
                </div>
            </div>
        </header>
        <div className="flex-1">
            <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;