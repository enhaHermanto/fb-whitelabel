import React, { useEffect, useState } from 'react';
import { usePOSStore } from '../stores/posStore';
import { useAuthStore } from '../stores/authStore';
import { Circle, Shield, User, Clock, Monitor, RefreshCw, LayoutDashboard, LogOut, Eye } from 'lucide-react';

interface HeaderProps {
  currentTab: 'CASHIER' | 'KITCHEN' | 'RUNNER' | 'ADMIN' | 'CUSTOMER';
  setCurrentTab: (tab: 'CASHIER' | 'KITCHEN' | 'RUNNER' | 'ADMIN' | 'CUSTOMER') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab }) => {
  const { tenantConfig, socket, tenantId } = usePOSStore();
  const { currentUser, logout } = useAuthStore();
  const [time, setTime] = useState(new Date().toLocaleTimeString('id-ID'));
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleConnect = () => setIsOnline(true);
    const handleDisconnect = () => setIsOnline(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    setIsOnline(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  // Define tabs with roles allowed to view them
  const allTabs = [
    { id: 'CASHIER', label: 'Kasir (POS)', icon: Monitor, roles: ['KASIR', 'MANAGEMENT', 'SYSADMIN'] },
    { id: 'KITCHEN', label: 'Dapur (KDS)', icon: RefreshCw, roles: ['KITCHEN', 'MANAGEMENT', 'SYSADMIN'] },
    { id: 'RUNNER', label: 'Runner App', icon: User, roles: ['RUNNER', 'MANAGEMENT', 'SYSADMIN'] },
    { id: 'ADMIN', label: 'Back Office', icon: LayoutDashboard, roles: ['MANAGEMENT', 'SYSADMIN'] },
    { id: 'CUSTOMER', label: 'Layar Pelanggan', icon: Eye, roles: ['CUSTOMER', 'MANAGEMENT', 'SYSADMIN'] }
  ];

  // Filter tabs by active user role
  const visibleTabs = allTabs.filter(tab => {
    if (!currentUser) return false;
    return tab.roles.includes(currentUser.role);
  });

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'SYSADMIN': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'MANAGEMENT': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'KASIR': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'KITCHEN': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RUNNER': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'CUSTOMER': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <header className="bg-white/85 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200/80 px-4 md:px-6 py-2 md:py-3 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-3 shadow-sm select-none">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-brand-primary/20 flex items-center justify-center bg-brand-surface shadow-sm transition-all duration-300">
          <img
            src={
              tenantConfig?.branding.logo_url || 
              'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=100&h=100&fit=crop&q=80'
            }
            alt="Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h2 className="font-extrabold text-base tracking-tight text-gray-800 flex items-center gap-1.5 uppercase">
            {tenantConfig?.branding.brand_name || 'Resto POS'}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Circle className={`w-2 h-2 fill-current ${isOnline ? 'text-green-500' : 'text-yellow-500 animate-ping'}`} />
            <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">
              {isOnline ? 'Local LAN Connected' : 'Local Server Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Tabs Navigation Selector based on active User Role */}
      {visibleTabs.length > 0 && (
        <div className="flex bg-gray-100 rounded-full p-1 border border-gray-200/50 shadow-inner">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-extrabold text-xs transition-all duration-300 cursor-pointer ${
                  currentTab === tab.id
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-gray-500 hover:text-brand-primary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Clock, Tenant Status & User Profile Info */}
      <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
        <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200/50 px-3 py-1.5 rounded-full shadow-sm">
          <Clock className="w-3.5 h-3.5 text-brand-primary" />
          <span className="font-mono text-gray-700 font-bold">{time}</span>
        </div>
        
        {tenantId === 'bakmigm' && (
          <span className="bg-amber-100 text-amber-700 font-bold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-amber-200/50 flex items-center gap-1">
            <Shield className="w-3 h-3 text-amber-700" /> Premium Tenant
          </span>
        )}

        {/* User profile & Glassmorphic Logout Button */}
        {currentUser && (
          <div className="flex items-center gap-3 border-l border-gray-200 pl-4 ml-1">
            <div className="text-right">
              <div className="text-xs font-bold text-gray-800 leading-tight">
                {currentUser.name}
              </div>
              <div className="flex justify-end mt-0.5">
                <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border tracking-wide uppercase leading-none ${getRoleBadgeStyle(currentUser.role)}`}>
                  {currentUser.role}
                </span>
              </div>
            </div>
            
            <button
              onClick={logout}
              title="Keluar dari Akun"
              className="p-2 rounded-full text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all duration-200 cursor-pointer shadow-sm flex items-center justify-center"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
