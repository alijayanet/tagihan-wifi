const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuth } = require('../middlewares/authMiddleware');

// Halaman utama: redirect otomatis sesuai session atau ke login admin
router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    if (req.session.user.role === 'kolektor') {
      return res.redirect('/kolektor/dashboard');
    }
  }
  res.redirect('/admin/login');
});

// Admin Login
router.get('/admin/login', redirectIfAuth, authController.showAdminLogin);
router.post('/admin/login', authController.postAdminLogin);

// Kolektor Login (Terpisah)
router.get('/kolektor/login', redirectIfAuth, authController.showCollectorLogin);
router.post('/kolektor/login', authController.postCollectorLogin);

// Logout
router.all('/logout', authController.logout);

module.exports = router;
