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

async function testHw() {
  const worker = await login('daniar_worker_PGA', '12345678');
  const res = await fetch(`${BASE_URL}/api/forms/hot-work`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': worker.cookie },
    body: JSON.stringify({
      isSubmit: true,
      idIjinKerja: 'WP-0010',
      tipePerusahaan: 'eksternal',
      tanggal: '2026-10-31',
      tanggalPelaksanaan: '2026-10-31',
      lokasiPekerjaan: 'Utility Area',
      waktuPukul: '08:00',
      waktuSelesai: '12:00',
      spvPemberiIzin: { nama: 'daniar_spv3', nik: '12345678', jabatan: 'SPV PGA' },
      namaKontraktorNik: 'Budi Santoso',
      namaPekerjaNik: 'Ahmad Subandi',
      detailWelding: true,
      tMulaiWelding: '08:30',
      tSelesaiWelding: '11:30',
      kondisiToolsBaik: true,
      tersediaAparHydrant: true,
      apdLengkap: true,
      lantaiBersih: true,
      fireWatchMemastikanAreaAman: true,
      firwatchTerlatih: true,
    }),
  });
  console.log('Status:', res.status);
  const json = await res.json();
  console.log('Response:', json);
}

testHw().catch(console.error);

