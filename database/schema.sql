-- ===================================================
-- SCHEMA DATABASE SISTEM TAGIHAN WIFI SEDERHANA
-- Target: SQLite dengan WAL Mode (Cocok untuk Armbian / SBC)
-- ===================================================

-- 1. Tabel Pengguna (Admin & Kolektor)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'kolektor')),
    phone TEXT,
    area TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Paket Internet
CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    speed TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Pelanggan
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    package_id INTEGER NOT NULL REFERENCES packages(id) ON UPDATE CASCADE,
    collector_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    due_date INTEGER DEFAULT 10,
    ip_address TEXT,
    installation_date DATE DEFAULT (DATE('now')),
    status TEXT DEFAULT 'aktif' CHECK(status IN ('aktif', 'isolir', 'nonaktif')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Tagihan (Bills) Bulanan
CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'belum' CHECK(status IN ('belum', 'lunas')),
    paid_at DATETIME,
    collected_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    payment_method TEXT CHECK(payment_method IN ('tunai', 'transfer', 'qris', NULL)),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, period_month, period_year)
);

-- 5. Tabel Setoran Kolektor ke Admin
CREATE TABLE IF NOT EXISTS collector_deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collector_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deposit_date DATE DEFAULT (DATE('now')),
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'rejected')),
    verified_by INTEGER REFERENCES users(id),
    verified_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Pengaturan Sistem
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Indeks untuk mempercepat pencarian data
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_package ON customers(package_id);
CREATE INDEX IF NOT EXISTS idx_customers_collector ON customers(collector_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_period ON bills(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_collector ON bills(collected_by);
