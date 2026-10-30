const BASE_URL = 'http://localhost:3100';

async function login(username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  const setCookie = res.headers.get('set-cookie');
  const cookieHeader = setCookie.split(',').map(c => c.split(';')[0].trim()).join('; ');
  return { user: data.user, cookie: cookieHeader };
}

async function run() {
  const worker = await login('daniar_worker_PGA', '12345678');
  const payload = {
    isSubmit: true,
    tipePerusahaan: 'internal',
    petugasKetinggian: 'internal',
    tanggal: new Date().toISOString().slice(0, 10),
    tanggalPelaksanaan: new Date().toISOString().slice(0, 10),
    lokasi: 'Area Atap Gedung B',
    deskripsiPekerjaan: 'Perbaikan atap dan talang air',
    waktuMulai: '08:00',
    waktuSelesai: '16:00',
    spvPemberiIzin: { nama: 'daniar_spv3', nik: '12345678', jabatan: 'SPV PGA' },
    namaPetugas1: 'Daniar Worker',
    petugas1Sehat: true,
    adaSafetyHelmet: true,
    adaFullBodyHarness: true,
    areaDiperiksaAman: true,
    webbingKondisiBaik: true,
    dringKondisiBaik: true,
    gesperKondisiBaik: true,
    perluScaffolding: true,
    scaffoldingInspection: {
      nama_inspektor: 'Daniar Worker',
      tanggal_inspeksi: new Date().toISOString().slice(0, 10),
      lokasi: 'Area Atap Gedung B',
      tipe_perancah: 'Frame Scaffolding',
      items: [
        { no: 1, item: 'Pondasi / Base Plate', kondisi: 'baik', keterangan: 'Kuat dan stabil' },
        { no: 2, item: 'Tiang Vertikal', kondisi: 'baik', keterangan: 'Lurus' },
        { no: 3, item: 'Horizontal Ledger', kondisi: 'baik', keterangan: 'Terpasang kuat' },
        { no: 4, item: 'Diagonal Bracing', kondisi: 'baik', keterangan: 'Lengkap' },
        { no: 5, item: 'Platform Papan Kerja', kondisi: 'baik', keterangan: 'Rapat dan aman' },
        { no: 6, item: 'Guardrail & Toe Board', kondisi: 'baik', keterangan: 'Terpasang standar' },
      ],
      ketentuan_lainnya: 'Aman digunakan untuk kerja ketinggian',
      is_submitted: true,
    },
  };

  const res = await fetch(`${BASE_URL}/api/forms/height-work`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': worker.cookie },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  console.log('Result:', data);
}

run().catch(console.error);

