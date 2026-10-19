const { formatRupiah, formatDate, formatDateTime, getMonthName } = require('./formatter');

/**
 * Normalisasi nomor HP ke format internasional 62xxx
 */
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Buat link WhatsApp langsung
 */
function buildWaUrl(phone, text) {
  const normPhone = normalizePhone(phone);
  if (!normPhone) return '#';
  return `https://wa.me/${normPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Generate pesan pengingat tagihan
 */
function getReminderMessage(customer, bill, settings = {}) {
  const template = settings.wa_reminder_template || 
    'Halo Bpk/Ibu *{nama}*,\n\nKami menginformasikan tagihan internet Wi-Fi ({paket}) untuk periode *{periode}* sebesar *{total}* telah terbit.\nJatuh tempo: tanggal *{jatuh_tempo}*.\n\nMohon lakukan pembayaran sebelum tanggal jatuh tempo ya. Terima kasih! 🙏\n_{perusahaan}_';

  const periodStr = `${getMonthName(bill.period_month)} ${bill.period_year}`;
  const companyName = settings.company_name || 'Layanan Internet WiFi';
  const dueDateStr = customer.due_date ? `${customer.due_date} ${periodStr}` : `10 ${periodStr}`;

  return template
    .replace(/{nama}/g, customer.name || 'Pelanggan')
    .replace(/{paket}/g, customer.package_name || 'Internet')
    .replace(/{periode}/g, periodStr)
    .replace(/{total}/g, formatRupiah(bill.amount))
    .replace(/{jatuh_tempo}/g, dueDateStr)
    .replace(/{perusahaan}/g, companyName)
    .replace(/{no_invoice}/g, bill.invoice_no || '-');
}

/**
 * Generate pesan bukti bayar (kwitansi digital)
 */
function getReceiptMessage(customer, bill, settings = {}, collectorName = 'Admin') {
  const template = settings.wa_receipt_template ||
    'Terima Kasih Bpk/Ibu *{nama}*! 🙏\n\nPembayaran tagihan internet Wi-Fi periode *{periode}* sebesar *{total}* telah kami terima pada *{tgl_bayar}* melalui *{metode}*.\nNo. Kwitansi: *{no_invoice}*\nPetugas: *{petugas}*\n\nSelamat menikmati koneksi internet kami!\n_{perusahaan}_';

  const periodStr = `${getMonthName(bill.period_month)} ${bill.period_year}`;
  const companyName = settings.company_name || 'Layanan Internet WiFi';
  const payDateStr = bill.paid_at ? formatDateTime(bill.paid_at) : formatDate(new Date());
  const methodStr = (bill.payment_method || 'Tunai').toUpperCase();

  return template
    .replace(/{nama}/g, customer.name || 'Pelanggan')
    .replace(/{paket}/g, customer.package_name || 'Internet')
    .replace(/{periode}/g, periodStr)
    .replace(/{total}/g, formatRupiah(bill.amount))
    .replace(/{tgl_bayar}/g, payDateStr)
    .replace(/{metode}/g, methodStr)
    .replace(/{no_invoice}/g, bill.invoice_no || '-')
    .replace(/{petugas}/g, collectorName)
    .replace(/{perusahaan}/g, companyName);
}

module.exports = {
  normalizePhone,
  buildWaUrl,
  getReminderMessage,
  getReceiptMessage
};
