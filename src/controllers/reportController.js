const db = require('../../database/db');
const { formatRupiah, formatDate, formatDateTime, getMonthName } = require('../utils/formatter');

async function collectorReport(req, res) {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    
    // Default dari tanggal 1 bulan ini sampai hari ini
    const firstDayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const startDate = req.query.start_date || firstDayMonth;
    const endDate = req.query.end_date || todayStr;
    const collectorId = req.query.collector_id || '';
    const paymentMethod = req.query.payment_method || '';

    let sql = `
      SELECT 
        b.*,
        c.customer_code,
        c.name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address,
        p.name as package_name,
        p.speed as package_speed,
        u.name as collector_name,
        u.area as collector_area
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      JOIN packages p ON c.package_id = p.id
      LEFT JOIN users u ON b.collected_by = u.id
      WHERE b.status = 'lunas' 
        AND b.paid_at IS NOT NULL
        AND DATE(b.paid_at) >= DATE(?)
        AND DATE(b.paid_at) <= DATE(?)
    `;
    const params = [startDate, endDate];

    if (collectorId === 'admin') {
      sql += ' AND b.collected_by IS NULL';
    } else if (collectorId) {
      sql += ' AND b.collected_by = ?';
      params.push(collectorId);
    }

    if (paymentMethod) {
      sql += ' AND b.payment_method = ?';
      params.push(paymentMethod);
    }

    sql += ' ORDER BY b.paid_at DESC';

    const transactions = await db.all(sql, params);

    // Ambil daftar seluruh kolektor aktif untuk filter
    const collectors = await db.all("SELECT id, name, area FROM users WHERE role = 'kolektor' AND is_active = 1");

    // Hitung ringkasan statistik
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalCount = transactions.length;

    // Rincian per metode bayar
    const summaryMethod = {
      tunai: transactions.filter(t => (t.payment_method || 'tunai') === 'tunai').reduce((sum, t) => sum + t.amount, 0),
      transfer: transactions.filter(t => t.payment_method === 'transfer').reduce((sum, t) => sum + t.amount, 0),
      qris: transactions.filter(t => t.payment_method === 'qris').reduce((sum, t) => sum + t.amount, 0)
    };

    // Rincian per kolektor
    const summaryByCollector = {};
    transactions.forEach(t => {
      const colName = t.collector_name || 'Admin Langsung (Pusat)';
      if (!summaryByCollector[colName]) {
        summaryByCollector[colName] = {
          name: colName,
          area: t.collector_area || 'Kantor Pusat',
          count: 0,
          total: 0
        };
      }
      summaryByCollector[colName].count++;
      summaryByCollector[colName].total += t.amount;
    });

    const collectorBreakdown = Object.values(summaryByCollector);

    res.render('admin/laporan/kolektor', {
      title: 'Laporan Transaksi & Setoran Kolektor',
      activePage: 'laporan',
      transactions,
      totalAmount,
      totalCount,
      summaryMethod,
      collectorBreakdown,
      collectors,
      startDate,
      endDate,
      collectorId,
      paymentMethod,
      formatRupiah,
      formatDate,
      formatDateTime,
      user: req.session.user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Error laporan kolektor:', err);
    req.flash('error', 'Gagal memuat laporan transaksi kolektor.');
    res.redirect('/admin/dashboard');
  }
}

async function printCollectorReport(req, res) {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const firstDayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const startDate = req.query.start_date || firstDayMonth;
    const endDate = req.query.end_date || todayStr;
    const collectorId = req.query.collector_id || '';
    const paymentMethod = req.query.payment_method || '';

    let sql = `
      SELECT 
        b.*,
        c.customer_code,
        c.name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address,
        p.name as package_name,
        p.speed as package_speed,
        u.name as collector_name,
        u.area as collector_area
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      JOIN packages p ON c.package_id = p.id
      LEFT JOIN users u ON b.collected_by = u.id
      WHERE b.status = 'lunas' 
        AND b.paid_at IS NOT NULL
        AND DATE(b.paid_at) >= DATE(?)
        AND DATE(b.paid_at) <= DATE(?)
    `;
    const params = [startDate, endDate];

    let targetCollectorName = 'Semua Petugas Kolektor';
    if (collectorId === 'admin') {
      sql += ' AND b.collected_by IS NULL';
      targetCollectorName = 'Kasir Admin (Pusat)';
    } else if (collectorId) {
      sql += ' AND b.collected_by = ?';
      params.push(collectorId);
      const col = await db.get('SELECT name FROM users WHERE id = ?', [collectorId]);
      if (col) targetCollectorName = col.name;
    }

    if (paymentMethod) {
      sql += ' AND b.payment_method = ?';
      params.push(paymentMethod);
    }

    sql += ' ORDER BY b.paid_at ASC';

    const transactions = await db.all(sql, params);
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    const settingsRows = await db.all('SELECT key, value FROM settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    res.render('admin/laporan/cetak', {
      title: `Cetak Laporan Setoran - ${startDate} s/d ${endDate}`,
      transactions,
      totalAmount,
      targetCollectorName,
      startDate,
      endDate,
      paymentMethod,
      settings,
      formatRupiah,
      formatDate,
      formatDateTime
    });
  } catch (err) {
    console.error('Error print report:', err);
    res.status(500).send('Gagal membuat cetak laporan: ' + err.message);
  }
}

module.exports = {
  collectorReport,
  printCollectorReport
};
