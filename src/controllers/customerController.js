const db = require('../../database/db');
const { formatRupiah, formatDate, formatDateTime, getMonthName } = require('../utils/formatter');
const { buildWaUrl, getReminderMessage } = require('../utils/waHelper');

async function index(req, res) {
  try {
    const now = new Date();
    const currentMonth = parseInt(req.query.month, 10) || (now.getMonth() + 1);
    const currentYear = parseInt(req.query.year, 10) || now.getFullYear();
    const filterStatus = req.query.status || '';
    const filterBill = req.query.bill || ''; // 'lunas' or 'belum'
    const filterCollector = req.query.collector || '';
    const search = req.query.search ? req.query.search.trim() : '';

    let sql = `
      SELECT 
        c.*,
        p.name as package_name,
        p.speed as package_speed,
        p.price as package_price,
        u.name as collector_name,
        b.id as current_bill_id,
        b.invoice_no as current_invoice_no,
        b.status as current_bill_status,
        b.amount as current_bill_amount,
        b.paid_at as current_paid_at,
        b.payment_method as current_payment_method
      FROM customers c
      JOIN packages p ON c.package_id = p.id
      LEFT JOIN users u ON c.collector_id = u.id
      LEFT JOIN bills b ON b.customer_id = c.id AND b.period_month = ? AND b.period_year = ?
      WHERE 1=1
    `;
    const params = [currentMonth, currentYear];

    if (filterStatus) {
      sql += ' AND c.status = ?';
      params.push(filterStatus);
    }

    if (filterCollector) {
      sql += ' AND c.collector_id = ?';
      params.push(filterCollector);
    }

    if (filterBill === 'lunas') {
      sql += " AND b.status = 'lunas'";
    } else if (filterBill === 'belum') {
      sql += " AND (b.status = 'belum' OR b.id IS NULL)";
    }

    if (search) {
      sql += ' AND (c.name LIKE ? OR c.customer_code LIKE ? OR c.phone LIKE ? OR c.address LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY c.id DESC';

    const customers = await db.all(sql, params);
    const packages = await db.all("SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC");
    const collectors = await db.all("SELECT id, name, area FROM users WHERE role = 'kolektor' AND is_active = 1");
    
    // Ambil settings untuk link WA
    const settingsRows = await db.all('SELECT key, value FROM settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    // Tambahkan helper WhatsApp reminder link untuk yang status belum lunas
    const enrichedCustomers = customers.map(cust => {
      let waReminderUrl = '#';
      if (cust.current_bill_status !== 'lunas') {
        const dummyBill = {
          period_month: currentMonth,
          period_year: currentYear,
          amount: cust.current_bill_amount || cust.package_price,
          invoice_no: cust.current_invoice_no || '-'
        };
        const msg = getReminderMessage(cust, dummyBill, settings);
        waReminderUrl = buildWaUrl(cust.phone, msg);
      }
      return {
        ...cust,
        waReminderUrl
      };
    });

    // Ringkasan status pelanggan untuk badge atas
    const summary = await db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'aktif' THEN 1 ELSE 0 END) as aktif,
        SUM(CASE WHEN status = 'isolir' THEN 1 ELSE 0 END) as isolir,
        SUM(CASE WHEN status = 'nonaktif' THEN 1 ELSE 0 END) as nonaktif
      FROM customers
    `);

    res.render('admin/pelanggan/index', {
      title: 'Data Pelanggan Wi-Fi',
      activePage: 'pelanggan',
      customers: enrichedCustomers,
      packages,
      collectors,
      summary,
      currentMonth,
      currentYear,
      monthName: getMonthName(currentMonth),
      filterStatus,
      filterBill,
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
    console.error('Error customer index:', err);
    req.flash('error', 'Gagal memuat data pelanggan.');
    res.redirect('/admin/dashboard');
  }
}

async function create(req, res) {
  const { name, phone, address, package_id, collector_id, due_date, ip_address, status, notes } = req.body;

  if (!name || !phone || !package_id) {
    req.flash('error', 'Nama, Nomor Telepon, dan Paket wajib diisi!');
    return res.redirect('/admin/pelanggan');
  }

  try {
    // Generate kode pelanggan unik (misal: CUST-008)
    const lastCust = await db.get('SELECT id FROM customers ORDER BY id DESC LIMIT 1');
    const nextId = (lastCust ? lastCust.id : 0) + 1;
    const customerCode = `CUST-${String(nextId).padStart(3, '0')}`;

    const result = await db.run(`
      INSERT INTO customers (
        customer_code, name, phone, address, package_id, 
        collector_id, due_date, ip_address, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      customerCode,
      name.trim(),
      phone.trim(),
      address ? address.trim() : '',
      package_id,
      collector_id || null,
      due_date ? parseInt(due_date, 10) : 10,
      ip_address ? ip_address.trim() : '',
      status || 'aktif',
      notes ? notes.trim() : ''
    ]);

    // Otomatis buatkan tagihan bulan berjalan untuk pelanggan baru ini jika belum ada
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const pkg = await db.get('SELECT price FROM packages WHERE id = ?', [package_id]);
    
    if (pkg) {
      const invNo = `INV/${curYear}${String(curMonth).padStart(2, '0')}/${String(result.lastID).padStart(4, '0')}`;
      await db.run(`
        INSERT OR IGNORE INTO bills (invoice_no, customer_id, period_month, period_year, amount, status)
        VALUES (?, ?, ?, ?, ?, 'belum')
      `, [invNo, result.lastID, curMonth, curYear, pkg.price]);
    }

    req.flash('success', `Pelanggan "${name}" (${customerCode}) berhasil ditambahkan.`);
    res.redirect('/admin/pelanggan');
  } catch (err) {
    console.error('Error create customer:', err);
    req.flash('error', 'Gagal menambahkan pelanggan: ' + err.message);
    res.redirect('/admin/pelanggan');
  }
}

async function show(req, res) {
  const { id } = req.params;

  try {
    const customer = await db.get(`
      SELECT 
        c.*,
        p.name as package_name,
        p.speed as package_speed,
        p.price as package_price,
        u.name as collector_name,
        u.phone as collector_phone
      FROM customers c
      JOIN packages p ON c.package_id = p.id
      LEFT JOIN users u ON c.collector_id = u.id
      WHERE c.id = ?
    `, [id]);

    if (!customer) {
      req.flash('error', 'Pelanggan tidak ditemukan.');
      return res.redirect('/admin/pelanggan');
    }

    // Riwayat seluruh tagihan pelanggan
    const bills = await db.all(`
      SELECT 
        b.*,
        u.name as collector_name
      FROM bills b
      LEFT JOIN users u ON b.collected_by = u.id
      WHERE b.customer_id = ?
      ORDER BY b.period_year DESC, b.period_month DESC
    `, [id]);

    // Settings
    const settingsRows = await db.all('SELECT key, value FROM settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    const packages = await db.all("SELECT * FROM packages WHERE is_active = 1 ORDER BY price ASC");
    const collectors = await db.all("SELECT id, name, area FROM users WHERE role = 'kolektor' AND is_active = 1");

    res.render('admin/pelanggan/detail', {
      title: `Detail Pelanggan - ${customer.name}`,
      activePage: 'pelanggan',
      customer,
      bills,
      packages,
      collectors,
      settings,
      formatRupiah,
      formatDate,
      formatDateTime,
      getMonthName,
      user: req.session.user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Error show customer:', err);
    req.flash('error', 'Gagal memuat detail pelanggan.');
    res.redirect('/admin/pelanggan');
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { name, phone, address, package_id, collector_id, due_date, ip_address, status, notes } = req.body;

  try {
    await db.run(`
      UPDATE customers
      SET name = ?, phone = ?, address = ?, package_id = ?, 
          collector_id = ?, due_date = ?, ip_address = ?, status = ?, notes = ?
      WHERE id = ?
    `, [
      name.trim(),
      phone.trim(),
      address ? address.trim() : '',
      package_id,
      collector_id || null,
      due_date ? parseInt(due_date, 10) : 10,
      ip_address ? ip_address.trim() : '',
      status || 'aktif',
      notes ? notes.trim() : '',
      id
    ]);

    // Sinkronisasi status ke MikroTik jika diaktifkan (opsional)
    const { syncCustomerStatus } = require('../services/mikrotikService');
    const updatedCust = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
    if (updatedCust) {
      syncCustomerStatus(updatedCust, status || 'aktif').catch(err => {
        console.warn('MikroTik optional sync skipped:', err.message);
      });
    }

    req.flash('success', `Data pelanggan "${name}" berhasil diperbarui.`);
    res.redirect(req.headers.referer || '/admin/pelanggan');
  } catch (err) {
    console.error('Error update customer:', err);
    req.flash('error', 'Gagal memperbarui data pelanggan.');
    res.redirect('/admin/pelanggan');
  }
}

async function remove(req, res) {
  const { id } = req.params;

  try {
    await db.run('DELETE FROM customers WHERE id = ?', [id]);
    req.flash('success', 'Pelanggan berhasil dihapus.');
    res.redirect('/admin/pelanggan');
  } catch (err) {
    console.error('Error delete customer:', err);
    req.flash('error', 'Gagal menghapus pelanggan.');
    res.redirect('/admin/pelanggan');
  }
}

async function exportCsv(req, res) {
  try {
    const customers = await db.all(`
      SELECT 
        c.customer_code,
        c.name,
        c.phone,
        c.address,
        p.name as package_name,
        p.speed as package_speed,
        p.price as package_price,
        u.name as collector_name,
        c.due_date,
        c.ip_address,
        c.status,
        c.notes,
        c.installation_date
      FROM customers c
      JOIN packages p ON c.package_id = p.id
      LEFT JOIN users u ON c.collector_id = u.id
      ORDER BY c.id ASC
    `);

    // Helper untuk escape field CSV
    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      'Kode Pelanggan',
      'Nama Lengkap',
      'Nomor HP / WA',
      'Alamat',
      'Paket Internet',
      'Kecepatan',
      'Tarif Bulanan',
      'Kolektor PJ',
      'Tgl Jatuh Tempo',
      'IP Address',
      'Status Akun',
      'Tgl Pasang',
      'Catatan'
    ];

    let csvContent = '\uFEFF'; // UTF-8 BOM untuk Excel
    csvContent += headers.map(escapeCsv).join(',') + '\r\n';

    customers.forEach(c => {
      const row = [
        c.customer_code,
        c.name,
        c.phone,
        c.address,
        c.package_name,
        c.package_speed,
        c.package_price,
        c.collector_name || '',
        c.due_date || 10,
        c.ip_address || '',
        c.status,
        c.installation_date || '',
        c.notes || ''
      ];
      csvContent += row.map(escapeCsv).join(',') + '\r\n';
    });

    const nowStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="data_pelanggan_${nowStr}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('Error export CSV:', err);
    req.flash('error', 'Gagal mengekspor data pelanggan.');
    res.redirect('/admin/pelanggan');
  }
}

function downloadTemplate(req, res) {
  const headers = [
    'Kode Pelanggan (Kosongkan utk auto)',
    'Nama Lengkap *',
    'Nomor HP *',
    'Alamat',
    'Nama Paket *',
    'Username Kolektor',
    'Jatuh Tempo (1-28)',
    'IP Address',
    'Status (aktif/isolir/nonaktif)',
    'Catatan'
  ];

  const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += headers.map(escapeCsv).join(',') + '\r\n';
  
  // Contoh baris 1
  csvContent += [
    'CUST-101',
    'Ahmad Fauzi',
    '081234567899',
    'Jl. Anggrek No. 05 RT 02',
    'Paket Hemat',
    'kolektor1',
    '10',
    '192.168.1.150',
    'aktif',
    'Rumah cat biru'
  ].map(escapeCsv).join(',') + '\r\n';

  // Contoh baris 2 (kode auto generate)
  csvContent += [
    '',
    'Siti Nurhaliza',
    '081398765432',
    'Jl. Cempaka No. 12 RT 03',
    'Paket Keluarga',
    'kolektor2',
    '15',
    '192.168.1.151',
    'aktif',
    'Toko kelontong'
  ].map(escapeCsv).join(',') + '\r\n';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="template_import_pelanggan.csv"');
  res.send(csvContent);
}

async function importCsv(req, res) {
  if (!req.file || !req.file.buffer) {
    req.flash('error', 'Silakan pilih file CSV yang ingin diimpor.');
    return res.redirect('/admin/pelanggan');
  }

  try {
    const content = req.file.buffer.toString('utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length <= 1) {
      req.flash('error', 'File CSV kosong atau hanya berisi judul kolom.');
      return res.redirect('/admin/pelanggan');
    }

    // Deteksi pemisah (koma atau titik koma)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') && (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

    // Parser sederhana untuk satu baris CSV dengan handling tanda petik
    const parseCsvLine = (text) => {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
          if (inQuotes && text[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === delimiter && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    };

    // Ambil referensi paket dan kolektor
    const packages = await db.all('SELECT * FROM packages');
    const collectors = await db.all("SELECT * FROM users WHERE role = 'kolektor'");
    
    if (packages.length === 0) {
      req.flash('error', 'Belum ada paket internet di sistem. Buat paket terlebih dahulu sebelum mengimpor pelanggan.');
      return res.redirect('/admin/pelanggan');
    }

    const pkgMapByName = {};
    packages.forEach(p => { pkgMapByName[p.name.toLowerCase()] = p; });
    const defaultPkg = packages[0];

    const colMapByUsername = {};
    const colMapByName = {};
    collectors.forEach(c => {
      colMapByUsername[c.username.toLowerCase()] = c;
      colMapByName[c.name.toLowerCase()] = c;
    });

    // Cari ID terakhir untuk generate CUST-xxx otomatis
    const lastCust = await db.get('SELECT id FROM customers ORDER BY id DESC LIMIT 1');
    let nextId = (lastCust ? lastCust.id : 0) + 1;

    let importedCount = 0;
    let skippedCount = 0;

    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    // Loop data (lewati header baris ke-0)
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 2) continue;

      let code = cols[0] ? cols[0].replace(/['"]/g, '').trim() : '';
      const name = cols[1] ? cols[1].replace(/['"]/g, '').trim() : '';
      const phone = cols[2] ? cols[2].replace(/['"]/g, '').trim() : '';
      const address = cols[3] ? cols[3].replace(/['"]/g, '').trim() : '';
      const pkgName = cols[4] ? cols[4].replace(/['"]/g, '').trim().toLowerCase() : '';
      const colUser = cols[5] ? cols[5].replace(/['"]/g, '').trim().toLowerCase() : '';
      const dueDate = parseInt(cols[6], 10) || 10;
      const ip = cols[7] ? cols[7].replace(/['"]/g, '').trim() : '';
      let status = cols[8] ? cols[8].replace(/['"]/g, '').trim().toLowerCase() : 'aktif';
      if (!['aktif', 'isolir', 'nonaktif'].includes(status)) status = 'aktif';
      const notes = cols[9] ? cols[9].replace(/['"]/g, '').trim() : '';

      if (!name || !phone) {
        skippedCount++;
        continue;
      }

      // Tentukan paket
      let targetPkg = pkgMapByName[pkgName] || defaultPkg;

      // Tentukan kolektor
      let targetColId = null;
      if (colUser) {
        if (colMapByUsername[colUser]) {
          targetColId = colMapByUsername[colUser].id;
        } else if (colMapByName[colUser]) {
          targetColId = colMapByName[colUser].id;
        }
      }

      // Generate kode jika kosong
      if (!code) {
        code = `CUST-${String(nextId).padStart(3, '0')}`;
        nextId++;
      } else {
        // Cek duplikasi kode
        const existingCode = await db.get('SELECT id FROM customers WHERE customer_code = ?', [code]);
        if (existingCode) {
          code = `CUST-${String(nextId).padStart(3, '0')}`;
          nextId++;
        }
      }

      // Insert customer
      const resCust = await db.run(`
        INSERT INTO customers (
          customer_code, name, phone, address, package_id, 
          collector_id, due_date, ip_address, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [code, name, phone, address, targetPkg.id, targetColId, dueDate, ip, status, notes]);

      // Buat tagihan bulan berjalan untuk pelanggan yang baru diimpor jika aktif
      if (status === 'aktif') {
        const invNo = `INV/${curYear}${String(curMonth).padStart(2, '0')}/${String(resCust.lastID).padStart(4, '0')}`;
        await db.run(`
          INSERT OR IGNORE INTO bills (invoice_no, customer_id, period_month, period_year, amount, status)
          VALUES (?, ?, ?, ?, ?, 'belum')
        `, [invNo, resCust.lastID, curMonth, curYear, targetPkg.price]);
      }

      importedCount++;
    }

    if (importedCount > 0) {
      req.flash('success', `Berhasil mengimpor ${importedCount} pelanggan baru!${skippedCount > 0 ? ` (${skippedCount} baris tidak lengkap dilewati)` : ''}`);
    } else {
      req.flash('error', `Tidak ada data yang berhasil diimpor. Pastikan format nama dan nomor telepon terisi.`);
    }

    res.redirect('/admin/pelanggan');
  } catch (err) {
    console.error('Error import CSV:', err);
    req.flash('error', 'Gagal memproses file CSV: ' + err.message);
    res.redirect('/admin/pelanggan');
  }
}

module.exports = {
  index,
  create,
  show,
  update,
  remove,
  exportCsv,
  downloadTemplate,
  importCsv
};
