import Database from "better-sqlite3";
import path from "path";
import bcryptjs from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "studione.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initializeDatabase(_db);
  }
  return _db;
}

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('product', 'service')),
      parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      birth_date TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
      stock_sales INTEGER NOT NULL DEFAULT 0 CHECK(stock_sales >= 0),
      stock_internal INTEGER NOT NULL DEFAULT 0 CHECK(stock_internal >= 0),
      price REAL NOT NULL CHECK(price >= 0),
      cost REAL DEFAULT 0 CHECK(cost >= 0),
      image TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      product_type TEXT NOT NULL DEFAULT 'both' CHECK(product_type IN ('sell', 'internal', 'both')),
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL CHECK(price >= 0),
      duration INTEGER DEFAULT 60 CHECK(duration > 0),
      image TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS service_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
      UNIQUE(service_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS cash_registers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      opening_amount REAL NOT NULL DEFAULT 0 CHECK(opening_amount >= 0),
      closing_amount REAL,
      expected_amount REAL,
      notes TEXT,
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cash_register_id INTEGER REFERENCES cash_registers(id) ON DELETE RESTRICT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card')),
      subtotal REAL NOT NULL,
      total REAL NOT NULL,
      amount_paid REAL,
      change_given REAL DEFAULT 0,
      sale_type TEXT NOT NULL CHECK(sale_type IN ('product', 'service', 'mixed')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      service_id INTEGER REFERENCES services(id),
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      total REAL NOT NULL CHECK(total >= 0)
    );

    CREATE TABLE IF NOT EXISTS internal_consumption (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      client_name TEXT NOT NULL,
      client_phone TEXT,
      service_id INTEGER REFERENCES services(id),
      service_name TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      end_time TEXT,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('low_stock_sales', 'low_stock_internal', 'out_of_stock_sales', 'out_of_stock_internal')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for query performance (IF NOT EXISTS prevents errors on re-run)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(active);
    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
    CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
    CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(client_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
    CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
    CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
    CREATE INDEX IF NOT EXISTS idx_sales_cash_register ON sales(cash_register_id);
    CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_service ON sale_items(service_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_cash_registers_user_status ON cash_registers(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_notifications_product_read ON notifications(product_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, is_read);
    CREATE INDEX IF NOT EXISTS idx_categories_type_parent ON categories(type, parent_id);
    CREATE INDEX IF NOT EXISTS idx_internal_consumption_product ON internal_consumption(product_id);
    CREATE INDEX IF NOT EXISTS idx_internal_consumption_user ON internal_consumption(user_id);
    CREATE INDEX IF NOT EXISTS idx_service_products_service ON service_products(service_id);
    CREATE INDEX IF NOT EXISTS idx_service_products_product ON service_products(product_id);
  `);

  // Migrate: if old 'quantity' column exists, move data to stock_sales
  try {
    const cols = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
    const hasQuantity = cols.some(c => c.name === "quantity");
    const hasStockSales = cols.some(c => c.name === "stock_sales");
    if (hasQuantity && !hasStockSales) {
      db.exec(`
        ALTER TABLE products ADD COLUMN stock_sales INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE products ADD COLUMN stock_internal INTEGER NOT NULL DEFAULT 0;
        UPDATE products SET stock_sales = quantity;
      `);
    }
  } catch {
    // columns already exist or table is fresh — safe to ignore
  }

  // Migrate: if old 'brand' TEXT column exists, move data to brands table
  try {
    const cols = db.prepare("PRAGMA table_info(products)").all() as { name: string; type: string }[];
    const brandCol = cols.find(c => c.name === "brand");
    const hasBrandId = cols.some(c => c.name === "brand_id");
    if (brandCol && !hasBrandId) {
      // Get distinct brand values
      const brands = db.prepare("SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != ''").all() as { brand: string }[];
      const insertBrand = db.prepare("INSERT OR IGNORE INTO brands (name) VALUES (?)");
      for (const b of brands) {
        insertBrand.run(b.brand);
      }
      // Add brand_id column and map
      db.exec("ALTER TABLE products ADD COLUMN brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL");
      const updateBrandId = db.prepare("UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = products.brand) WHERE brand IS NOT NULL AND brand != ''");
      updateBrandId.run();
    }
  } catch {
    // columns already migrated or table is fresh — safe to ignore
  }

  // Seed admin user if not exists
  const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@studione.com");
  if (!adminExists) {
    const hashedPassword = bcryptjs.hashSync("123456789", 10);
    db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run(
      "admin@studione.com",
      hashedPassword,
      "Administrador",
      "admin"
    );
  }

  // Migrate: add product_type column if missing
  try {
    const prodCols = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
    if (!prodCols.some(c => c.name === "product_type")) {
      db.exec("ALTER TABLE products ADD COLUMN product_type TEXT NOT NULL DEFAULT 'both'");
    }
  } catch { /* already exists */ }

  // Migrate: add client_id to sales if missing
  try {
    const salesCols = db.prepare("PRAGMA table_info(sales)").all() as { name: string }[];
    if (!salesCols.some(c => c.name === "client_id")) {
      db.exec("ALTER TABLE sales ADD COLUMN client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL");
    }
  } catch { /* already exists */ }

  // Migrate: add client_id to appointments if missing
  try {
    const apptCols = db.prepare("PRAGMA table_info(appointments)").all() as { name: string }[];
    if (!apptCols.some(c => c.name === "client_id")) {
      db.exec("ALTER TABLE appointments ADD COLUMN client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL");
    }
  } catch { /* already exists */ }

  // Seed categories if empty
  const catCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
  if (catCount.count === 0) {
    const insertCat = db.prepare("INSERT INTO categories (name, type, parent_id) VALUES (?, ?, ?)");

    // Product categories
    const productCats = ["Capilares", "Maquillaje", "Paquetes Quinceañera", "Paquetes Novia", "Faciales", "Herramientas", "Extensiones", "Accesorios"];
    for (const cat of productCats) {
      insertCat.run(cat, "product", null);
    }

    // Service categories
    const capilares = insertCat.run("Capilares", "service", null);
    const maquillajes = insertCat.run("Maquillajes", "service", null);
    const faciales = insertCat.run("Faciales", "service", null);

    // Subcategories - Capilares
    const capilarSubs = ["Cortes", "Tintes", "Diseños de Color", "Ondulados", "Peinados (Brushing, Planchado, Recogido)", "Brazilian Blowout", "Tratamientos Capilares"];
    for (const sub of capilarSubs) {
      insertCat.run(sub, "service", capilares.lastInsertRowid);
    }

    // Subcategories - Maquillajes
    const maqSubs = ["Social", "Fantasía", "Aplicación de Pestañas Postizas"];
    for (const sub of maqSubs) {
      insertCat.run(sub, "service", maquillajes.lastInsertRowid);
    }

    // Subcategories - Faciales
    const facSubs = ["Tratamientos", "Exfoliación", "Hidratación", "Facial Express", "Facial Profundo"];
    for (const sub of facSubs) {
      insertCat.run(sub, "service", faciales.lastInsertRowid);
    }
  }
}
