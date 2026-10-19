const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'tagihan_wifi.sqlite');

// Pastikan direktori database tersedia
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Buka koneksi database SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Gagal membuka database SQLite:', err.message);
  } else {
    console.log(`📦 Database SQLite terhubung: ${DB_PATH}`);
  }
});

// Konfigurasi SQLite WAL Mode dan Optimasi untuk Armbian/SBC
db.serialize(() => {
  // 1. Set mode WAL (Write-Ahead Logging) sesuai permintaan
  db.run('PRAGMA journal_mode = WAL;', (err) => {
    if (err) console.error('Gagal set WAL mode:', err);
    else {
      db.get('PRAGMA journal_mode;', (e, row) => {
        console.log(`⚡ SQLite Journal Mode: ${row ? row.journal_mode.toUpperCase() : 'WAL'}`);
      });
    }
  });

  // 2. Optimasi performa untuk SD Card / eMMC di Armbian
  db.run('PRAGMA synchronous = NORMAL;');
  db.run('PRAGMA foreign_keys = ON;');
  db.run('PRAGMA busy_timeout = 5000;');

  // 3. Jalankan skema file jika tabel belum ada
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql, (err) => {
      if (err) {
        console.error('❌ Gagal inisialisasi schema database:', err.message);
      } else {
        console.log('✅ Skema tabel database siap digunakan.');
      }
    });
  }
});

// Promise Helpers untuk kemudahan async/await di controllers
const dbHelper = {
  // Ambil banyak baris
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  // Ambil 1 baris
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  },

  // Insert, Update, Delete
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  // Raw multi-statement SQL
  exec(sql) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },

  raw: db
};

module.exports = dbHelper;
