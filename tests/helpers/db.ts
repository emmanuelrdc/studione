import Database from "better-sqlite3";
import bcryptjs from "bcryptjs";
import { TEST_SCHEMA } from "./schema";

export interface SeedResult {
  adminId: number;
  cashierId: number;
  productId: number;
  serviceId: number;
  clientId: number;
  registerId: number;
}

export function createTestDatabase(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = OFF"); // OFF so we can seed in any order
  db.exec(TEST_SCHEMA);
  return db;
}

export function seedDatabase(db: Database.Database): SeedResult {
  const adminHash = bcryptjs.hashSync("admin123", 1);
  const cashierHash = bcryptjs.hashSync("cashier123", 1);

  const adminRow = db
    .prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)")
    .run("admin@test.com", adminHash, "Admin Test", "admin");

  const cashierRow = db
    .prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)")
    .run("cashier@test.com", cashierHash, "Cashier Test", "cashier");

  const productRow = db
    .prepare(
      "INSERT INTO products (name, price, cost, stock_sales, stock_internal, product_type) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run("Shampoo Test", 150, 80, 10, 5, "both");

  const serviceRow = db
    .prepare(
      "INSERT INTO services (name, price, duration) VALUES (?, ?, ?)"
    )
    .run("Corte Test", 200, 30);

  const clientRow = db
    .prepare("INSERT INTO clients (name, phone, birth_date) VALUES (?, ?, ?)")
    .run("Cliente Test", "5551234567", "1990-01-15");

  const registerRow = db
    .prepare(
      "INSERT INTO cash_registers (user_id, opening_amount, status) VALUES (?, ?, ?)"
    )
    .run(Number(adminRow.lastInsertRowid), 500, "open");

  // Seed pos_settings singleton
  db.prepare(
    "INSERT OR IGNORE INTO pos_settings (id, theme, allow_discounts, allow_promotions, show_clients_panel, birthday_discount_enabled, birthday_discount_percent) VALUES (1, 'dark', 0, 0, 1, 0, 0)"
  ).run();

  return {
    adminId: Number(adminRow.lastInsertRowid),
    cashierId: Number(cashierRow.lastInsertRowid),
    productId: Number(productRow.lastInsertRowid),
    serviceId: Number(serviceRow.lastInsertRowid),
    clientId: Number(clientRow.lastInsertRowid),
    registerId: Number(registerRow.lastInsertRowid),
  };
}

export function clearTables(db: Database.Database): void {
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM stock_adjustments;
    DELETE FROM sale_refunds;
    DELETE FROM internal_consumption;
    DELETE FROM notifications;
    DELETE FROM sale_items;
    DELETE FROM sales;
    DELETE FROM cash_registers;
    DELETE FROM appointments;
    DELETE FROM service_products;
    DELETE FROM services;
    DELETE FROM products;
    DELETE FROM clients;
    DELETE FROM brands;
    DELETE FROM categories;
    DELETE FROM pos_settings;
    DELETE FROM users;
  `);
}
