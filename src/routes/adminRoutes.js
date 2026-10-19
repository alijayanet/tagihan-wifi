const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middlewares/authMiddleware');

const dashboardController = require('../controllers/dashboardController');
const packageController = require('../controllers/packageController');
const customerController = require('../controllers/customerController');
const collectorController = require('../controllers/collectorController');
const billController = require('../controllers/billController');
const settingController = require('../controllers/settingController');
const reportController = require('../controllers/reportController');

// Semua route admin diproteksi oleh middleware requireAdmin
router.use(requireAdmin);

// 1. Dashboard
router.get('/dashboard', dashboardController.index);

// 2. Paket Internet
router.get('/paket', packageController.index);
router.post('/paket', packageController.create);
router.post('/paket/:id/update', packageController.update);
router.post('/paket/:id/delete', packageController.remove);

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// 3. Pelanggan
router.get('/pelanggan', customerController.index);
router.get('/pelanggan/export', customerController.exportCsv);
router.get('/pelanggan/template', customerController.downloadTemplate);
router.post('/pelanggan/import', upload.single('file'), customerController.importCsv);
router.post('/pelanggan', customerController.create);
router.get('/pelanggan/:id', customerController.show);
router.post('/pelanggan/:id/update', customerController.update);
router.post('/pelanggan/:id/delete', customerController.remove);

// 4. Kolektor
router.get('/kolektor', collectorController.index);
router.post('/kolektor', collectorController.create);
router.get('/kolektor/:id', collectorController.show);
router.post('/kolektor/:id/update', collectorController.update);
router.post('/kolektor/:id/delete', collectorController.remove);

// 5. Tagihan (Lunas / Belum)
router.get('/tagihan', billController.index);
router.post('/tagihan/generate', billController.generateMonthly);
router.post('/tagihan/blast-fonnte', billController.blastFonnteReminders);
router.post('/tagihan/:id/bayar', billController.markPaid);
router.post('/tagihan/:id/batal', billController.cancelPayment);
router.post('/tagihan/:id/hapus', billController.remove);
router.get('/tagihan/:id/struk', billController.printReceipt);
router.post('/tagihan/:id/kirim-fonnte', billController.sendFonnteSingle);

// 6. Laporan Transaksi Kolektor (Pertanggal / Rentang Tanggal)
router.get('/laporan-kolektor', reportController.collectorReport);
router.get('/laporan-kolektor/cetak', reportController.printCollectorReport);

// 7. Pengaturan
router.get('/pengaturan', settingController.index);
router.post('/pengaturan', settingController.update);
router.post('/pengaturan/test-mikrotik', settingController.testMikrotik);
router.post('/pengaturan/test-fonnte', settingController.testFonnte);

module.exports = router;
