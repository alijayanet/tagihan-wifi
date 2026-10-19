require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');

// Inisialisasi Database SQLite WAL
const db = require('./database/db');

// Import Routes
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const collectorRoutes = require('./src/routes/collectorRoutes');

// Service Billing Otomatis Bulanan
const { startBillingScheduler } = require('./src/services/billingService');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi View Engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Konfigurasi Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'wifi-billing-secret-key-armbian-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 hari
    }
  })
);

app.use(flash());

// Global Variables untuk Views EJS
app.use(async (req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.successMsg = req.flash('success');
  res.locals.errorMsg = req.flash('error');
  
  // Cache atau load basic app settings
  try {
    const settingsRows = await db.all('SELECT key, value FROM settings');
    const appSettings = {};
    settingsRows.forEach(r => { appSettings[r.key] = r.value; });
    res.locals.appSettings = appSettings;
  } catch (e) {
    res.locals.appSettings = { company_name: 'Tagihan WiFi' };
  }

  next();
});

// Routing
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/kolektor', collectorRoutes);

// Error 404 Not Found
app.use((req, res) => {
  res.status(404).render('partials/404', {
    title: 'Halaman Tidak Ditemukan',
    user: req.session.user
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).send('Terjadi kesalahan internal pada server.');
});

// Jalankan Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Aplikasi Tagihan WiFi Berjalan di Port ${PORT}`);
  console.log(`💻 Login Admin:    http://localhost:${PORT}/admin/login`);
  console.log(`📱 Login Kolektor: http://localhost:${PORT}/kolektor/login`);
  console.log(`⚡ Mode Database:  SQLite WAL (Cocok untuk Armbian)`);
  console.log(`====================================================`);

  // Mulai scheduler generate tagihan otomatis
  startBillingScheduler();
});
