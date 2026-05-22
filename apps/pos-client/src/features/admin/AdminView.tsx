import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../stores/posStore';
import type { TenantConfig, Order } from '@resto-pos/shared-types';
import { 
  Settings, Shield, CheckCircle, Palette, BarChart3, Lock, 
  Plus, ToggleLeft, ToggleRight, Loader2, Printer, Wifi, Sparkles, 
  AlertCircle, TrendingUp, DollarSign, RotateCw 
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const { 
    tenantId, tenantConfig, setTenant, menu, orders, 
    addMenuItem, toggleMenuItem, saveCustomTenantConfig, isLoading 
  } = usePOSStore();

  const [activeTab, setActiveTab] = useState<'BRANDING' | 'MENU_STOCK' | 'REPORTS' | 'SHIFT_CLOSE'>('BRANDING');

  // --- BRANDING FORM STATE ---
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');

  // --- ADD MENU FORM STATE ---
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState<number | ''>('');
  const [newCategory, setNewCategory] = useState<'FOOD' | 'BEVERAGE' | 'SNACK'>('FOOD');
  const [newDesc, setNewDesc] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  // --- REPORTS STATE ---
  const [reportData, setReportData] = useState<any>(null);
  const [isReportsLoading, setIsReportsLoading] = useState(false);

  // --- SHIFT CLOSE STATE ---
  const [drawerStartCash, setDrawerStartCash] = useState<number>(500000);
  const [physicalCashCount, setPhysicalCashCount] = useState<number>(0);
  const [showShiftCloseReceipt, setShowShiftCloseReceipt] = useState(false);
  const [closedShiftData, setClosedShiftData] = useState<any>(null);

  // Synchronize visual branding form fields when tenant config loads or switches
  useEffect(() => {
    if (tenantConfig) {
      setBrandName(tenantConfig.branding.brand_name || '');
      setLogoUrl(tenantConfig.branding.logo_url || '');
      setPrimaryColor(tenantConfig.branding.theme.primary_color || '');
      setSecondaryColor(tenantConfig.branding.theme.secondary_color || '');
      setAccentColor(tenantConfig.branding.theme.accent_color || '');
      setWifiSsid(tenantConfig.receipt.wifi_ssid || '');
      setWifiPassword(tenantConfig.receipt.wifi_password || '');
      setReceiptHeader(tenantConfig.receipt.header || '');
      setReceiptFooter(tenantConfig.receipt.footer || '');
    }
  }, [tenantConfig, tenantId]);

  // Fetch reports on switch
  const fetchReports = async () => {
    setIsReportsLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname || 'localhost'}:5000/api/${tenantId}/reports`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      console.error('Failed to load reports', e);
    } finally {
      setIsReportsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [tenantId, orders]); // Reload reports when switching tenants or when orders update

  const handleSwitchTenant = async (id: string) => {
    if (isLoading) return;
    await setTenant(id);
  };

  // --- ACTION: SAVE BRAND CONFIG ---
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantConfig) return;

    const updatedConfig: TenantConfig = {
      ...tenantConfig,
      branding: {
        ...tenantConfig.branding,
        brand_name: brandName,
        logo_url: logoUrl,
        theme: {
          ...tenantConfig.branding.theme,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor
        }
      },
      receipt: {
        ...tenantConfig.receipt,
        wifi_ssid: wifiSsid,
        wifi_password: wifiPassword,
        header: receiptHeader,
        footer: receiptFooter
      }
    };

    try {
      await saveCustomTenantConfig(updatedConfig);
      alert('Visual branding & Wi-Fi berhasil disimpan! Semua client terhubung otomatis berganti gaya.');
    } catch (err) {
      alert('Gagal menyimpan konfigurasi branding.');
    }
  };

  // --- ACTION: ADD MENU ITEM ---
  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName || newPrice === '') {
      alert('Mohon isi Kode, Nama Menu, dan Harga!');
      return;
    }

    try {
      await addMenuItem({
        code: newCode,
        name: newName,
        price: Number(newPrice),
        category: newCategory,
        description: newDesc,
        image_url: newImageUrl
      });
      alert(`Sukses menambahkan menu baru: ${newName}!`);
      setNewCode('');
      setNewName('');
      setNewPrice('');
      setNewDesc('');
      setNewImageUrl('');
    } catch (err) {
      alert('Gagal menambahkan menu baru.');
    }
  };

  // --- ACTION: TOGGLE MENU AVAILABILITY ---
  const handleToggleStock = async (itemId: string) => {
    try {
      await toggleMenuItem(itemId);
    } catch (err) {
      alert('Gagal memperbarui stok menu.');
    }
  };

  // --- ACTION: CLOSE KASIR SHIFT ---
  const todayCashSales = orders
    .filter(o => {
      const isPaid = o.payment_status === 'PAID';
      const isCash = o.payment_method === 'CASH';
      const isToday = new Date(o.created_at).toDateString() === new Date().toDateString();
      return isPaid && isCash && isToday;
    })
    .reduce((sum, o) => sum + o.total_price, 0);

  const todayQRISSales = orders
    .filter(o => {
      const isPaid = o.payment_status === 'PAID';
      const isQRIS = o.payment_method === 'QRIS';
      const isToday = new Date(o.created_at).toDateString() === new Date().toDateString();
      return isPaid && isQRIS && isToday;
    })
    .reduce((sum, o) => sum + o.total_price, 0);

  const expectedCashInDrawer = drawerStartCash + todayCashSales;
  const cashVariance = physicalCashCount - expectedCashInDrawer;

  const handleCloseShift = () => {
    if (physicalCashCount <= 0) {
      alert('Mohon masukkan jumlah perhitungan uang fisik dalam laci kasir!');
      return;
    }

    const shiftData = {
      tenant_name: tenantConfig?.branding.brand_name || 'Restoran',
      closed_at: new Date().toISOString(),
      cashier_name: 'Ani Rahmawati',
      drawer_start: drawerStartCash,
      cash_sales: todayCashSales,
      qris_sales: todayQRISSales,
      expected_cash: expectedCashInDrawer,
      physical_cash: physicalCashCount,
      variance: cashVariance,
      total_orders_today: orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length
    };

    setClosedShiftData(shiftData);
    setShowShiftCloseReceipt(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-2">
      {/* Visual Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-primary to-brand-primary/80 rounded-brand text-white p-6 shadow-md relative overflow-hidden transition-all duration-300">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-85">BACK OFFICE RESTORAN</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Pusat Administrasi &amp; Kontrol Brand</h1>
          <p className="text-white/90 max-w-xl text-xs leading-relaxed">
            Kelola branding visual multi-tenant, kontrol ketersediaan menu stok (Tersedia/Habis), pantau laporan harian omzet secara real-time, dan lakukan proses tutup shift kasir secara cepat dan akurat.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 opacity-10 w-1/3 flex items-center justify-center">
          <Settings className="w-36 h-36 animate-spin" style={{ animationDuration: '25s' }} />
        </div>
      </div>

      {/* Brand Switcher Pills */}
      <div className="flex gap-3 bg-white p-2.5 rounded-brand border border-gray-200 shadow-sm items-center">
        <span className="text-xs font-bold text-gray-500 uppercase px-2">Tenant Aktif:</span>
        <div className="flex gap-2">
          {[
            { id: 'solaria', label: 'Solaria' },
            { id: 'bakmigm', label: 'Bakmi GM' }
          ].map(tenant => (
            <button
              key={tenant.id}
              onClick={() => handleSwitchTenant(tenant.id)}
              className={`text-xs font-extrabold px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer ${
                tenantId === tenant.id
                  ? 'bg-brand-primary text-white shadow border-brand-primary'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {tenant.label}
            </button>
          ))}
        </div>
        {isLoading && <Loader2 className="w-4 h-4 text-brand-primary animate-spin ml-2" />}
      </div>

      {/* PREMIUM TABS CONTROLLER */}
      <div className="grid grid-cols-4 gap-2 bg-gray-100 p-1.5 rounded-brand border border-gray-200">
        {[
          { id: 'BRANDING', label: 'Kustomisasi Brand', icon: Palette },
          { id: 'MENU_STOCK', label: 'Manajemen Menu', icon: Sparkles },
          { id: 'REPORTS', label: 'Laporan Omzet', icon: BarChart3 },
          { id: 'SHIFT_CLOSE', label: 'Tutup Shift', icon: Lock }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3.5 px-2 rounded-brand font-bold text-[10px] sm:text-xs transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-brand-primary shadow border border-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* --- TAB CONTENT AREA --- */}
      <div className="bg-white rounded-brand border border-gray-200 p-6 shadow-sm min-h-[400px]">
        
        {/* =========================================== */}
        {/* TAB 1: VISUAL BRANDING FORM                 */}
        {/* =========================================== */}
        {activeTab === 'BRANDING' && tenantConfig && (
          <form onSubmit={handleSaveBranding} className="space-y-6">
            <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-wide">
                  Visual Branding &amp; Atribut Tenant
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Ubah skema warna, logo, dan struk secara real-time</p>
              </div>
              <Sparkles className="w-5 h-5 text-brand-primary" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* BRANDING */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-brand-primary border-b border-brand-secondary pb-1">IDENTITAS UTAMA</h4>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Nama Brand / Tenant</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded px-2.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">URL Logo Gambar</label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono text-[10px]"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Warna Utama</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-8 h-8 rounded border cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full text-center font-mono text-[10px] border border-gray-200 rounded uppercase font-bold text-gray-700 bg-gray-50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Warna Sekunder</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-8 h-8 rounded border cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-full text-center font-mono text-[10px] border border-gray-200 rounded uppercase font-bold text-gray-700 bg-gray-50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Warna Aksen</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-8 h-8 rounded border cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-full text-center font-mono text-[10px] border border-gray-200 rounded uppercase font-bold text-gray-700 bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* WI-FI & STRUK CONFIG */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-brand-primary border-b border-brand-secondary pb-1">KREDENSIAL WI-FI &amp; STRUK</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 text-brand-primary" /> SSID Wi-Fi Restoran
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Solaria_Gratis_5G"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded px-2.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                      🔑 Password Wi-Fi
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. nasispesial"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded px-2.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Header Struk Belanja</label>
                  <input
                    type="text"
                    value={receiptHeader}
                    onChange={(e) => setReceiptHeader(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Footer Struk Belanja</label>
                  <input
                    type="text"
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2.5 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs px-6 py-3 rounded-brand shadow flex items-center gap-2 cursor-pointer transition-all duration-200"
              >
                <CheckCircle className="w-4 h-4" /> Simpan Konfigurasi Branding
              </button>
            </div>
          </form>
        )}

        {/* =========================================== */}
        {/* TAB 2: MANAJEMEN MENU & STOK                */}
        {/* =========================================== */}
        {activeTab === 'MENU_STOCK' && (
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* TAMBAH MENU BARU FORM */}
            <div className="bg-gray-50 rounded-brand p-5 border border-gray-200 shadow-inner h-fit space-y-4">
              <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-brand-primary" /> Tambah Menu Baru
              </h4>
              <form onSubmit={handleAddMenu} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">Kode Menu (Unik)</label>
                  <input
                    type="text"
                    placeholder="e.g. A04"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-gray-200 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">Nama Menu</label>
                  <input
                    type="text"
                    placeholder="e.g. Nasi Goreng Seafood"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-gray-200 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Harga (Rp)</label>
                    <input
                      type="number"
                      placeholder="e.g. 38000"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs font-bold bg-white border border-gray-200 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Kategori</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full text-xs font-bold bg-white border border-gray-200 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-primary h-[34px]"
                    >
                      <option value="FOOD">Makanan</option>
                      <option value="BEVERAGE">Minuman</option>
                      <option value="SNACK">Cemilan</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">Deskripsi</label>
                  <textarea
                    placeholder="Deskripsi singkat hidangan..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full text-xs bg-white border border-gray-200 rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-primary h-14 resize-none"
                  />
                </div>
                
                {/* Image upload and url */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase block">Gambar Menu (URL / Upload)</label>
                  {newImageUrl && (
                    <div className="relative w-full h-20 rounded border border-gray-200 overflow-hidden mb-1">
                      <img src={newImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewImageUrl('')}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-[8px] font-bold hover:bg-red-600 shadow-sm cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="URL Gambar..."
                      value={newImageUrl.startsWith('data:') ? 'Local Image (Base64)' : newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      disabled={newImageUrl.startsWith('data:')}
                      className="flex-1 text-[10px] bg-white border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                    />
                    <label className="bg-brand-primary hover:bg-brand-primary-hover text-white text-[9px] font-bold px-2.5 py-1.5 rounded shadow cursor-pointer transition-all duration-200 flex items-center justify-center whitespace-nowrap">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewImageUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs py-2.5 rounded shadow cursor-pointer transition-all duration-200"
                >
                  Tambahkan ke Menu
                </button>
              </form>
            </div>

            {/* DAFTAR MENU DENGAN TOGGLE STOK */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h4 className="font-extrabold text-gray-800 text-xs uppercase tracking-wider">
                  Daftar Menu &amp; Kontrol Stok Tersedia
                </h4>
                <span className="text-[10px] text-gray-400 font-semibold">{menu.length} Produk terdaftar</span>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {menu.map(item => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-brand border flex justify-between items-center transition-all duration-200 ${
                      item.available
                        ? 'bg-white border-gray-100 hover:border-gray-200'
                        : 'bg-gray-50 border-gray-200 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Image Thumbnail */}
                      <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden flex-shrink-0 relative border border-gray-100">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-brand-primary/40 bg-brand-primary/5">
                            <Sparkles className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-extrabold text-brand-primary font-mono uppercase tracking-wider bg-brand-secondary px-1.5 py-0.5 rounded">
                            {item.code}
                          </span>
                          <h5 className="font-bold text-gray-800 text-xs">{item.name}</h5>
                        </div>
                        <p className="text-[10px] text-gray-500 line-clamp-1">{item.description || 'Tidak ada deskripsi.'}</p>
                        <div className="text-xs font-extrabold text-brand-primary">
                          Rp {item.price.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStock(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-[10px] uppercase shadow-sm border transition-all duration-200 cursor-pointer ${
                        item.available
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {item.available ? (
                        <>
                          <ToggleRight className="w-4.5 h-4.5 text-green-600" />
                          Tersedia
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4.5 h-4.5 text-red-500" />
                          Habis (Hidden)
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* =========================================== */}
        {/* TAB 3: LAPORAN PENJUALAN (ANALYTICS)        */}
        {/* =========================================== */}
        {activeTab === 'REPORTS' && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-1.5">
                  <BarChart3 className="w-4.5 h-4.5 text-brand-primary animate-pulse" /> Laporan Analitik Penjualan
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Metrik performa finansial real-time tenant</p>
              </div>
              <button
                onClick={fetchReports}
                className="flex items-center gap-1 bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 text-[10px] font-bold px-2.5 py-1 rounded"
              >
                <RotateCw className={`w-3 h-3 ${isReportsLoading ? 'animate-spin' : ''}`} /> Muat Ulang
              </button>
            </div>

            {isReportsLoading || !reportData ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                <p className="text-xs font-semibold">Mengkalkulasi laporan penjualan...</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Metrik Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Omzet Hari Ini */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100/55 rounded-brand border border-green-200/50 p-4 shadow-sm space-y-1">
                    <div className="flex justify-between items-center text-green-700">
                      <span className="text-[9px] font-bold uppercase tracking-wider">Omzet Hari Ini</span>
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-green-800">
                      Rp {reportData.summary.daily_revenue.toLocaleString('id-ID')}
                    </div>
                    <p className="text-[8px] text-green-600 font-semibold">{reportData.summary.today_orders} Transaksi Sukses</p>
                  </div>

                  {/* Omzet Bulan Ini */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/55 rounded-brand border border-blue-200/50 p-4 shadow-sm space-y-1">
                    <div className="flex justify-between items-center text-blue-700">
                      <span className="text-[9px] font-bold uppercase tracking-wider">Omzet Bulan Ini</span>
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-blue-800">
                      Rp {reportData.summary.monthly_revenue.toLocaleString('id-ID')}
                    </div>
                    <p className="text-[8px] text-blue-600 font-semibold">{reportData.summary.monthly_orders} Transaksi Sukses</p>
                  </div>

                  {/* Jumlah Order Hari Ini */}
                  <div className="bg-gray-50 rounded-brand border border-gray-200 p-4 shadow-sm space-y-1">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Total Order Hari Ini</span>
                    <div className="text-base sm:text-lg font-extrabold text-gray-700">
                      {reportData.summary.today_orders}
                    </div>
                    <p className="text-[8px] text-gray-400 font-medium">Berdasarkan waktu server</p>
                  </div>

                  {/* Jumlah Order Bulan Ini */}
                  <div className="bg-gray-50 rounded-brand border border-gray-200 p-4 shadow-sm space-y-1">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Total Order Bulan Ini</span>
                    <div className="text-base sm:text-lg font-extrabold text-gray-700">
                      {reportData.summary.monthly_orders}
                    </div>
                    <p className="text-[8px] text-gray-400 font-medium">Bulan berjalan berjalan</p>
                  </div>
                </div>

                {/* Best Sellers & Recent Transactions */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Menu Terlaris (Best Sellers) */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-1">
                      🔥 TOP 5 MENU TERLARIS (TERBARU)
                    </h4>
                    <div className="space-y-3 bg-gray-50 p-4 rounded-brand border border-gray-200 shadow-inner">
                      {reportData.best_sellers.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6 font-medium">Belum ada menu terjual hari ini.</p>
                      ) : (
                        reportData.best_sellers.map((item: any, idx: number) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-700">{idx + 1}. {item.name}</span>
                              <span className="font-semibold text-brand-primary">{item.quantity} porsi</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-brand-primary h-full rounded-full" 
                                style={{ width: `${Math.min(100, (item.quantity / Math.max(...reportData.best_sellers.map((x: any) => x.quantity))) * 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[8px] text-gray-400 font-mono">
                              <span>KODE: {item.code}</span>
                              <span>Omzet: Rp {item.revenue.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Riwayat Pesanan Terakhir */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-1">
                      📄 TRANSAKSI TERAKHIR (PAID &amp; PENDING)
                    </h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {reportData.orders.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8">Belum ada transaksi terekam.</p>
                      ) : (
                        reportData.orders.slice(0, 10).map((order: Order) => (
                          <div key={order.id} className="p-3 bg-white rounded border border-gray-100 flex justify-between items-center hover:border-gray-200 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-800">{order.order_number}</span>
                                <span className={`text-[8px] font-extrabold px-1.5 rounded ${
                                  order.payment_status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {order.payment_status}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400">Meja {order.table_number} • {order.payment_method}</p>
                              {order.notes && <p className="text-[9px] text-brand-primary italic font-semibold">📝 "{order.notes}"</p>}
                            </div>
                            <div className="text-right space-y-0.5">
                              <span className="font-extrabold text-brand-primary">
                                Rp {Math.round(order.total_price * 1.1).toLocaleString('id-ID')}
                              </span>
                              <p className="text-[8px] text-gray-400 font-mono">
                                {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================== */}
        {/* TAB 4: SHIFT KASIR CLOSING PANEL             */}
        {/* =========================================== */}
        {activeTab === 'SHIFT_CLOSE' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* INPUT PANEL */}
            <div className="space-y-5">
              <div>
                <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-1.5">
                  <Lock className="w-4.5 h-4.5 text-brand-primary" /> Penutupan Shift Kasir (Closing POS)
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Kalkulasi kas laci, setorkan fisik, dan hitung selisih laci</p>
              </div>

              <div className="bg-gray-50 rounded-brand p-5 border border-gray-200 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Uang Modal Awal Laci (Drawer Start Cash)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">Rp</span>
                    <input
                      type="number"
                      value={drawerStartCash}
                      onChange={(e) => setDrawerStartCash(Number(e.target.value))}
                      className="w-full text-xs font-extrabold bg-white border border-gray-200 rounded pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>
                  <p className="text-[8px] text-gray-400 font-semibold">Standar modal kasir di laci di awal hari</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Hasil Penjualan Tunai Sistem (Auto-Calc)</label>
                  <div className="w-full text-xs font-extrabold bg-white border border-gray-200 rounded px-3 py-2.5 text-gray-700 select-all">
                    Rp {todayCashSales.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Total Uang Ekspektasi Laci (Modal + Tunai)</label>
                  <div className="w-full text-xs font-extrabold bg-green-50 border border-green-200 rounded px-3 py-2.5 text-green-800">
                    Rp {expectedCashInDrawer.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Perhitungan Uang Fisik Aktual Laci
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-red-500">Rp</span>
                    <input
                      type="number"
                      placeholder="Masukkan total uang fisik di laci"
                      value={physicalCashCount || ''}
                      onChange={(e) => setPhysicalCashCount(Number(e.target.value))}
                      className="w-full text-xs font-extrabold bg-white border border-red-200 rounded pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-red-500 text-red-700"
                    />
                  </div>
                  <p className="text-[8px] text-red-500 font-semibold">Hitung uang fisik di laci (kertas &amp; logam) lalu ketik di atas</p>
                </div>

                {physicalCashCount > 0 && (
                  <div className={`p-3 rounded border text-xs font-bold ${
                    cashVariance === 0 
                      ? 'bg-green-50 border-green-200 text-green-700' 
                      : cashVariance > 0 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span>ANALISIS SELISIH KAS:</span>
                      <span>
                        {cashVariance === 0 
                          ? 'SEIMBANG (PERFECT)' 
                          : cashVariance > 0 
                            ? `SURPLUS (+Rp ${cashVariance.toLocaleString('id-ID')})`
                            : `DEFISIT (-Rp ${Math.abs(cashVariance).toLocaleString('id-ID')})`}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCloseShift}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs py-3 rounded shadow flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                >
                  <Printer className="w-4 h-4" /> Proses Tutup Shift &amp; Cetak Laporan
                </button>
              </div>
            </div>

            {/* VIRTUAL CLOSING RECEIPT EMULATOR */}
            <div className="flex flex-col items-center justify-center border-l border-gray-150 pl-6">
              {showShiftCloseReceipt && closedShiftData ? (
                <div className="w-full max-w-xs space-y-4">
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block text-center">
                    Virtual Receipt Tutup Shift
                  </span>
                  
                  {/* Virtual 80mm closing roll */}
                  <div className="bg-white p-6 shadow-md border border-gray-300 font-mono text-[11px] leading-relaxed text-gray-700 relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-gray-200/50 to-transparent"></div>

                    <div className="text-center space-y-1 mb-4">
                      <h4 className="font-bold text-xs tracking-tight uppercase text-black">
                        LAPORAN TUTUP SHIFT KASIR
                      </h4>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">
                        {closedShiftData.tenant_name}
                      </p>
                    </div>

                    <div className="border-t border-dashed border-gray-300 py-3 space-y-1 text-left">
                      <div className="flex justify-between">
                        <span>Waktu Closing:</span>
                        <span>{new Date(closedShiftData.closed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tanggal:</span>
                        <span>{new Date(closedShiftData.closed_at).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kasir On-Duty:</span>
                        <span className="font-bold text-black">{closedShiftData.cashier_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Transaksi:</span>
                        <span className="font-bold text-black">{closedShiftData.total_orders_today} orders</span>
                      </div>
                    </div>

                    {/* Financial breakdowns */}
                    <div className="border-t border-dashed border-gray-300 py-3 space-y-1">
                      <div className="flex justify-between">
                        <span>Modal Awal Kas:</span>
                        <span>Rp {closedShiftData.drawer_start.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-black font-semibold">
                        <span>Penjualan Tunai:</span>
                        <span>+Rp {closedShiftData.cash_sales.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between font-bold text-black border-t border-dashed border-gray-300 pt-1 mt-1">
                        <span>Ekspektasi Kas Laci:</span>
                        <span>Rp {closedShiftData.expected_cash.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* Physical Count vs Expected and Variance */}
                    <div className="border-t border-dashed border-gray-300 py-3 space-y-1">
                      <div className="flex justify-between text-black font-semibold">
                        <span>Uang Fisik Laci:</span>
                        <span>Rp {closedShiftData.physical_cash.toLocaleString('id-ID')}</span>
                      </div>
                      <div className={`flex justify-between font-bold border-t border-dashed border-gray-300 pt-1 mt-1 ${
                        closedShiftData.variance === 0 
                          ? 'text-green-600' 
                          : closedShiftData.variance > 0 
                            ? 'text-blue-600' 
                            : 'text-red-500'
                      }`}>
                        <span>SELISIH KAS LACI:</span>
                        <span>
                          {closedShiftData.variance === 0 
                            ? 'Rp 0' 
                            : closedShiftData.variance > 0 
                              ? `+Rp ${closedShiftData.variance.toLocaleString('id-ID')}`
                              : `-Rp ${Math.abs(closedShiftData.variance).toLocaleString('id-ID')}`}
                        </span>
                      </div>
                    </div>

                    {/* QRIS references */}
                    <div className="border-t border-dashed border-gray-300 py-3 space-y-1 text-gray-500 text-[10px]">
                      <div className="flex justify-between">
                        <span>Penjualan QRIS (Bank):</span>
                        <span>Rp {closedShiftData.qris_sales.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-gray-300 pt-4 text-center space-y-3">
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] text-gray-400 mb-1">CLOSING SECURE TOKEN</span>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=closing-shift-${closedShiftData.closed_at}`}
                          alt="Closing Barcode"
                          className="w-14 h-14 opacity-75 object-contain"
                        />
                      </div>
                      <p className="text-[8px] text-gray-400 text-center leading-normal">
                        Simpan struk ini sebagai bukti setoran fisik kasir harian.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowShiftCloseReceipt(false);
                      setClosedShiftData(null);
                      setPhysicalCashCount(0);
                    }}
                    className="w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs py-2 rounded"
                  >
                    Reset Form Tutup Shift
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-350 space-y-2 py-12">
                  <Printer className="w-14 h-14 stroke-[1.2] opacity-40 text-gray-400" />
                  <p className="text-xs font-semibold text-center max-w-[200px] leading-relaxed">
                    Virtual struk 80mm Tutup Shift akan muncul setelah Anda mengklik tombol "Proses Tutup Shift".
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
