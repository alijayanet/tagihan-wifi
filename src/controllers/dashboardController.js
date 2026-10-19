const db = require('../../database/db');
const { formatRupiah, formatDate, formatDateTime, getMonthName } = require('../utils/formatter');

async function index(req, res) {
  try {
    const now = new Date();
    const currentMonth = parseInt(req.query.month, 10) || (now.getMonth() + 1);
    const currentYear = parseInt(req.query.year, 10) || now.getFullYear();

    // 1. Statistik Pelanggan
    const customerStats = await db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'aktif' THEN 1 ELSE 0 END) as aktif,
        SUM(CASE WHEN status = 'isolir' THEN 1 ELSE 0 END) as isolir,
        SUM(CASE WHEN status = 'nonaktif' THEN 1 ELSE 0 END) as nonaktif
      FROM customers
    `);

    // 2. Statistik Tagihan Bulan Terpilih
    const billStats = await db.get(`
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'lunas' THEN amount ELSE 0 END), 0) as lunas_amount,
        COALESCE(SUM(CASE WHEN status = 'belum' THEN amount ELSE 0 END), 0) as belum_amount,
        COALESCE(SUM(CASE WHEN status = 'lunas' THEN 1 ELSE 0 END), 0) as lunas_count,
        COALESCE(SUM(CASE WHEN status = 'belum' THEN 1 ELSE 0 END), 0) as belum_count
      FROM bills
      WHERE period_month = ? AND period_year = ?
    `, [currentMonth, currentYear]);

    // Persentase Pelunasan
    const percentLunas = billStats.total_amount > 0 
      ? Math.round((billStats.lunas_amount / billStats.total_amount) * 100) 
      : 0;

    // 3. Statistik Performa Kolektor Bulan Ini
    const collectorStats = await db.all(`
      SELECT 
        u.id, 
        u.name, 
        u.area,
        u.phone,
        COUNT(b.id) as total_bills,
        COALESCE(SUM(CASE WHEN b.status = 'lunas' THEN b.amount ELSE 0 END), 0) as lunas_amount,
        COALESCE(SUM(CASE WHEN b.status = 'belum' THEN b.amount ELSE 0 END), 0) as belum_amount,
        COALESCE(SUM(CASE WHEN b.status = 'lunas' THEN 1 ELSE 0 END), 0) as lunas_count,
        COALESCE(SUM(CASE WHEN b.status = 'belum' THEN 1 ELSE 0 END), 0) as belum_count
      FROM users u
      LEFT JOIN customers c ON c.collector_id = u.id
      LEFT JOIN bills b ON b.customer_id = c.id AND b.period_month = ? AND b.period_year = ?
      WHERE u.role = 'kolektor' AND u.is_active = 1
      GROUP BY u.id
    `, [currentMonth, currentYear]);

    // 4. Tagihan Terbaru / Aktivitas Terkini
    const recentBills = await db.all(`
      SELECT 
        b.id,
        b.invoice_no,
        b.amount,
        b.status,
        b.paid_at,
        b.payment_method,
        c.name as customer_name,
        c.customer_code,
        p.name as package_name,
        u.name as collector_name
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      JOIN packages p ON c.package_id = p.id
      LEFT JOIN users u ON b.collected_by = u.id
      WHERE b.period_month = ? AND b.period_year = ?
      ORDER BY b.paid_at DESC, b.id DESC
      LIMIT 10
    `, [currentMonth, currentYear]);

    // 5. Trend Pendapatan 6 Bulan Terakhir
    const trendMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      trendMonths.push({ month: m, year: y, label: `${getMonthName(m).substring(0, 3)} ${y}` });
    }

    const monthlyTrends = [];
    for (const t of trendMonths) {
      const row = await db.get(`
        SELECT 
          COALESCE(SUM(CASE WHEN status = 'lunas' THEN amount ELSE 0 END), 0) as lunas,
          COALESCE(SUM(amount), 0) as target
        FROM bills 
        WHERE period_month = ? AND period_year = ?
      `, [t.month, t.year]);

      monthlyTrends.push({
        label: t.label,
        lunas: row ? row.lunas : 0,
        target: row ? row.target : 0
      });
    }

    res.render('admin/dashboard', {
      title: 'Dashboard Admin',
      activePage: 'dashboard',
      currentMonth,
      currentYear,
      monthName: getMonthName(currentMonth),
      customerStats,
      billStats,
      percentLunas,
      collectorStats,
      recentBills,
      monthlyTrends,
      formatRupiah,
      formatDate,
      formatDateTime,
      user: req.session.user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Error dashboard:', err);
    req.flash('error', 'Gagal memuat data dashboard.');
    res.render('admin/dashboard', {
      title: 'Dashboard Admin',
      activePage: 'dashboard',
      currentMonth: new Date().getMonth() + 1,
      currentYear: new Date().getFullYear(),
      monthName: getMonthName(new Date().getMonth() + 1),
      customerStats: { total: 0, aktif: 0, isolir: 0, nonaktif: 0 },
      billStats: { total_bills: 0, total_amount: 0, lunas_amount: 0, belum_amount: 0, lunas_count: 0, belum_count: 0 },
      percentLunas: 0,
      collectorStats: [],
      recentBills: [],
      monthlyTrends: [],
      formatRupiah,
      formatDate,
      formatDateTime,
      user: req.session.user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  }
}

module.exports = {
  index
};
