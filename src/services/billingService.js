const db = require('../../database/db');

/**
 * Service untuk generate tagihan otomatis setiap bulan
 * Berjalan otomatis pada awal bulan, saat server startup, atau terjadwal.
 */
async function autoGenerateBills(targetMonth = null, targetYear = null) {
  const now = new Date();
  const month = targetMonth || (now.getMonth() + 1);
  const year = targetYear || now.getFullYear();

  try {
    // 1. Ambil seluruh pelanggan aktif
    const activeCustomers = await db.all(`
      SELECT c.id, c.package_id, p.price 
      FROM customers c
      JOIN packages p ON c.package_id = p.id
      WHERE c.status = 'aktif'
    `);

    if (!activeCustomers || activeCustomers.length === 0) {
      return { success: true, count: 0, message: 'Tidak ada pelanggan aktif' };
    }

    // 2. Ambil ID pelanggan yang sudah memiliki tagihan di bulan & tahun ini
    const existing = await db.all(
      'SELECT customer_id FROM bills WHERE period_month = ? AND period_year = ?',
      [month, year]
    );
    const existingSet = new Set(existing.map(e => e.customer_id));

    // 3. Cari counter nomor invoice terakhir untuk bulan ini
    let counter = existing.length + 1;
    let generatedCount = 0;

    for (const cust of activeCustomers) {
      if (!existingSet.has(cust.id)) {
        const invNo = `INV/${year}${String(month).padStart(2, '0')}/${String(counter).padStart(4, '0')}`;
        await db.run(`
          INSERT INTO bills (invoice_no, customer_id, period_month, period_year, amount, status)
          VALUES (?, ?, ?, ?, ?, 'belum')
        `, [invNo, cust.id, month, year, cust.price]);

        counter++;
        generatedCount++;
      }
    }

    if (generatedCount > 0) {
      console.log(`⚡ [AutoBilling] Berhasil membuat ${generatedCount} tagihan otomatis baru untuk periode ${month}/${year}`);
    }

    return {
      success: true,
      count: generatedCount,
      period: `${month}/${year}`,
      totalActive: activeCustomers.length
    };
  } catch (err) {
    console.error('❌ [AutoBilling Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Memeriksa apakah perlu generate tagihan otomatis (hanya pada tanggal 1 setiap bulan)
 */
async function checkAndAutoGenerate() {
  const now = new Date();
  if (now.getDate() === 1) {
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const periodKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    try {
      const row = await db.get("SELECT value FROM settings WHERE key = 'last_autobill_period'");
      if (!row || row.value !== periodKey) {
        console.log(`⏰ [AutoBilling] Tanggal 1 terdeteksi, generate tagihan otomatis periode ${periodKey}...`);
        await autoGenerateBills(curMonth, curYear);
        await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_autobill_period', ?)", [periodKey]);
      }
    } catch (err) {
      console.error('❌ Error checking autobill setting:', err.message);
    }
  }
}

/**
 * Inisialisasi scheduler otomatis internal Node.js
 * Memeriksa dan memastikan tagihan terbit otomatis tiap tanggal 1
 */
function startBillingScheduler() {
  // 1. Periksa saat server menyala
  checkAndAutoGenerate().catch(console.error);

  // 2. Jalankan pemeriksaan berkala setiap 1 jam
  const INTERVAL_MS = 60 * 60 * 1000;
  setInterval(() => {
    checkAndAutoGenerate().catch(console.error);
  }, INTERVAL_MS);

  console.log('⏰ Scheduler Tagihan Otomatis Bulanan aktif (Otomatis generate tiap tanggal 1)');
}

module.exports = {
  autoGenerateBills,
  startBillingScheduler
};
