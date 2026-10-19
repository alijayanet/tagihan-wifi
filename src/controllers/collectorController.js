const bcrypt = require('bcryptjs');
const db = require('../../database/db');
const { formatRupiah, formatDate, formatDateTime, getMonthName } = require('../utils/formatter');

async function index(req, res) {
  try {
    const now = new Date();
    const currentMonth = parseInt(req.query.month, 10) || (now.getMonth() + 1);
    const currentYear = parseInt(req.query.year, 10) || now.getFullYear();

    const collectors = await db.all(`
      SELECT 
        u.*,
        COUNT(DISTINCT c.id) as total_customers,
        COALESCE(SUM(CASE WHEN b.status = 'lunas' THEN b.amount ELSE 0 END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN b.status = 'belum' THEN b.amount ELSE 0 END), 0) as total_uncollected,
        COALESCE(SUM(CASE WHEN b.status = 'lunas' THEN 1 ELSE 0 END), 0) as lunas_count,
        COALESCE(SUM(CASE WHEN b.status = 'belum' THEN 1 ELSE 0 END), 0) as belum_count
      FROM users u
      LEFT JOIN customers c ON c.collector_id = u.id
      LEFT JOIN bills b ON b.customer_id = c.id AND b.period_month = ? AND b.period_year = ?
      WHERE u.role = 'kolektor'
      GROUP BY u.id
      ORDER BY u.name ASC
    `, [currentMonth, currentYear]);

    res.render('admin/kolektor/index', {
      title: 'Manajemen Kolektor / Petugas Lapangan',
      activePage: 'kolektor',
      collectors,
      currentMonth,
      currentYear,
      monthName: getMonthName(currentMonth),
      formatRupiah,
      formatDate,
      user: req.session.user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Error collector index:', err);
    req.flash('error', 'Gagal memuat data kolektor.');
    res.redirect('/admin/dashboard');
  }
}

async function create(req, res) {
  const { name, username, password, phone, area } = req.body;

  if (!name || !username || !password) {
    req.flash('error', 'Nama, Username, dan Password wajib diisi!');
    return res.redirect('/admin/kolektor');
  }

  try {
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing) {
      req.flash('error', `Username "${username}" sudah digunakan.`);
      return res.redirect('/admin/kolektor');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    await db.run(`
      INSERT INTO users (name, username, password, role, phone, area, is_active)
      VALUES (?, ?, ?, 'kolektor', ?, ?, 1)
    `, [name.trim(), username.trim().toLowerCase(), hashedPassword, phone ? phone.trim() : '', area ? area.trim() : '']);

    req.flash('success', `Kolektor "${name}" berhasil didaftarkan.`);
    res.redirect('/admin/kolektor');
  } catch (err) {
    console.error('Error create collector:', err);
    req.flash('error', 'Gagal menambahkan kolektor: ' + err.message);
    res.redirect('/admin/kolektor');
  }
}

async function show(req, res) {
  const { id } = req.params;
  const now = new Date();
  const currentMonth = parseInt(req.query.month, 10) || (now.getMonth() + 1);
  const currentYear = parseInt(req.query.year, 10) || now.getFullYear();

  try {
    const collector = await db.get(
      "SELECT * FROM users WHERE id = ? AND role = 'kolektor'",
      [id]
    );

    if (!collector) {
      req.flash('error', 'Kolektor tidak ditemukan.');
      return res.redirect('/admin/kolektor');
    }

    // Pelanggan di bawah kolektor ini
    const customers = await db.all(`
      SELECT 
        c.*, 
        p.name as package_name, 
        p.price as package_price,
        b.status as current_bill_status,
        b.invoice_no as current_invoice_no,
        b.amount as current_bill_amount,
        b.paid_at as current_paid_at
      FROM customers c
      JOIN packages p ON c.package_id = p.id
      LEFT JOIN bills b ON b.customer_id = c.id AND b.period_month = ? AND b.period_year = ?
      WHERE c.collector_id = ?
      ORDER BY c.name ASC
    `, [currentMonth, currentYear, id]);

    // Riwayat transaksi pembayaran yang ditagih oleh kolektor ini bulan berjalan
    const collectionHistory = await db.all(`
      SELECT 
        b.*,
        c.name as customer_name,
        c.customer_code,
        p.name as package_name
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      JOIN packages p ON c.package_id = p.id
      WHERE b.collected_by = ? AND b.status = 'lunas' AND b.period_month = ? AND b.period_year = ?
      ORDER BY b.paid_at DESC
    `, [id, currentMonth, currentYear]);

    const totalCollected = collectionHistory.reduce((acc, curr) => acc + curr.amount, 0);

    res.render('admin/kolektor/detail', {
      title: `Detail Kolektor - ${collector.name}`,
      activePage: 'kolektor',
      collector,
      customers,
      collectionHistory,
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
    console.error('Error show collector:', err);
    req.flash('error', 'Gagal memuat detail kolektor.');
    res.redirect('/admin/kolektor');
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { name, phone, area, password, is_active } = req.body;

  try {
    if (password && password.trim().length > 0) {
      const hashedPassword = bcrypt.hashSync(password.trim(), 10);
      await db.run(`
        UPDATE users
        SET name = ?, phone = ?, area = ?, password = ?, is_active = ?
        WHERE id = ? AND role = 'kolektor'
      `, [name.trim(), phone ? phone.trim() : '', area ? area.trim() : '', hashedPassword, is_active ? 1 : 0, id]);
    } else {
      await db.run(`
        UPDATE users
        SET name = ?, phone = ?, area = ?, is_active = ?
        WHERE id = ? AND role = 'kolektor'
      `, [name.trim(), phone ? phone.trim() : '', area ? area.trim() : '', is_active ? 1 : 0, id]);
    }

    req.flash('success', `Data kolektor "${name}" berhasil diperbarui.`);
    res.redirect(req.headers.referer || '/admin/kolektor');
  } catch (err) {
    console.error('Error update collector:', err);
    req.flash('error', 'Gagal memperbarui data kolektor.');
    res.redirect('/admin/kolektor');
  }
}

async function remove(req, res) {
  const { id } = req.params;

  try {
    // Unassign customers from this collector
    await db.run('UPDATE customers SET collector_id = NULL WHERE collector_id = ?', [id]);
    await db.run('DELETE FROM users WHERE id = ? AND role = ?', [id, 'kolektor']);

    req.flash('success', 'Kolektor berhasil dihapus. Pelanggan terkait telah dialihkan ke tanpa kolektor.');
    res.redirect('/admin/kolektor');
  } catch (err) {
    console.error('Error delete collector:', err);
    req.flash('error', 'Gagal menghapus kolektor.');
    res.redirect('/admin/kolektor');
  }
}

module.exports = {
  index,
  create,
  show,
  update,
  remove
};
