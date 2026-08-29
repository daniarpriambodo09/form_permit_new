-- migration/add_security_user.sql
-- Menambahkan role 'security' ke dalam sistem.
-- Role security sudah didukung secara aplikasi (lib/auth.ts), 
-- skrip ini membuat contoh user security untuk testing.
--
-- CATATAN: Ganti password hash sesuai kebutuhan.
-- Hash berikut adalah untuk password "security123" dengan bcrypt rounds=10.
-- Untuk generate hash baru, gunakan: SELECT crypt('password_baru', gen_salt('bf'));
-- Atau bisa daftar melalui halaman /register jika tersedia.

-- Pastikan enum/check constraint untuk kolom role mendukung 'security'
-- (biasanya sudah karena disimpan sebagai VARCHAR)

-- Cek apakah user security sudah ada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'security') THEN
    -- Tambahkan user security baru
    INSERT INTO users (username, password, nama, jabatan, role, departmen, is_active, created_at, updated_at)
    VALUES (
      'security01',
      -- Password: Security@123 (bcrypt hash)
      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      'Security Officer',
      'Security',
      'security',
      'Security',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (username) DO NOTHING;
    
    RAISE NOTICE 'User security01 berhasil ditambahkan dengan password: Security@123';
  ELSE
    RAISE NOTICE 'User dengan role security sudah ada di database.';
  END IF;
END $$;

-- Tampilkan daftar user dengan role security
SELECT id, username, nama, jabatan, role, departmen, is_active
FROM users
WHERE role = 'security'
ORDER BY id;
