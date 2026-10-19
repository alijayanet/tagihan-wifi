const db = require('../../database/db');
const { formatRupiah, formatDate, formatDateTime, getMonthName } = require('../utils/formatter');
const { buildWaUrl, getReminderMessage, getReceiptMessage } = require('../utils/waHelper');

async function dashboard(req, res) {
  try {
    const collectorId = req.session.user.id;
    const now = new Date();
    const currentMonth = parseInt(req.query.month, 10) || (now.getMonth() + 1);
    const currentYear = parseInt(req.query.year, 10) || now.getFullYear();
    const tab = req.query.tab || 'belum'; // default fokus pada yang 'belum' lunas
    const search = req.query.search ? req.query.search.trim() : '';

    // 1. Ambil ringkasan performa kolektor bulan ini
    const stats = await db.get(`
      SELECT 
        COUNT(b.id) as total_bills,
        COALESCE(SUM(b.amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN b.status = 'lunas' THEN b.amount ELSE 0 END), 0) as lunas_amount,
        COALESCE(SUM(CASE WHEN b.status = 'belum' THEN b.amount ELSE 0 END), 0) as belum_amount,
        COALESCE(SUM(CASE WHEN b.status = 'lunas' THEN 1 ELSE 0 END), 0) as lunas_count,
        COALESCE(SUM(CASE WHEN b.status = 'belum' THEN 1 ELSE 0 END), 0) as belum_count
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      WHERE (c.collector_id = ? OR b.collected_by = ?)
        AND b.period_month = ? AND b.period_year = ?
    `, [collectorId, collectorId, currentMonth, currentYear]);

    // 2. Query daftar tagihan pelanggan
    let sql = `
      SELECT 
        b.id as bill_id,
        b.invoice_no,
        b.amount,
        b.status,
        b.paid_at,
        b.payment_method,
        b.period_month,
        b.period_year,
        c.id as customer_id,
        c.customer_code,
        c.name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address,
        c.due_date,
        p.name as package_name,
        p.speed as package_speed
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      JOIN packages p ON c.package_id = p.id
      WHERE (c.collector_id = ? OR b.collected_by = ?)
        AND b.period_month = ? AND b.period_year = ?
    `;
    const params = [collectorId, collectorId, currentMonth, currentYear];

    if (tab === 'belum') {
      sql += " AND b.status = 'belum'";
    } else if (tab === 'lunas') {
      sql += " AND b.status = 'lunas'";
    }

    if (search) {
      sql += " AND (c.name LIKE ? OR c.customer_code LIKE ? OR c.address LIKE ? OR c.phone LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += " ORDER BY c.due_date ASC, c.name ASC";

    const bills = await db.all(sql, params);

    // Ambil setting untuk generate WA
    const settingsRows = await db.all('SELECT key, value FROM settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    const enrichedBills = bills.map(b => {
      const custObj = {
        name: b.customer_name,
        phone: b.customer_phone,
        package_name: b.package_name,
        due_date: b.due_date
      };

      let waUrl = '#';
      if (b.status === 'lunas') {
        const msg = getReceiptMessage(custObj, b, settings, req.session.user.name);
        waUrl = buildWaUrl(b.customer_phone, msg);
      } else {
        const msg = getReminderMessage(custObj, b, settings);
        waUrl = buildWaUrl(b.customer_phone, msg);
      }

      return {
        ...b,
        waUrl
      };
    });

    res.render('kolektor/dashboard', {
      title: 'Portal Petugas Lapangan',
      bills: enrichedBills,
      stats,
      tab,
      search,
      currentMonth,
      currentYear,
      monthName: getMonthName(currentMonth),
      formatRupiah,
      formatDate,
      formatDateTime,
      user: req.session.user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Error collector portal dashboard:', err);
    req.flash('error', 'Gagal memuat portal kolektor.');
    res.redirect('/kolektor/login');
  }
}

async function markPaid(req, res) {
  const { bill_id, payment_method, notes } = req.body;
  const collectorId = req.session.user.id;

  try {
    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [bill_id]);
    if (!bill) {
      req.flash('error', 'Tagihan tidak ditemukan.');
      return res.redirect('/kolektor/dashboard');
    }

    const nowIso = new Date().toISOString();
    await db.run(`
      UPDATE bills
      SET status = 'lunas',
          paid_at = ?,
          collected_by = ?,
          payment_method = ?,
          notes = ?
      WHERE id = ?
    `, [nowIso, collectorId, payment_method || 'tunai', notes ? notes.trim() : 'Diterima oleh petugas kolektor', bill_id]);

    req.flash('success', `Pembayaran ${bill.invoice_no} BERHASIL diterima!`);
    res.redirect(req.headers.referer || '/kolektor/dashboard?tab=lunas');
  } catch (err) {
    console.error('Error collector mark paid:', err);
    req.flash('error', 'Gagal mencatat pembayaran.');
    res.redirect('/kolektor/dashboard');
  }
}

async function riwayat(req, res) {
  try {
    const collectorId = req.session.user.id;
    const now = new Date();
    const currentMonth = parseInt(req.query.month, 10) || (now.getMonth() + 1);
    const currentYear = parseInt(req.query.year, 10) || now.getFullYear();

    const collections = await db.all(`
      SELECT 
        b.*,
        c.name as customer_name,
        c.customer_code,
        c.phone as customer_phone,
        c.address as customer_address,
        p.name as package_name
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      JOIN packages p ON c.package_id = p.id
      WHERE b.collected_by = ? AND b.status = 'lunas' AND b.period_month = ? AND b.period_year = ?
      ORDER BY b.paid_at DESC
    `, [collectorId, currentMonth, currentYear]);

    const totalCollected = collections.reduce((acc, curr) => acc + curr.amount, 0);

    res.render('kolektor/riwayat', {
      title: 'Riwayat Penagihan & Setoran',
      collections,
      totalCollected,
      currentMonth,
      currentYear,
      monthName: getMonthName(currentMonth),
      formatRupiah,
      formatDate,
      formatDateTime,
      user: req.session.user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Error riwayat kolektor:', err);
    req.flash('error', 'Gagal memuat riwayat.');
    res.redirect('/kolektor/dashboard');
  }
}

module.exports = {
  dashboard,
  markPaid,
  riwayat
};
