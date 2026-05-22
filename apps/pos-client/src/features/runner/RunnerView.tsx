import React, { useEffect, useState } from 'react';
import { usePOSStore } from '../../stores/posStore';
import type { Order, OrderItem } from '@resto-pos/shared-types';
import { ClipboardCheck, CheckCircle2, ChevronRight, User, BellRing, MapPin } from 'lucide-react';

export const RunnerView: React.FC = () => {
  const { orders, updateOrderStatus, initializeSocket } = usePOSStore();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  const readyOrders = orders.filter((o) => o.status === 'READY');

  const handleToggleCheck = (itemKey: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  const handleDeliverOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'COMPLETED');
    setSelectedOrder(null);
    setCheckedItems({});
  };

  return (
    <div className="max-w-md mx-auto space-y-4 p-2 h-[calc(100vh-140px)] flex flex-col">
      {/* Runner Bar */}
      <div className="bg-white rounded-brand border border-gray-200 p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-brand-primary" />
          <span className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">
            Runner App
          </span>
        </div>
        <span className="bg-brand-primary text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
          {readyOrders.length} Ready
        </span>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {readyOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 space-y-2 py-12">
            <BellRing className="w-16 h-16 stroke-[1.2] opacity-50" />
            <p className="text-xs font-semibold">Semua hidangan telah diantar!</p>
          </div>
        ) : (
          readyOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="bg-white rounded-brand border border-gray-100 p-4 shadow-sm hover:border-brand-primary/30 active:scale-[0.99] transition-all duration-200 cursor-pointer flex justify-between items-center"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-extrabold text-sm text-gray-800">{order.order_number}</span>
                  <span className="bg-green-100 text-green-800 font-bold text-[9px] px-1.5 py-0.5 rounded uppercase">
                    Ready
                  </span>
                  {order.delivery_type === 'TAKE_AWAY' ? (
                    <span className="bg-amber-100 text-amber-800 font-bold text-[9px] px-1.5 py-0.5 rounded uppercase">
                      🛍️ Take Away
                    </span>
                  ) : (
                    <span className="bg-brand-primary/10 text-brand-primary font-bold text-[9px] px-1.5 py-0.5 rounded uppercase">
                      🍽️ Dine In
                    </span>
                  )}
                  {order.items.some(i => i.delivery_type && i.delivery_type !== order.delivery_type) && (
                    <span className="bg-purple-100 text-purple-800 font-bold text-[9px] px-1.5 py-0.5 rounded uppercase">
                      ⚡ Campur
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
                  <MapPin className="w-4 h-4 text-brand-primary" />
                  Meja {order.table_number}
                </div>
                {order.notes && (
                  <div className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 w-max uppercase">
                    📝 Ada Catatan
                  </div>
                )}
                <p className="text-[10px] text-gray-400">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)} hidangan • Siap sejak{' '}
                  {order.ready_at ? new Date(order.ready_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}
                </p>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          ))
        )}
      </div>

      {/* --- CROSSCHECK & DELIVERY MODAL --- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-t-brand max-w-md w-full p-5 space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col rounded-brand">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5">
                  <ClipboardCheck className="w-4.5 h-4.5 text-brand-primary" /> Crosscheck Pesanan {selectedOrder.order_number}
                </h3>
                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Antar ke Meja {selectedOrder.table_number}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setCheckedItems({});
                }}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 bg-gray-100 px-3 py-1 rounded-full"
              >
                Batal
              </button>
            </div>

            {selectedOrder.notes && (
              <div className="bg-red-50 text-red-700 text-[10px] font-extrabold px-3 py-2 rounded border border-red-100 uppercase tracking-wide">
                ⚠️ Catatan Khusus: {selectedOrder.notes}
              </div>
            )}

            {/* Checklist */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
              <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">TANDAI HIDANGAN YANG SUDAH DI NAMPAN</span>
              {selectedOrder.items.map((item: OrderItem, idx: number) => {
                const itemKey = `${selectedOrder.id}-${item.menu_item_id}-${idx}`;
                const isChecked = !!checkedItems[itemKey];

                return (
                  <button
                    key={itemKey}
                    onClick={() => handleToggleCheck(itemKey)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-brand border text-left transition-all duration-200 cursor-pointer ${
                      isChecked
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                        isChecked
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="w-4 h-4" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-xs ${isChecked ? 'line-through opacity-60' : ''}`}>
                            {item.quantity}x {item.name}
                          </span>
                          {/* Item level delivery type badge in runner checklist */}
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${
                            (item.delivery_type || selectedOrder.delivery_type || 'DINE_IN') === 'TAKE_AWAY'
                              ? 'bg-amber-100 text-amber-800 border-amber-250'
                              : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                          }`}>
                            {(item.delivery_type || selectedOrder.delivery_type || 'DINE_IN') === 'TAKE_AWAY' ? '🛍️ Bungkus' : '🍽️ Dine In'}
                          </span>
                        </div>
                        <span className="font-mono text-[9px] opacity-50">({item.code})</span>
                      </div>
                      {item.notes && (
                        <p className="text-[10px] text-brand-primary italic font-semibold mt-0.5">
                          * {item.notes}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Serve Button */}
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => handleDeliverOrder(selectedOrder.id)}
                disabled={selectedOrder.items.some((_, idx) => !checkedItems[`${selectedOrder.id}-${selectedOrder.items[idx].menu_item_id}-${idx}`])}
                className="w-full bg-brand-primary text-white font-bold text-xs py-3 rounded-brand shadow flex items-center justify-center gap-1.5 hover:bg-brand-primary-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <CheckCircle2 className="w-4.5 h-4.5" /> Konfirm &amp; Antar ke Meja {selectedOrder.table_number}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
