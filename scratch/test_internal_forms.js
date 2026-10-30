const fs = require('fs');

const BASE_URL = 'http://localhost:3100';

async function login(username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed for ${username}: ${JSON.stringify(data)}`);
  const setCookie = res.headers.get('set-cookie');
  let cookieHeader = '';
  if (setCookie) {
    cookieHeader = setCookie.split(',').map(c => c.split(';')[0].trim()).join('; ');
  }
  return { user: data.user, cookie: cookieHeader };
}

async function main() {
  console.log('=== LOGGING IN USERS ===');
  const worker = await login('daniar_worker_PGA', '12345678');
  const spv = await login('daniar_spv3', '12345678');
  const adminK3_gp = await login('daniark3', '12345678');
  const adminK3_ws = await login('daniark3_2', '12345678');
  const sfo = await login('daniar_sfo1', '12345678');
  const smr = await login('daniar_smr', '12345678');

  // 1. SUBMIT HOT WORK
  console.log('\n--- 1. SUBMIT INTERNAL HOT WORK ---');
  const hwPayload = {
    isSubmit: true,
    tipePerusahaan: 'internal',
    tanggal: new Date().toISOString().slice(0, 10),
    tanggalPelaksanaan: new Date().toISOString().slice(0, 10),
    lokasiPekerjaan: 'Workshop Pabrik Line 1',
    waktuPukul: '08:00',
    waktuSelesai: '17:00',
    spvPemberiIzin: { nama: 'daniar_spv3', nik: '12345678', jabatan: 'SPV PGA' },
    namaKontraktorNik: 'Daniar Worker',
    namaPekerjaNik: 'Daniar Worker',
    detailCutting: true,
    tMulaiCutting: '08:00',
    tSelesaiCutting: '12:00',
    kondisiToolsBaik: true,
    tersediaAparHydrant: true,
    apdLengkap: true,
    lantaiBersih: true,
    fireWatchMemastikanAreaAman: true,
    firwatchTerlatih: true,
  };

  const resHw = await fetch(`${BASE_URL}/api/forms/hot-work`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': worker.cookie },
    body: JSON.stringify(hwPayload),
  });
  const hwJson = await resHw.json();
  if (!resHw.ok) throw new Error(`Failed to submit HW: ${JSON.stringify(hwJson)}`);
  const hwId = hwJson.idForm || hwJson.id_form;
  console.log('Submitted Hot Work ID:', hwId);

  // 2. SUBMIT HEIGHT WORK WITH SCAFFOLDING
  console.log('\n--- 2. SUBMIT INTERNAL HEIGHT WORK ---');
  const heightPayload = {
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

  const resHeight = await fetch(`${BASE_URL}/api/forms/height-work`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': worker.cookie },
    body: JSON.stringify(heightPayload),
  });
  const heightJson = await resHeight.json();
  if (!resHeight.ok) throw new Error(`Failed to submit Height Work: ${JSON.stringify(heightJson)}`);
  const heightId = heightJson.idForm || heightJson.id_form;
  console.log('Submitted Height Work ID:', heightId);

  // 3. SUBMIT WORKSHOP
  console.log('\n--- 3. SUBMIT INTERNAL WORKSHOP ---');
  const wsPayload = {
    isSubmit: true,
    tipePerusahaan: 'internal',
    tanggal: new Date().toISOString().slice(0, 10),
    tanggalPelaksanaan: new Date().toISOString().slice(0, 10),
    lokasiPekerjaan: 'Area Bengkel Workshop',
    waktuPukul: '08:00',
    waktuSelesai: '17:00',
    spvPemberiIzin: { nama: 'daniar_spv3', nik: '12345678', jabatan: 'SPV PGA' },
    namaKontraktorNik: 'Daniar Worker',
    namaPekerjaNik: 'Daniar Worker',
    detailWelding: true,
    tMulaiWelding: '09:00',
    tSelesaiWelding: '12:00',
    kondisiToolsBaik: true,
    tersediaAparHydrant: true,
    apdLengkap: true,
    lantaiBersih: true,
  };

  const resWs = await fetch(`${BASE_URL}/api/forms/workshop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': worker.cookie },
    body: JSON.stringify(wsPayload),
  });
  const wsJson = await resWs.json();
  if (!resWs.ok) throw new Error(`Failed to submit Workshop: ${JSON.stringify(wsJson)}`);
  const wsId = wsJson.idForm || wsJson.id_form;
  console.log('Submitted Workshop ID:', wsId);

  // FUNCTION TO APPROVE
  async function approveForm(jenis, id, approverCookie, extraBody = {}) {
    const res = await fetch(`${BASE_URL}/api/approval/${jenis}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Cookie': approverCookie },
      body: JSON.stringify({ action: 'approve', ...extraBody }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Approval failed for ${jenis} ${id}: ${JSON.stringify(json)}`);
    return json;
  }

  // APPROVAL CHAIN FOR HOT WORK
  console.log('\n=== PROGRESSING HOT WORK APPROVAL ===');
  console.log('SPV approving Hot Work...');
  await approveForm('hot-work', hwId, spv.cookie);
  console.log('Admin K3 approving Hot Work (picking SFO id 44)...');
  await approveForm('hot-work', hwId, adminK3_gp.cookie, { next_approver_user_id: 44 });
  console.log('SFO approving Hot Work (picking SMR id 45)...');
  await approveForm('hot-work', hwId, sfo.cookie, { next_approver_user_id: 45 });
  console.log('SMR approving Hot Work...');
  await approveForm('hot-work', hwId, smr.cookie);
  console.log('Hot Work fully approved!');

  // APPROVAL CHAIN FOR HEIGHT WORK
  console.log('\n=== PROGRESSING HEIGHT WORK APPROVAL ===');
  console.log('SPV approving Height Work...');
  await approveForm('height-work', heightId, spv.cookie);
  console.log('Admin K3 approving Height Work (picking SFO id 44)...');
  await approveForm('height-work', heightId, adminK3_gp.cookie, {
    next_approver_user_id: 44,
    harness_checklist: {
      webbing: true,
      dring: true,
      gesper: true,
      absorter: true,
      snapHook: true,
      ropeLanyard: true,
      carabiner: true,
    },
  });
  console.log('SFO approving Height Work (picking SMR id 45)...');
  await approveForm('height-work', heightId, sfo.cookie, { next_approver_user_id: 45 });
  console.log('SMR approving Height Work...');
  await approveForm('height-work', heightId, smr.cookie);
  console.log('Height Work fully approved!');

  // APPROVAL CHAIN FOR WORKSHOP
  console.log('\n=== PROGRESSING WORKSHOP APPROVAL ===');
  console.log('SPV approving Workshop...');
  await approveForm('workshop', wsId, spv.cookie);
  console.log('Admin K3 WS (daniark3_2) approving Workshop (picking SFO id 44)...');
  await approveForm('workshop', wsId, adminK3_ws.cookie, { next_approver_user_id: 44 });
  console.log('SFO approving Workshop (picking SMR id 45)...');
  await approveForm('workshop', wsId, sfo.cookie, { next_approver_user_id: 45 });
  console.log('SMR approving Workshop...');
  await approveForm('workshop', wsId, smr.cookie);
  console.log('Workshop fully approved!');

  console.log('\n=== SUMMARY OF INTERNAL FORMS TEST ===');
  console.log('Hot Work ID:', hwId, '-> APPROVED');
  console.log('Height Work ID:', heightId, '-> APPROVED');
  console.log('Workshop ID:', wsId, '-> APPROVED');
}

main().catch(err => {
  console.error('\n[ERROR IN TEST]', err);
  process.exit(1);
});
