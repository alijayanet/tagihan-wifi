# 📡 ALIJAYA-NET - Sistem Manajemen Tagihan WiFi (Standalone)

[![GitHub Repository](https://img.shields.io/badge/GitHub-alijayanet%2Ftagihan--wifi-blue?logo=github)](https://github.com/alijayanet/tagihan-wifi)
[![Node.js Version](https://img.shields.io/badge/Node.js-18%20%7C%2020%20LTS-green?logo=node.js)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite%20WAL-yellow?logo=sqlite)](https://www.sqlite.org/)
[![Platform](https://img.shields.io/badge/Platform-Armbian%20%7C%20Linux%20SBC%20%7C%20PC-orange?logo=linux)](https://www.armbian.com/)
[![License](https://img.shields.io/badge/License-ISC-purple)](#)
[![Developer](https://img.shields.io/badge/Developer-ALIJAYA--NET-00bcd4?logo=whatsapp)](https://wa.me/6281947215703)

Aplikasi manajemen operasional dan penagihan internet Wi-Fi (**RT/RW Net / ISP Mandiri**) yang modern, ringan, dan cepat. Dirancang secara optimal untuk dapat berjalan lancar pada perangkat hemat daya **Armbian / Linux SBC** (seperti STB Android Fiberhome HG680P / ZTE B860H, Raspberry Pi, Orange Pi) maupun komputer server/PC biasa tanpa memerlukan ketergantungan wajib pada router MikroTik.

Sistem menggunakan mesin database **SQLite dengan mode WAL (Write-Ahead Logging)** yang tangguh, hemat memori RAM (~40-60 MB), bebas maintenance engine server SQL yang berat, serta sangat aman untuk meminimalkan beban tulis (*write-wear*) pada penyimpanan flash memory (SD Card / eMMC).

---

## 📞 Kontak Pengembang & Layanan Support

Aplikasi ini dikembangkan dan dipelihara oleh **ALIJAYA-NET**:
* **Developer / Pengelola**: ALIJAYA-NET
* **WhatsApp / Telepon**: [**081947215703**](https://wa.me/6281947215703) (`+62 819-4721-5703`)
* **Repository Resmi**: [https://github.com/alijayanet/tagihan-wifi](https://github.com/alijayanet/tagihan-wifi)
* **Kebutuhan**: Siap melayani tanya jawab, panduan instalasi di perangkat STB Armbian, penambahan fitur custom, dan konsultasi jaringan RT/RW Net.

---

## 🌟 Keunggulan & Fitur Utama

### 1. 📊 Dashboard Admin Modern & Interaktif
* **Ringkasan Finansial Real-time**: Target omzet bulanan, total penerimaan kas (Lunas), dan sisa piutang tagihan tertunda (Belum Lunas).
* **Grafik Riwayat Keuangan**: Visualisasi grafik batang trend pendapatan 6 bulan terakhir.
* **Performa Kolektor Lapangan**: Menampilkan ranking dan capaian nominal tagihan masing-masing petugas lapangan.
* **Indikator SBC & Database**: Pemantau status sistem server Armbian, status SQLite WAL mode, dan status koneksi API eksternal.

### 2. 👥 Pemisahan Portal Login Admin & Kolektor
* **Portal Administrator** (`/admin/login`): Akses penuh ke seluruh konfigurasi master data paket, pelanggan, kolektor, pembukuan kas, laporan keuangan, dan pengaturan integrasi.
* **Portal Kolektor Lapangan** (`/kolektor/login`): Antarmuka ramah smartphone (*mobile-first*) yang simpel, cepat, dan ringan untuk petugas penagih di lapangan. Login terisolasi tanpa tautan yang mengarah ke portal admin.

### 3. 📂 Manajemen Master Data Lengkap
* **Paket Internet**: Atur nama paket, batas bandwidth, tarif bulanan, dan ringkasan jumlah pelanggan aktif per paket.
* **Pelanggan**: Pencatatan kode pelanggan unik otomatis, nomor WhatsApp, alamat rumah, paket, petugas kolektor penanggung jawab, tanggal jatuh tempo, IP address / keterangan ONT, serta status isolir/aktif.
* **Kolektor Lapangan**: Daftarkan akun petugas penagih, nomor HP, wilayah/area tugas (misal: RT 01-03), serta pantau uang setoran.

### 4. 📑 Export & Import Data Pelanggan (Format CSV / Excel)
* **1-Klik Export CSV**: Unduh seluruh database pelanggan ke format spreadsheet CSV yang rapi dan siap dibuka di Microsoft Excel / Google Sheets.
* **Import Massal**: Tambahkan puluhan/ratusan pelanggan baru sekaligus hanya dengan mengunggah file CSV.
* **Template CSV Resmi**: Tersedia tombol download template CSV contoh yang sudah dilengkapi instruksi pengisian.

### 5. 💰 Tagihan, Kas Masuk & Struk Thermal
* **Filter Status**: Filter cepat tagihan berstatus **LUNAS** atau **BELUM LUNAS**, serta filter per bulan, tahun, kolektor, dan pencarian instan.
* **Cetak Struk Thermal (58mm / 80mm)**: Format struk kasir profesional untuk printer Bluetooth portable maupun printer USB kasir desktop.
* **Kwitansi Digital**: Bukti bayar sah yang dapat dikirimkan ke pelanggan via WhatsApp.
* **Kontrol Penuh Admin**: Tersedia fitur **Batalkan Pembayaran** (mengembalikan tagihan ke status belum lunas) dan tombol **Hapus Tagihan** jika terjadi kesalahan input.
* **Database Bersih (Zero-Dummy Transaction)**: Seeding instalasi hanya menyiapkan akun dan paket dasar, tanpa tagihan palsu yang mengotori pembukuan riil Anda.

### 6. 📈 Laporan Transaksi Kolektor & Cetak Rentang Tanggal (Date-to-Date)
* **Filter Tanggal Fleksibel**: Pilih rentang waktu dari tanggal tertentu sampai tanggal tertentu (harian, mingguan, bulanan, atau custom).
* **Filter Multi-Kriteria**: Saring laporan berdasarkan nama kolektor tertentu dan metode pembayaran (Tunai / Transfer Bank).
* **Cetak Dokumen Resmi (Format A4 / Cetak PDF)**: Lembar laporan formal siap cetak lengkap dengan Kop Surat usaha Anda, ringkasan transaksi, tabel rincian pembayaran, serta kolom tanda tangan Admin dan Kolektor.

### 7. ⏰ Otomatisasi Tagihan Bulanan (Auto-Billing Scheduler)
* Tagihan pelanggan aktif otomatis digenerate tepat setiap tanggal 1 setiap bulannya.
* Disertai tombol manual **"⚡ Generate Tagihan Bulan Ini"** di menu admin.
* Tersedia perintah CLI standalone: `npm run autobill` untuk dijalankan melalui cron job Armbian/Linux.

### 8. 💬 Integrasi WhatsApp Otomatis (Fonnte Gateway & Manual)
* **Fonnte API Gateway** (`fonnte.com`): Kirim tagihan dan kwitansi otomatis langsung dari server ke nomor WhatsApp pelanggan di latar belakang (*background*).
* **Fitur Blast WA Massal**: Kirim pengingat tagihan ke seluruh pelanggan yang belum lunas dalam 1 kali klik.
* **WhatsApp Manual (`wa.me`)**: Tetap tersedia tautan langsung kirim WhatsApp Web / aplikasi jika gateway tidak diaktifkan.

### 9. 🌐 Integrasi MikroTik RouterOS API (100% Opsional)
* Fitur opsional untuk sinkronisasi status isolir pelanggan ke router MikroTik (disable secret PPPoE / Address List `ISOLIR`).
* Dilengkapi tombol pengujian koneksi (*Test Connection*) di menu Pengaturan.
* **Graceful Fallback**: Jika router dimatikan, tidak disetting, atau kabel LAN lepas, aplikasi billing tetap berjalan 100% normal tanpa error/crash.

---

## 📂 Struktur File & Direktori Project

```text
tagihan-wifi/
├── database/
│   ├── schema.sql            # DDL Skema tabel SQLite & indeks teroptimasi
│   ├── db.js                 # Konektor SQLite WAL Mode & async/await helper
│   ├── seed.js               # Inisialisasi akun bawaan, paket dasar & pengaturan bersih
│   └── tagihan_wifi.sqlite   # File database utama SQLite (auto-created)
├── src/
│   ├── controllers/
│   │   ├── authController.js             # Autentikasi terpisah Admin & Kolektor
│   │   ├── dashboardController.js        # Statistik, grafik omzet & status sistem
│   │   ├── packageController.js          # CRUD Paket internet
│   │   ├── customerController.js         # CRUD Pelanggan, status, export/import CSV
│   │   ├── collectorController.js        # Manajemen & evaluasi kolektor
│   │   ├── collectorPortalController.js  # Portal mobile kolektor penagihan lapangan
│   │   ├── billController.js             # Billing, kas, struk thermal, hapus tagihan
│   │   ├── reportController.js           # Laporan transaksi kolektor & cetak A4 date-to-date
│   │   └── settingController.js          # Pengaturan usaha, MikroTik & WA Fonnte
│   ├── middlewares/
│   │   └── authMiddleware.js             # Proteksi session role Admin & Kolektor
│   ├── routes/
│   │   ├── authRoutes.js                 # Route login & logout
│   │   ├── adminRoutes.js                # Route panel administrator lengkap
│   │   └── collectorRoutes.js            # Route mobile portal kolektor lapangan
│   ├── services/
│   │   ├── billingService.js             # Generator otomatis tagihan & cron scheduler
│   │   ├── fonnteService.js              # Integrasi WhatsApp Gateway Fonnte
│   │   └── mikrotikService.js            # API RouterOS MikroTik (opsional)
│   ├── utils/
│   │   ├── formatter.js                  # Helper format Rupiah & tanggal Indonesia
│   │   └── waHelper.js                   # Template teks sopan WhatsApp
│   └── cron/
│       └── autoBill.js                   # Skrip standalone untuk cron job Armbian
├── views/
│   ├── partials/                         # Layout reusable (head, navbar, sidebar, alerts, footer, 404)
│   ├── auth/                             # admin-login.ejs & kolektor-login.ejs
│   ├── admin/                            # dashboard, paket, pelanggan, kolektor, tagihan, struk
│   │   └── laporan/                      # kolektor.ejs (filter rentang tanggal) & cetak.ejs (A4 print)
│   └── kolektor/                         # dashboard.ejs (mobile-first) & riwayat.ejs
├── public/
│   ├── css/style.css                     # Custom stylesheet & print media styling
│   └── js/app.js                         # Script interaksi UI & auto-dismiss alert
├── .env                                  # Konfigurasi environment (PORT, SESSION_SECRET)
├── ecosystem.config.js                   # Konfigurasi PM2 auto-start di Armbian/Linux
├── server.js                             # Entry point aplikasi Express
└── package.json                          # Metadata dependensi & script project
```

---

## 🔑 Akun Bawaan (Default Login)

Setelah proses instalasi dan seeding, gunakan akun bawaan berikut:

| Role / Akses | URL Akses | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `http://<IP-SERVER>:3000/admin/login` | `admin` | `admin123` | Akses penuh seluruh sistem, tagihan, dan laporan |
| **Kolektor 1** | `http://<IP-SERVER>:3000/kolektor/login` | `kolektor1` | `kolektor123` | Petugas Lapangan Wilayah RT 01 - 03 (Budi Santoso) |
| **Kolektor 2** | `http://<IP-SERVER>:3000/kolektor/login` | `kolektor2` | `kolektor123` | Petugas Lapangan Wilayah RT 04 - 06 (Siti Aminah) |

> [!TIP]
> Segera ganti password default admin di menu **Pengaturan** dan password kolektor di menu **Kolektor** setelah berhasil login untuk keamanan jaringan Anda.

---

## 🚀 Panduan Instalasi Lengkap

### 1. Kebutuhan Sistem
* **Perangkat**: STB Armbian (B860H, HG680P), Orange Pi, Raspberry Pi, VPS Linux, atau Komputer Windows/Linux.
* **Sistem Operasi**: Armbian, Ubuntu, Debian, CentOS, atau Windows 10/11.
* **Node.js**: Versi 18 LTS atau 20 LTS (direkomendasikan Node.js 20).
* **RAM**: Minimal 512 MB (aplikasi hanya membutuhkan ~50 MB RAM).

Bagi pengguna Armbian / Debian / Ubuntu, pasang Node.js & Git:
```bash
sudo apt update
sudo apt install -y curl git nodejs npm
```

---

### 2. Unduh Repository & Pasang Dependensi

```bash
# 1. Clone repository dari GitHub ALIJAYA-NET
git clone https://github.com/alijayanet/tagihan-wifi.git

# 2. Masuk ke direktori project
cd tagihan-wifi

# 3. Install seluruh paket dependensi
npm install
```

---

### 3. Konfigurasi Environment (`.env`)

File `.env` otomatis membaca konfigurasi default, namun Anda dapat menyesuaikannya:
```bash
# Salin template .env jika diperlukan
nano .env
```
Isi dasar file `.env`:
```env
PORT=3000
SESSION_SECRET=wifi-billing-secret-key-armbian-2026
```

---

### 4. Inisialisasi Database Bersih (Seeding Awal)

Jalankan perintah ini untuk membuat skema tabel SQLite dan akun master dasar:
```bash
npm run seed
```
Output yang sukses akan memunculkan konfirmasi:
```text
📦 Database SQLite terhubung: ./database/tagihan_wifi.sqlite
✅ Skema tabel database siap digunakan.
⚡ SQLite Journal Mode: WAL
✅ Pengaturan default berhasil disiapkan.
✅ Akun Admin dibuat (username: admin)
✅ Akun Kolektor dibuat (kolektor1 & kolektor2)
✅ Data paket internet berhasil ditambahkan.
🎉 Seeding database selesai! Siap digunakan dengan data transaksi bersih.
```

---

### 5. Menjalankan Aplikasi

#### A. Mode Normal (Pengujian / Development)
```bash
npm start
```
Buka browser pada komputer atau smartphone di jaringan yang sama:
* **Admin Dashboard**: `http://IP_STB_ANDA:3000/admin/login`
* **Portal Kolektor**: `http://IP_STB_ANDA:3000/kolektor/login`

*(Contoh: `http://192.168.1.10:3000`)*

---

### 6. Panduan Menjalankan & Perintah Lengkap PM2 (Armbian / Linux SBC)

**PM2 (Process Manager 2)** adalah tool standar industri untuk memastikan aplikasi Node.js tetap berjalan di latar belakang (*background*), otomatis hidup kembali jika terjadi crash (*autorestart*), dan otomatis menyala ketika STB Armbian dinyalakan kembali pasca mati lampu atau reboot.

#### A. Langkah Pemasangan & Menjalankan Pertama Kali
```bash
# 1. Pasang PM2 secara global
sudo npm install -g pm2

# 2. Masuk ke direktori project tagihan-wifi
cd /path/to/tagihan-wifi

# 3. Jalankan aplikasi menggunakan file konfigurasi ecosystem
pm2 start ecosystem.config.js
```
> [!NOTE]
> File `ecosystem.config.js` sudah disetel khusus hemat RAM dengan batasan restart memori `150M` dan mode single-instance yang sangat optimal untuk SQLite WAL mode di perangkat STB RAM 1GB / 2GB.

#### B. Konfigurasi Auto-Start Saat STB Dinyalakan (Auto-Boot)
Agar aplikasi otomatis hidup sendiri saat STB Armbian dinyalakan kembali:
```bash
# Simpan daftar proses yang sedang aktif
pm2 save

# Buat script startup systemd
pm2 startup
```
*Setelah menjalankan `pm2 startup`, terminal akan menampilkan satu baris perintah `sudo env PATH=...` yang harus Anda salin dan jalankan sekali di terminal. Contoh:*
```bash
# Contoh output yang perlu dijalankan (sesuaikan dengan output di layar Anda):
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u armbian --hp /home/armbian
```
Setelah itu, jalankan `pm2 save` sekali lagi untuk mengunci konfigurasi.

---

#### C. Tabel Perintah PM2 yang Sering Digunakan

| Perintah | Deskripsi & Fungsi |
| :--- | :--- |
| `pm2 status` *(atau `pm2 ls`)* | Melihat status aplikasi (apakah *online*, pemakaian RAM, CPU, Uptime, & ID proses). |
| `pm2 start ecosystem.config.js` | Menjalankan aplikasi untuk pertama kali menggunakan konfigurasi project. |
| `pm2 restart tagihan-wifi` | Merestart aplikasi (sangat berguna setelah update kode atau konfigurasi). |
| `pm2 reload tagihan-wifi` | Mereload aplikasi secara mulus (*zero-downtime reload*). |
| `pm2 stop tagihan-wifi` | Menghentikan sementara aplikasi tanpa menghapusnya dari daftar PM2. |
| `pm2 delete tagihan-wifi` | Menghentikan dan menghapus aplikasi dari daftar manajemen PM2. |
| `pm2 logs tagihan-wifi` | Melihat log output sistem secara live / real-time (tekan `Ctrl+C` untuk keluar). |
| `pm2 logs tagihan-wifi --lines 50` | Menampilkan 50 baris terakhir log aktivitas aplikasi. |
| `pm2 logs tagihan-wifi --err` | Hanya menampilkan pesan catatan error saja. |
| `pm2 monit` | Membuka dashboard interaktif visual di terminal untuk memantau grafik CPU, RAM, & heap memory. |
| `pm2 flush` | Membersihkan/mengosongkan seluruh file log lama agar hemat ruang disk SD Card/eMMC STB. |
| `pm2 save` | Menyimpan daftar proses aktif ke file konfigurasi persistensi boot. |
| `pm2 unstartup` | Menghapus konfigurasi auto-start PM2 saat booting OS. |

#### D. Tips Tambahan: Rotasi Log Otomatis di Armbian (Hemat Memori Storage)
Perangkat STB menggunakan storage berbasis SD card atau eMMC. Agar file log PM2 tidak membengkak dan memenuhi kapasitas penyimpanan:
```bash
# Pasang modul logrotate otomatis di PM2
pm2 install pm2-logrotate

# Batasi ukuran maksimum 1 file log maksimal 10 MB
pm2 set pm2-logrotate:max_size 10M

# Simpan maksimal 7 arsip log terakhir (file lama otomatis dihapus)
pm2 set pm2-logrotate:retain 7
```

---

### 7. Otomatisasi Tagihan via Cron Job Linux (Opsional)

Secara bawaan, aplikasi sudah memiliki scheduler internal yang aktif otomatis tiap tanggal 1. Jika Anda juga ingin memicu penagihan otomatis lewat cron job OS Armbian:

```bash
crontab -e
```
Tambahkan baris berikut di akhir file (berjalan setiap tanggal 1 jam 00:05):
```bash
5 0 1 * * cd /path/to/tagihan-wifi && /usr/bin/npm run autobill >> /var/log/autobill.log 2>&1
```

---

## 💾 Pencadangan Data (Backup Database SQLite WAL)

Karena sistem menggunakan engine SQLite, seluruh data pelanggan, tagihan, dan pengaturan tersimpan dalam satu file mandiri:
`database/tagihan_wifi.sqlite`

### Cara Backup Cepat:
```bash
# Backup langsung ke flashdisk USB atau folder arsip
cp database/tagihan_wifi.sqlite /media/usb/backup_wifi_$(date +%Y%m%d).sqlite
```
Untuk mengembalikan (*restore*) data, cukup matikan aplikasi (`pm2 stop tagihan-wifi`), timpa file `tagihan_wifi.sqlite`, lalu jalankan kembali aplikasinya.

---

## 🤝 Dukungan & Donasi

Jika Anda merasa aplikasi ini bermanfaat untuk usaha RT/RW Net Anda dan ingin berdiskusi, menyampaikan saran, atau membutuhkan bantuan instalasi teknis, silakan hubungi kami:

* **WhatsApp / Telepon**: [**081947215703**](https://wa.me/6281947215703) (`+62 819-4721-5703`)
* **Pengembang**: **ALIJAYA-NET**
* **GitHub**: [github.com/alijayanet](https://github.com/alijayanet)

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi terbuka [ISC License](LICENSE). Bebas digunakan dan dimodifikasi untuk kebutuhan operasional RT/RW Net di seluruh Indonesia.
