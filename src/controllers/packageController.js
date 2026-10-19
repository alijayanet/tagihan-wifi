const db = require('../../database/db');
const { formatRupiah, formatDate } = require('../utils/formatter');

async function index(req, res) {
  try {
    const packages = await db.all(`
      SELECT 
        p.*,
        COUNT(c.id) as customer_count,
        SUM(CASE WHEN c.status = 'aktif' THEN 1 ELSE 0 END) as active_customer_count
      FROM packages p
      LEFT JOIN customers c ON c.package_id = p.id
      GROUP BY p.id
      ORDER BY p.price ASC
    `);

    res.render('admin/paket/index', {
      title: 'Manajemen Paket Internet',
      activePage: 'paket',
      packages,
      formatRupiah,
      formatDate,
      user: req.session.user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error('Error package index:', err);
    req.flash('error', 'Gagal memuat daftar paket.');
    res.redirect('/admin/dashboard');
  }
}

async function create(req, res) {
  const { name, speed, price, description } = req.body;

  if (!name || !speed || !price) {
    req.flash('error', 'Nama paket, kecepatan, dan harga wajib diisi!');
    return res.redirect('/admin/paket');
  }

  try {
    const numericPrice = parseInt(price.toString().replace(/[^0-9]/g, ''), 10);
    await db.run(
      'INSERT INTO packages (name, speed, price, description) VALUES (?, ?, ?, ?)',
      [name.trim(), speed.trim(), numericPrice, description ? description.trim() : '']
    );

    req.flash('success', `Paket "${name}" berhasil ditambahkan.`);
    res.redirect('/admin/paket');
  } catch (err) {
    console.error('Error create package:', err);
    req.flash('error', 'Gagal menambahkan paket internet.');
    res.redirect('/admin/paket');
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { name, speed, price, description, is_active } = req.body;

  try {
    const numericPrice = parseInt(price.toString().replace(/[^0-9]/g, ''), 10);
    await db.run(
      `UPDATE packages 
       SET name = ?, speed = ?, price = ?, description = ?, is_active = ?
       WHERE id = ?`,
      [name.trim(), speed.trim(), numericPrice, description ? description.trim() : '', is_active ? 1 : 0, id]
    );

    req.flash('success', `Paket "${name}" berhasil diperbarui.`);
    res.redirect('/admin/paket');
  } catch (err) {
    console.error('Error update package:', err);
    req.flash('error', 'Gagal memperbarui paket internet.');
    res.redirect('/admin/paket');
  }
}

async function remove(req, res) {
  const { id } = req.params;

  try {
    const usage = await db.get('SELECT COUNT(*) as cnt FROM customers WHERE package_id = ?', [id]);
    if (usage && usage.cnt > 0) {
      req.flash('error', `Tidak dapat menghapus paket ini karena sedang digunakan oleh ${usage.cnt} pelanggan.`);
      return res.redirect('/admin/paket');
    }

    await db.run('DELETE FROM packages WHERE id = ?', [id]);
    req.flash('success', 'Paket internet berhasil dihapus.');
    res.redirect('/admin/paket');
  } catch (err) {
    console.error('Error delete package:', err);
    req.flash('error', 'Gagal menghapus paket.');
    res.redirect('/admin/paket');
  }
}

module.exports = {
  index,
  create,
  update,
  remove
};
