import { create } from 'zustand';
import type { MenuItem, Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus, TenantConfig } from '@resto-pos/shared-types';
import { injectTheme } from '@resto-pos/theme-engine';
import { io, Socket } from 'socket.io-client';

const API_HOST = window.location.hostname || 'localhost';
export const API_URL = `http://${API_HOST}:5000`;

interface POSState {
  tenantId: string;
  tenantConfig: TenantConfig | null;
  menu: MenuItem[];
  cart: OrderItem[];
  tableNumber: string;
  orderNotes: string;
  deliveryType: 'DINE_IN' | 'TAKE_AWAY';
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  socket: Socket | null;
  
  // Actions
  setTenant: (tenantId: string) => Promise<void>;
  setTableNumber: (table: string) => void;
  setOrderNotes: (notes: string) => void;
  setDeliveryType: (type: 'DINE_IN' | 'TAKE_AWAY') => void;
  updateCartItemNotesByIndex: (index: number, notes: string) => void;
  updateCartItemDeliveryTypeByIndex: (index: number, deliveryType: 'DINE_IN' | 'TAKE_AWAY') => void;
  addToCart: (item: MenuItem, notes?: string, deliveryType?: 'DINE_IN' | 'TAKE_AWAY') => void;
  removeFromCart: (menuItemId: string, notes?: string, deliveryType?: 'DINE_IN' | 'TAKE_AWAY') => void;
  clearCart: () => void;
  submitOrder: (paymentMethod?: PaymentMethod) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateOrderPayment: (orderId: string, method: PaymentMethod, status: PaymentStatus) => Promise<void>;
  fetchOrders: () => Promise<void>;
  initializeSocket: () => void;
  addMenuItem: (item: Omit<MenuItem, 'id' | 'available'>) => Promise<void>;
  toggleMenuItem: (id: string) => Promise<void>;
  saveCustomTenantConfig: (config: TenantConfig) => Promise<void>;
}

export const usePOSStore = create<POSState>((set, get) => ({
  tenantId: 'solaria',
  tenantConfig: null,
  menu: [],
  cart: [],
  tableNumber: '',
  orderNotes: '',
  deliveryType: 'DINE_IN',
  orders: [],
  isLoading: false,
  error: null,
  socket: null,

  setTenant: async (tenantId: string) => {
    set({ isLoading: true, error: null, tenantId, cart: [], tableNumber: '', orderNotes: '', deliveryType: 'DINE_IN' });
    try {
      // 1. Fetch Config
      const configRes = await fetch(`${API_URL}/api/${tenantId}/config`);
      if (!configRes.ok) throw new Error('Failed to fetch tenant configuration');
      const tenantConfig: TenantConfig = await configRes.json();
      
      // 2. Inject dynamic theme
      injectTheme(tenantConfig);
      
      // 3. Fetch Menu
      const menuRes = await fetch(`${API_URL}/api/${tenantId}/menu`);
      if (!menuRes.ok) throw new Error('Failed to fetch tenant menu');
      const menu: MenuItem[] = await menuRes.json();

      set({ tenantConfig, menu, isLoading: false });

      // 4. Update Socket room if connected
      const { socket } = get();
      if (socket) {
        socket.emit('tenant:join', tenantId);
      }

      // 5. Fetch tenant orders
      await get().fetchOrders();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  setTableNumber: (tableNumber: string) => set({ tableNumber }),

  setOrderNotes: (orderNotes: string) => set({ orderNotes }),

  setDeliveryType: (deliveryType: 'DINE_IN' | 'TAKE_AWAY') => set({ deliveryType }),

  updateCartItemNotesByIndex: (index: number, notes: string) => {
    set((state) => {
      const newCart = [...state.cart];
      if (newCart[index]) {
        newCart[index].notes = notes;
        return { cart: newCart };
      }
      return {};
    });
  },

  updateCartItemDeliveryTypeByIndex: (index: number, deliveryType: 'DINE_IN' | 'TAKE_AWAY') => {
    set((state) => {
      const newCart = [...state.cart];
      if (newCart[index]) {
        newCart[index].delivery_type = deliveryType;
        return { cart: newCart };
      }
      return {};
    });
  },

  addToCart: (item: MenuItem, notes: string = '', deliveryType?: 'DINE_IN' | 'TAKE_AWAY') => {
    set((state) => {
      const targetDeliveryType = deliveryType || state.deliveryType;
      const existingItemIndex = state.cart.findIndex(
        (i) => i.menu_item_id === item.id && i.notes === notes && (i.delivery_type || 'DINE_IN') === targetDeliveryType
      );

      if (existingItemIndex > -1) {
        const newCart = [...state.cart];
        newCart[existingItemIndex].quantity += 1;
        return { cart: newCart };
      } else {
        const newItem: OrderItem = {
          menu_item_id: item.id,
          code: item.code,
          name: item.name,
          price: item.price,
          quantity: 1,
          notes,
          delivery_type: targetDeliveryType
        };
        return { cart: [...state.cart, newItem] };
      }
    });
  },

  removeFromCart: (menuItemId: string, notes: string = '', deliveryType?: 'DINE_IN' | 'TAKE_AWAY') => {
    set((state) => {
      const targetDeliveryType = deliveryType || state.deliveryType;
      const existingItemIndex = state.cart.findIndex(
        (i) => i.menu_item_id === menuItemId && i.notes === notes && (i.delivery_type || 'DINE_IN') === targetDeliveryType
      );

      if (existingItemIndex === -1) return {};

      const newCart = [...state.cart];
      const item = newCart[existingItemIndex];

      if (item.quantity > 1) {
        item.quantity -= 1;
        return { cart: newCart };
      } else {
        newCart.splice(existingItemIndex, 1);
        return { cart: newCart };
      }
    });
  },

  clearCart: () => set({ cart: [], tableNumber: '', orderNotes: '', deliveryType: 'DINE_IN' }),

  submitOrder: async (paymentMethod?: PaymentMethod) => {
    const { tenantId, tableNumber, cart, orderNotes, deliveryType } = get();
    if (!tableNumber) {
      set({ error: 'Table number is mandatory' });
      return null;
    }
    if (cart.length === 0) {
      set({ error: 'Cart is empty' });
      return null;
    }

    set({ isLoading: true, error: null });

    const total_price = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          table_number: tableNumber,
          total_price,
          items: cart.map(item => ({
            ...item,
            delivery_type: item.delivery_type || 'DINE_IN'
          })),
          payment_method: paymentMethod || 'CASH',
          notes: orderNotes,
          delivery_type: deliveryType
        })
      });

      if (!res.ok) throw new Error('Failed to submit order');
      const submittedOrder: Order = await res.json();
      
      set({ cart: [], tableNumber: '', isLoading: false });
      
      // Update local orders list instantly, checking for duplicates to avoid race conditions with WebSockets
      set((state) => {
        if (state.orders.some((o) => o.id === submittedOrder.id)) return {};
        return { orders: [submittedOrder, ...state.orders] };
      });

      return submittedOrder;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updatedOrder: Order = await res.json();
      
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o))
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateOrderPayment: async (orderId: string, payment_method: PaymentMethod, payment_status: PaymentStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method, payment_status })
      });
      if (!res.ok) throw new Error('Failed to update payment');
      const updatedOrder: Order = await res.json();
      
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o))
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchOrders: async () => {
    const { tenantId } = get();
    try {
      const res = await fetch(`${API_URL}/api/${tenantId}/orders`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const orders: Order[] = await res.json();
      set({ orders });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  initializeSocket: () => {
    const { socket, tenantId } = get();
    if (socket) return; // already initialized

    console.log(`POSStore: Connecting to Socket.io server at ${API_URL}`);
    const newSocket = io(API_URL);

    newSocket.on('connect', () => {
      console.log('POSStore: Socket.io connected successfully');
      newSocket.emit('tenant:join', tenantId);
    });

    newSocket.on('order:new', (newOrder: Order) => {
      console.log('POSStore: Received real-time order:new event', newOrder);
      // Play sound notification
      try {
        const audio = new Audio('/bell.mp3');
        audio.play();
      } catch (e) {
        console.warn('Audio play failed', e);
      }

      set((state) => {
        // Prevent duplicate
        if (state.orders.some((o) => o.id === newOrder.id)) return {};
        return { orders: [newOrder, ...state.orders] };
      });
    });

    newSocket.on('order:status_updated', (updatedOrder: Order) => {
      console.log('POSStore: Received real-time order:status_updated event', updatedOrder);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      }));
    });

    newSocket.on('menu:updated', async () => {
      console.log('POSStore: Received real-time menu:updated event');
      const { tenantId } = get();
      try {
        const menuRes = await fetch(`${API_URL}/api/${tenantId}/menu`);
        if (menuRes.ok) {
          const menu = await menuRes.json();
          set({ menu });
        }
      } catch (e) {
        console.error('Failed to fetch menu on update', e);
      }
    });

    newSocket.on('config:updated', (updatedConfig: TenantConfig) => {
      console.log('POSStore: Received real-time config:updated event', updatedConfig);
      injectTheme(updatedConfig);
      set({ tenantConfig: updatedConfig });
    });

    set({ socket: newSocket });
  },

  addMenuItem: async (item: Omit<MenuItem, 'id' | 'available'>) => {
    const { tenantId } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/${tenantId}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (!res.ok) throw new Error('Failed to add menu item');
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  toggleMenuItem: async (id: string) => {
    const { tenantId } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/${tenantId}/menu/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to toggle menu item availability');
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  saveCustomTenantConfig: async (config: TenantConfig) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/tenant/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Failed to save tenant config');
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  }
}));
