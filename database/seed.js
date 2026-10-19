const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('🌱 Memulai proses seeding data awal...');

  try {
    // 1. Inisialisasi Pengaturan Default
    const defaultSettings = [
      ['company_name', 'NET NUSANTARA RT/RW NET'],
      ['company_tagline', 'Koneksi Cepat, Stabil & Terpercaya'],
      ['company_phone', '081234567890'],
      ['company_address', 'Jl. Merdeka No. 12, RT 03/RW 04, Kelurahan Sukamaju'],
      ['default_due_date', '10'],
      ['receipt_footer', 'Terima kasih telah berlangganan layanan internet kami.\nSimpan struk ini sebagai bukti pembayaran yang sah.'],
      ['wa_reminder_template', 'Halo Bpk/Ibu *{nama}*,\n\nKami menginformasikan tagihan internet Wi-Fi ({paket}) untuk periode *{periode}* sebesar *{total}* telah terbit.\nJatuh tempo: tanggal *{jatuh_tempo}*.\n\nMohon lakukan pembayaran sebelum tanggal jatuh tempo ya. Terima kasih! 🙏\n_{perusahaan}_'],
      ['wa_receipt_template', 'Terima Kasih Bpk/Ibu *{nama}*! 🙏\n\nPembayaran tagihan internet Wi-Fi periode *{periode}* sebesar *{total}* telah kami terima pada *{tgl_bayar}* melalui *{metode}*.\nNo. Kwitansi: *{no_invoice}*\nPetugas: *{petugas}*\n\nSelamat menikmati koneksi internet kami!\n_{perusahaan}_']
    ];

    for (const [key, val] of defaultSettings) {
      await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, val]);
    }
    console.log('✅ Pengaturan default berhasil disiapkan.');

    // 2. Inisialisasi Akun Admin & Kolektor
    const hashPassword = (plain) => bcrypt.hashSync(plain, 10);

    const adminCheck = await db.get("SELECT id FROM users WHERE username = 'admin'");
    if (!adminCheck) {
      await db.run(
        `INSERT INTO users (name, username, password, role, phone, area) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['Super Administrator', 'admin', hashPassword('admin123'), 'admin', '081234567890', 'Pusat']
      );
      console.log('✅ Akun Admin dibuat (username: admin, pass: admin123)');
    }

    const kolektorCheck = await db.get("SELECT id FROM users WHERE username = 'kolektor1'");
    let k1Id, k2Id;
    if (!kolektorCheck) {
      const k1 = await db.run(
        `INSERT INTO users (name, username, password, role, phone, area) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['Budi Santoso', 'kolektor1', hashPassword('kolektor123'), 'kolektor', '081987654321', 'Wilayah RT 01 - 03']
      );
      k1Id = k1.lastID;

      const k2 = await db.run(
        `INSERT INTO users (name, username, password, role, phone, area) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['Siti Aminah', 'kolektor2', hashPassword('kolektor123'), 'kolektor', '081334455667', 'Wilayah RT 04 - 06']
      );
      k2Id = k2.lastID;
      console.log('✅ Akun Kolektor dibuat (kolektor1 & kolektor2, pass: kolektor123)');
    } else {
      k1Id = kolektorCheck.id;
      const k2 = await db.get("SELECT id FROM users WHERE username = 'kolektor2'");
      k2Id = k2 ? k2.id : k1Id;
    }

    // 3. Inisialisasi Paket Internet
    const packagesCount = await db.get('SELECT COUNT(*) as cnt FROM packages');
    let pkg10, pkg20, pkg30, pkg50;
    if (packagesCount.cnt === 0) {
      const p1 = await db.run('INSERT INTO packages (name, speed, price, description) VALUES (?, ?, ?, ?)',
        ['Paket Hemat', '10 Mbps', 100000, 'Cocok untuk browsing dan media sosial 1-3 perangkat']);
      pkg10 = p1.lastID;

      const p2 = await db.run('INSERT INTO packages (name, speed, price, description) VALUES (?, ?, ?, ?)',
        ['Paket Keluarga', '20 Mbps', 150000, 'Streaming HD lancar untuk keluarga 3-5 perangkat']);
      pkg20 = p2.lastID;

      const p3 = await db.run('INSERT INTO packages (name, speed, price, description) VALUES (?, ?, ?, ?)',
        ['Paket Bisnis', '30 Mbps', 200000, 'Kebutuhan WFH, Zoom meeting dan toko kelontong']);
      pkg30 = p3.lastID;

      const p4 = await db.run('INSERT INTO packages (name, speed, price, description) VALUES (?, ?, ?, ?)',
        ['Paket Gamer/Pro', '50 Mbps', 300000, 'Prioritas bandwidth rendah latency untuk game & kantor']);
      pkg50 = p4.lastID;
      console.log('✅ Data paket internet berhasil ditambahkan.');
    } else {
      const p = await db.all('SELECT id FROM packages LIMIT 4');
      pkg10 = p[0]?.id || 1;
      pkg20 = p[1]?.id || pkg10;
      pkg30 = p[2]?.id || pkg10;
      pkg50 = p[3]?.id || pkg10;
    }

    // 4. Inisialisasi Contoh Pelanggan
    const customerCount = await db.get('SELECT COUNT(*) as cnt FROM customers');
    if (customerCount.cnt === 0) {
      const sampleCustomers = [
        ['CUST-001', 'Pak Joko Widodo', '081234567891', 'Jl. Merpati No. 10 RT 01', pkg20, k1Id, 10, '192.168.1.101', 'aktif', 'Dekat pos ronda'],
        ['CUST-002', 'Ibu Rina Marlina', '081234567892', 'Jl. Mawar No. 04 RT 02', pkg10, k1Id, 10, '192.168.1.102', 'aktif', 'Rumah pagar hijau'],
        ['CUST-003', 'Mas Dani Kurniawan', '081234567893', 'Jl. Kenanga No. 15 RT 04', pkg30, k2Id, 15, '192.168.1.103', 'aktif', 'Bengkel motor'],
        ['CUST-004', 'Pak Hendra Gunawan', '081234567894', 'Jl. Flamboyan No. 22 RT 05', pkg10, k2Id, 10, '192.168.1.104', 'aktif', 'Warung sembako'],
        ['CUST-005', 'Ibu Dewi Lestari', '081234567895', 'Jl. Dahlia No. 08 RT 03', pkg20, k1Id, 10, '192.168.1.105', 'aktif', 'Kontrakan pintu 2'],
        ['CUST-006', 'Budi Prasetyo', '081234567896', 'Jl. Melati No. 01 RT 06', pkg50, k2Id, 10, '192.168.1.106', 'aktif', 'Warnet kecil'],
        ['CUST-007', 'Slamet Riyadi', '081234567897', 'Jl. Anggrek No. 18 RT 01', pkg10, k1Id, 10, '192.168.1.107', 'isolir', 'Kabel sempat kendur']
      ];

      for (const c of sampleCustomers) {
        await db.run(
          `INSERT INTO customers (customer_code, name, phone, address, package_id, collector_id, due_date, ip_address, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          c
        );
      }
      console.log('✅ 7 Pelanggan sampel berhasil ditambahkan.');
    }
    // Catatan: Tidak ada data transaksi/tagihan dummy yang dibuat agar data keuangan bersih saat instalasi awal.
    // Tagihan pelanggan riil dapat digenerate otomatis tiap tanggal 1 atau via tombol Generate di menu Tagihan.

    console.log('🎉 Seeding database selesai! Siap digunakan dengan data transaksi bersih.');
  } catch (err) {
    console.error('❌ Gagal menjalankan seeding:', err);
  }
}

if (require.main === module) {
  // Tunggu sebentar memastikan inisialisasi schema selesai
  setTimeout(async () => {
    await seed();
    process.exit(0);
  }, 1000);
}

module.exports = seed;
