const express = require('express');
const router = express.Router();
const { requireCollector } = require('../middlewares/authMiddleware');
const collectorPortalController = require('../controllers/collectorPortalController');
const billController = require('../controllers/billController');

// Proteksi akses khusus role kolektor
router.use(requireCollector);

// Dashboard mobile penagihan
router.get('/dashboard', collectorPortalController.dashboard);

// Terima Pembayaran di Lapangan
router.post('/bayar', collectorPortalController.markPaid);

// Riwayat Penagihan & Total Uang Terkumpul
router.get('/riwayat', collectorPortalController.riwayat);

// Cetak Struk Bukti Bayar
router.get('/struk/:id', billController.printReceipt);

module.exports = router;
