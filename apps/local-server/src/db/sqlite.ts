import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'node:crypto';
import { TenantConfig, MenuItem, Order, OrderItem, OrderStatus, PaymentStatus, PaymentMethod, User, UserRole } from '@resto-pos/shared-types';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const DB_PATH = path.join(DB_DIR, 'pos.db');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === key;
}

export class SQLiteDB {
  private db: DatabaseSync;

  constructor() {
    console.log(`SQLiteDB: Connecting to database at ${DB_PATH}`);
    this.db = new DatabaseSync(DB_PATH);
    this.initSchema();
    this.seedData();
  }

  private initSchema() {
    // 1. Tenant Configs Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tenant_configs (
        tenant_id TEXT PRIMARY KEY,
        subscription_plan TEXT NOT NULL DEFAULT 'BASIC',
        branding TEXT NOT NULL,
        feature_flags TEXT NOT NULL,
        receipt TEXT NOT NULL,
        license TEXT
      )
    `);

    // Users Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenant_configs(tenant_id)
      )
    `);

    // 2. Menu Items Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        available INTEGER NOT NULL DEFAULT 1
      )
    `);

    // 3. Orders Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        table_number TEXT NOT NULL,
        status TEXT NOT NULL,
        payment_method TEXT,
        payment_status TEXT NOT NULL,
        total_price INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        notes TEXT,
        delivery_type TEXT DEFAULT 'DINE_IN',
        cooking_started_at TEXT,
        ready_at TEXT,
        delivered_at TEXT
      )
    `);

    // 4. Order Items Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        menu_item_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        notes TEXT,
        delivery_type TEXT DEFAULT 'DINE_IN',
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    // Schema Migrations (Kondisional)
    try {
      this.db.exec(`ALTER TABLE tenant_configs ADD COLUMN subscription_plan TEXT NOT NULL DEFAULT 'BASIC'`);
      console.log('SQLiteDB: Migrated tenant_configs table - added subscription_plan column.');
    } catch (e) {}

    try {
      this.db.exec(`ALTER TABLE tenant_configs ADD COLUMN license TEXT`);
      console.log('SQLiteDB: Migrated tenant_configs table - added license column.');
    } catch (e) {}

    try {
      this.db.exec(`ALTER TABLE orders ADD COLUMN notes TEXT`);
      console.log('SQLiteDB: Migrated orders table - added notes column.');
    } catch (e) {
      // Column already exists or table not created, ignore safely
    }

    try {
      this.db.exec(`ALTER TABLE orders ADD COLUMN delivery_type TEXT DEFAULT 'DINE_IN'`);
      console.log('SQLiteDB: Migrated orders table - added delivery_type column.');
    } catch (e) {}

    try {
      this.db.exec(`ALTER TABLE order_items ADD COLUMN delivery_type TEXT DEFAULT 'DINE_IN'`);
      console.log('SQLiteDB: Migrated order_items table - added delivery_type column.');
    } catch (e) {}

    try {
      this.db.exec(`ALTER TABLE menu_items ADD COLUMN image_url TEXT`);
      console.log('SQLiteDB: Migrated menu_items table - added image_url column.');
    } catch (e) {}

    console.log('SQLiteDB: Schema successfully initialized or verified.');
  }

  private seedData() {
    // Seed Tenants
    const solariaConfig: TenantConfig = {
      tenant_id: 'solaria',
      subscription_plan: 'PREMIUM',
      branding: {
        brand_name: 'Solaria',
        logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&h=100&fit=crop&q=80',
        theme: {
          primary_color: '#E63946',
          secondary_color: '#F1FAEE',
          background_color: '#FFFFFF',
          surface_color: '#F8F9FA',
          text_primary: '#1D3557',
          text_secondary: '#6C757D',
          accent_color: '#457B9D',
          error_color: '#DC3545',
          success_color: '#28A745',
          font_family: 'Poppins, sans-serif',
          border_radius: '8px'
        }
      },
      feature_flags: {
        qris_payment: true,
        runner_app: true,
        customer_display: false,
        order_priority: true
      },
      receipt: {
        header: 'TERIMA KASIH TELAH MEMILIH SOLARIA',
        footer: 'IG: @solaria.resto | Telp: (021) 1234-5678',
        show_logo: true,
        paper_size: '80mm',
        wifi_ssid: 'Solaria_Gratis_5G',
        wifi_password: 'nasispesialsolaria'
      },
      license: {
        serial_number: 'SOL-62821-ACTIVE',
        license_status: 'ACTIVE',
        activated_at: new Date().toISOString()
      }
    };

    const bakmigmConfig: TenantConfig = {
      tenant_id: 'bakmigm',
      subscription_plan: 'ENTERPRISE',
      branding: {
        brand_name: 'Bakmi GM',
        logo_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=100&h=100&fit=crop&q=80',
        theme: {
          primary_color: '#F59E0B', // Gold/Yellow branding
          secondary_color: '#FEF3C7',
          background_color: '#FFFFFF',
          surface_color: '#FFFDF5',
          text_primary: '#78350F', // Dark warm brown
          text_secondary: '#92400E',
          accent_color: '#DC2626', // Red accents
          error_color: '#EF4444',
          success_color: '#10B981',
          font_family: 'Outfit, sans-serif',
          border_radius: '12px'
        }
      },
      feature_flags: {
        qris_payment: true,
        runner_app: true,
        customer_display: true,
        order_priority: false
      },
      receipt: {
        header: 'SELAMAT MENIKMATI BAKMI GM',
        footer: 'Call Center: 1500677 | www.bakmigm.co.id',
        show_logo: true,
        paper_size: '80mm',
        wifi_ssid: 'Bakmi_GM_Premium',
        wifi_password: 'pangsitgorenglezat'
      },
      license: {
        serial_number: 'GM-9988-ENTERPRISE',
        license_status: 'ACTIVE',
        activated_at: new Date().toISOString()
      }
    };

    const morosenengConfig: TenantConfig = {
      tenant_id: 'moroseneng',
      subscription_plan: 'BASIC',
      branding: {
        brand_name: 'Warung Moroseneng',
        logo_url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=100&h=100&fit=crop&q=80',
        theme: {
          primary_color: '#0D9488', // Teal branding
          secondary_color: '#F0FDFA',
          background_color: '#FFFFFF',
          surface_color: '#F8FAFC',
          text_primary: '#0F172A',
          text_secondary: '#475569',
          accent_color: '#14B8A6',
          error_color: '#EF4444',
          success_color: '#10B981',
          font_family: 'Outfit, sans-serif',
          border_radius: '10px'
        }
      },
      feature_flags: {
        qris_payment: false,
        runner_app: false,
        customer_display: false,
        order_priority: false
      },
      receipt: {
        header: 'TERIMA KASIH TELAH MAMPIR DI WARUNG MOROSENENG',
        footer: 'Sedia Aneka Penyetan & Masakan Khas Jawa Timur',
        show_logo: true,
        paper_size: '58mm',
        wifi_ssid: '',
        wifi_password: ''
      },
      license: {
        license_status: 'UNLICENSED'
      }
    };

    const ingkungrahtawuConfig: TenantConfig = {
      tenant_id: 'ingkung-rahtawu',
      subscription_plan: 'PREMIUM',
      branding: {
        brand_name: 'Ingkung Rahtawu',
        logo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=100&h=100&fit=crop&q=80',
        theme: {
          primary_color: '#78350F', // Javanese Classic Warm Brown
          secondary_color: '#FEF3C7',
          background_color: '#FFFFFF',
          surface_color: '#FFFDF5',
          text_primary: '#451A03',
          text_secondary: '#78350F',
          accent_color: '#D97706',
          error_color: '#EF4444',
          success_color: '#10B981',
          font_family: 'Plus Jakarta Sans, sans-serif',
          border_radius: '12px'
        }
      },
      feature_flags: {
        qris_payment: true,
        runner_app: true,
        customer_display: false,
        order_priority: true
      },
      receipt: {
        header: 'SUGENG RAWUH INGKUNG RAHTAWU - KUDUS',
        footer: 'Matur Nuwun Sanget, Sugeng Kondur',
        show_logo: true,
        paper_size: '80mm',
        wifi_ssid: 'Ingkung_Rahtawu_VIP',
        wifi_password: 'ingkungmaknyus'
      },
      license: {
        serial_number: 'RAHTAWU-62821-ACTIVE',
        license_status: 'ACTIVE',
        activated_at: new Date().toISOString()
      }
    };

    const dekocafeConfig: TenantConfig = {
      tenant_id: 'deko-cafe',
      subscription_plan: 'PREMIUM',
      branding: {
        brand_name: 'Deko Cafe',
        logo_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=100&h=100&fit=crop&q=80',
        theme: {
          primary_color: '#1E293B', // Sleek Modern Slate Charcoal
          secondary_color: '#F1F5F9',
          background_color: '#FFFFFF',
          surface_color: '#F8FAFC',
          text_primary: '#0F172A',
          text_secondary: '#475569',
          accent_color: '#D97706', // Warm Amber Cafe Accents
          error_color: '#EF4444',
          success_color: '#10B981',
          font_family: 'Outfit, sans-serif',
          border_radius: '16px'
        }
      },
      feature_flags: {
        qris_payment: true,
        runner_app: true,
        customer_display: true,
        order_priority: false
      },
      receipt: {
        header: 'DEKO CAFE & ROASTERY',
        footer: 'Follow Us: @deko.cafe | Thank you!',
        show_logo: true,
        paper_size: '80mm',
        wifi_ssid: 'Deko_Cafe_HighSpeed',
        wifi_password: 'ngopidekocafe'
      },
      license: {
        serial_number: 'DEKO-62821-ACTIVE',
        license_status: 'ACTIVE',
        activated_at: new Date().toISOString()
      }
    };

    // Save Tenants only if they do not already exist, to preserve user-customized visual branding across restarts
    const insertTenant = this.db.prepare(`
      INSERT OR IGNORE INTO tenant_configs (tenant_id, subscription_plan, branding, feature_flags, receipt, license)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertTenant.run(
      'solaria',
      solariaConfig.subscription_plan,
      JSON.stringify(solariaConfig.branding),
      JSON.stringify(solariaConfig.feature_flags),
      JSON.stringify(solariaConfig.receipt),
      JSON.stringify(solariaConfig.license)
    );

    insertTenant.run(
      'bakmigm',
      bakmigmConfig.subscription_plan,
      JSON.stringify(bakmigmConfig.branding),
      JSON.stringify(bakmigmConfig.feature_flags),
      JSON.stringify(bakmigmConfig.receipt),
      JSON.stringify(bakmigmConfig.license)
    );

    insertTenant.run(
      'moroseneng',
      morosenengConfig.subscription_plan,
      JSON.stringify(morosenengConfig.branding),
      JSON.stringify(morosenengConfig.feature_flags),
      JSON.stringify(morosenengConfig.receipt),
      JSON.stringify(morosenengConfig.license)
    );

    insertTenant.run(
      'ingkung-rahtawu',
      ingkungrahtawuConfig.subscription_plan,
      JSON.stringify(ingkungrahtawuConfig.branding),
      JSON.stringify(ingkungrahtawuConfig.feature_flags),
      JSON.stringify(ingkungrahtawuConfig.receipt),
      JSON.stringify(ingkungrahtawuConfig.license)
    );

    insertTenant.run(
      'deko-cafe',
      dekocafeConfig.subscription_plan,
      JSON.stringify(dekocafeConfig.branding),
      JSON.stringify(dekocafeConfig.feature_flags),
      JSON.stringify(dekocafeConfig.receipt),
      JSON.stringify(dekocafeConfig.license)
    );

    // Seed Menu Items
    const menuItems: MenuItem[] = [
      // Solaria Menu
      { id: 'sol-01', code: 'A01', name: 'Nasi Goreng Spesial', price: 35000, category: 'FOOD', description: 'Nasi goreng lezat khas Solaria dengan bakso ikan, ayam, telur mata sapi, dan kerupuk.', image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'sol-02', code: 'A02', name: 'Kwetiau Siram Ayam', price: 38000, category: 'FOOD', description: 'Kwetiau basah disiram kuah kental gurih lengkap dengan potongan ayam, sayuran segar, dan telur.', image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'sol-03', code: 'A03', name: 'Chicken Cordon Bleu', price: 45000, category: 'FOOD', description: 'Dada ayam gulung isi keju mozarella and smoked beef goreng tepung roti gurih.', image_url: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'sol-04', code: 'D01', name: 'Es Teh Manis', price: 12000, category: 'BEVERAGE', description: 'Es teh manis segar pelepas dahaga.', image_url: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'sol-05', code: 'D02', name: 'Jus Alpukat', price: 22000, category: 'BEVERAGE', description: 'Jus buah alpukat segar kental dengan saus cokelat manis.', image_url: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'sol-06', code: 'S01', name: 'Kentang Goreng', price: 18000, category: 'SNACK', description: 'Kentang goreng renyah bumbu garam gurih.', image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format&fit=crop&q=60', available: true },

      // Bakmi GM Menu
      { id: 'gm-01', code: 'B01', name: 'Bakmi Spesial GM', price: 34000, category: 'FOOD', description: 'Bakmi lembut legendaris disajikan dengan potongan ayam jamur kecap gurih.', image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'gm-02', code: 'B02', name: 'Bakmi Ayam Saus Thai', price: 36000, category: 'FOOD', description: 'Bakmi GM dengan topping ayam goreng renyah disiram saus khas Thailand asam pedas.', image_url: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'gm-03', code: 'B03', name: 'Pangsit Goreng (5 pcs)', price: 21000, category: 'SNACK', description: 'Pangsit goreng legendaris Bakmi GM yang renyah dengan saus merah manis khas.', image_url: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'gm-04', code: 'GD01', name: 'Es Teh Manis GM', price: 10000, category: 'BEVERAGE', description: 'Es teh manis segar aroma melati khas GM.', image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'gm-05', code: 'GD02', name: 'Es Green Tea Lychee', price: 18000, category: 'BEVERAGE', description: 'Es teh hijau dingin rasa buah leci menyegarkan.', image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=60', available: true },

      // Moroseneng Menu
      { id: 'mor-01', code: 'A01', name: 'Nasi Ayam Penyet', price: 22000, category: 'FOOD', description: 'Nasi hangat dengan ayam goreng renyah dipadukan sambal ulek korek pedas mantap dan lalapan segar.', image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'mor-02', code: 'A02', name: 'Bakso Urat Wonogiri', price: 18000, category: 'FOOD', description: 'Bakso sapi urat khas Wonogiri dengan kuah kaldu sapi bening gurih nan lezat.', image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'mor-03', code: 'D01', name: 'Es Jeruk Peras', price: 8000, category: 'BEVERAGE', description: 'Es jeruk peras asli segar kaya vitamin C.', image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'mor-04', code: 'D02', name: 'Es Teh Manis', price: 5000, category: 'BEVERAGE', description: 'Es teh manis segar pelepas dahaga.', image_url: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=400&auto=format&fit=crop&q=60', available: true },

      // Ingkung Rahtawu Menu
      { id: 'rah-01', code: 'A01', name: 'Ingkung Ayam Kampung Utuh', price: 120000, category: 'FOOD', description: 'Satu ekor ayam kampung utuh dimasak dengan santan kental bumbu rempah tradisional Jawa yang meresap dan gurih manis pedas.', image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'rah-02', code: 'A02', name: 'Nasi Ingkung Ayam Potong', price: 35000, category: 'FOOD', description: 'Nasi hangat disajikan dengan porsi potongan ayam ingkung empuk bumbu areh santan gurih, sambal bajak khas Kudus, dan lalapan.', image_url: 'https://images.unsplash.com/photo-1598515214211-89d3e73ae83b?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'rah-03', code: 'D01', name: 'Wedang Uwuh Wangi', price: 12000, category: 'BEVERAGE', description: 'Wedang uwuh rempah tradisional hangat dengan secang, jahe, kayu manis, dan cengkeh harum.', image_url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=400&auto=format&fit=crop&q=60', available: true },

      // Deko Cafe Menu
      { id: 'dec-01', code: 'C01', name: 'Specialty Cafe Latte', price: 28000, category: 'BEVERAGE', description: 'Double espresso blend dengan susu lembut premium, foam tebal, dan seni latte art yang menawan.', image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'dec-02', code: 'C02', name: 'Ice Caramel Macchiato', price: 32000, category: 'BEVERAGE', description: 'Paduan dingin espresso kental, fresh milk, vanilla syrup, dan siraman saus karamel lezat di atasnya.', image_url: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400&auto=format&fit=crop&q=60', available: true },
      { id: 'dec-03', code: 'S01', name: 'Premium Butter Croissant', price: 20000, category: 'SNACK', description: 'Croissant butter Prancis klasik yang renyah di luar, berongga lembut, harum mentega gurih.', image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=60', available: true }
    ];

    const insertMenu = this.db.prepare(`
      INSERT OR REPLACE INTO menu_items (id, tenant_id, code, name, price, category, description, image_url, available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of menuItems) {
      const tenantId = item.id.startsWith('sol') 
        ? 'solaria' 
        : (item.id.startsWith('gm') 
          ? 'bakmigm' 
          : (item.id.startsWith('mor') 
            ? 'moroseneng' 
            : (item.id.startsWith('rah') 
              ? 'ingkung-rahtawu' 
              : 'deko-cafe')));
      insertMenu.run(
        item.id,
        tenantId,
        item.code,
        item.name,
        item.price.toString(),
        item.category,
        item.description || '',
        item.image_url || '',
        item.available ? '1' : '0'
      );
    }

    // Seed Users
    const defaultUsers = [
      // Solaria Users
      { id: 'u-sol-admin', tenant_id: 'solaria', username: 'solaria_admin', name: 'Solaria Admin', role: 'SYSADMIN', password: 'admin' },
      { id: 'u-sol-cashier', tenant_id: 'solaria', username: 'solaria_cashier', name: 'Ani Rahmawati', role: 'KASIR', password: 'cashier' },
      { id: 'u-sol-kitchen', tenant_id: 'solaria', username: 'solaria_kitchen', name: 'Budi Chef', role: 'KITCHEN', password: 'kitchen' },
      { id: 'u-sol-runner', tenant_id: 'solaria', username: 'solaria_runner', name: 'Candra Runner', role: 'RUNNER', password: 'runner' },
      { id: 'u-sol-manager', tenant_id: 'solaria', username: 'solaria_manager', name: 'Dewi Manager', role: 'MANAGEMENT', password: 'manager' },

      // Bakmi GM Users
      { id: 'u-gm-admin', tenant_id: 'bakmigm', username: 'gm_admin', name: 'GM Admin', role: 'SYSADMIN', password: 'admin' },
      { id: 'u-gm-cashier', tenant_id: 'bakmigm', username: 'gm_cashier', name: 'Eka Rahayu', role: 'KASIR', password: 'cashier' },
      { id: 'u-gm-kitchen', tenant_id: 'bakmigm', username: 'gm_kitchen', name: 'Fajar Chef', role: 'KITCHEN', password: 'kitchen' },
      { id: 'u-gm-runner', tenant_id: 'bakmigm', username: 'gm_runner', name: 'Gita Runner', role: 'RUNNER', password: 'runner' },
      { id: 'u-gm-manager', tenant_id: 'bakmigm', username: 'gm_manager', name: 'Hadi Manager', role: 'MANAGEMENT', password: 'manager' },

      // Moroseneng Users
      { id: 'u-mor-admin', tenant_id: 'moroseneng', username: 'moroseneng_admin', name: 'Moroseneng Admin', role: 'SYSADMIN', password: 'admin' },
      { id: 'u-mor-cashier', tenant_id: 'moroseneng', username: 'moroseneng_cashier', name: 'Sri Wahyuni', role: 'KASIR', password: 'cashier' },
      { id: 'u-mor-kitchen', tenant_id: 'moroseneng', username: 'moroseneng_kitchen', name: 'Pak Slamet', role: 'KITCHEN', password: 'kitchen' },
      { id: 'u-mor-runner', tenant_id: 'moroseneng', username: 'moroseneng_runner', name: 'Tono Runner', role: 'RUNNER', password: 'runner' },
      { id: 'u-mor-customer', tenant_id: 'moroseneng', username: 'moroseneng_customer', name: 'Tamu Moroseneng', role: 'CUSTOMER', password: 'customer' },

      // Ingkung Rahtawu Users
      { id: 'u-rah-admin', tenant_id: 'ingkung-rahtawu', username: 'rahtawu_admin', name: 'Rahtawu Admin', role: 'SYSADMIN', password: 'admin' },
      { id: 'u-rah-cashier', tenant_id: 'ingkung-rahtawu', username: 'rahtawu_cashier', name: 'Wahyu Cashier', role: 'KASIR', password: 'cashier' },
      { id: 'u-rah-kitchen', tenant_id: 'ingkung-rahtawu', username: 'rahtawu_kitchen', name: 'Siti Chef', role: 'KITCHEN', password: 'kitchen' },
      { id: 'u-rah-runner', tenant_id: 'ingkung-rahtawu', username: 'rahtawu_runner', name: 'Lilik Runner', role: 'RUNNER', password: 'runner' },
      { id: 'u-rah-customer', tenant_id: 'ingkung-rahtawu', username: 'rahtawu_customer', name: 'Tamu Rahtawu', role: 'CUSTOMER', password: 'customer' },

      // Deko Cafe Users
      { id: 'u-dec-admin', tenant_id: 'deko-cafe', username: 'deko_admin', name: 'Deko Admin', role: 'SYSADMIN', password: 'admin' },
      { id: 'u-dec-cashier', tenant_id: 'deko-cafe', username: 'deko_cashier', name: 'Putri Cashier', role: 'KASIR', password: 'cashier' },
      { id: 'u-dec-kitchen', tenant_id: 'deko-cafe', username: 'deko_kitchen', name: 'Rian Barista', role: 'KITCHEN', password: 'kitchen' },
      { id: 'u-dec-runner', tenant_id: 'deko-cafe', username: 'deko_runner', name: 'Bimo Runner', role: 'RUNNER', password: 'runner' }
    ];

    const insertUser = this.db.prepare(`
      INSERT OR IGNORE INTO users (id, tenant_id, username, name, role, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const u of defaultUsers) {
      insertUser.run(
        u.id,
        u.tenant_id,
        u.username,
        u.name,
        u.role,
        hashPassword(u.password)
      );
    }

    console.log('SQLiteDB: Seeding completed successfully.');
  }

  // --- API Methods ---

  public getTenantConfig(tenantId: string): TenantConfig | null {
    const query = this.db.prepare('SELECT * FROM tenant_configs WHERE tenant_id = ?');
    const result = query.all(tenantId) as any[];
    if (result.length === 0) return null;

    const row = result[0];
    return {
      tenant_id: row.tenant_id,
      subscription_plan: (row.subscription_plan as any) || 'BASIC',
      branding: JSON.parse(row.branding),
      feature_flags: JSON.parse(row.feature_flags),
      receipt: JSON.parse(row.receipt),
      license: row.license ? JSON.parse(row.license) : { license_status: 'UNLICENSED' }
    };
  }

  public getMenu(tenantId: string): MenuItem[] {
    const query = this.db.prepare('SELECT * FROM menu_items WHERE tenant_id = ?');
    const rows = query.all(tenantId) as any[];
    return rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      price: Number(row.price),
      category: row.category as any,
      description: row.description,
      image_url: row.image_url || undefined,
      available: row.available === 1
    }));
  }

  public createOrder(order: Order): void {
    const insertOrder = this.db.prepare(`
      INSERT INTO orders (id, order_number, tenant_id, table_number, status, payment_method, payment_status, total_price, created_at, updated_at, notes, delivery_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertOrder.run(
      order.id,
      order.order_number,
      order.tenant_id,
      order.table_number,
      order.status,
      order.payment_method || '',
      order.payment_status,
      order.total_price.toString(),
      order.created_at,
      order.updated_at,
      order.notes || '',
      order.delivery_type || 'DINE_IN'
    );

    const insertOrderItem = this.db.prepare(`
      INSERT INTO order_items (id, order_id, menu_item_id, code, name, price, quantity, notes, delivery_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const itemId = `${order.id}-${i}`;
      insertOrderItem.run(
        itemId,
        order.id,
        item.menu_item_id,
        item.code,
        item.name,
        item.price.toString(),
        item.quantity.toString(),
        item.notes || '',
        item.delivery_type || 'DINE_IN'
      );
    }
  }

  public updateOrderStatus(orderId: string, status: OrderStatus, timestampKey?: string, timestampVal?: string): void {
    let queryStr = 'UPDATE orders SET status = ?, updated_at = ?';
    if (timestampKey && timestampVal) {
      queryStr += `, ${timestampKey} = ?`;
    }
    queryStr += ' WHERE id = ?';

    const update = this.db.prepare(queryStr);
    const updatedAt = new Date().toISOString();

    if (timestampKey && timestampVal) {
      update.run(status, updatedAt, timestampVal, orderId);
    } else {
      update.run(status, updatedAt, orderId);
    }
  }

  public updateOrderPayment(orderId: string, paymentMethod: PaymentMethod, paymentStatus: PaymentStatus): void {
    const update = this.db.prepare(`
      UPDATE orders 
      SET payment_method = ?, payment_status = ?, updated_at = ? 
      WHERE id = ?
    `);
    update.run(paymentMethod, paymentStatus, new Date().toISOString(), orderId);
  }

  public getOrders(tenantId: string): Order[] {
    const queryOrders = this.db.prepare('SELECT * FROM orders WHERE tenant_id = ? ORDER BY created_at DESC');
    const orderRows = queryOrders.all(tenantId) as any[];

    const orders: Order[] = [];
    const queryItems = this.db.prepare('SELECT * FROM order_items WHERE order_id = ?');

    for (const row of orderRows) {
      const itemRows = queryItems.all(row.id) as any[];
      const items: OrderItem[] = itemRows.map(item => ({
        menu_item_id: item.menu_item_id,
        code: item.code,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        notes: item.notes,
        delivery_type: item.delivery_type as any || 'DINE_IN'
      }));

      orders.push({
        id: row.id,
        order_number: row.order_number,
        tenant_id: row.tenant_id,
        table_number: row.table_number,
        status: row.status as OrderStatus,
        payment_method: row.payment_method ? (row.payment_method as PaymentMethod) : undefined,
        payment_status: row.payment_status as PaymentStatus,
        total_price: Number(row.total_price),
        items,
        created_at: row.created_at,
        updated_at: row.updated_at,
        notes: row.notes || undefined,
        delivery_type: row.delivery_type as any || 'DINE_IN',
        cooking_started_at: row.cooking_started_at,
        ready_at: row.ready_at,
        delivered_at: row.delivered_at
      });
    }

    return orders;
  }

  public getOrderById(orderId: string): Order | null {
    const queryOrder = this.db.prepare('SELECT * FROM orders WHERE id = ?');
    const orderRows = queryOrder.all(orderId) as any[];
    if (orderRows.length === 0) return null;

    const row = orderRows[0];
    const queryItems = this.db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const itemRows = queryItems.all(row.id) as any[];

    const items: OrderItem[] = itemRows.map(item => ({
      menu_item_id: item.menu_item_id,
      code: item.code,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
      notes: item.notes,
      delivery_type: item.delivery_type as any || 'DINE_IN'
    }));

    return {
      id: row.id,
      order_number: row.order_number,
      tenant_id: row.tenant_id,
      table_number: row.table_number,
      status: row.status as OrderStatus,
      payment_method: row.payment_method ? (row.payment_method as PaymentMethod) : undefined,
      payment_status: row.payment_status as PaymentStatus,
      total_price: Number(row.total_price),
      items,
      created_at: row.created_at,
      updated_at: row.updated_at,
      notes: row.notes || undefined,
      delivery_type: row.delivery_type as any || 'DINE_IN',
      cooking_started_at: row.cooking_started_at,
      ready_at: row.ready_at,
      delivered_at: row.delivered_at
    };
  }

  public addMenuItem(tenantId: string, item: MenuItem): void {
    const insert = this.db.prepare(`
      INSERT INTO menu_items (id, tenant_id, code, name, price, category, description, image_url, available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      item.id,
      tenantId,
      item.code,
      item.name,
      item.price.toString(),
      item.category,
      item.description || '',
      item.image_url || '',
      item.available ? 1 : 0
    );
  }

  public toggleMenuItemAvailability(itemId: string): boolean {
    const select = this.db.prepare('SELECT available FROM menu_items WHERE id = ?');
    const rows = select.all(itemId) as any[];
    if (rows.length === 0) return false;
    const current = rows[0].available;
    const nextVal = current === 1 ? 0 : 1;
    
    const update = this.db.prepare('UPDATE menu_items SET available = ? WHERE id = ?');
    update.run(nextVal, itemId);
    return nextVal === 1;
  }

  public saveCustomTenantConfig(config: TenantConfig): void {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO tenant_configs (tenant_id, subscription_plan, branding, feature_flags, receipt, license)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      config.tenant_id,
      config.subscription_plan || 'BASIC',
      JSON.stringify(config.branding),
      JSON.stringify(config.feature_flags),
      JSON.stringify(config.receipt),
      config.license ? JSON.stringify(config.license) : null
    );
  }

  // --- User Authentication & Management Methods ---

  public getUserByUsername(tenantId: string, username: string): (User & { password_hash: string }) | null {
    const query = this.db.prepare('SELECT * FROM users WHERE tenant_id = ? AND username = ?');
    const result = query.all(tenantId, username) as any[];
    if (result.length === 0) return null;
    const row = result[0];
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      username: row.username,
      name: row.name,
      role: row.role as UserRole,
      password_hash: row.password_hash
    };
  }

  public getUsers(tenantId: string): User[] {
    const query = this.db.prepare('SELECT id, tenant_id, username, name, role FROM users WHERE tenant_id = ? ORDER BY name ASC');
    const rows = query.all(tenantId) as any[];
    return rows.map(row => ({
      id: row.id,
      tenant_id: row.tenant_id,
      username: row.username,
      name: row.name,
      role: row.role as UserRole
    }));
  }

  public addUser(tenantId: string, user: User & { password_hash: string }): void {
    const insert = this.db.prepare(`
      INSERT INTO users (id, tenant_id, username, name, role, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      user.id,
      tenantId,
      user.username,
      user.name,
      user.role,
      user.password_hash
    );
  }

  public deleteUser(userId: string): void {
    const del = this.db.prepare('DELETE FROM users WHERE id = ?');
    del.run(userId);
  }
}
