import React, { useEffect, useState } from 'react';
import { usePOSStore } from '../../stores/posStore';
import type { Order } from '@resto-pos/shared-types';
import { ClipboardList, Clock, CheckCircle2, Flame, Package, Eye, Bell } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; animate?: string }> = {
  NEW: {
    label: 'Pesanan Baru',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <Bell className="w-3.5 h-3.5" />,
  },
  COOKING: {
    label: 'Sedang Dimasak',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <Flame className="w-3.5 h-3.5" />,
    animate: 'animate-pulse',
  },
  READY: {
    label: 'Siap Disajikan',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    animate: 'animate-pulse',
  },
  DELIVERING: {
    label: 'Sedang Diantar',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: <Package className="w-3.5 h-3.5" />,
  },
  COMPLETED: {
    label: 'Selesai',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
};

export const CustomerView: React.FC = () => {
  const { orders, tenantConfig, initializeSocket } = usePOSStore();
  const [time, setTime] = useState(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Show recent non-VOID orders, sorted newest first, limit 5
  const recentOrders: Order[] = orders
    .filter((o) => o.status !== 'VOID')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-lg mx-auto flex flex-col h-full min-h-0 space-y-3 p-1 md:p-2">
      {/* Customer Display Header */}
      <div className="bg-white rounded-brand border border-gray-200 p-4 shadow-sm text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          {tenantConfig?.branding.logo_url && (
            <img
              src={tenantConfig.branding.logo_url}
              alt="Logo"
              className="w-8 h-8 rounded-full object-cover border border-gray-200"
            />
          )}
          <h2 className="font-extrabold text-base text-gray-800 uppercase tracking-wider">
            {tenantConfig?.branding.brand_name || 'Resto POS'}
          </h2>
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Eye className="w-3.5 h-3.5 text-brand-primary" />
            <span className="font-bold uppercase tracking-widest text-[10px]">Layar Pelanggan</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full text-xs">
            <Clock className="w-3 h-3 text-brand-primary" />
            <span className="font-mono font-bold text-gray-700">{time}</span>
          </div>
        </div>
      </div>

      {/* Orders List — Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 space-y-3 py-16">
            <ClipboardList className="w-16 h-16 stroke-[1.2] opacity-50" />
            <p className="text-sm font-semibold">Belum ada pesanan</p>
            <p className="text-xs text-gray-400">Pesanan Anda akan muncul di sini setelah diproses oleh kasir</p>
          </div>
        ) : (
          recentOrders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.NEW;
            const subtotal = order.total_price;
            const ppn = Math.round(subtotal * 0.11);
            const grandTotal = Math.round(subtotal * 1.11);

            return (
              <div
                key={order.id}
                className="bg-white rounded-brand border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                {/* Order Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-gray-800">{order.order_number}</span>
                    <span className="bg-brand-secondary text-brand-primary font-bold text-[10px] px-2 py-0.5 rounded-full">
                      Meja {order.table_number}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wide ${status.color} ${status.animate || ''}`}>
                    {status.icon}
                    {status.label}
                  </div>
                </div>

                {/* Delivery Type Badge */}
                <div className="px-4 pt-2 flex flex-wrap gap-1">
                  {order.delivery_type === 'TAKE_AWAY' ? (
                    <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded border border-amber-200 uppercase">
                      🛍️ Take Away
                    </span>
                  ) : (
                    <span className="bg-brand-primary/10 text-brand-primary text-[9px] font-extrabold px-2 py-0.5 rounded border border-brand-primary/20 uppercase">
                      🍽️ Dine In
                    </span>
                  )}
                  {order.items.some(i => i.delivery_type && i.delivery_type !== order.delivery_type) && (
                    <span className="bg-purple-100 text-purple-800 text-[9px] font-extrabold px-2 py-0.5 rounded border border-purple-200 uppercase">
                      ⚡ Campuran
                    </span>
                  )}
                </div>

                {/* Order Notes */}
                {order.notes && (
                  <div className="mx-4 mt-2 bg-red-50 text-red-700 text-[10px] font-extrabold px-2.5 py-1.5 rounded border border-red-100 uppercase tracking-wide">
                    ⚠️ Catatan: {order.notes}
                  </div>
                )}

                {/* Items List */}
                <div className="px-4 py-3 space-y-1.5 text-xs text-gray-700">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-800">{item.quantity}x {item.name}</span>
                          {item.delivery_type && item.delivery_type !== order.delivery_type && (
                            <span className={`text-[7px] font-extrabold px-1 py-0.5 rounded border uppercase ${
                              item.delivery_type === 'TAKE_AWAY'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-brand-primary/5 text-brand-primary border-brand-primary/10'
                            }`}>
                              {item.delivery_type === 'TAKE_AWAY' ? 'Bungkus' : 'Dine In'}
                            </span>
                          )}
                        </div>
                        <span className="text-gray-500 font-semibold">
                          Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                        </span>
                      </div>
                      {item.notes && (
                        <div className="text-[10px] text-brand-primary font-semibold italic pl-4">
                          * {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="px-4 pb-3 border-t border-gray-100 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal:</span>
                    <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>PPN (11%):</span>
                    <span>Rp {ppn.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-gray-800 border-t border-dashed border-gray-100 pt-1.5">
                    <span>TOTAL:</span>
                    <span className="text-brand-primary">Rp {grandTotal.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[9px] text-gray-400 font-medium py-1 flex-shrink-0">
        Terima kasih atas kunjungan Anda • Powered by sign-in.id
      </div>
    </div>
  );
};
