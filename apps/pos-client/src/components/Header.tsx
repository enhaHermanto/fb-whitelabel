import React, { useEffect, useState } from 'react';
import { usePOSStore } from '../stores/posStore';
import { Circle, Shield, User, Clock, Monitor, RefreshCw, LayoutDashboard } from 'lucide-react';

interface HeaderProps {
  currentTab: 'CASHIER' | 'KITCHEN' | 'RUNNER' | 'ADMIN';
  setCurrentTab: (tab: 'CASHIER' | 'KITCHEN' | 'RUNNER' | 'ADMIN') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab }) => {
  const { tenantConfig, socket, tenantId } = usePOSStore();
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

  return (
    <header className="bg-white/85 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200/80 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm select-none">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-brand-primary/20 flex items-center justify-center bg-brand-surface shadow-sm transition-all duration-300">
          <img
            src={
              tenantId === 'solaria'
                ? 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&h=100&fit=crop&q=80'
                : 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=100&h=100&fit=crop&q=80'
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

      {/* Tabs Navigation Selector */}
      <div className="flex bg-gray-100 rounded-full p-1 border border-gray-200/50 shadow-inner">
        {[
          { id: 'CASHIER', label: 'Kasir (POS)', icon: Monitor },
          { id: 'KITCHEN', label: 'Dapur (KDS)', icon: RefreshCw },
          { id: 'RUNNER', label: 'Runner App', icon: User },
          { id: 'ADMIN', label: 'Branding', icon: LayoutDashboard }
        ].map((tab) => {
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

      {/* Clock & Status Indicators */}
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
      </div>
    </header>
  );
};
