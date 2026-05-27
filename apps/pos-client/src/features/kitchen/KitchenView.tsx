import React, { useEffect, useState } from 'react';
import { usePOSStore } from '../../stores/posStore';

import { Bell, Flame, CheckCircle2, Clock, Check, Volume2 } from 'lucide-react';

// Cooking Timer Component for real-time elapsed time rendering
const CookingTimer: React.FC<{ startedAt: string }> = ({ startedAt }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(startedAt).getTime();
      const now = Date.now();
      const diffMs = now - start;
      if (diffMs < 0) return '00:00';

      const diffSecs = Math.floor(diffMs / 1000);
      const mins = Math.floor(diffSecs / 60).toString().padStart(2, '0');
      const secs = (diffSecs % 60).toString().padStart(2, '0');
      return `${mins}:${secs}`;
    };

    setElapsed(calculateElapsed());
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="flex items-center gap-1 font-mono font-bold text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
      <Clock className="w-3.5 h-3.5 animate-pulse" />
      {elapsed}
    </span>
  );
};

export const KitchenView: React.FC = () => {
  const { orders, updateOrderStatus, tenantConfig, initializeSocket } = usePOSStore();

  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  // Clean chimes audio using Web Audio API Synthesizer (Works 100% offline!)
  const playWebBellChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playDing = (delay: number, frequency: number, duration: number = 1.0) => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
          
          gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
          
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.start();
          osc.stop(audioCtx.currentTime + duration);
        }, delay);
      };

      // Crisp double bell ring (High A5 and C#6)
      playDing(0, 880, 1.2); 
      playDing(180, 1109, 1.5);
    } catch (e) {
      console.warn("Web Audio bell failed, wait for user interaction.", e);
    }
  };

  const activeOrders = orders.filter(
    (o) => o.status !== 'COMPLETED' && o.status !== 'VOID' && o.status !== 'DELIVERING'
  );

  const newOrders = activeOrders.filter((o) => o.status === 'NEW');
  const cookingOrders = activeOrders.filter((o) => o.status === 'COOKING');
  const readyOrders = activeOrders.filter((o) => o.status === 'READY');

  const handleStartCooking = async (orderId: string) => {
    await updateOrderStatus(orderId, 'COOKING');
  };

  const handleFinishCooking = async (orderId: string) => {
    await updateOrderStatus(orderId, 'READY');
    // Synthesize kitchen notification sound
    playWebBellChime();
  };

  return (
    <div className="flex flex-col h-full space-y-3 p-1 md:p-2 min-h-0">
      {/* Kitchen status bar */}
      <div className="bg-white rounded-brand border border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></div>
          <span className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">
            {tenantConfig?.branding.brand_name} Kitchen Panel
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={playWebBellChime}
            className="flex items-center gap-1.5 bg-brand-secondary text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/10 px-3 py-1.5 rounded-full font-bold text-[10px] uppercase shadow-sm transition-all duration-200 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" /> Test Bell Sound
          </button>
          <span className="text-gray-400 text-xs font-semibold">
            Total Antrian: {activeOrders.length} Pesanan
          </span>
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="flex-1 grid md:grid-cols-3 gap-3 lg:gap-6 min-h-0 overflow-hidden">
        {/* COLUMN 1: NEW ORDERS */}
        <div className="bg-gray-100/80 rounded-brand border border-gray-200/50 flex flex-col min-h-0 shadow-inner overflow-hidden">
          <div className="bg-white px-4 py-3.5 rounded-t-brand border-b border-gray-200 flex justify-between items-center">
            <span className="font-extrabold text-xs text-gray-800 tracking-wider flex items-center gap-1.5 uppercase">
              <Bell className="w-4 h-4 text-brand-primary animate-bounce" /> New Orders
            </span>
            <span className="bg-brand-primary text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              {newOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {newOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                <Bell className="w-8 h-8 stroke-[1.5] opacity-50" />
                <p className="text-[10px] font-medium">Belum ada pesanan baru</p>
              </div>
            ) : (
              newOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-brand border border-gray-100 p-4 shadow-sm space-y-3 hover:border-brand-primary/30 transition-all duration-200"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-sm text-gray-800">{order.order_number}</span>
                      <span className="bg-brand-secondary text-brand-primary font-bold text-xs px-2.5 py-0.5 rounded-full">
                        Meja {order.table_number}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {order.delivery_type === 'TAKE_AWAY' ? (
                        <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-2 py-0.5 rounded border border-amber-200 uppercase">
                          🛍️ Take Away
                        </span>
                      ) : (
                        <span className="bg-brand-primary/10 text-brand-primary text-[8px] font-extrabold px-2 py-0.5 rounded border border-brand-primary/20 uppercase">
                          🍽️ Dine In
                        </span>
                      )}
                      {order.items.some(i => i.delivery_type && i.delivery_type !== order.delivery_type) && (
                        <span className="bg-purple-100 text-purple-800 text-[8px] font-extrabold px-2 py-0.5 rounded border border-purple-200 uppercase">
                          ⚡ Campuran
                        </span>
                      )}
                    </div>
                  </div>

                  {order.notes && (
                    <div className="bg-red-50 text-red-700 text-[10px] font-extrabold px-2.5 py-1.5 rounded border border-red-100 uppercase tracking-wide">
                      ⚠️ CATATAN: {order.notes}
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-1.5 border-y border-dashed border-gray-100 py-3 text-xs text-gray-700">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-black">{item.quantity}x {item.name}</span>
                            {item.delivery_type && item.delivery_type !== order.delivery_type && (
                              <span className={`text-[7px] font-extrabold px-1 py-0.2 rounded border uppercase ${
                                item.delivery_type === 'TAKE_AWAY'
                                  ? 'bg-amber-50 text-amber-700 border-amber-150'
                                  : 'bg-brand-primary/5 text-brand-primary border-brand-primary/10'
                              }`}>
                                {item.delivery_type === 'TAKE_AWAY' ? 'Bungkus' : 'Dine In'}
                              </span>
                            )}
                          </div>
                          <span className="text-gray-400 font-mono">({item.code})</span>
                        </div>
                        {item.notes && (
                          <div className="text-[10px] text-brand-primary font-semibold italic pl-3">
                            * {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleStartCooking(order.id)}
                    className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs py-2.5 rounded-brand flex items-center justify-center gap-1.5 shadow transition-all duration-200 cursor-pointer"
                  >
                    <Flame className="w-4 h-4" /> Mulai Masak
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: COOKING */}
        <div className="bg-gray-100/80 rounded-brand border border-gray-200/50 flex flex-col min-h-0 shadow-inner overflow-hidden">
          <div className="bg-white px-4 py-3.5 rounded-t-brand border-b border-gray-200 flex justify-between items-center">
            <span className="font-extrabold text-xs text-gray-800 tracking-wider flex items-center gap-1.5 uppercase">
              <Flame className="w-4 h-4 text-orange-500 animate-pulse" /> Cooking Process
            </span>
            <span className="bg-orange-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              {cookingOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {cookingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                <Flame className="w-8 h-8 stroke-[1.5] opacity-50" />
                <p className="text-[10px] font-medium">Tidak ada proses memasak</p>
              </div>
            ) : (
              cookingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-brand border border-gray-100 p-4 shadow-sm space-y-3 hover:border-orange-300 transition-all duration-200"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-sm text-gray-800">{order.order_number}</span>
                      <div className="flex items-center gap-2">
                        {order.cooking_started_at && <CookingTimer startedAt={order.cooking_started_at} />}
                        <span className="bg-brand-secondary text-brand-primary font-bold text-xs px-2.5 py-0.5 rounded-full">
                          M{order.table_number}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {order.delivery_type === 'TAKE_AWAY' ? (
                        <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-2 py-0.5 rounded border border-amber-200 uppercase">
                          🛍️ Take Away
                        </span>
                      ) : (
                        <span className="bg-brand-primary/10 text-brand-primary text-[8px] font-extrabold px-2 py-0.5 rounded border border-brand-primary/20 uppercase">
                          🍽️ Dine In
                        </span>
                      )}
                      {order.items.some(i => i.delivery_type && i.delivery_type !== order.delivery_type) && (
                        <span className="bg-purple-100 text-purple-800 text-[8px] font-extrabold px-2 py-0.5 rounded border border-purple-200 uppercase">
                          ⚡ Campuran
                        </span>
                      )}
                    </div>
                  </div>

                  {order.notes && (
                    <div className="bg-red-50 text-red-700 text-[10px] font-extrabold px-2.5 py-1.5 rounded border border-red-100 uppercase tracking-wide">
                      ⚠️ CATATAN: {order.notes}
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-1.5 border-y border-dashed border-gray-100 py-3 text-xs text-gray-700">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-black">{item.quantity}x {item.name}</span>
                            {item.delivery_type && item.delivery_type !== order.delivery_type && (
                              <span className={`text-[7px] font-extrabold px-1 py-0.2 rounded border uppercase ${
                                item.delivery_type === 'TAKE_AWAY'
                                  ? 'bg-amber-50 text-amber-700 border-amber-150'
                                  : 'bg-brand-primary/5 text-brand-primary border-brand-primary/10'
                              }`}>
                                {item.delivery_type === 'TAKE_AWAY' ? 'Bungkus' : 'Dine In'}
                              </span>
                            )}
                          </div>
                          <span className="text-gray-400 font-mono">({item.code})</span>
                        </div>
                        {item.notes && (
                          <div className="text-[10px] text-brand-primary font-semibold italic pl-3">
                            * {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleFinishCooking(order.id)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2.5 rounded-brand flex items-center justify-center gap-1.5 shadow transition-all duration-200 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Masakan Siap!
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: READY FOR RUNNER */}
        <div className="bg-gray-100/80 rounded-brand border border-gray-200/50 flex flex-col min-h-0 shadow-inner overflow-hidden">
          <div className="bg-white px-4 py-3.5 rounded-t-brand border-b border-gray-200 flex justify-between items-center">
            <span className="font-extrabold text-xs text-gray-800 tracking-wider flex items-center gap-1.5 uppercase">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Ready to Serve
            </span>
            <span className="bg-green-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              {readyOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {readyOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 stroke-[1.5] opacity-50" />
                <p className="text-[10px] font-medium">Belum ada hidangan siap saji</p>
              </div>
            ) : (
              readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white/80 rounded-brand border border-green-200 p-4 shadow-sm space-y-3 relative overflow-hidden"
                >
                  {/* Subtle green overlay background banner */}
                  <div className="absolute right-0 top-0 bg-green-50 text-green-600 px-3 py-1 text-[8px] font-extrabold uppercase rounded-bl">
                    Serving Pending
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center pr-24">
                      <span className="font-extrabold text-sm text-gray-800">{order.order_number}</span>
                      <span className="bg-green-100 text-green-700 font-bold text-xs px-2.5 py-0.5 rounded-full">
                        Meja {order.table_number}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {order.delivery_type === 'TAKE_AWAY' ? (
                        <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-2 py-0.5 rounded border border-amber-200 uppercase">
                          🛍️ Take Away
                        </span>
                      ) : (
                        <span className="bg-brand-primary/10 text-brand-primary text-[8px] font-extrabold px-2 py-0.5 rounded border border-brand-primary/20 uppercase">
                          🍽️ Dine In
                        </span>
                      )}
                      {order.items.some(i => i.delivery_type && i.delivery_type !== order.delivery_type) && (
                        <span className="bg-purple-100 text-purple-800 text-[8px] font-extrabold px-2 py-0.5 rounded border border-purple-200 uppercase">
                          ⚡ Campuran
                        </span>
                      )}
                    </div>
                  </div>

                  {order.notes && (
                    <div className="bg-red-50 text-red-700 text-[10px] font-extrabold px-2.5 py-1.5 rounded border border-red-100 uppercase tracking-wide">
                      ⚠️ CATATAN: {order.notes}
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-1.5 border-y border-dashed border-gray-100 py-3 text-xs text-gray-500">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{item.quantity}x {item.name}</span>
                            {item.delivery_type && item.delivery_type !== order.delivery_type && (
                              <span className={`text-[7px] font-extrabold px-1 py-0.2 rounded border uppercase ${
                                item.delivery_type === 'TAKE_AWAY'
                                  ? 'bg-amber-50 text-amber-700 border-amber-150'
                                  : 'bg-brand-primary/5 text-brand-primary border-brand-primary/10'
                              }`}>
                                {item.delivery_type === 'TAKE_AWAY' ? 'Bungkus' : 'Dine In'}
                              </span>
                            )}
                          </div>
                          <span className="text-gray-400 font-mono">({item.code})</span>
                        </div>
                        {item.notes && (
                          <div className="text-[9px] text-gray-500 italic pl-3">
                            * {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-center py-1 bg-green-50 text-green-700 font-extrabold text-[10px] rounded flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Menunggu Runner Mengambil
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
