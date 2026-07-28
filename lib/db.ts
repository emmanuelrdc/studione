import Database from "better-sqlite3";
import path from "path";
import bcryptjs from "bcryptjs";

// En Railway, DB_PATH debe apuntar dentro del Volume montado (ej. /data/studione.db)
// para que la base de datos persista entre redeploys. En local/dev, sin la env var
// definida, se usa el archivo studione.db en la raíz del proyecto (comportamiento actual).
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "studione.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    try {
      initializeDatabase(db);
    } catch (err) {
      // Don't cache a half-initialized handle: rethrow on every subsequent call
      // so a fatal misconfiguration (e.g. missing INITIAL_ADMIN_PASSWORD in
      // production) keeps failing loudly instead of silently running degraded.
      db.close();
      throw err;
    }
    _db = db;
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

    CREATE TABLE IF NOT EXISTS pos_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      theme TEXT NOT NULL DEFAULT 'dark' CHECK(theme IN ('dark', 'light')),
      allow_discounts INTEGER NOT NULL DEFAULT 0 CHECK(allow_discounts IN (0, 1)),
      allow_promotions INTEGER NOT NULL DEFAULT 0 CHECK(allow_promotions IN (0, 1)),
      show_clients_panel INTEGER NOT NULL DEFAULT 1 CHECK(show_clients_panel IN (0, 1)),
      birthday_discount_enabled INTEGER NOT NULL DEFAULT 0 CHECK(birthday_discount_enabled IN (0, 1)),
      birthday_discount_percent REAL NOT NULL DEFAULT 0,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_refunds (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id     INTEGER NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
      refunded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      reason      TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
      type       TEXT NOT NULL CHECK(type IN ('in', 'out')),
      quantity   INTEGER NOT NULL CHECK(quantity > 0),
      reason     TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // --- Migrations: run BEFORE index creation so all columns exist when indexes are built ---

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
      const brands = db.prepare("SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != ''").all() as { brand: string }[];
      const insertBrand = db.prepare("INSERT OR IGNORE INTO brands (name) VALUES (?)");
      for (const b of brands) {
        insertBrand.run(b.brand);
      }
      db.exec("ALTER TABLE products ADD COLUMN brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL");
      const updateBrandId = db.prepare("UPDATE products SET brand_id = (SELECT id FROM brands WHERE name = products.brand) WHERE brand IS NOT NULL AND brand != ''");
      updateBrandId.run();
    }
  } catch {
    // columns already migrated or table is fresh — safe to ignore
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

  // Migrate: add discount columns to sale_items / sales
  try {
    const itemCols = db.prepare("PRAGMA table_info(sale_items)").all() as { name: string }[];
    if (!itemCols.some(c => c.name === "discount_percent")) {
      db.exec("ALTER TABLE sale_items ADD COLUMN discount_percent REAL NOT NULL DEFAULT 0");
    }
    const saleCols = db.prepare("PRAGMA table_info(sales)").all() as { name: string }[];
    if (!saleCols.some(c => c.name === "discount_total")) {
      db.exec("ALTER TABLE sales ADD COLUMN discount_total REAL NOT NULL DEFAULT 0");
    }
    if (!saleCols.some(c => c.name === "birthday_discount_applied")) {
      db.exec("ALTER TABLE sales ADD COLUMN birthday_discount_applied INTEGER NOT NULL DEFAULT 0");
    }
  } catch { /* already exists */ }

  // Migrate: add cancellation status to sales
  try {
    const saleCols = db.prepare("PRAGMA table_info(sales)").all() as { name: string }[];
    if (!saleCols.some(c => c.name === "status")) {
      db.exec("ALTER TABLE sales ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
    }
  } catch { /* already exists */ }

  // Migrate: add active column to users
  try {
    const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    if (!userCols.some(c => c.name === "active")) {
      db.exec("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
    }
  } catch { /* already exists */ }

  // Create cash_register_exits table if missing
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS cash_register_exits (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        cash_register_id INTEGER REFERENCES cash_registers(id) ON DELETE SET NULL,
        user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        amount           REAL    NOT NULL CHECK(amount > 0),
        concept          TEXT    NOT NULL,
        description      TEXT,
        created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_cash_exits_register ON cash_register_exits(cash_register_id);
      CREATE INDEX IF NOT EXISTS idx_cash_exits_user     ON cash_register_exits(user_id);
      CREATE INDEX IF NOT EXISTS idx_cash_exits_created  ON cash_register_exits(created_at);
    `);
  } catch { /* already exists */ }

  // Create gallery_images table if missing
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS gallery_images (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        url        TEXT    NOT NULL,
        alt        TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        active     INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_gallery_sort ON gallery_images(sort_order, active);
    `);
  } catch { /* already exists */ }

  // Create promotions table if missing
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS promotions (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        name           TEXT NOT NULL,
        type           TEXT NOT NULL CHECK(type IN ('percent', 'fixed')),
        discount_value REAL NOT NULL CHECK(discount_value > 0),
        target_type    TEXT NOT NULL CHECK(target_type IN ('product', 'service', 'all')),
        target_id      INTEGER,
        valid_from     TEXT,
        valid_to       TEXT,
        active         INTEGER NOT NULL DEFAULT 1,
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_promotions_target ON promotions(target_type, target_id);
    `);
  } catch { /* already exists */ }

  // Create audit_logs table if missing — append-only security audit trail.
  // Written ONLY via lib/audit.ts; no HTTP mutation surface (no UPDATE/DELETE endpoint).
  // user_id ON DELETE SET NULL + denormalized user_name/user_email snapshot so the
  // trail survives a user rename or deletion and stays referentially independent.
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
        user_name   TEXT,
        user_email  TEXT,
        action      TEXT NOT NULL,
        entity_type TEXT,
        entity_id   INTEGER,
        status      TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('success', 'denied', 'error')),
        details     TEXT,
        ip          TEXT,
        user_agent  TEXT,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch { /* already exists */ }

  // Create contact_messages table if missing
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        phone      TEXT,
        email      TEXT,
        message    TEXT NOT NULL,
        ip         TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch { /* already exists */ }

  // Seed default POS settings row (singleton id=1)
  try {
    db.prepare(
      "INSERT OR IGNORE INTO pos_settings (id, theme, allow_discounts, allow_promotions, show_clients_panel, birthday_discount_enabled, birthday_discount_percent) VALUES (1, 'dark', 0, 0, 1, 0, 0)"
    ).run();
  } catch { /* ignore */ }

  // Seed admin user if not exists
  const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@studione.com");
  if (!adminExists) {
    const initialPass = process.env.INITIAL_ADMIN_PASSWORD;
    if (!initialPass) {
      if (process.env.NODE_ENV === "production") {
        // Never seed a production admin with a password that is public in the repo.
        throw new Error(
          "[STUDIONE] INITIAL_ADMIN_PASSWORD environment variable is required to create the initial admin user in production. Set it before starting the app."
        );
      }
      console.warn("[STUDIONE] INITIAL_ADMIN_PASSWORD env var not set — using insecure DEVELOPMENT-ONLY default. This fallback is disabled in production; set it before first run.");
    }
    const hashedPassword = bcryptjs.hashSync(initialPass || "studione-change-me", 10);
    db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run(
      "admin@studione.com",
      hashedPassword,
      "Administrador",
      "admin"
    );
  }

  // Create indexes for query performance — runs after all migrations so columns are guaranteed to exist
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
    CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
    CREATE INDEX IF NOT EXISTS idx_sale_refunds_sale_id ON sale_refunds(sale_id);
    CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_adjustments_user ON stock_adjustments(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
  `);

}
