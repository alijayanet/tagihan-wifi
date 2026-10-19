const db = require('../../database/db');
const { formatRupiah, formatDate, formatDateTime, getMonthName } = require('../utils/formatter');
const { buildWaUrl, getReminderMessage, getReceiptMessage } = require('../utils/waHelper');

async function index(req, res) {
  try {
    const now = new Date();
    const currentMonth = parseInt(req.query.month, 10) || (now.getMonth() + 1);
    const currentYear = parseInt(req.query.year, 10) || now.getFullYear();
    const filterStatus = req.query.status || ''; // 'lunas', 'belum', or ''
    const filterCollector = req.query.collector || '';
    const search = req.query.search ? req.query.search.trim() : '';

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
        uc.name as customer_collector_name
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      JOIN packages p ON c.package_id = p.id
      LEFT JOIN users u ON b.collected_by = u.id
      LEFT JOIN users uc ON c.collector_id = uc.id
      WHERE b.period_month = ? AND b.period_year = ?
    `;
    const params = [currentMonth, currentYear];

    if (filterStatus) {
      sql += ' AND b.status = ?';
      params.push(filterStatus);
    }

    if (filterCollector) {
      sql += ' AND (b.collected_by = ? OR c.collector_id = ?)';
      params.push(filterCollector, filterCollector);
    }

    if (search) {
      sql += ' AND (b.invoice_no LIKE ? OR c.name LIKE ? OR c.customer_code LIKE ? OR c.phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY b.status ASC, b.id DESC';

    const bills = await db.all(sql, params);
    const collectors = await db.all("SELECT id, name, area FROM users WHERE role = 'kolektor' AND is_active = 1");

    // Ambil settings untuk WA
    const settingsRows = await db.all('SELECT key, value FROM settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    // Tambahkan URL WhatsApp reminder atau kwitansi
    const enrichedBills = bills.map(b => {
      const custObj = {
        name: b.customer_name,
        phone: b.customer_phone,
        package_name: b.package_name,
        due_date: 10
      };
      
      let waUrl = '#';
      if (b.status === 'lunas') {
        const msg = getReceiptMessage(custObj, b, settings, b.collector_name || 'Admin');
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

    // Statistik bulan ini
    const stats = await db.get(`
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

    res.render('admin/tagihan/index', {
      title: 'Manajemen Tagihan Pelanggan',
      activePage: 'tagihan',
      bills: enrichedBills,
      stats,
      collectors,
      currentMonth,
      currentYear,
      monthName: getMonthName(currentMonth),
      filterStatus,
      filterCollector,
      search,
      formatRupiah,
      formatDate,
      formatDateTime,
      user: req.session.user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Error bill index:', err);
    req.flash('error', 'Gagal memuat daftar tagihan.');
    res.redirect('/admin/dashboard');
  }
}

async function generateMonthly(req, res) {
  const { month, year } = req.body;
  const targetMonth = parseInt(month, 10);
  const targetYear = parseInt(year, 10);

  if (!targetMonth || !targetYear) {
    req.flash('error', 'Bulan dan tahun harus dipilih.');
    return res.redirect('/admin/tagihan');
  }

  try {
    // Ambil semua pelanggan aktif
    const activeCustomers = await db.all(`
      SELECT c.id, c.package_id, p.price 
      FROM customers c
      JOIN packages p ON c.package_id = p.id
      WHERE c.status = 'aktif'
    `);

    if (activeCustomers.length === 0) {
      req.flash('error', 'Tidak ada pelanggan dengan status aktif.');
      return res.redirect(`/admin/tagihan?month=${targetMonth}&year=${targetYear}`);
    }

    // Ambil tagihan yang sudah ada di periode ini
    const existing = await db.all(
      'SELECT customer_id FROM bills WHERE period_month = ? AND period_year = ?',
      [targetMonth, targetYear]
    );
    const existingSet = new Set(existing.map(e => e.customer_id));

    // Ambil counter invoice terakhir periode ini
    const lastInv = await db.get(
      'SELECT id FROM bills WHERE period_month = ? AND period_year = ? ORDER BY id DESC LIMIT 1',
      [targetMonth, targetYear]
    );
    let counter = existing.length + 1;

    let createdCount = 0;
    for (const cust of activeCustomers) {
      if (!existingSet.has(cust.id)) {
        const invNo = `INV/${targetYear}${String(targetMonth).padStart(2, '0')}/${String(counter).padStart(4, '0')}`;
        await db.run(`
          INSERT INTO bills (invoice_no, customer_id, period_month, period_year, amount, status)
          VALUES (?, ?, ?, ?, ?, 'belum')
        `, [invNo, cust.id, targetMonth, targetYear, cust.price]);
        counter++;
        createdCount++;
      }
    }

    if (createdCount === 0) {
      req.flash('success', `Semua pelanggan aktif (${activeCustomers.length}) sudah memiliki tagihan untuk periode ${getMonthName(targetMonth)} ${targetYear}.`);
    } else {
      req.flash('success', `Berhasil membuat ${createdCount} tagihan baru untuk periode ${getMonthName(targetMonth)} ${targetYear}!`);
    }

    res.redirect(`/admin/tagihan?month=${targetMonth}&year=${targetYear}`);
  } catch (err) {
    console.error('Error generate bills:', err);
    req.flash('error', 'Gagal generate tagihan: ' + err.message);
    res.redirect('/admin/tagihan');
  }
}

async function markPaid(req, res) {
  const { id } = req.params;
  const { payment_method, collected_by, notes } = req.body;

  try {
    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [id]);
    if (!bill) {
      req.flash('error', 'Tagihan tidak ditemukan.');
      return res.redirect('/admin/tagihan');
    }

    const collectorId = collected_by || (req.session.user.role === 'kolektor' ? req.session.user.id : null);
    const nowIso = new Date().toISOString();

    await db.run(`
      UPDATE bills
      SET status = 'lunas',
          paid_at = ?,
          collected_by = ?,
          payment_method = ?,
          notes = ?
      WHERE id = ?
    `, [nowIso, collectorId, payment_method || 'tunai', notes ? notes.trim() : 'Lunas dibayar', id]);

    // Kirim Kwitansi Otomatis via Fonnte jika diaktifkan (opsional)
    const { sendPaymentReceipt, getFonnteConfig } = require('../services/fonnteService');
    const fonnteCfg = await getFonnteConfig();
    if (fonnteCfg.enabled && fonnteCfg.autoSend) {
      const cust = await db.get(`
        SELECT c.*, p.name as package_name, p.speed as package_speed
        FROM customers c
        JOIN packages p ON c.package_id = p.id
        WHERE c.id = ?
      `, [bill.customer_id]);

      const colUser = collectorId ? await db.get('SELECT name FROM users WHERE id = ?', [collectorId]) : null;
      const updatedBill = await db.get('SELECT * FROM bills WHERE id = ?', [id]);
      const settingsRows = await db.all('SELECT key, value FROM settings');
      const settings = {};
      settingsRows.forEach(r => { settings[r.key] = r.value; });

      sendPaymentReceipt(cust, updatedBill, settings, colUser ? colUser.name : 'Admin Kas').catch(err => {
        console.warn('Fonnte auto receipt error:', err.message);
      });
    }

    req.flash('success', `Tagihan ${bill.invoice_no} berhasil ditandai LUNAS.`);
    res.redirect(req.headers.referer || '/admin/tagihan');
  } catch (err) {
    console.error('Error mark paid:', err);
    req.flash('error', 'Gagal memproses pembayaran tagihan.');
    res.redirect('/admin/tagihan');
  }
}

async function cancelPayment(req, res) {
  const { id } = req.params;

  try {
    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [id]);
    if (!bill) {
      req.flash('error', 'Tagihan tidak ditemukan.');
      return res.redirect('/admin/tagihan');
    }

    await db.run(`
      UPDATE bills
      SET status = 'belum',
          paid_at = NULL,
          collected_by = NULL,
          payment_method = NULL
      WHERE id = ?
    `, [id]);

    req.flash('success', `Status tagihan ${bill.invoice_no} dikembalikan menjadi BELUM LUNAS.`);
    res.redirect(req.headers.referer || '/admin/tagihan');
  } catch (err) {
    console.error('Error cancel payment:', err);
    req.flash('error', 'Gagal membatalkan status pembayaran.');
    res.redirect('/admin/tagihan');
  }
}

async function printReceipt(req, res) {
  const { id } = req.params;

  try {
    const bill = await db.get(`
      SELECT 
        b.*,
        c.customer_code,
        c.name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address,
        p.name as package_name,
        p.speed as package_speed,
        u.name as collector_name
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      JOIN packages p ON c.package_id = p.id
      LEFT JOIN users u ON b.collected_by = u.id
      WHERE b.id = ?
    `, [id]);

    if (!bill) {
      return res.status(404).send('Tagihan tidak ditemukan.');
    }

    const settingsRows = await db.all('SELECT key, value FROM settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    res.render('admin/tagihan/struk', {
      title: `Struk Pembayaran - ${bill.invoice_no}`,
      bill,
      settings,
      periodName: `${getMonthName(bill.period_month)} ${bill.period_year}`,
      formatRupiah,
      formatDate,
      formatDateTime
    });
  } catch (err) {
    console.error('Error print receipt:', err);
    res.status(500).send('Gagal memuat struk: ' + err.message);
  }
}

async function sendFonnteSingle(req, res) {
  const { id } = req.params;
  const { sendBillReminder, sendPaymentReceipt } = require('../services/fonnteService');

  try {
    const bill = await db.get(`
      SELECT b.*, c.name as customer_name, c.phone as customer_phone, c.due_date,
             p.name as package_name, p.speed as package_speed, u.name as collector_name
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      JOIN packages p ON c.package_id = p.id
      LEFT JOIN users u ON b.collected_by = u.id
      WHERE b.id = ?
    `, [id]);

    if (!bill) {
      req.flash('error', 'Tagihan tidak ditemukan.');
      return res.redirect('/admin/tagihan');
    }

    const custObj = {
      name: bill.customer_name,
      phone: bill.customer_phone,
      package_name: bill.package_name,
      due_date: bill.due_date || 10
    };

    const settingsRows = await db.all('SELECT key, value FROM settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    let result;
    if (bill.status === 'lunas') {
      result = await sendPaymentReceipt(custObj, bill, settings, bill.collector_name || 'Admin Kas');
    } else {
      result = await sendBillReminder(custObj, bill, settings);
    }

    if (result.success) {
      req.flash('success', `Pesan WhatsApp berhasil dikirim ke ${bill.customer_name} via Fonnte Gateway!`);
    } else {
      req.flash('error', `Gagal kirim via Fonnte: ${result.message}`);
    }

    res.redirect(req.headers.referer || '/admin/tagihan');
  } catch (err) {
    console.error('Error send single fonnte:', err);
    req.flash('error', 'Gagal memproses pengiriman: ' + err.message);
    res.redirect('/admin/tagihan');
  }
}

async function blastFonnteReminders(req, res) {
  const { month, year } = req.body;
  const targetMonth = parseInt(month, 10);
  const targetYear = parseInt(year, 10);
  const { sendBillReminder, getFonnteConfig } = require('../services/fonnteService');

  const fonnteCfg = await getFonnteConfig();
  if (!fonnteCfg.enabled || !fonnteCfg.token) {
    req.flash('error', 'WhatsApp Gateway Fonnte belum diaktifkan. Silakan aktifkan dan isi token di menu Pengaturan.');
    return res.redirect(`/admin/tagihan?month=${targetMonth}&year=${targetYear}`);
  }

  try {
    const unpaidBills = await db.all(`
      SELECT b.*, c.name as customer_name, c.phone as customer_phone, c.due_date,
             p.name as package_name, p.speed as package_speed
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      JOIN packages p ON c.package_id = p.id
      WHERE b.period_month = ? AND b.period_year = ? AND b.status = 'belum'
    `, [targetMonth, targetYear]);

    if (unpaidBills.length === 0) {
      req.flash('success', 'Tidak ada tagihan yang belum lunas pada periode ini.');
      return res.redirect(`/admin/tagihan?month=${targetMonth}&year=${targetYear}`);
    }

    const settingsRows = await db.all('SELECT key, value FROM settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    let successCount = 0;
    let failCount = 0;

    for (const b of unpaidBills) {
      const custObj = {
        name: b.customer_name,
        phone: b.customer_phone,
        package_name: b.package_name,
        due_date: b.due_date || 10
      };

      const resSend = await sendBillReminder(custObj, b, settings);
      if (resSend.success) {
        successCount++;
      } else {
        failCount++;
      }

      // Jeda 1 detik antar pesan untuk keamanan anti-spam Fonnte
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    req.flash('success', `Selesai! Berhasil mengirim tagihan WA ke ${successCount} pelanggan${failCount > 0 ? ` (${failCount} gagal)` : ''}.`);
    res.redirect(`/admin/tagihan?month=${targetMonth}&year=${targetYear}&status=belum`);
  } catch (err) {
    console.error('Error blast fonnte:', err);
    req.flash('error', 'Gagal memproses blast WhatsApp: ' + err.message);
    res.redirect('/admin/tagihan');
  }
}

async function remove(req, res) {
  const { id } = req.params;

  try {
    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [id]);
    if (!bill) {
      req.flash('error', 'Tagihan tidak ditemukan.');
      return res.redirect(req.headers.referer || '/admin/tagihan');
    }

    await db.run('DELETE FROM bills WHERE id = ?', [id]);

    req.flash('success', `Tagihan ${bill.invoice_no} berhasil dihapus.`);
    res.redirect(req.headers.referer || '/admin/tagihan');
  } catch (err) {
    console.error('Error delete bill:', err);
    req.flash('error', 'Gagal menghapus tagihan: ' + err.message);
    res.redirect(req.headers.referer || '/admin/tagihan');
  }
}

module.exports = {
  index,
  generateMonthly,
  markPaid,
  cancelPayment,
  remove,
  printReceipt,
  sendFonnteSingle,
  blastFonnteReminders
};
