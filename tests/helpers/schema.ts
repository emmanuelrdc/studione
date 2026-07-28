// Schema SQL for the in-memory test database.
// Mirrors lib/db.ts but with all migration columns already included
// and without FK constraints (to allow flexible test seeding order).
export const TEST_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    email     TEXT    UNIQUE NOT NULL,
    password  TEXT    NOT NULL,
    name      TEXT    NOT NULL,
    role      TEXT    NOT NULL DEFAULT 'cashier',
    active    INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL,
    parent_id  INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    phone      TEXT,
    birth_date TEXT,
    active     INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS brands (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    active      INTEGER DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    description    TEXT,
    brand_id       INTEGER,
    stock_sales    INTEGER NOT NULL DEFAULT 0,
    stock_internal INTEGER NOT NULL DEFAULT 0,
    price          REAL    NOT NULL DEFAULT 0,
    cost           REAL             DEFAULT 0,
    image          TEXT,
    category_id    INTEGER,
    product_type   TEXT    NOT NULL DEFAULT 'both',
    active         INTEGER DEFAULT 1,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    price       REAL NOT NULL DEFAULT 0,
    duration    INTEGER DEFAULT 60,
    image       TEXT,
    category_id INTEGER,
    active      INTEGER DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS service_products (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity   INTEGER NOT NULL DEFAULT 1,
    UNIQUE(service_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS cash_registers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    opening_amount  REAL    NOT NULL DEFAULT 0,
    closing_amount  REAL,
    expected_amount REAL,
    notes           TEXT,
    opened_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at       DATETIME,
    status          TEXT DEFAULT 'open'
  );

  CREATE TABLE IF NOT EXISTS sales (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    cash_register_id         INTEGER,
    user_id                  INTEGER NOT NULL,
    client_id                INTEGER,
    payment_method           TEXT    NOT NULL,
    subtotal                 REAL    NOT NULL,
    total                    REAL    NOT NULL,
    amount_paid              REAL,
    change_given             REAL    DEFAULT 0,
    sale_type                TEXT    NOT NULL,
    notes                    TEXT,
    discount_total           REAL    NOT NULL DEFAULT 0,
    birthday_discount_applied INTEGER NOT NULL DEFAULT 0,
    status                   TEXT    NOT NULL DEFAULT 'active',
    created_at               DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id          INTEGER NOT NULL,
    product_id       INTEGER,
    service_id       INTEGER,
    item_name        TEXT    NOT NULL,
    quantity         INTEGER NOT NULL DEFAULT 1,
    unit_price       REAL    NOT NULL DEFAULT 0,
    total            REAL    NOT NULL DEFAULT 0,
    discount_percent REAL    NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS internal_consumption (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity   INTEGER NOT NULL DEFAULT 1,
    reason     TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id    INTEGER,
    client_name  TEXT NOT NULL,
    client_phone TEXT,
    service_id   INTEGER,
    service_name TEXT,
    date         TEXT NOT NULL,
    time         TEXT NOT NULL,
    end_time     TEXT,
    status       TEXT DEFAULT 'scheduled',
    notes        TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    product_id INTEGER,
    is_read    INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pos_settings (
    id                         INTEGER PRIMARY KEY,
    theme                      TEXT NOT NULL DEFAULT 'dark',
    allow_discounts            INTEGER NOT NULL DEFAULT 0,
    allow_promotions           INTEGER NOT NULL DEFAULT 0,
    show_clients_panel         INTEGER NOT NULL DEFAULT 1,
    birthday_discount_enabled  INTEGER NOT NULL DEFAULT 0,
    birthday_discount_percent  REAL    NOT NULL DEFAULT 0,
    updated_by                 INTEGER,
    updated_at                 DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sale_refunds (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id      INTEGER NOT NULL,
    refunded_by  INTEGER NOT NULL,
    reason       TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stock_adjustments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    type       TEXT    NOT NULL,
    quantity   INTEGER NOT NULL,
    reason     TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cash_register_exits (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    cash_register_id INTEGER,
    user_id          INTEGER NOT NULL,
    amount           REAL    NOT NULL,
    concept          TEXT    NOT NULL,
    description      TEXT,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    phone      TEXT,
    email      TEXT,
    message    TEXT NOT NULL,
    ip         TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS gallery_images (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    url        TEXT    NOT NULL,
    alt        TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,
    user_name   TEXT,
    user_email  TEXT,
    action      TEXT NOT NULL,
    entity_type TEXT,
    entity_id   INTEGER,
    status      TEXT NOT NULL DEFAULT 'success',
    details     TEXT,
    ip          TEXT,
    user_agent  TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;
