const db = require('../../database/db');
const { getReminderMessage, getReceiptMessage } = require('../utils/waHelper');

/**
 * Ambil konfigurasi Fonnte dari SQLite settings
 */
async function getFonnteConfig() {
  const rows = await db.all(`
    SELECT key, value FROM settings 
    WHERE key IN ('fonnte_enabled', 'fonnte_token', 'fonnte_auto_send')
  `);

  const config = {
    enabled: false,
    token: '',
    autoSend: false
  };

  rows.forEach(r => {
    if (r.key === 'fonnte_enabled') config.enabled = (r.value === '1');
    if (r.key === 'fonnte_token') config.token = (r.value || '').trim();
    if (r.key === 'fonnte_auto_send') config.autoSend = (r.value === '1');
  });

  return config;
}

/**
 * Kirim pesan WhatsApp melalui Fonnte Gateway API
 */
async function sendMessage(targetPhone, message, customToken = null) {
  const config = await getFonnteConfig();
  const token = customToken || config.token;

  if (!token) {
    return {
      success: false,
      message: 'Token Fonnte belum diatur di menu Pengaturan.'
    };
  }

  // Normalisasi nomor target
  let target = targetPhone.replace(/[^0-9]/g, '');
  if (target.startsWith('0')) {
    target = '62' + target.slice(1);
  } else if (target.startsWith('8')) {
    target = '62' + target;
  }

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: target,
        message: message,
        countryCode: '62'
      })
    });

    const data = await response.json();

    if (data.status === true) {
      return {
        success: true,
        message: 'Pesan WhatsApp berhasil dikirim via Fonnte!',
        data: data
      };
    } else {
      return {
        success: false,
        message: data.reason || 'Gagal mengirim pesan via Fonnte.',
        data: data
      };
    }
  } catch (err) {
    console.error('Fonnte API Error:', err.message);
    return {
      success: false,
      message: 'Terjadi kesalahan koneksi ke server Fonnte: ' + err.message
    };
  }
}

/**
 * Kirim notifikasi pengingat tagihan via Fonnte
 */
async function sendBillReminder(customer, bill, settings) {
  const config = await getFonnteConfig();
  if (!config.enabled || !config.token) {
    return { success: false, message: 'Fonnte dinonaktifkan atau token belum diisi.' };
  }

  const msg = getReminderMessage(customer, bill, settings);
  return await sendMessage(customer.phone, msg, config.token);
}

/**
 * Kirim bukti pembayaran / kwitansi digital via Fonnte
 */
async function sendPaymentReceipt(customer, bill, settings, collectorName = 'Admin') {
  const config = await getFonnteConfig();
  if (!config.enabled || !config.token) {
    return { success: false, message: 'Fonnte dinonaktifkan atau token belum diisi.' };
  }

  const msg = getReceiptMessage(customer, bill, settings, collectorName);
  return await sendMessage(customer.phone, msg, config.token);
}

module.exports = {
  getFonnteConfig,
  sendMessage,
  sendBillReminder,
  sendPaymentReceipt
};
