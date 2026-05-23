import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { usePOSStore } from '../../stores/posStore';
import { Shield, Lock, User, RefreshCw, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { tenantId, tenantConfig, setTenant } = usePOSStore();
  const { login, isLoading, error } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sync auth errors with local state
  useEffect(() => {
    if (error) {
      setLoginError(error);
    } else {
      setLoginError(null);
    }
  }, [error]);

  const handleTenantChange = async (newTenantId: string) => {
    if (isLoading) return;
    setLoginError(null);
    await setTenant(newTenantId);
    
    // Clear credentials when changing tenant
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setLoginError('Username dan password harus diisi!');
      return;
    }

    const success = await login(tenantId, username.trim().toLowerCase(), password);
    if (!success) {
      // The store updates its error state, which triggers the useEffect above
    }
  };

  // Detect if on fandb master subdomain
  const isMasterSubdomain = window.location.hostname.split('.')[0] === 'fandb';
  const plan = tenantConfig?.subscription_plan || 'BASIC';

  // Build credentials helper buttons dynamically
  const credentialsHelpers = [
    { 
      label: 'Kasir', 
      user: tenantId === 'moroseneng' 
        ? 'moroseneng_cashier' 
        : tenantId === 'ingkung-rahtawu' 
          ? 'rahtawu_cashier' 
          : 'deko_cashier', 
      pass: 'cashier', 
      role: 'KASIR', 
      color: 'emerald' 
    },
    { 
      label: 'Kitchen', 
      user: tenantId === 'moroseneng' 
        ? 'moroseneng_kitchen' 
        : tenantId === 'ingkung-rahtawu' 
          ? 'rahtawu_kitchen' 
          : 'deko_kitchen', 
      pass: 'kitchen', 
      role: 'KITCHEN', 
      color: 'amber' 
    },
    { 
      label: 'Runner', 
      user: tenantId === 'moroseneng' 
        ? 'moroseneng_runner' 
        : tenantId === 'ingkung-rahtawu' 
          ? 'rahtawu_runner' 
          : 'deko_runner', 
      pass: 'runner', 
      role: 'RUNNER', 
      color: 'indigo' 
    }
  ];

  // Admin role helper is shown only for premium/enterprise plans or on the fandb master hub
  if (isMasterSubdomain || plan !== 'BASIC') {
    credentialsHelpers.push({
      label: 'Admin',
      user: tenantId === 'moroseneng' 
        ? 'moroseneng_admin' 
        : tenantId === 'ingkung-rahtawu' 
          ? 'rahtawu_admin' 
          : 'deko_admin',
      pass: 'admin',
      role: 'SYSADMIN',
      color: 'purple'
    });
  }

  // SysAdmin role helper is exclusively shown on the fandb master subdomain
  if (isMasterSubdomain) {
    credentialsHelpers.push({
      label: 'SysAdmin',
      user: tenantId === 'moroseneng' 
        ? 'moroseneng_admin' 
        : tenantId === 'ingkung-rahtawu' 
          ? 'rahtawu_admin' 
          : 'deko_admin',
      pass: 'admin',
      role: 'SYSADMIN',
      color: 'blue'
    });
  }

  const handleFillCredentials = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setLoginError(null);
  };

  const getRoleBg = (color: string) => {
    switch (color) {
      case 'emerald': return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-250';
      case 'amber': return 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-250';
      case 'indigo': return 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-250';
      case 'blue': return 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-250';
      case 'purple': return 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-250';
      default: return 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200';
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center transition-all duration-700 select-none"
      style={{
        backgroundImage: tenantId === 'moroseneng'
          ? 'linear-gradient(135deg, rgba(13,148,136,0.85) 0%, rgba(15,23,42,0.9) 100%), url("https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1600&q=80")'
          : tenantId === 'ingkung-rahtawu'
            ? 'linear-gradient(135deg, rgba(120,53,15,0.85) 0%, rgba(69,26,3,0.9) 100%), url("https://images.unsplash.com/photo-1544025162-d76694265947?w=1600&q=80")'
            : 'linear-gradient(135deg, rgba(30,41,59,0.85) 0%, rgba(15,23,42,0.9) 100%), url("https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1600&q=80")'
      }}
    >
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-brand-primary/20 blur-[120px] pointer-events-none animate-pulse duration-[8s]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-brand-accent/20 blur-[120px] pointer-events-none animate-pulse duration-[6s]" />

      {/* Main Glassmorphic Login Container */}
      <div className="relative w-full max-w-[480px] rounded-2xl backdrop-blur-xl bg-white/80 border border-white/50 shadow-2xl p-8 transition-all duration-500 overflow-hidden flex flex-col gap-6 scale-in duration-300">
        
        {/* Tenant Config Brand Adaptability */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-brand-primary bg-white shadow-md transition-all duration-500 flex items-center justify-center">
            <img
              src={
                tenantConfig?.branding.logo_url || 
                (tenantId === 'moroseneng'
                  ? 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=120&h=120&fit=crop&q=80'
                  : tenantId === 'ingkung-rahtawu'
                    ? 'https://images.unsplash.com/photo-1544025162-d76694265947?w=120&h=120&fit=crop&q=80'
                    : 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=120&h=120&fit=crop&q=80')
              }
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-gray-800 uppercase">
              {tenantConfig?.branding.brand_name || 'Resto POS'}
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-brand-primary uppercase mt-0.5">
              Smart POS Platform
            </p>
          </div>
        </div>

        {/* Tenant Selector Segmented Pill - Only visible on the fandb master hub */}
        {isMasterSubdomain && (
          <div className="bg-gray-150/80 backdrop-blur rounded-full p-1 border border-gray-200/50 shadow-inner flex gap-1">
            <button
              type="button"
              onClick={() => handleTenantChange('moroseneng')}
              className={`flex-1 text-center py-2.5 rounded-full font-extrabold text-[10px] tracking-wider transition-all duration-300 cursor-pointer ${
                tenantId === 'moroseneng'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-gray-500 hover:text-brand-primary'
              }`}
            >
              MOROSENENG
            </button>
            <button
              type="button"
              onClick={() => handleTenantChange('ingkung-rahtawu')}
              className={`flex-1 text-center py-2.5 rounded-full font-extrabold text-[10px] tracking-wider transition-all duration-300 cursor-pointer ${
                tenantId === 'ingkung-rahtawu'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-gray-500 hover:text-brand-primary'
              }`}
            >
              INGKUNG
            </button>
            <button
              type="button"
              onClick={() => handleTenantChange('deko-cafe')}
              className={`flex-1 text-center py-2.5 rounded-full font-extrabold text-[10px] tracking-wider transition-all duration-300 cursor-pointer ${
                tenantId === 'deko-cafe'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-gray-500 hover:text-brand-primary'
              }`}
            >
              DEKO CAFE
            </button>
          </div>
        )}

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Error Message */}
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3.5 flex items-start gap-2.5 animate-in slide-in-from-top-3 duration-250">
              <AlertCircle className="w-4.5 h-4.5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] font-bold leading-normal">{loginError}</div>
            </div>
          )}

          {/* Username Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Ketik username Anda..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full text-xs font-semibold bg-gray-50/70 border border-gray-200/80 rounded-xl pl-11 pr-4 py-3.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-200 text-gray-800"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider flex justify-between">
              <span>Password</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs bg-gray-50/70 border border-gray-200/80 rounded-xl pl-11 pr-4 py-3.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-200 text-gray-800 font-mono"
                required
              />
            </div>
          </div>

          {/* Login Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-primary hover:bg-brand-primary-hover disabled:bg-gray-400 text-white font-extrabold text-xs py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                MENGOTENTIKASI...
              </>
            ) : (
              <>
                <KeyRound className="w-4.5 h-4.5" />
                MASUK KE POS
              </>
            )}
          </button>
        </form>

        {/* Credentials Helper Section */}
        <div className="flex flex-col gap-3.5 border-t border-gray-200/60 pt-5">
          <div className="flex items-center gap-1.5 justify-center">
            <Shield className="w-3.5 h-3.5 text-brand-primary" />
            <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
              KREDENSIAL PENGUJI (QUICK FILL CO-PILOT)
            </span>
          </div>
          
          <div className="grid grid-cols-2 min-[400px]:grid-cols-5 gap-2">
            {credentialsHelpers.map((helper) => (
              <button
                key={helper.label}
                type="button"
                onClick={() => handleFillCredentials(helper.user, helper.pass)}
                className={`text-[9px] font-extrabold px-1 py-2.5 rounded-lg border text-center transition-all duration-250 cursor-pointer shadow-sm ${getRoleBg(helper.color)}`}
              >
                <div className="font-extrabold uppercase leading-none">{helper.label}</div>
                <div className="text-[8px] opacity-75 font-mono mt-1 lowercase truncate leading-none">
                  {helper.pass}
                </div>
              </button>
            ))}
          </div>

          <div className="bg-brand-primary/5 rounded-lg p-2.5 border border-brand-primary/10 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
            <p className="text-[9px] text-gray-500 leading-normal">
              Pilih salah satu tombol di atas untuk mengisi kredensial secara otomatis berdasarkan tenant aktif.
            </p>
          </div>
        </div>

        {/* Footer / Offline Status */}
        <div className="text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
          POS Platform Offline-Ready v1.2 • Secured
        </div>
      </div>
    </div>
  );
};
