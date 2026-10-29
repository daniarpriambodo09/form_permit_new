#!/bin/bash
set -e

echo "=== [DEPLOY] Memulai update repositori ==="
git pull origin main

echo "=== [DEPLOY] Memeriksa & menjalankan migrasi database baru ==="
node scripts/migrate.js

echo "=== [DEPLOY] Menginstal dependensi jika ada perubahan ==="
npm install --omit=dev

echo "=== [DEPLOY] Membangun aplikasi Next.js ==="
npm run build

echo "=== [DEPLOY] Restarting PM2 process ==="
pm2 restart form-permit || pm2 start npm --name "form-permit" -- run start

echo "=== [DEPLOY] Selesai & Berhasil! ==="
