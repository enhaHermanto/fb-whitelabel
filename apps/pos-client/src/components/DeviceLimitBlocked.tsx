import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { usePOSStore } from '../stores/posStore';
import { ShieldAlert, RefreshCw, LogOut, MessageSquare } from 'lucide-react';

interface DeviceLimitBlockedProps {
  role: string;
}

export const DeviceLimitBlocked: React.FC<DeviceLimitBlockedProps> = ({ role }) => {
  const { logout } = useAuthStore();
  const { resetDeviceLimitBlock } = usePOSStore();

  const handleLogout = () => {
    logout();
    resetDeviceLimitBlock();
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const getRoleDisplayName = (r: string) => {
    if (r === 'KASIR') return 'Tablet Kasir (POS)';
    if (r === 'KITCHEN') return 'Layar Monitor Dapur (KDS)';
    return r;
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-50">
      {/* Background soft glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="bg-slate-950/80 border border-red-500/20 backdrop-blur-xl rounded-2xl p-8 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
        {/* Top visual divider bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500"></div>

        {/* Warning Icon with pulse */}
        <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Batas Perangkat Terlampaui!
          </h2>
          <p className="text-xs text-red-400 font-bold uppercase tracking-widest bg-red-500/10 py-1.5 px-3 rounded-full inline-block">
            {getRoleDisplayName(role)}
          </p>
          <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
            Sistem mendeteksi bahwa perangkat aktif untuk role ini telah terpakai. Lisensi **Basic &amp; Premium** membatasi maksimal **1 perangkat kasir** dan **1 perangkat dapur**.
          </p>
        </div>

        {/* License Policy Info Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 my-6 text-left space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">ATURAN LISENSI BELI PUTUS</span>
          <div className="text-xs text-slate-300 space-y-1.5">
            <p className="flex justify-between">
              <span>🖥️ Tablet Kasir aktif:</span>
              <span className="font-extrabold text-red-400">Maks. 1 Device</span>
            </p>
            <p className="flex justify-between">
              <span>🍳 Layar Monitor Dapur aktif:</span>
              <span className="font-extrabold text-red-400">Maks. 1 Device</span>
            </p>
            <p className="flex justify-between">
              <span>🏃 Waiter / Runner aktif:</span>
              <span className="font-extrabold text-green-400">Tanpa Batas</span>
            </p>
          </div>
        </div>

        {/* Call to Action Buttons */}
        <div className="space-y-3">
          <a
            href="https://wa.me/6282130338787?text=Halo%20Mas,%20saya%20tertarik%20dengan%20Plan%20Enterprise%20karena%20ingin%20menambah%20perangkat%20POS%20saya"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs py-3.5 px-6 rounded-xl shadow-lg shadow-red-600/20 transition-all duration-200"
          >
            <MessageSquare className="w-4 h-4" />
            Upgrade ke Plan Enterprise
          </a>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRetry}
              className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-bold text-xs py-3 px-4 rounded-xl transition-all duration-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Coba Lagi
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-bold text-xs py-3 px-4 rounded-xl transition-all duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar Sesi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
