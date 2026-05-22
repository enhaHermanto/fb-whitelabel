import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { SQLiteDB, hashPassword, verifyPassword } from './db/sqlite.js';
import { Order, OrderStatus, PaymentStatus, PaymentMethod, MenuItem, TenantConfig, User, UserRole } from '@resto-pos/shared-types';

const PORT = 5000;

// Initialize fastify
const fastify = Fastify({ logger: true });

// Initialize database
const db = new SQLiteDB();

// Register CORS
fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
});

// Root route
fastify.get('/', async () => {
  return { status: 'POS Resto Local Server is Running', node: process.version };
});

// 1. GET /api/:tenantId/config
fastify.get<{ Params: { tenantId: string } }>('/api/:tenantId/config', async (request, reply) => {
  const { tenantId } = request.params;
  const config = db.getTenantConfig(tenantId);
  if (!config) {
    return reply.status(404).send({ error: `Tenant config for ${tenantId} not found` });
  }
  return config;
});

// 2. GET /api/:tenantId/menu
fastify.get<{ Params: { tenantId: string } }>('/api/:tenantId/menu', async (request, reply) => {
  const { tenantId } = request.params;
  const config = db.getTenantConfig(tenantId);
  if (!config) {
    return reply.status(404).send({ error: `Tenant ${tenantId} not found` });
  }
  const menu = db.getMenu(tenantId);
  return menu;
});

// 3. GET /api/:tenantId/orders
fastify.get<{ Params: { tenantId: string } }>('/api/:tenantId/orders', async (request, reply) => {
  const { tenantId } = request.params;
  const orders = db.getOrders(tenantId);
  return orders;
});

// 4. POST /api/orders
fastify.post<{ Body: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at' | 'status' | 'payment_status'> }>('/api/orders', async (request, reply) => {
  const body = request.body;
  
  if (!body.tenant_id || !body.table_number || !body.items || body.items.length === 0) {
    return reply.status(400).send({ error: 'Missing required order fields: tenant_id, table_number, or items.' });
  }

  // Generate unique order number (incremental based on current orders today)
  const currentOrders = db.getOrders(body.tenant_id);
  const orderCountToday = currentOrders.length;
  const orderNumber = `#${100 + orderCountToday + 1}`;

  const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const newOrder: Order = {
    id: orderId,
    order_number: orderNumber,
    tenant_id: body.tenant_id,
    table_number: body.table_number,
    status: 'NEW',
    payment_method: body.payment_method,
    payment_status: body.payment_method === 'QRIS' ? 'PENDING' : 'PAID', // QRIS simulates pending, Cash is paid instantly
    total_price: body.total_price,
    items: body.items,
    notes: body.notes, // Order level notes
    delivery_type: body.delivery_type || 'DINE_IN',
    created_at: now,
    updated_at: now
  };

  db.createOrder(newOrder);

  // Broadcast via Socket.IO to the tenant room
  io.to(`tenant:${body.tenant_id}`).emit('order:new', newOrder);

  fastify.log.info(`Order ${orderNumber} created for tenant ${body.tenant_id} on table ${body.table_number}`);
  return newOrder;
});

// 5. PATCH /api/orders/:id/status
fastify.patch<{ Params: { id: string }; Body: { status: OrderStatus } }>('/api/orders/:id/status', async (request, reply) => {
  const { id } = request.params;
  const { status } = request.body;

  const existingOrder = db.getOrderById(id);
  if (!existingOrder) {
    return reply.status(404).send({ error: `Order ${id} not found.` });
  }

  let timestampKey: string | undefined = undefined;
  let timestampVal: string | undefined = undefined;

  const now = new Date().toISOString();
  if (status === 'COOKING') {
    timestampKey = 'cooking_started_at';
    timestampVal = now;
  } else if (status === 'READY') {
    timestampKey = 'ready_at';
    timestampVal = now;
  } else if (status === 'DELIVERING' || status === 'COMPLETED') {
    timestampKey = 'delivered_at';
    timestampVal = now;
  }

  db.updateOrderStatus(id, status, timestampKey, timestampVal);

  const updatedOrder = db.getOrderById(id);
  if (updatedOrder) {
    // Broadcast status change
    io.to(`tenant:${existingOrder.tenant_id}`).emit('order:status_updated', updatedOrder);
    fastify.log.info(`Order ${updatedOrder.order_number} status updated to ${status}`);
    return updatedOrder;
  }

  return reply.status(500).send({ error: 'Failed to update order status.' });
});

// 6. PATCH /api/orders/:id/payment
fastify.patch<{ Params: { id: string }; Body: { payment_method: PaymentMethod; payment_status: PaymentStatus } }>('/api/orders/:id/payment', async (request, reply) => {
  const { id } = request.params;
  const { payment_method, payment_status } = request.body;

  const existingOrder = db.getOrderById(id);
  if (!existingOrder) {
    return reply.status(404).send({ error: `Order ${id} not found.` });
  }

  db.updateOrderPayment(id, payment_method, payment_status);

  const updatedOrder = db.getOrderById(id);
  if (updatedOrder) {
    io.to(`tenant:${existingOrder.tenant_id}`).emit('order:status_updated', updatedOrder);
    fastify.log.info(`Order ${updatedOrder.order_number} payment updated to ${payment_status} via ${payment_method}`);
    return updatedOrder;
  }

  return reply.status(500).send({ error: 'Failed to update order payment.' });
});

// 7. POST /api/:tenantId/menu - Add a new menu item
fastify.post<{ Params: { tenantId: string }; Body: Omit<MenuItem, 'id' | 'available'> }>('/api/:tenantId/menu', async (request, reply) => {
  const { tenantId } = request.params;
  const body = request.body;

  if (!body.code || !body.name || body.price === undefined || !body.category) {
    return reply.status(400).send({ error: 'Missing required menu fields: code, name, price, or category.' });
  }

  const itemId = `${tenantId.substring(0, 3)}-${Date.now()}`;
  const newItem: MenuItem = {
    id: itemId,
    code: body.code,
    name: body.name,
    price: Number(body.price),
    category: body.category as any,
    description: body.description || '',
    image_url: body.image_url || '',
    available: true
  };

  db.addMenuItem(tenantId, newItem);

  // Broadcast menu update to the room
  io.to(`tenant:${tenantId}`).emit('menu:updated');

  fastify.log.info(`Menu item ${newItem.name} (${newItem.code}) created for tenant ${tenantId}`);
  return newItem;
});

// 8. PATCH /api/:tenantId/menu/:id/toggle - Toggle availability (stock control)
fastify.patch<{ Params: { tenantId: string; id: string } }>('/api/:tenantId/menu/:id/toggle', async (request, reply) => {
  const { tenantId, id } = request.params;
  const exists = db.getMenu(tenantId).some(item => item.id === id);
  if (!exists) {
    return reply.status(404).send({ error: `Menu item ${id} not found for tenant ${tenantId}.` });
  }
  const isAvailable = db.toggleMenuItemAvailability(id);
  
  // Broadcast menu update
  io.to(`tenant:${tenantId}`).emit('menu:updated');
  
  return { id, available: isAvailable };
});

// 9. GET /api/:tenantId/reports - Revenue reports and best sellers
fastify.get<{ Params: { tenantId: string } }>('/api/:tenantId/reports', async (request, reply) => {
  const { tenantId } = request.params;
  const orders = db.getOrders(tenantId);

  // Filter completed or paid orders for financial reports
  const paidOrders = orders.filter(o => o.payment_status === 'PAID');

  const now = new Date();
  
  const getLocalDateString = (isoStr: string) => {
    const d = new Date(isoStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };
  
  const getLocalMonthString = (isoStr: string) => {
    const d = new Date(isoStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const todayLocal = getLocalDateString(now.toISOString());
  const monthLocal = getLocalMonthString(now.toISOString());

  let dailyRevenue = 0;
  let monthlyRevenue = 0;
  let todayOrderCount = 0;
  let monthlyOrderCount = 0;

  const productSalesMap: Record<string, { code: string; name: string; quantity: number; revenue: number }> = {};

  for (const order of paidOrders) {
    const orderDate = getLocalDateString(order.created_at);
    const orderMonth = getLocalMonthString(order.created_at);

    const isToday = orderDate === todayLocal;
    const isThisMonth = orderMonth === monthLocal;

    if (isToday) {
      dailyRevenue += order.total_price;
      todayOrderCount++;
    }
    if (isThisMonth) {
      monthlyRevenue += order.total_price;
      monthlyOrderCount++;
    }

    for (const item of order.items) {
      if (!productSalesMap[item.menu_item_id]) {
        productSalesMap[item.menu_item_id] = {
          code: item.code,
          name: item.name,
          quantity: 0,
          revenue: 0
        };
      }
      productSalesMap[item.menu_item_id].quantity += item.quantity;
      productSalesMap[item.menu_item_id].revenue += item.price * item.quantity;
    }
  }

  const bestSellers = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    summary: {
      daily_revenue: dailyRevenue,
      monthly_revenue: monthlyRevenue,
      today_orders: todayOrderCount,
      monthly_orders: monthlyOrderCount
    },
    best_sellers: bestSellers,
    orders: orders.slice(0, 50)
  };
});

// 10. POST /api/tenant/custom - Save custom visual/Wi-Fi tenant branding configuration
fastify.post<{ Body: TenantConfig }>('/api/tenant/custom', async (request, reply) => {
  const body = request.body;
  
  if (!body.tenant_id || !body.branding || !body.feature_flags || !body.receipt) {
    return reply.status(400).send({ error: 'Missing required tenant config fields.' });
  }

  db.saveCustomTenantConfig(body);

  // Broadcast new config to the room
  io.to(`tenant:${body.tenant_id}`).emit('config:updated', body);

  fastify.log.info(`Tenant configuration updated for ${body.tenant_id}`);
  return body;
});

// --- AUTH & USER MANAGEMENT ENDPOINTS ---

// 11. POST /api/:tenantId/auth/login
fastify.post<{ Params: { tenantId: string }; Body: { username?: string; password?: string } }>('/api/:tenantId/auth/login', async (request, reply) => {
  const { tenantId } = request.params;
  const { username, password } = request.body;

  if (!username || !password) {
    return reply.status(400).send({ error: 'Username dan password wajib diisi!' });
  }

  const user = db.getUserByUsername(tenantId, username);
  if (!user) {
    return reply.status(401).send({ error: 'Username atau password salah.' });
  }

  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    return reply.status(401).send({ error: 'Username atau password salah.' });
  }

  // Generate a mock secure token
  const token = `mock-token-${user.id}-${Date.now()}`;

  fastify.log.info(`User ${user.username} (${user.role}) logged in successfully for tenant ${tenantId}`);

  return {
    user: {
      id: user.id,
      tenant_id: user.tenant_id,
      username: user.username,
      name: user.name,
      role: user.role
    },
    token
  };
});

// 12. GET /api/:tenantId/users - List all users in a tenant
fastify.get<{ Params: { tenantId: string } }>('/api/:tenantId/users', async (request, reply) => {
  const { tenantId } = request.params;
  const users = db.getUsers(tenantId);
  return users;
});

// 13. POST /api/:tenantId/users - Add a new user
fastify.post<{ Params: { tenantId: string }; Body: Omit<User, 'id'> & { password?: string } }>('/api/:tenantId/users', async (request, reply) => {
  const { tenantId } = request.params;
  const body = request.body;

  if (!body.username || !body.name || !body.role || !body.password) {
    return reply.status(400).send({ error: 'Mohon isi semua kolom: username, nama lengkap, role, dan password!' });
  }

  // Check if username is already taken
  const existingUser = db.getUserByUsername(tenantId, body.username);
  if (existingUser) {
    return reply.status(400).send({ error: 'Username ini sudah terpakai!' });
  }

  const userId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const passwordHash = hashPassword(body.password);

  const newUser: User = {
    id: userId,
    tenant_id: tenantId,
    username: body.username,
    name: body.name,
    role: body.role as UserRole
  };

  db.addUser(tenantId, {
    ...newUser,
    password_hash: passwordHash
  });

  // Broadcast user changes to other connected clients
  io.to(`tenant:${tenantId}`).emit('users:updated');

  fastify.log.info(`New user ${newUser.username} (${newUser.role}) created for tenant ${tenantId}`);

  return { success: true, user: newUser };
});

// 14. DELETE /api/:tenantId/users/:id - Delete a user
fastify.delete<{ Params: { tenantId: string; id: string } }>('/api/:tenantId/users/:id', async (request, reply) => {
  const { tenantId, id } = request.params;
  
  db.deleteUser(id);

  // Broadcast user changes to other connected clients
  io.to(`tenant:${tenantId}`).emit('users:updated');

  fastify.log.info(`User ID ${id} deleted for tenant ${tenantId}`);

  return { success: true };
});

// Start Fastify server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Fastify local-server is listening on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// Attach Socket.IO
// Note: We access the underlying raw Node server via fastify.server
const io = new SocketIOServer(fastify.server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`Socket.IO Client connected: ${socket.id}`);

  // Client joins a tenant-specific room to guarantee data isolation
  socket.on('tenant:join', (tenantId: string) => {
    socket.join(`tenant:${tenantId}`);
    console.log(`Socket ${socket.id} joined room tenant:${tenantId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket.IO Client disconnected: ${socket.id}`);
  });
});
