const { autoGenerateBills } = require('../services/billingService');

async function run() {
  console.log('🚀 Menjalankan Auto Generate Tagihan Bulanan...');
  const result = await autoGenerateBills();
  console.log('Hasil:', result);
  process.exit(0);
}

run();
