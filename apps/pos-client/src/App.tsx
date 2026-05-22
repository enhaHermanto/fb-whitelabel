import React, { useEffect, useState } from 'react';
import { usePOSStore } from './stores/posStore';
import { useAuthStore } from './stores/authStore';
import { LoginView } from './features/auth/LoginView';
import { Header } from './components/Header';
import { CashierView } from './features/cashier/CashierView';
import { KitchenView } from './features/kitchen/KitchenView';
import { RunnerView } from './features/runner/RunnerView';
import { AdminView } from './features/admin/AdminView';
import { ShieldAlert, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const { tenantId, setTenant, initializeSocket, isLoading, error } = usePOSStore();
  const { currentUser, isLoggedIn, initializeAuth, logout } = useAuthStore();
  const [currentTab, setCurrentTab] = useState<'CASHIER' | 'KITCHEN' | 'RUNNER' | 'ADMIN'>('CASHIER');

  // 1. Initialize Authentication session on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 2. Set initial tenant as Solaria & initialize Websocket client
  useEffect(() => {
    setTenant('solaria');
    initializeSocket();
  }, [setTenant, initializeSocket]);

  // 3. Multi-Tenant Session Security Guard: Logout if tenant changes and doesn't match current user
  useEffect(() => {
    if (isLoggedIn && currentUser && currentUser.tenant_id !== tenantId) {
      logout();
    }
  }, [tenantId, currentUser, isLoggedIn, logout]);

  // 4. Role-based Initial Routing Tab selection upon login
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      if (currentUser.role === 'KITCHEN') {
        setCurrentTab('KITCHEN');
      } else if (currentUser.role === 'RUNNER') {
        setCurrentTab('RUNNER');
      } else if (currentUser.role === 'KASIR') {
        setCurrentTab('CASHIER');
      } else if (currentUser.role === 'SYSADMIN' || currentUser.role === 'MANAGEMENT') {
        setCurrentTab('ADMIN');
      }
    }
  }, [isLoggedIn, currentUser]);

  // If unauthenticated, show the custom glassmorphic Login View
  if (!isLoggedIn) {
    return <LoginView />;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col transition-all duration-300 overflow-hidden">
      {/* Shared Premium Header */}
      <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col min-h-0 overflow-hidden">
        {/* Global Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in duration-200">
            <RefreshCw className="w-10 h-10 text-brand-primary animate-spin mb-4" />
            <p className="text-sm font-bold text-gray-700 uppercase tracking-widest animate-pulse">
              Memuat Konfigurasi Tenant...
            </p>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-brand p-4 mb-6 flex items-center gap-3 animate-in slide-in-from-top duration-300 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold block">Server Connection Error</span>
              {error}. Pastikan local-server telah dijalankan (`pnpm --filter @resto-pos/local-server dev`).
            </div>
          </div>
        )}

        {/* Tab switcher wrapper */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {currentTab === 'CASHIER' && <CashierView />}
          {currentTab === 'KITCHEN' && <KitchenView />}
          {currentTab === 'RUNNER' && <RunnerView />}
          {currentTab === 'ADMIN' && <AdminView />}
        </div>
      </main>
    </div>
  );
};

export default App;
