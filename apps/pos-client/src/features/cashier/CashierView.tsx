import React, { useState } from 'react';
import { usePOSStore } from '../../stores/posStore';
import type { MenuItem, OrderItem } from '@resto-pos/shared-types';
import { ShoppingCart, User, Hash, Utensils, MessageSquare, Coffee, Layers, Trash2, Printer, CheckCircle, RefreshCw } from 'lucide-react';

export const CashierView: React.FC = () => {
  const { menu, cart, tableNumber, setTableNumber, addToCart, removeFromCart, clearCart, submitOrder, tenantConfig, isLoading, orderNotes, setOrderNotes, updateCartItemNotesByIndex, deliveryType, setDeliveryType, updateCartItemDeliveryTypeByIndex } = usePOSStore();
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'FOOD' | 'BEVERAGE' | 'SNACK'>('ALL');
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({});
  const [activeNotesItem, setActiveNotesItem] = useState<string | null>(null);
  
  // Checkout & Printer simulation states
  const [printedOrder, setPrintedOrder] = useState<any>(null);
  const [showQRISModal, setShowQRISModal] = useState(false);
  const [qrisOrder, setQrisOrder] = useState<any>(null);
  const [qrCodeStatus, setQrCodeStatus] = useState<'PENDING' | 'SUCCESS'>('PENDING');

  const filteredMenu = menu.filter(item => {
    if (!item.available) return false;
    if (selectedCategory === 'ALL') return true;
    return item.category === selectedCategory;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleAddToCart = (item: MenuItem) => {
    const note = customNotes[item.id] || '';
    addToCart(item, note);
    // Clear the note for this menu item so next additions start clean
    setCustomNotes(prev => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    // Also close the active notes popover if it was open
    if (activeNotesItem === item.id) {
      setActiveNotesItem(null);
    }
  };

  const handleCheckoutCash = async () => {
    if (!tableNumber) {
      alert('Nomor Meja wajib diisi!');
      return;
    }
    if (cart.length === 0) {
      alert('Keranjang belanja kosong!');
      return;
    }

    const order = await submitOrder('CASH');
    if (order) {
      setPrintedOrder(order);
    }
  };

  const handleCheckoutQRIS = async () => {
    if (!tableNumber) {
      alert('Nomor Meja wajib diisi!');
      return;
    }
    if (cart.length === 0) {
      alert('Keranjang belanja kosong!');
      return;
    }

    const order = await submitOrder('QRIS');
    if (order) {
      setQrisOrder(order);
      setQrCodeStatus('PENDING');
      setShowQRISModal(true);
    }
  };

  const handleQrisGatedClick = () => {
    alert("🔒 Fitur QRIS Dinamis Otomatis hanya tersedia di Paket PREMIUM dan ENTERPRISE! Silakan hubungi kami di WhatsApp (0821-3033-8787) untuk mengaktifkan paket Premium.");
    window.open("https://wa.me/6282130338787?text=Halo%20Mas,%20saya%20tertarik%20dengan%20Plan%20Premium%20karena%20ingin%20mengaktifkan%20fitur%20QRIS%20pada%20aplikasi%20POS%20saya", "_blank");
  };

  const handleConfirmQRISPayment = async () => {
    if (!qrisOrder) return;
    setQrCodeStatus('SUCCESS');
    // Simulate updating payment status on server
    try {
      await fetch(`http://${window.location.hostname || 'localhost'}:5000/api/orders/${qrisOrder.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: 'QRIS', payment_status: 'PAID' })
      });
      
      // Close QRIS modal and trigger print receipt
      setTimeout(() => {
        setShowQRISModal(false);
        setPrintedOrder({
          ...qrisOrder,
          payment_status: 'PAID'
        });
        setQrisOrder(null);
      }, 1000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-3 lg:gap-6 h-full p-1 md:p-2 min-h-0 overflow-hidden">
      {/* Category & Menu Section */}
      <div className="md:col-span-2 flex flex-col h-full space-y-4 min-h-0">
        {/* Category Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
          {[
            { id: 'ALL', label: 'Semua Menu', icon: Layers },
            { id: 'FOOD', label: 'Makanan', icon: Utensils },
            { id: 'BEVERAGE', label: 'Minuman', icon: Coffee },
            { id: 'SNACK', label: 'Cemilan', icon: Layers }
          ].map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === cat.id
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'bg-white text-brand-text-secondary border border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Menu Grid Container (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* Menu Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenu.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-brand border border-gray-150 shadow-sm flex flex-col justify-between hover:border-brand-primary/30 hover:shadow-md transition-all duration-300 overflow-hidden group"
            >
              {/* Product Image Area */}
              <div className="w-full aspect-square bg-gray-50 overflow-hidden relative border-b border-gray-100 flex items-center justify-center">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand-primary/5 text-brand-primary/45">
                    <Utensils className="w-8 h-8" />
                  </div>
                )}
                {/* Category Badge over Image */}
                <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  {item.category}
                </span>
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold tracking-widest text-brand-primary uppercase">
                    {item.code}
                  </span>
                  <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{item.name}</h4>
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed h-8">
                    {item.description || 'Tidak ada deskripsi.'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 mt-3 border-t border-gray-50">
                  {/* Note Trigger */}
                  <div className="relative">
                    {activeNotesItem === item.id ? (
                      <div className="absolute bottom-10 left-0 right-0 bg-white p-2 rounded-lg border border-gray-200 shadow-lg z-10 flex gap-2">
                        <input
                          type="text"
                          placeholder="Pedas, manis, es dikit..."
                          value={customNotes[item.id] || ''}
                          onChange={(e) => setCustomNotes({ ...customNotes, [item.id]: e.target.value })}
                          className="text-xs border border-gray-200 rounded p-1 flex-1 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                          autoFocus
                        />
                        <button
                          onClick={() => setActiveNotesItem(null)}
                          className="bg-brand-primary text-white text-[10px] px-2 rounded font-bold cursor-pointer"
                        >
                          OK
                        </button>
                      </div>
                    ) : null}

                    <button
                      onClick={() => setActiveNotesItem(item.id)}
                      className="flex items-center gap-1 text-[10px] text-brand-text-secondary hover:text-brand-primary font-semibold cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-brand-primary" />
                      {customNotes[item.id] ? `Catatan: ${customNotes[item.id]}` : '+ Catatan Item'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-sm text-brand-primary">
                      Rp {item.price.toLocaleString('id-ID')}
                    </span>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="bg-brand-primary text-white font-bold text-xs px-3.5 py-1.5 rounded-full hover:bg-brand-primary-hover shadow-sm transition-all duration-200 cursor-pointer"
                    >
                      Tambah
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Cart & Checkout Section */}
      <div className="bg-white rounded-brand border border-gray-200 p-3 shadow-sm flex flex-col h-full min-h-0 overflow-hidden">
        {/* Cart Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-brand-primary" />
            <h3 className="font-extrabold text-gray-800 text-xs">Keranjang Pesanan</h3>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-gray-400 hover:text-brand-error transition-all duration-200"
              title="Bersihkan Keranjang"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Input Nomor Meja & Kasir */}
        <div className="grid grid-cols-2 gap-1.5 mb-1.5 flex-shrink-0">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-brand-text-secondary flex items-center gap-1 uppercase">
              <Hash className="w-3 h-3 text-brand-primary" /> Nomor Meja <span className="text-brand-error">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 15"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded px-2.5 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-brand-text-secondary flex items-center gap-1 uppercase">
              <User className="w-3 h-3 text-brand-primary" /> Kasir On-Duty
            </label>
            <div className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded px-2.5 py-2 text-gray-600">
              Ani Rahmawati
            </div>
          </div>
        </div>

        {/* Scrollable Cart Content: Delivery Type + Items + Order Notes */}
        <div className="flex-1 overflow-y-auto pr-1 mb-2 min-h-[120px] space-y-3">
          {/* Tipe Pesanan Bawaan (Default Order Delivery Type) */}
          {cart.length > 0 && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-text-secondary flex items-center gap-1 uppercase">
                📍 Tipe Pesanan Utama
              </label>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-brand border border-gray-200">
                <button
                  type="button"
                  onClick={() => setDeliveryType('DINE_IN')}
                  className={`py-1.5 px-3 text-xs font-bold rounded-brand transition-all duration-200 cursor-pointer ${
                    deliveryType === 'DINE_IN'
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200 shadow-sm'
                  }`}
                >
                  🍽️ Dine In
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType('TAKE_AWAY')}
                  className={`py-1.5 px-3 text-xs font-bold rounded-brand transition-all duration-200 cursor-pointer ${
                    deliveryType === 'TAKE_AWAY'
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200 shadow-sm'
                  }`}
                >
                  🛍️ Take Away
                </button>
              </div>
            </div>
          )}

          {/* Cart Items list */}
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 space-y-2">
              <ShoppingCart className="w-12 h-12 stroke-[1.5]" />
              <p className="text-xs font-medium">Belum ada item ditambahkan</p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const menuItem = menu.find(m => m.id === item.menu_item_id);
              const isBeverage = menuItem?.category === 'BEVERAGE';
              const quickNotes = isBeverage
                ? ['Less Sugar', 'Less Ice', 'More Ice', 'Split Sugar']
                : ['Tidak Pedas', 'Pedas', 'Pisah Bumbu'];

              return (
                <div
                  key={`${item.menu_item_id}-${idx}`}
                  className="bg-gray-50 rounded border border-gray-100 p-2.5 flex items-center justify-between"
                >
                  <div className="space-y-1.5 flex-1 pr-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-gray-700 text-xs line-clamp-1">{item.name}</h5>
                        {/* Mini item-level delivery type selector */}
                        <div className="flex items-center gap-1 mt-1">
                          {deliveryType === 'TAKE_AWAY' ? (
                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-250 select-none">
                              🛍️ Bawa Pulang
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => updateCartItemDeliveryTypeByIndex(idx, 'DINE_IN')}
                                className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                  (item.delivery_type || 'DINE_IN') === 'DINE_IN'
                                    ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                                    : 'bg-gray-200 text-gray-400 border border-transparent'
                                }`}
                              >
                                🍽️ Dine In
                              </button>
                              <button
                                type="button"
                                onClick={() => updateCartItemDeliveryTypeByIndex(idx, 'TAKE_AWAY')}
                                className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                  (item.delivery_type || 'DINE_IN') === 'TAKE_AWAY'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-250'
                                    : 'bg-gray-200 text-gray-400 border border-transparent'
                                }`}
                              >
                                🛍️ Bawa Pulang
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-gray-400">({item.code})</span>
                    </div>

                    <div className="relative flex items-center gap-1 bg-white border border-gray-250 rounded px-2 py-1 shadow-sm">
                      <span className="text-[10px] text-gray-400">📝</span>
                      <input
                        type="text"
                        placeholder="Catatan item (tidak pedas, dll)..."
                        value={item.notes || ''}
                        onChange={(e) => updateCartItemNotesByIndex(idx, e.target.value)}
                        className="w-full text-[10px] font-semibold bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-brand-primary placeholder-gray-350"
                      />
                    </div>

                    {/* Touchscreen Quick-tap note buttons */}
                    <div className="flex flex-wrap gap-1">
                      {quickNotes.map((quickNote) => (
                        <button
                          key={quickNote}
                          type="button"
                          onClick={() => {
                            const currentNotes = item.notes || '';
                            const newNotes = currentNotes.includes(quickNote)
                              ? currentNotes
                              : currentNotes
                              ? `${currentNotes}, ${quickNote}`
                              : quickNote;
                            updateCartItemNotesByIndex(idx, newNotes);
                          }}
                          className="text-[8px] font-bold px-1.5 py-0.5 bg-white hover:bg-brand-primary/10 hover:text-brand-primary text-gray-500 rounded border border-gray-200 transition-all duration-150 cursor-pointer"
                        >
                          +{quickNote}
                        </button>
                      ))}
                    </div>

                  <div className="text-[11px] font-extrabold text-brand-primary pt-0.5">
                    Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                  </div>
                </div>

                {/* Plus Minus */}
                <div className="flex items-center gap-1.5 border border-gray-200 rounded bg-white p-0.5">
                  <button
                    onClick={() => removeFromCart(item.menu_item_id, item.notes, item.delivery_type)}
                    className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-500 hover:bg-gray-100 rounded"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold text-gray-700 w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => {
                      const menuItem = menu.find(m => m.id === item.menu_item_id);
                      if (menuItem) addToCart(menuItem, item.notes, item.delivery_type);
                    }}
                    className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-500 hover:bg-gray-100 rounded"
                  >
                    +
                  </button>
                </div>
              </div>
              );
            })
          )}

          {/* Catatan Khusus Pesanan (Order Notes) - inside scrollable area */}
          {cart.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-gray-100">
              <label className="text-[10px] font-bold text-brand-text-secondary flex items-center gap-1 uppercase">
                <MessageSquare className="w-3 h-3 text-brand-primary" /> Catatan Khusus Pesanan
              </label>
              <textarea
                placeholder="Catatan order (garam dikit, sendok garpu, dll)..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary h-10 resize-none"
              />
            </div>
          )}
        </div>

        {/* Pricing Subtotal - sticky bottom */}
        <div className="border-t border-gray-100 pt-1.5 mb-1.5 space-y-0.5 text-xs flex-shrink-0">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal:</span>
            <span>Rp {cartTotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>PPN (10%):</span>
            <span>Rp {Math.round(cartTotal * 0.1).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-gray-800 font-extrabold text-sm border-t border-dashed border-gray-100 pt-1">
            <span>TOTAL:</span>
            <span className="text-brand-primary">
              Rp {Math.round(cartTotal * 1.1).toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Actions Checkout buttons */}
        <div className="grid grid-cols-2 gap-1.5 flex-shrink-0">
          <button
            onClick={handleCheckoutCash}
            disabled={isLoading || cart.length === 0}
            className="bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs py-2.5 rounded-brand shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Bayar Tunai
          </button>
          
          {(tenantConfig?.subscription_plan === 'BASIC' || tenantConfig?.feature_flags.qris_payment) && (
            <button
              onClick={tenantConfig?.subscription_plan === 'BASIC' ? handleQrisGatedClick : handleCheckoutQRIS}
              disabled={isLoading || (tenantConfig?.subscription_plan !== 'BASIC' && cart.length === 0)}
              className={`font-bold text-xs py-2.5 rounded-brand shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 ${
                tenantConfig?.subscription_plan === 'BASIC'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10'
                  : 'bg-brand-primary hover:bg-brand-primary-hover text-white'
              }`}
            >
              {tenantConfig?.subscription_plan === 'BASIC' ? (
                <>
                  <span className="inline-block bg-white/20 text-[8px] px-1.5 py-0.5 rounded font-black tracking-widest text-white uppercase animate-pulse">PREMIUM</span>
                  Bayar QRIS 🔒
                </>
              ) : (
                'Bayar QRIS'
              )}
            </button>
          )}
        </div>
      </div>

      {/* --- MOCK QRIS DYNAMIC CODE MODAL --- */}
      {showQRISModal && qrisOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-brand max-w-sm w-full p-6 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">GPN / QRIS STANDAR</span>
              <h3 className="font-extrabold text-lg text-gray-800">{tenantConfig?.branding.brand_name}</h3>
            </div>

            {/* Simulated QR Code box */}
            <div className="bg-gray-100 border border-gray-200 p-4 rounded-xl inline-block relative overflow-hidden group">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=pos-order-${qrisOrder.id}`}
                alt="QRIS QR Code"
                className="w-48 h-48 mx-auto object-contain transition-all duration-300"
              />
              {qrCodeStatus === 'SUCCESS' && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center space-y-2 animate-in fade-in duration-300">
                  <CheckCircle className="w-16 h-16 text-green-500 stroke-[2.5]" />
                  <span className="font-extrabold text-sm text-green-600">PEMBAYARAN PAID</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-gray-400 text-xs">Total Pembayaran (Termasuk Pajak):</p>
              <div className="text-xl font-extrabold text-brand-primary">
                Rp {Math.round(qrisOrder.total_price * 1.1).toLocaleString('id-ID')}
              </div>
            </div>

            {/* QRIS Actions Simulation */}
            {qrCodeStatus === 'PENDING' ? (
              <div className="space-y-3">
                <button
                  onClick={handleConfirmQRISPayment}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 rounded-brand flex items-center justify-center gap-2 shadow"
                >
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Simulasikan Pelanggan Scan & Bayar
                </button>
                <button
                  onClick={() => setShowQRISModal(false)}
                  className="w-full text-xs font-semibold text-gray-500 hover:text-gray-700 py-1"
                >
                  Batal
                </button>
              </div>
            ) : (
              <p className="text-xs font-bold text-green-600 animate-pulse">Menghubungkan & mencetak struk...</p>
            )}
          </div>
        </div>
      )}

      {/* --- PREMIUM PRINT RECEIPT EMULATOR MODAL --- */}
      {printedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-brand border border-gray-200 max-w-sm w-full p-4 flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
              <h3 className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5">
                <Printer className="w-4.5 h-4.5 text-brand-primary" /> Printer Emulator (80mm)
              </h3>
              <button
                onClick={() => setPrintedOrder(null)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 bg-gray-100 px-3 py-1 rounded-full"
              >
                Tutup
              </button>
            </div>

            {/* Virtual 80mm Roll Ticket */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6 border-y border-dashed border-gray-300 font-mono text-[11px] leading-relaxed text-gray-700 shadow-inner flex flex-col items-center">
              <div className="w-full bg-white p-6 shadow-md border border-gray-100 relative">
                {/* Visual jagged edge indicator for paper cut */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-gray-200/50 to-transparent"></div>

                <div className="text-center space-y-1 mb-4">
                  <h4 className="font-bold text-sm tracking-tight uppercase text-black">
                    {tenantConfig?.branding.brand_name}
                  </h4>
                  <p className="text-[10px] text-gray-500 text-center">
                    {tenantConfig?.receipt.header}
                  </p>
                </div>

                <div className="border-t border-dashed border-gray-300 py-3 space-y-1 text-left">
                  <div className="flex justify-between">
                    <span>Order No:</span>
                    <span className="font-bold text-black">{printedOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Table No:</span>
                    <span className="font-bold text-black">{printedOrder.table_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipe Pesanan:</span>
                    <span className="font-bold text-black">
                      {printedOrder.delivery_type === 'TAKE_AWAY' ? '🛍️ TAKE AWAY' : '🍽️ DINE IN'}
                    </span>
                  </div>
                  {printedOrder.notes && (
                    <div className="border-l-2 border-brand-primary pl-2 my-1 text-left text-[10px] text-brand-primary italic font-bold">
                      Catatan Order: "{printedOrder.notes}"
                    </div>
                  )}
                  <div className="flex justify-between text-[10px]">
                    <span>Waktu:</span>
                    <span>{new Date(printedOrder.created_at).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>Kasir:</span>
                    <span>Ani R</span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border-t border-dashed border-gray-300 py-3 space-y-2">
                  {printedOrder.items.map((item: OrderItem, idx: number) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-black font-semibold">
                          {item.quantity}x {item.name}
                          {item.delivery_type && item.delivery_type !== printedOrder.delivery_type && (
                            <span className="text-[9px] font-bold text-amber-600 ml-1">
                              ({item.delivery_type === 'TAKE_AWAY' ? 'TAKE AWAY' : 'DINE IN'})
                            </span>
                          )}
                        </span>
                        <span>Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                      </div>
                      {item.notes && (
                        <div className="text-[9px] text-gray-500 italic pl-3">
                          * {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-dashed border-gray-300 py-3 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rp {printedOrder.total_price.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PPN (10%):</span>
                    <span>Rp {Math.round(printedOrder.total_price * 0.1).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-black text-xs border-t border-dashed border-gray-300 pt-2 mt-1">
                    <span>GRAND TOTAL:</span>
                    <span>Rp {Math.round(printedOrder.total_price * 1.1).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Wi-Fi Info */}
                {tenantConfig?.receipt.wifi_ssid && (
                  <div className="border-t border-dashed border-gray-300 py-3 text-center space-y-1">
                    <div className="inline-block bg-gray-100 px-3 py-1 rounded text-[10px] font-bold text-gray-700">
                      📶 FREE WI-FI INTERNET
                    </div>
                    <div className="text-[9px] text-gray-500">
                      <div>SSID: <span className="font-bold text-black">{tenantConfig.receipt.wifi_ssid}</span></div>
                      <div>PASS: <span className="font-bold text-black">{tenantConfig.receipt.wifi_password}</span></div>
                    </div>
                  </div>
                )}

                <div className="border-t border-dashed border-gray-300 pt-4 text-center space-y-3">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-gray-400 mb-1">Status: {printedOrder.payment_status}</span>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${printedOrder.order_number}`}
                      alt="Receipt Barcode"
                      className="w-16 h-16 opacity-75 object-contain"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 text-center leading-normal">
                    {tenantConfig?.receipt.footer}
                  </p>
                </div>
              </div>
            </div>

            {/* Print trigger button */}
            <div className="pt-3">
              <button
                onClick={() => setPrintedOrder(null)}
                className="w-full bg-brand-primary text-white font-bold text-xs py-3 rounded-brand shadow flex items-center justify-center gap-2 hover:bg-brand-primary-hover transition-all duration-200 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" /> Selesai Cetak Struk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
