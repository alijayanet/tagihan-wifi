const bcrypt = require('bcryptjs');
const db = require('../../database/db');

async function index(req, res) {
  try {
    const rows = await db.all('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });

    res.render('admin/pengaturan/index', {
      title: 'Pengaturan Sistem',
      activePage: 'pengaturan',
      settings,
      user: req.session.user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Error setting index:', err);
    req.flash('error', 'Gagal memuat pengaturan.');
    res.redirect('/admin/dashboard');
  }
}

async function update(req, res) {
  try {
    const {
      company_name,
      company_tagline,
      company_phone,
      company_address,
      default_due_date,
      receipt_footer,
      wa_reminder_template,
      wa_receipt_template,
      mikrotik_enabled,
      mikrotik_host,
      mikrotik_port,
      mikrotik_user,
      mikrotik_pass,
      fonnte_enabled,
      fonnte_token,
      fonnte_auto_send,
      current_password,
      new_password
    } = req.body;

    // 1. Simpan pengaturan umum, MikroTik & Fonnte WhatsApp (opsional)
    const toUpdate = [
      ['company_name', company_name ? company_name.trim() : ''],
      ['company_tagline', company_tagline ? company_tagline.trim() : ''],
      ['company_phone', company_phone ? company_phone.trim() : ''],
      ['company_address', company_address ? company_address.trim() : ''],
      ['default_due_date', default_due_date ? default_due_date.trim() : '10'],
      ['receipt_footer', receipt_footer ? receipt_footer.trim() : ''],
      ['wa_reminder_template', wa_reminder_template ? wa_reminder_template.trim() : ''],
      ['wa_receipt_template', wa_receipt_template ? wa_receipt_template.trim() : ''],
      ['mikrotik_enabled', mikrotik_enabled === '1' ? '1' : '0'],
      ['mikrotik_host', mikrotik_host ? mikrotik_host.trim() : ''],
      ['mikrotik_port', mikrotik_port ? mikrotik_port.trim() : '8728'],
      ['mikrotik_user', mikrotik_user ? mikrotik_user.trim() : ''],
      ['mikrotik_pass', mikrotik_pass ? mikrotik_pass : ''],
      ['fonnte_enabled', fonnte_enabled === '1' ? '1' : '0'],
      ['fonnte_token', fonnte_token ? fonnte_token.trim() : ''],
      ['fonnte_auto_send', fonnte_auto_send === '1' ? '1' : '0']
    ];

    for (const [key, val] of toUpdate) {
      await db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, val]
      );
    }

    // 2. Ganti password admin jika diisi
    if (new_password && new_password.trim().length > 0) {
      if (!current_password) {
        req.flash('error', 'Password lama harus diisi untuk mengganti password baru!');
        return res.redirect('/admin/pengaturan');
      }

      const admin = await db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
      if (!admin || !bcrypt.compareSync(current_password, admin.password)) {
        req.flash('error', 'Password lama tidak sesuai!');
        return res.redirect('/admin/pengaturan');
      }

      const hashed = bcrypt.hashSync(new_password.trim(), 10);
      await db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, req.session.user.id]);
      req.flash('success', 'Pengaturan dan Password Admin berhasil diperbarui.');
      return res.redirect('/admin/pengaturan');
    }

    req.flash('success', 'Pengaturan sistem berhasil disimpan.');
    res.redirect('/admin/pengaturan');
  } catch (err) {
    console.error('Error update settings:', err);
    req.flash('error', 'Gagal menyimpan pengaturan: ' + err.message);
    res.redirect('/admin/pengaturan');
  }
}

async function testMikrotik(req, res) {
  const { host, port, user, pass } = req.body;
  const { testConnection } = require('../services/mikrotikService');

  try {
    const result = await testConnection({
      host: host ? host.trim() : '',
      port: parseInt(port, 10) || 8728,
      user: user ? user.trim() : '',
      pass: pass || ''
    });

    res.json(result);
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
}

async function testFonnte(req, res) {
  const { token, phone } = req.body;
  const { sendMessage } = require('../services/fonnteService');

  if (!token || !phone) {
    return res.json({ success: false, message: 'Token Fonnte dan Nomor HP Tujuan harus diisi!' });
  }

  const testMsg = `*TES WHATSAPP GATEWAY FONNTE*\n\nHalo! Ini adalah pesan pengujian koneksi dari Sistem Tagihan WiFi.\nGateway WhatsApp Fonnte Anda berhasil terhubung dan siap digunakan! 🚀`;
  const result = await sendMessage(phone, testMsg, token);
  res.json(result);
}

module.exports = {
  index,
  update,
  testMikrotik,
  testFonnte
};
