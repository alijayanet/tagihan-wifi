module.exports = {
  apps: [
    {
      name: 'tagihan-wifi',
      script: './server.js',
      instances: 1, // Single instance is ideal for SQLite WAL
      autorestart: true,
      watch: false,
      max_memory_restart: '150M', // Sangat hemat RAM untuk STB / Armbian RAM 1GB / 2GB
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
