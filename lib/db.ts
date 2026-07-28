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

  // Seed initial gallery images from /gallery/ if table is empty
  try {
    const galleryEmpty = db.prepare("SELECT COUNT(*) as c FROM gallery_images").get() as { c: number };
    if (galleryEmpty.c === 0) {
      const insert = db.prepare("INSERT INTO gallery_images (url, alt, sort_order) VALUES (?, ?, ?)");
      for (let i = 1; i <= 9; i++) {
        insert.run(`/gallery/${i}.jpg`, `Studio One - Trabajo ${i}`, i);
      }
    }
  } catch { /* table not yet created — safe to skip */ }

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
      console.warn("[STUDIONE] INITIAL_ADMIN_PASSWORD env var not set — using insecure default. Set it before first run.");
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

  // ==================== SEED BRANDS ====================
  const brandCount = db.prepare("SELECT COUNT(*) as count FROM brands").get() as { count: number };
  if (brandCount.count === 0) {
    const insertBrand = db.prepare("INSERT INTO brands (name, description) VALUES (?, ?)");
    const brandData: [string, string][] = [
      ["L'Oréal Professionnel", "Línea profesional de cuidado y color capilar"],
      ["Schwarzkopf Professional", "Productos profesionales alemanes para cabello"],
      ["Wella Professionals", "Coloración y cuidado capilar profesional"],
      ["Matrix", "Soluciones de color y cuidado accesibles para profesionales"],
      ["Redken", "Productos capilares de alta tecnología"],
      ["Olaplex", "Sistema de reparación de enlaces capilares"],
      ["Moroccanoil", "Tratamientos a base de aceite de argán"],
      ["Kérastase", "Cuidado capilar de lujo"],
      ["MAC Cosmetics", "Maquillaje profesional de alta gama"],
      ["Urban Decay", "Maquillaje de alta pigmentación y larga duración"],
      ["Dermalogica", "Cuidado profesional de la piel"],
      ["La Roche-Posay", "Dermocosméticos con agua termal"],
    ];
    const brandIds: Record<string, number> = {};
    for (const [name, desc] of brandData) {
      const result = insertBrand.run(name, desc);
      brandIds[name] = Number(result.lastInsertRowid);
    }

    // ==================== SEED PRODUCTS ====================
    const prodCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
    if (prodCount.count === 0) {
      // Lookup category IDs by name
      const getCatId = (name: string, type: string): number | null => {
        const row = db.prepare("SELECT id FROM categories WHERE name = ? AND type = ?").get(name, type) as { id: number } | undefined;
        return row ? row.id : null;
      };

      const catCapilares = getCatId("Capilares", "product");
      const catMaquillaje = getCatId("Maquillaje", "product");
      const catFaciales = getCatId("Faciales", "product");
      const catHerramientas = getCatId("Herramientas", "product");
      const catExtensiones = getCatId("Extensiones", "product");
      const catAccesorios = getCatId("Accesorios", "product");

      const insertProduct = db.prepare(
        "INSERT INTO products (name, description, brand_id, stock_sales, stock_internal, price, cost, category_id, product_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );

      // --- Capilares ---
      insertProduct.run("Shampoo Serie Expert Gold Quinoa 300ml", "Shampoo reparador para cabello dañado", brandIds["L'Oréal Professionnel"], 25, 10, 320, 180, catCapilares, "both");
      insertProduct.run("Acondicionador Serie Expert Gold Quinoa 200ml", "Acondicionador reparador intensivo", brandIds["L'Oréal Professionnel"], 20, 8, 290, 160, catCapilares, "both");
      insertProduct.run("Shampoo BC Bonacure Repair Rescue 250ml", "Shampoo para cabello dañado y quebradizo", brandIds["Schwarzkopf Professional"], 18, 12, 280, 155, catCapilares, "both");
      insertProduct.run("Mascarilla BC Bonacure Repair Rescue 200ml", "Tratamiento intensivo de reparación", brandIds["Schwarzkopf Professional"], 15, 10, 350, 195, catCapilares, "both");
      insertProduct.run("Color Touch Tinte Semi-permanente", "Tinte demi-permanente sin amoniaco", brandIds["Wella Professionals"], 40, 20, 180, 95, catCapilares, "internal");
      insertProduct.run("Koleston Perfect Tinte Permanente", "Tinte permanente de alta cobertura", brandIds["Wella Professionals"], 35, 25, 195, 105, catCapilares, "internal");
      insertProduct.run("Oxidante Welloxon 20 Vol 1L", "Peróxido revelador 6%", brandIds["Wella Professionals"], 20, 15, 150, 80, catCapilares, "internal");
      insertProduct.run("Oxidante Welloxon 30 Vol 1L", "Peróxido revelador 9%", brandIds["Wella Professionals"], 20, 15, 150, 80, catCapilares, "internal");
      insertProduct.run("Olaplex No.3 Hair Perfector 100ml", "Tratamiento en casa para reparación de enlaces", brandIds["Olaplex"], 30, 5, 850, 520, catCapilares, "sell");
      insertProduct.run("Olaplex No.1 Bond Multiplier 100ml", "Concentrado profesional de protección capilar", brandIds["Olaplex"], 5, 15, 1200, 750, catCapilares, "internal");
      insertProduct.run("Olaplex No.2 Bond Perfector 100ml", "Perfeccionador de enlaces para uso en salón", brandIds["Olaplex"], 5, 15, 1100, 680, catCapilares, "internal");
      insertProduct.run("Moroccanoil Treatment 100ml", "Aceite de argán para todo tipo de cabello", brandIds["Moroccanoil"], 22, 8, 750, 450, catCapilares, "both");
      insertProduct.run("Kérastase Elixir Ultime Oleo-Complexe 100ml", "Aceite sublimador universal", brandIds["Kérastase"], 18, 6, 680, 400, catCapilares, "both");
      insertProduct.run("Matrix Total Results Brass Off Shampoo 300ml", "Shampoo neutralizante de tonos cobrizos", brandIds["Matrix"], 20, 10, 260, 140, catCapilares, "both");
      insertProduct.run("Redken All Soft Shampoo 300ml", "Shampoo suavizante para cabello seco", brandIds["Redken"], 22, 8, 340, 190, catCapilares, "both");
      insertProduct.run("Polvo Decolorante Blondme 450g", "Polvo decolorante premium hasta 9 tonos", brandIds["Schwarzkopf Professional"], 10, 20, 550, 320, catCapilares, "internal");

      // --- Maquillaje ---
      insertProduct.run("MAC Studio Fix Fluid SPF15 30ml", "Base líquida de cobertura media a completa", brandIds["MAC Cosmetics"], 15, 5, 720, 430, catMaquillaje, "both");
      insertProduct.run("MAC Retro Matte Lipstick Ruby Woo", "Labial rojo mate icónico", brandIds["MAC Cosmetics"], 20, 3, 480, 280, catMaquillaje, "sell");
      insertProduct.run("MAC Pro Longwear Paint Pot", "Sombra en crema de larga duración", brandIds["MAC Cosmetics"], 12, 4, 520, 310, catMaquillaje, "both");
      insertProduct.run("Urban Decay Naked 3 Palette", "Paleta de sombras tonos rosados", brandIds["Urban Decay"], 10, 2, 950, 580, catMaquillaje, "sell");
      insertProduct.run("Urban Decay All Nighter Setting Spray 118ml", "Spray fijador de maquillaje 16hrs", brandIds["Urban Decay"], 18, 8, 580, 340, catMaquillaje, "both");
      insertProduct.run("MAC Fix+ Setting Spray 100ml", "Spray fijador e hidratante", brandIds["MAC Cosmetics"], 15, 6, 520, 300, catMaquillaje, "both");
      insertProduct.run("MAC Studio Sculpt Concealer", "Corrector cremoso de alta cobertura", brandIds["MAC Cosmetics"], 14, 5, 450, 260, catMaquillaje, "both");
      insertProduct.run("Pestañas Postizas Ardell Wispies", "Pestañas naturales de banda completa", brandIds["MAC Cosmetics"], 30, 15, 120, 55, catMaquillaje, "both");

      // --- Faciales ---
      insertProduct.run("Dermalogica Daily Microfoliant 74g", "Exfoliante enzimático diario en polvo", brandIds["Dermalogica"], 12, 6, 1050, 650, catFaciales, "both");
      insertProduct.run("Dermalogica Special Cleansing Gel 250ml", "Gel limpiador para piel normal a grasa", brandIds["Dermalogica"], 15, 8, 780, 470, catFaciales, "both");
      insertProduct.run("Dermalogica Skin Smoothing Cream 100ml", "Crema hidratante con ácido hialurónico", brandIds["Dermalogica"], 14, 6, 920, 560, catFaciales, "both");
      insertProduct.run("La Roche-Posay Effaclar Duo+ 40ml", "Tratamiento corrector anti-imperfecciones", brandIds["La Roche-Posay"], 20, 5, 480, 290, catFaciales, "sell");
      insertProduct.run("La Roche-Posay Hyalu B5 Serum 30ml", "Sérum de ácido hialurónico y vitamina B5", brandIds["La Roche-Posay"], 18, 4, 650, 390, catFaciales, "sell");
      insertProduct.run("Dermalogica Hydro Masque Exfoliant 50ml", "Mascarilla exfoliante e hidratante", brandIds["Dermalogica"], 10, 8, 890, 540, catFaciales, "both");
      insertProduct.run("Dermalogica Precleanse Oil 150ml", "Aceite pre-limpiador para doble limpieza", brandIds["Dermalogica"], 12, 10, 680, 410, catFaciales, "internal");
      insertProduct.run("La Roche-Posay Anthelios SPF50 50ml", "Protector solar facial ultra fluido", brandIds["La Roche-Posay"], 25, 5, 420, 250, catFaciales, "sell");

      // --- Herramientas ---
      insertProduct.run("Brocha Kabuki MAC 182", "Brocha para aplicación de polvo y bronzer", brandIds["MAC Cosmetics"], 8, 4, 680, 400, catHerramientas, "sell");
      insertProduct.run("Set de Brochas MAC Look in a Box Basic 6pz", "Kit básico de brochas profesionales", brandIds["MAC Cosmetics"], 6, 2, 1800, 1100, catHerramientas, "sell");
      insertProduct.run("Bowl y Brocha para Tinte", "Set de bowl y brocha para aplicación de tinte", null, 10, 20, 85, 35, catHerramientas, "internal");
      insertProduct.run("Pinzas de Sección Profesionales x12", "Clips de sección para dividir cabello", null, 15, 20, 120, 50, catHerramientas, "internal");
      insertProduct.run("Peine de Corte Carbono", "Peine antiestático resistente al calor", null, 20, 15, 95, 40, catHerramientas, "both");
      insertProduct.run("Capa de Corte Profesional", "Capa impermeable para corte y color", null, 10, 10, 180, 80, catHerramientas, "internal");

      // --- Extensiones ---
      insertProduct.run("Extensiones Clip-In 20\" Natural Black", "Set 7 piezas cabello humano 100%", null, 8, 2, 2800, 1600, catExtensiones, "sell");
      insertProduct.run("Extensiones Clip-In 20\" Chocolate Brown", "Set 7 piezas cabello humano 100%", null, 6, 2, 2800, 1600, catExtensiones, "sell");
      insertProduct.run("Extensiones Tape-In 18\" Natural Black x20", "Paquete 20 tiras adhesivas cabello natural", null, 5, 3, 3500, 2100, catExtensiones, "both");
      insertProduct.run("Extensiones Micro-Ring 20\" Blonde x50", "50 mechones con micro-anillo", null, 4, 2, 4200, 2500, catExtensiones, "both");

      // --- Accesorios ---
      insertProduct.run("Diadema Terciopelo Negro", "Diadema elegante de terciopelo", null, 25, 0, 150, 60, catAccesorios, "sell");
      insertProduct.run("Set Scrunchies Satín x5", "Ligas de satín en colores neutros", null, 30, 0, 180, 70, catAccesorios, "sell");
      insertProduct.run("Pinzas Decorativas Perla x3", "Set de pinzas con perlas artificiales", null, 20, 0, 220, 90, catAccesorios, "sell");
      insertProduct.run("Pasadores Bobby Pin Negro x100", "Pasadores profesionales invisibles", null, 40, 30, 65, 25, catAccesorios, "both");
    }

    // ==================== SEED CLIENTS ====================
    const clientCount = db.prepare("SELECT COUNT(*) as count FROM clients").get() as { count: number };
    if (clientCount.count === 0) {
      const insertClient = db.prepare("INSERT INTO clients (name, phone, birth_date) VALUES (?, ?, ?)");
      const clients: [string, string, string][] = [
        ["María Fernanda López García", "8112345678", "1990-03-15"],
        ["Ana Sofía Martínez Ruiz", "8187654321", "1985-07-22"],
        ["Daniela Rodríguez Hernández", "8123456789", "1992-11-08"],
        ["Valentina Torres Salazar", "8198765432", "1988-01-30"],
        ["Camila Ramírez Flores", "8134567890", "1995-05-12"],
        ["Regina Gutiérrez Morales", "8109876543", "1982-09-25"],
        ["Sofía Herrera Castillo", "8145678901", "1993-12-03"],
        ["Isabella Mendoza Reyes", "8176543210", "1991-06-18"],
        ["Ximena Vargas Jiménez", "8156789012", "1987-04-07"],
        ["Renata Díaz Navarro", "8121098765", "1994-08-21"],
        ["Paulina Ortiz Delgado", "8167890123", "1989-02-14"],
        ["Andrea Sánchez Medina", "8132109876", "1996-10-09"],
        ["Mariana Peña Ríos", "8178901234", "1984-07-01"],
        ["Lucía Aguilar Contreras", "8143210987", "1997-03-28"],
        ["Fernanda Cruz Domínguez", "8189012345", "1986-12-16"],
      ];
      for (const [name, phone, birthDate] of clients) {
        insertClient.run(name, phone, birthDate);
      }
    }

    // ==================== SEED SERVICES ====================
    const serviceCount = db.prepare("SELECT COUNT(*) as count FROM services").get() as { count: number };
    if (serviceCount.count === 0) {
      // Lookup service subcategory IDs by name
      const getSvcCatId = (name: string): number | null => {
        const row = db.prepare("SELECT id FROM categories WHERE name = ? AND type = 'service'").get(name) as { id: number } | undefined;
        return row ? row.id : null;
      };

      const catCortes = getSvcCatId("Cortes");
      const catTintes = getSvcCatId("Tintes");
      const catDisenos = getSvcCatId("Diseños de Color");
      const catOndulados = getSvcCatId("Ondulados");
      const catPeinados = getSvcCatId("Peinados (Brushing, Planchado, Recogido)");
      const catBrazilian = getSvcCatId("Brazilian Blowout");
      const catTratamientos = getSvcCatId("Tratamientos Capilares");
      const catSocial = getSvcCatId("Social");
      const catFantasia = getSvcCatId("Fantasía");
      const catPestanas = getSvcCatId("Aplicación de Pestañas Postizas");
      const catFacTratamientos = getSvcCatId("Tratamientos");
      const catExfoliacion = getSvcCatId("Exfoliación");
      const catHidratacion = getSvcCatId("Hidratación");
      const catFacExpress = getSvcCatId("Facial Express");
      const catFacProfundo = getSvcCatId("Facial Profundo");

      const insertService = db.prepare(
        "INSERT INTO services (name, description, price, duration, category_id) VALUES (?, ?, ?, ?, ?)"
      );
      const insertSP = db.prepare(
        "INSERT INTO service_products (service_id, product_id, quantity) VALUES (?, ?, ?)"
      );

      // Helper to get product id by name
      const getProductId = (name: string): number | null => {
        const row = db.prepare("SELECT id FROM products WHERE name = ?").get(name) as { id: number } | undefined;
        return row ? row.id : null;
      };

      // --- Cortes ---
      let svcId: number;

      svcId = Number(insertService.run("Corte Dama", "Corte de cabello para dama, incluye lavado y secado", 250, 45, catCortes).lastInsertRowid);
      insertSP.run(svcId, getProductId("Shampoo Serie Expert Gold Quinoa 300ml"), 1);

      svcId = Number(insertService.run("Corte Caballero", "Corte de cabello para caballero", 150, 30, catCortes).lastInsertRowid);
      insertSP.run(svcId, getProductId("Shampoo Serie Expert Gold Quinoa 300ml"), 1);

      svcId = Number(insertService.run("Corte Niño(a)", "Corte de cabello infantil (hasta 12 años)", 120, 25, catCortes).lastInsertRowid);

      // --- Tintes ---
      svcId = Number(insertService.run("Tinte Raíz", "Aplicación de tinte en zona de raíz (hasta 2cm)", 450, 90, catTintes).lastInsertRowid);
      insertSP.run(svcId, getProductId("Koleston Perfect Tinte Permanente"), 1);
      insertSP.run(svcId, getProductId("Oxidante Welloxon 20 Vol 1L"), 1);
      insertSP.run(svcId, getProductId("Bowl y Brocha para Tinte"), 1);

      svcId = Number(insertService.run("Tinte Completo", "Aplicación de tinte en todo el cabello", 650, 120, catTintes).lastInsertRowid);
      insertSP.run(svcId, getProductId("Koleston Perfect Tinte Permanente"), 2);
      insertSP.run(svcId, getProductId("Oxidante Welloxon 20 Vol 1L"), 1);
      insertSP.run(svcId, getProductId("Bowl y Brocha para Tinte"), 1);
      insertSP.run(svcId, getProductId("Pinzas de Sección Profesionales x12"), 1);

      svcId = Number(insertService.run("Retoque de Color Semi-permanente", "Retoque con tinte semi-permanente sin amoniaco", 380, 75, catTintes).lastInsertRowid);
      insertSP.run(svcId, getProductId("Color Touch Tinte Semi-permanente"), 1);
      insertSP.run(svcId, getProductId("Oxidante Welloxon 20 Vol 1L"), 1);

      // --- Diseños de Color ---
      svcId = Number(insertService.run("Balayage", "Técnica de color degradado pintado a mano", 1800, 180, catDisenos).lastInsertRowid);
      insertSP.run(svcId, getProductId("Polvo Decolorante Blondme 450g"), 1);
      insertSP.run(svcId, getProductId("Oxidante Welloxon 30 Vol 1L"), 1);
      insertSP.run(svcId, getProductId("Olaplex No.1 Bond Multiplier 100ml"), 1);
      insertSP.run(svcId, getProductId("Olaplex No.2 Bond Perfector 100ml"), 1);
      insertSP.run(svcId, getProductId("Pinzas de Sección Profesionales x12"), 1);

      svcId = Number(insertService.run("Mechas Tradicionales", "Mechas con gorra o papel aluminio", 1200, 150, catDisenos).lastInsertRowid);
      insertSP.run(svcId, getProductId("Polvo Decolorante Blondme 450g"), 1);
      insertSP.run(svcId, getProductId("Oxidante Welloxon 30 Vol 1L"), 1);
      insertSP.run(svcId, getProductId("Pinzas de Sección Profesionales x12"), 1);

      svcId = Number(insertService.run("Highlights Parciales", "Iluminaciones parciales en zona frontal o superior", 800, 90, catDisenos).lastInsertRowid);
      insertSP.run(svcId, getProductId("Polvo Decolorante Blondme 450g"), 1);
      insertSP.run(svcId, getProductId("Oxidante Welloxon 20 Vol 1L"), 1);

      // --- Ondulados ---
      svcId = Number(insertService.run("Ondulado Permanente", "Permanente para ondas o rizos definidos", 900, 120, catOndulados).lastInsertRowid);
      insertSP.run(svcId, getProductId("Shampoo BC Bonacure Repair Rescue 250ml"), 1);

      // --- Peinados ---
      svcId = Number(insertService.run("Brushing", "Secado con cepillo redondo para volumen y movimiento", 200, 40, catPeinados).lastInsertRowid);
      insertSP.run(svcId, getProductId("Moroccanoil Treatment 100ml"), 1);

      svcId = Number(insertService.run("Planchado", "Alaciado con plancha profesional", 250, 45, catPeinados).lastInsertRowid);
      insertSP.run(svcId, getProductId("Moroccanoil Treatment 100ml"), 1);

      svcId = Number(insertService.run("Recogido Evento", "Peinado recogido para evento especial", 600, 60, catPeinados).lastInsertRowid);
      insertSP.run(svcId, getProductId("Urban Decay All Nighter Setting Spray 118ml"), 1);
      insertSP.run(svcId, getProductId("Pasadores Bobby Pin Negro x100"), 1);

      // --- Brazilian Blowout ---
      svcId = Number(insertService.run("Brazilian Blowout Completo", "Tratamiento alisador de keratina brasileña, duración 3 meses", 2500, 150, catBrazilian).lastInsertRowid);
      insertSP.run(svcId, getProductId("Shampoo Serie Expert Gold Quinoa 300ml"), 1);
      insertSP.run(svcId, getProductId("Acondicionador Serie Expert Gold Quinoa 200ml"), 1);

      // --- Tratamientos Capilares ---
      svcId = Number(insertService.run("Tratamiento Olaplex Salón", "Tratamiento completo de reparación de enlaces en salón", 1200, 60, catTratamientos).lastInsertRowid);
      insertSP.run(svcId, getProductId("Olaplex No.1 Bond Multiplier 100ml"), 1);
      insertSP.run(svcId, getProductId("Olaplex No.2 Bond Perfector 100ml"), 1);
      insertSP.run(svcId, getProductId("Shampoo Serie Expert Gold Quinoa 300ml"), 1);

      svcId = Number(insertService.run("Hidratación Profunda Kérastase", "Tratamiento de hidratación intensiva con aceites premium", 800, 45, catTratamientos).lastInsertRowid);
      insertSP.run(svcId, getProductId("Kérastase Elixir Ultime Oleo-Complexe 100ml"), 1);
      insertSP.run(svcId, getProductId("Mascarilla BC Bonacure Repair Rescue 200ml"), 1);

      // --- Maquillaje Social ---
      svcId = Number(insertService.run("Maquillaje Social", "Maquillaje para eventos sociales, incluye aplicación de pestañas", 800, 60, catSocial).lastInsertRowid);
      insertSP.run(svcId, getProductId("MAC Studio Fix Fluid SPF15 30ml"), 1);
      insertSP.run(svcId, getProductId("MAC Studio Sculpt Concealer"), 1);
      insertSP.run(svcId, getProductId("Urban Decay All Nighter Setting Spray 118ml"), 1);
      insertSP.run(svcId, getProductId("Pestañas Postizas Ardell Wispies"), 1);

      // --- Maquillaje Fantasía ---
      svcId = Number(insertService.run("Maquillaje Fantasía", "Maquillaje artístico para eventos temáticos o disfraces", 1200, 90, catFantasia).lastInsertRowid);
      insertSP.run(svcId, getProductId("MAC Studio Fix Fluid SPF15 30ml"), 1);
      insertSP.run(svcId, getProductId("MAC Pro Longwear Paint Pot"), 1);
      insertSP.run(svcId, getProductId("MAC Fix+ Setting Spray 100ml"), 1);

      // --- Pestañas ---
      svcId = Number(insertService.run("Aplicación de Pestañas Postizas", "Colocación profesional de pestañas de banda completa", 150, 20, catPestanas).lastInsertRowid);
      insertSP.run(svcId, getProductId("Pestañas Postizas Ardell Wispies"), 1);

      // --- Tratamientos Faciales ---
      svcId = Number(insertService.run("Limpieza Facial Profunda", "Limpieza con extracción, vapor y mascarilla purificante", 650, 60, catFacTratamientos).lastInsertRowid);
      insertSP.run(svcId, getProductId("Dermalogica Special Cleansing Gel 250ml"), 1);
      insertSP.run(svcId, getProductId("Dermalogica Precleanse Oil 150ml"), 1);
      insertSP.run(svcId, getProductId("Dermalogica Skin Smoothing Cream 100ml"), 1);

      // --- Exfoliación ---
      svcId = Number(insertService.run("Exfoliación Facial Enzimática", "Exfoliación suave con microfoliante enzimático", 500, 40, catExfoliacion).lastInsertRowid);
      insertSP.run(svcId, getProductId("Dermalogica Daily Microfoliant 74g"), 1);
      insertSP.run(svcId, getProductId("Dermalogica Skin Smoothing Cream 100ml"), 1);

      // --- Hidratación ---
      svcId = Number(insertService.run("Hidratación Facial con Ácido Hialurónico", "Tratamiento hidratante con sérum de ácido hialurónico y vitamina B5", 750, 50, catHidratacion).lastInsertRowid);
      insertSP.run(svcId, getProductId("La Roche-Posay Hyalu B5 Serum 30ml"), 1);
      insertSP.run(svcId, getProductId("Dermalogica Skin Smoothing Cream 100ml"), 1);
      insertSP.run(svcId, getProductId("La Roche-Posay Anthelios SPF50 50ml"), 1);

      // --- Facial Express ---
      svcId = Number(insertService.run("Facial Express", "Limpieza rápida + hidratación para pieles sin tiempo", 350, 30, catFacExpress).lastInsertRowid);
      insertSP.run(svcId, getProductId("Dermalogica Special Cleansing Gel 250ml"), 1);
      insertSP.run(svcId, getProductId("Dermalogica Skin Smoothing Cream 100ml"), 1);

      // --- Facial Profundo ---
      svcId = Number(insertService.run("Facial Profundo Anti-edad", "Tratamiento completo: limpieza, exfoliación, mascarilla e hidratación profunda", 1200, 90, catFacProfundo).lastInsertRowid);
      insertSP.run(svcId, getProductId("Dermalogica Precleanse Oil 150ml"), 1);
      insertSP.run(svcId, getProductId("Dermalogica Special Cleansing Gel 250ml"), 1);
      insertSP.run(svcId, getProductId("Dermalogica Daily Microfoliant 74g"), 1);
      insertSP.run(svcId, getProductId("Dermalogica Hydro Masque Exfoliant 50ml"), 1);
      insertSP.run(svcId, getProductId("La Roche-Posay Hyalu B5 Serum 30ml"), 1);
      insertSP.run(svcId, getProductId("Dermalogica Skin Smoothing Cream 100ml"), 1);
    }
  }
}
