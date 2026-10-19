function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error', 'Silakan login sebagai Admin terlebih dahulu.');
  res.redirect('/admin/login');
}

function requireCollector(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'kolektor') {
    return next();
  }
  req.flash('error', 'Silakan login sebagai Kolektor terlebih dahulu.');
  res.redirect('/kolektor/login');
}

function redirectIfAuth(req, res, next) {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    if (req.session.user.role === 'kolektor') {
      return res.redirect('/kolektor/dashboard');
    }
  }
  next();
}

module.exports = {
  requireAdmin,
  requireCollector,
  redirectIfAuth
};
