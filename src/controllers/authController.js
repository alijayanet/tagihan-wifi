const bcrypt = require('bcryptjs');
const db = require('../../database/db');

async function showAdminLogin(req, res) {
  const settings = await getSettings();
  res.render('auth/admin-login', {
    title: 'Login Admin - Sistem Tagihan WiFi',
    settings,
    error: req.flash('error'),
    success: req.flash('success')
  });
}

async function postAdminLogin(req, res) {
  const { username, password } = req.body;

  try {
    const user = await db.get(
      "SELECT * FROM users WHERE username = ? AND role = 'admin' AND is_active = 1",
      [username.trim()]
    );

    if (!user || !bcrypt.compareSync(password, user.password)) {
      req.flash('error', 'Username atau password Admin salah!');
      return res.redirect('/admin/login');
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      phone: user.phone
    };

    req.flash('success', `Selamat datang kembali, ${user.name}!`);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Error admin login:', err);
    req.flash('error', 'Terjadi kesalahan sistem.');
    res.redirect('/admin/login');
  }
}

async function showCollectorLogin(req, res) {
  const settings = await getSettings();
  res.render('auth/kolektor-login', {
    title: 'Portal Petugas Kolektor - Sistem Tagihan WiFi',
    settings,
    error: req.flash('error'),
    success: req.flash('success')
  });
}

async function postCollectorLogin(req, res) {
  const { username, password } = req.body;

  try {
    const user = await db.get(
      "SELECT * FROM users WHERE username = ? AND role = 'kolektor' AND is_active = 1",
      [username.trim()]
    );

    if (!user || !bcrypt.compareSync(password, user.password)) {
      req.flash('error', 'Username atau password Kolektor salah!');
      return res.redirect('/kolektor/login');
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      phone: user.phone,
      area: user.area
    };

    req.flash('success', `Halo ${user.name}, siap bertugas hari ini!`);
    res.redirect('/kolektor/dashboard');
  } catch (err) {
    console.error('Error collector login:', err);
    req.flash('error', 'Terjadi kesalahan sistem.');
    res.redirect('/kolektor/login');
  }
}

function logout(req, res) {
  const role = req.session?.user?.role;
  req.session.destroy(() => {
    if (role === 'kolektor') {
      res.redirect('/kolektor/login');
    } else {
      res.redirect('/admin/login');
    }
  });
}

async function getSettings() {
  const rows = await db.all('SELECT key, value FROM settings');
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return settings;
}

module.exports = {
  showAdminLogin,
  postAdminLogin,
  showCollectorLogin,
  postCollectorLogin,
  logout
};
