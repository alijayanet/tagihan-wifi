const { RouterOSAPI } = require('node-routeros');
const db = require('../../database/db');

/**
 * Ambil konfigurasi MikroTik dari tabel settings SQLite
 */
async function getMikrotikConfig() {
  const rows = await db.all(`
    SELECT key, value FROM settings 
    WHERE key IN ('mikrotik_enabled', 'mikrotik_host', 'mikrotik_port', 'mikrotik_user', 'mikrotik_pass')
  `);
  
  const config = {
    enabled: false,
    host: '',
    port: 8728,
    user: '',
    pass: ''
  };

  rows.forEach(r => {
    if (r.key === 'mikrotik_enabled') config.enabled = (r.value === '1');
    if (r.key === 'mikrotik_host') config.host = (r.value || '').trim();
    if (r.key === 'mikrotik_port') config.port = parseInt(r.value, 10) || 8728;
    if (r.key === 'mikrotik_user') config.user = (r.value || '').trim();
    if (r.key === 'mikrotik_pass') config.pass = (r.value || '');
  });

  return config;
}

/**
 * Uji koneksi ke API MikroTik
 */
async function testConnection(customConfig = null) {
  const cfg = customConfig || await getMikrotikConfig();

  if (!cfg.host || !cfg.user) {
    return {
      success: false,
      message: 'Host IP dan Username MikroTik wajib diisi!'
    };
  }

  const conn = new RouterOSAPI({
    host: cfg.host,
    user: cfg.user,
    password: cfg.pass,
    port: cfg.port || 8728,
    timeout: 5 // 5 detik timeout
  });

  try {
    await conn.connect();
    
    // Ambil info resource router
    const resources = await conn.write('/system/resource/print');
    const identity = await conn.write('/system/identity/print');
    
    await conn.close();

    const res = resources && resources[0] ? resources[0] : {};
    const id = identity && identity[0] ? identity[0].name : 'MikroTik Router';

    return {
      success: true,
      message: `Berhasil terhubung ke "${id}"!`,
      details: {
        identity: id,
        version: res.version || '-',
        boardName: res['board-name'] || '-',
        cpu: res.cpu || '-',
        cpuLoad: (res['cpu-load'] !== undefined ? res['cpu-load'] + '%' : '-'),
        uptime: res.uptime || '-'
      }
    };
  } catch (err) {
    try { await conn.close(); } catch(e) {}
    console.error('MikroTik Connection Error:', err.message);
    return {
      success: false,
      message: `Gagal terhubung ke MikroTik: ${err.message}`
    };
  }
}

/**
 * Sinkronisasi status isolir pelanggan ke MikroTik (OPSIONAL)
 * Jika MikroTik non-aktif atau tidak terjangkau, proses lokal tetap berjalan normal 100%.
 */
async function syncCustomerStatus(customer, status) {
  const cfg = await getMikrotikConfig();
  
  // Jika fitur MikroTik dinonaktifkan di pengaturan, lewati saja
  if (!cfg.enabled || !cfg.host || !cfg.user) {
    return { synced: false, reason: 'MikroTik dinonaktifkan di pengaturan' };
  }

  const conn = new RouterOSAPI({
    host: cfg.host,
    user: cfg.user,
    password: cfg.pass,
    port: cfg.port || 8728,
    timeout: 4
  });

  try {
    await conn.connect();

    // 1. Cek PPP Secret jika ada username/kode pelanggan
    const custIdentifier = customer.customer_code;
    const secrets = await conn.write('/ppp/secret/print', [`?name=${custIdentifier}`]);

    if (secrets && secrets.length > 0) {
      const secretId = secrets[0]['.id'];
      if (status === 'isolir') {
        // Nonaktifkan secret atau ganti profile isolir
        await conn.write('/ppp/secret/set', [`=.id=${secretId}`, '=disabled=yes']);
      } else if (status === 'aktif') {
        await conn.write('/ppp/secret/set', [`=.id=${secretId}`, '=disabled=no']);
      }
    }

    // 2. Jika pelanggan memiliki IP Address, sinkronkan ke Firewall Address List "ISOLIR"
    if (customer.ip_address) {
      const addressLists = await conn.write('/ip/firewall/address-list/print', [
        `?address=${customer.ip_address}`,
        '?list=ISOLIR'
      ]);

      if (status === 'isolir') {
        if (!addressLists || addressLists.length === 0) {
          await conn.write('/ip/firewall/address-list/add', [
            '=list=ISOLIR',
            `=address=${customer.ip_address}`,
            `=comment=${customer.name} - ${customer.customer_code}`
          ]);
        }
      } else if (status === 'aktif') {
        if (addressLists && addressLists.length > 0) {
          for (const item of addressLists) {
            await conn.write('/ip/firewall/address-list/remove', [`=.id=${item['.id']}`]);
          }
        }
      }
    }

    await conn.close();
    return { synced: true };
  } catch (err) {
    try { await conn.close(); } catch(e) {}
    console.warn(`[MikroTik Sync Warning]: Gagal sinkronisasi pelanggan ${customer.name} (${err.message}) - Tagihan tetap tersimpan lokal.`);
    return { synced: false, error: err.message };
  }
}

module.exports = {
  getMikrotikConfig,
  testConnection,
  syncCustomerStatus
};
