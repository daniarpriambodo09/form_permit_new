const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3100';
const JSA_FILE_PATH = 'C:\\Users\\Windows 11 Home\\Downloads\\JSA INSYS 31 okt-1 nov 2026.pdf';

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

async function uploadFile(endpoint, filePath, fieldName = 'file', cookie) {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

  let ext = path.extname(fileName).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.pdf') contentType = 'application/pdf';
  else if (ext === '.png') contentType = 'image/png';

  const postData = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const headers = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': postData.length,
  };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: postData,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Upload to ${endpoint} failed: ${JSON.stringify(json)}`);
  return json;
}

// Generate a dummy 1x1 transparent PNG for signature upload
function createDummySignaturePng() {
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const tmpPath = path.join(__dirname, 'dummy_sig.png');
  fs.writeFileSync(tmpPath, Buffer.from(pngBase64, 'base64'));
  return tmpPath;
}

async function main() {
  console.log('=== 1. VERIFYING JSA FILE ===');
  if (!fs.existsSync(JSA_FILE_PATH)) {
    console.error(`FATAL: File JSA tidak ditemukan di "${JSA_FILE_PATH}". Menghentikan pengujian sesuai instruksi user.`);
    process.exit(1);
  }
  const jsaStats = fs.statSync(JSA_FILE_PATH);
  console.log(`[OK] File JSA ditemukan: ${path.basename(JSA_FILE_PATH)} (${jsaStats.size} bytes)`);

  console.log('\n=== 2. LOGGING IN ACTORS ===');
  const worker = await login('daniar_worker_PGA', '12345678');
  console.log('Worker logged in');
  const spv = await login('daniar_spv3', '12345678');
  console.log('SPV logged in');
  const adminK3 = await login('daniark3', '12345678');
  console.log('Admin K3 logged in');
  const sfo = await login('daniar_sfo1', '12345678');
  console.log('SFO logged in');
  const smr = await login('daniar_smr', '12345678');
  console.log('SMR logged in');
  const security = await login('security1', '12345678');
  console.log('Security logged in');

  console.log('\n=== 3. UPLOADING JSA & SIGNATURES ===');
  const jsaUpload = await uploadFile('/api/upload/jsa', JSA_FILE_PATH, 'file', worker.cookie);
  console.log('JSA uploaded:', jsaUpload.url);

  const sigPath = createDummySignaturePng();
  const sigUpload = await uploadFile('/api/upload/signature', sigPath, 'file', worker.cookie);
  console.log('Contractor Signature uploaded:', sigUpload.url);

  console.log('\n=== 4. CREATING EXTERNAL PERMIT (FORM IJIN KERJA) ===');
  const gpPayload = {
    isSubmit: true,
    tipePerusahaan: 'eksternal',
    namaKontraktorPekerja: 'PT INSYS MANDIRI',
    deskripsiPekerjaan: 'Instalasi Jaringan dan Pengelasan Struktur Pabrik Line 1',
    areaLokasiPekerjaan: 'Utility Area, Panel Utama, Tandon Air & Water Treatment, IPAL (Hydro Kalva bio)',
    tanggal: '2026-10-31',
    tanggalMulai: '2026-10-31',
    tanggalSelesai: '2026-11-01',
    namaPengawasPicSubkont: 'Budi Santoso',
    noHpPic: '081234567890',
    jumlahTenagaKerja: 6,
    spvTerkaitPj: 'daniar_spv3',
    nikSpvTerkaitPj: '12345678',
    perluJsa: true,
    jsaFileUrl: jsaUpload.url,
    safetyInduction: {
      namaSubcont: 'PT INSYS MANDIRI',
      aktivitasPekerjaan: 'Instalasi Jaringan dan Pengelasan Struktur Pabrik Line 1',
      koordinatNoHp: 'Budi Santoso (081234567890)',
      areaTerbatas: 'Utility Area, Panel Utama, Tandon Air & Water Treatment, IPAL (Hydro Kalva bio)',
      namaPekerja: [
        'Ahmad Subandi', 'Bambang Supriyanto', 'Cahyo Utomo',
        'Dedi Kurniawan', 'Eko Prasetyo', 'Fajar Ramadhan',
        '', '', '', '', '', '', '', ''
      ],
      checklist: {
        identitasKtp: true,
        apdStandar: true,
        kondisiKesehatan: true,
        laranganMerokok: true,
        jalurEvakuasi: true,
        kebersihanLingkungan: true,
      },
      status: 'submitted',
    },
    penilaianSubkontraktor: {
      entries: [
        { item: 'Kesesuaian APD', kriteria: 'Lengkap dan standar', skor: 5, catatan: 'Sesuai' },
        { item: 'Kepatuhan SOP K3', kriteria: 'Mematuhi rambu-rambu', skor: 5, catatan: 'Baik' },
        { item: 'Kerapihan Area Kerja', kriteria: 'Housekeeping terjaga', skor: 5, catatan: 'Bersih' },
      ],
      mengetahui: {
        pengawasDept: { nama: 'Test Pengawas PGA', tgl: '2026-10-31' },
        purchasing: { nama: 'Test Purchasing', tgl: '2026-10-31' },
      },
    },
  };

  const resGp = await fetch(`${BASE_URL}/api/forms/general-permit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': worker.cookie },
    body: JSON.stringify(gpPayload),
  });
  const gpData = await resGp.json();
  if (!resGp.ok) throw new Error(`Create General Permit failed: ${JSON.stringify(gpData)}`);
  const idForm = gpData.idForm || gpData.id_form;
  console.log('Created External Permit ID:', idForm);

  console.log('\n=== 5. CONTRACTOR SIGNING EXTERNAL PERMIT ===');
  const resSignCtr = await fetch(`${BASE_URL}/api/forms/general-permit/${idForm}/sign-kontraktor`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': worker.cookie },
    body: JSON.stringify({ signatureUrl: sigUpload.url }),
  });
  const signCtrData = await resSignCtr.json();
  if (!resSignCtr.ok) throw new Error(`Contractor sign failed: ${JSON.stringify(signCtrData)}`);
  console.log('Contractor signed successfully');

  console.log('\n=== 6. CREATING MULTIPLE ATTACHMENTS (2 HW, 2 HAW, 1 WS) ===');
  // Hot Work 1
  const hw1 = await fetch(`${BASE_URL}/api/forms/hot-work`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': worker.cookie },
    body: JSON.stringify({
      isSubmit: true,
      idIjinKerja: idForm,
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
  }).then(r => r.json());
  console.log('Created HW Attachment #1:', hw1.idForm || hw1.id_form);

  // Hot Work 2
  const hw2 = await fetch(`${BASE_URL}/api/forms/hot-work`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': worker.cookie },
    body: JSON.stringify({
      isSubmit: true,
      idIjinKerja: idForm,
      tipePerusahaan: 'eksternal',
      tanggal: '2026-10-31',
      tanggalPelaksanaan: '2026-10-31',
      lokasiPekerjaan: 'Panel Utama',
      waktuPukul: '13:00',
      waktuSelesai: '17:00',
      spvPemberiIzin: { nama: 'daniar_spv3', nik: '12345678', jabatan: 'SPV PGA' },
      namaKontraktorNik: 'Budi Santoso',
      namaPekerjaNik: 'Bambang Supriyanto',
      detailCutting: true,
      tMulaiCutting: '13:30',
      tSelesaiCutting: '16:00',
      kondisiToolsBaik: true,
      tersediaAparHydrant: true,
      apdLengkap: true,
      lantaiBersih: true,
      fireWatchMemastikanAreaAman: true,
      firwatchTerlatih: true,
    }),
  }).then(r => r.json());
  console.log('Created HW Attachment #2:', hw2.idForm || hw2.id_form);

  // Height Work 1
  const haw1 = await fetch(`${BASE_URL}/api/forms/height-work`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': worker.cookie },
    body: JSON.stringify({
      isSubmit: true,
      idIjinKerja: idForm,
      tipePerusahaan: 'eksternal',
      petugasKetinggian: 'eksternal',
      tanggal: '2026-10-31',
      tanggalPelaksanaan: '2026-10-31',
      lokasi: 'Tandon Air & Water Treatment',
      deskripsiPekerjaan: 'Pemasangan pipa ketinggian',
      waktuMulai: '08:00',
      waktuSelesai: '12:00',
      spvPemberiIzin: { nama: 'daniar_spv3', nik: '12345678', jabatan: 'SPV PGA' },
      namaPetugas1: 'Cahyo Utomo',
      petugas1Sehat: true,
      adaSafetyHelmet: true,
      adaFullBodyHarness: true,
      areaDiperiksaAman: true,
      webbingKondisiBaik: true,
      dringKondisiBaik: true,
      gesperKondisiBaik: true,
    }),
  }).then(r => r.json());
  console.log('Created Height Work Attachment #1:', haw1.idForm || haw1.id_form);

  // Height Work 2
  const haw2 = await fetch(`${BASE_URL}/api/forms/height-work`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': worker.cookie },
    body: JSON.stringify({
      isSubmit: true,
      idIjinKerja: idForm,
      tipePerusahaan: 'eksternal',
      petugasKetinggian: 'eksternal',
      tanggal: '2026-10-31',
      tanggalPelaksanaan: '2026-10-31',
      lokasi: 'IPAL (Hydro Kalva bio)',
      deskripsiPekerjaan: 'Pengecatan struktur atas IPAL',
      waktuMulai: '13:00',
      waktuSelesai: '17:00',
      spvPemberiIzin: { nama: 'daniar_spv3', nik: '12345678', jabatan: 'SPV PGA' },
      namaPetugas1: 'Dedi Kurniawan',
      petugas1Sehat: true,
      adaSafetyHelmet: true,
      adaFullBodyHarness: true,
      areaDiperiksaAman: true,
      webbingKondisiBaik: true,
      dringKondisiBaik: true,
      gesperKondisiBaik: true,
    }),
  }).then(r => r.json());
  console.log('Created Height Work Attachment #2:', haw2.idForm || haw2.id_form);

  // Workshop 1
  const ws1 = await fetch(`${BASE_URL}/api/forms/workshop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': worker.cookie },
    body: JSON.stringify({
      isSubmit: true,
      idIjinKerja: idForm,
      tipePerusahaan: 'eksternal',
      tanggal: '2026-10-31',
      tanggalPelaksanaan: '2026-10-31',
      lokasiPekerjaan: 'Workshop Pabrik',
      waktuPukul: '08:00',
      waktuSelesai: '17:00',
      spvPemberiIzin: { nama: 'daniar_spv3', nik: '12345678', jabatan: 'SPV PGA' },
      namaKontraktorNik: 'Budi Santoso',
      namaPekerjaNik: 'Eko Prasetyo',
      detailWelding: true,
      tMulaiWelding: '09:00',
      tSelesaiWelding: '12:00',
      kondisiToolsBaik: true,
      tersediaAparHydrant: true,
      apdLengkap: true,
      lantaiBersih: true,
    }),
  }).then(r => r.json());
  console.log('Created Workshop Attachment #1:', ws1.idForm || ws1.id_form);

  console.log('\n=== 7. VERIFYING LINKED JOB FORMS API ===');
  const jobFormsRes = await fetch(`${BASE_URL}/api/forms/general-permit/${idForm}/job-forms`, {
    headers: { 'Cookie': worker.cookie },
  });
  const jobFormsJson = await jobFormsRes.json();
  const jobForms = jobFormsJson.data || jobFormsJson;
  console.log('Job forms response items count:');
  console.log('  hotWork count:', jobForms.items?.hotWork?.length);
  console.log('  heightWork count:', jobForms.items?.heightWork?.length);
  console.log('  workshop count:', jobForms.items?.workshop?.length);
  console.log('  all total:', jobForms.all?.length);

  if (jobForms.items?.hotWork?.length !== 2 || jobForms.items?.heightWork?.length !== 2 || jobForms.items?.workshop?.length !== 1) {
    throw new Error('Linked job forms count mismatch!');
  }

  console.log('\n=== 8. PROGRESSING APPROVAL CHAIN ===');
  // STAGE 1: SPV
  console.log('1. SPV (daniar_spv3) approving...');
  const resSpv = await fetch(`${BASE_URL}/api/approval/general-permit/${idForm}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': spv.cookie },
    body: JSON.stringify({ action: 'approve' }),
  });
  const spvJson = await resSpv.json();
  if (!resSpv.ok) throw new Error(`SPV approval failed: ${JSON.stringify(spvJson)}`);
  console.log('SPV approved -> current_stage is now 2 (Admin K3)');

  // STAGE 2: Admin K3
  console.log('2. Admin K3 (daniark3) approving and selecting SFO (id 44)...');
  const resK3 = await fetch(`${BASE_URL}/api/approval/general-permit/${idForm}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminK3.cookie },
    body: JSON.stringify({ action: 'approve', next_approver_user_id: 44 }),
  });
  const k3Json = await resK3.json();
  if (!resK3.ok) throw new Error(`Admin K3 approval failed: ${JSON.stringify(k3Json)}`);
  console.log('Admin K3 approved -> SFO selected, current_stage is now 3 (SFO)');

  // STAGE 3: SFO
  console.log('3. SFO (daniar_sfo1) approving and selecting SMR (id 45)...');
  const resSfo = await fetch(`${BASE_URL}/api/approval/general-permit/${idForm}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': sfo.cookie },
    body: JSON.stringify({ action: 'approve', next_approver_user_id: 45 }),
  });
  const sfoJson = await resSfo.json();
  if (!resSfo.ok) throw new Error(`SFO approval failed: ${JSON.stringify(sfoJson)}`);
  console.log('SFO approved -> SMR selected, current_stage is now 4 (SMR)');

  // STAGE 4: SMR
  console.log('4. SMR (daniar_smr) approving (choice stops at SMR)...');
  const resSmr = await fetch(`${BASE_URL}/api/approval/general-permit/${idForm}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': smr.cookie },
    body: JSON.stringify({ action: 'approve' }),
  });
  const smrJson = await resSmr.json();
  if (!resSmr.ok) throw new Error(`SMR approval failed: ${JSON.stringify(smrJson)}`);
  console.log('SMR approved -> current_stage is now 5 (Security / Final)');

  // STAGE 5: Security (Safety Induction verification & signature)
  console.log('5. Security (security1) approving Safety Induction...');
  const secSigUpload = await uploadFile('/api/upload/signature', sigPath, 'file', security.cookie);
  const secPayload = {
    safetyInduction: {
      namaSubcont: 'PT INSYS MANDIRI',
      aktivitasPekerjaan: 'Instalasi Jaringan dan Pengelasan Struktur Pabrik Line 1',
      koordinatNoHp: 'Budi Santoso (081234567890)',
      areaTerbatas: 'Utility Area, Panel Utama, Tandon Air & Water Treatment, IPAL (Hydro Kalva bio)',
      namaPekerja: [
        'Ahmad Subandi', 'Bambang Supriyanto', 'Cahyo Utomo',
        'Dedi Kurniawan', 'Eko Prasetyo', 'Fajar Ramadhan',
        '', '', '', '', '', '', '', ''
      ],
      checklist: {
        identitasKtp: true,
        apdStandar: true,
        kondisiKesehatan: true,
        laranganMerokok: true,
        jalurEvakuasi: true,
        kebersihanLingkungan: true,
      },
    },
    signatureUrl: secSigUpload.url,
  };

  const resSec = await fetch(`${BASE_URL}/api/approval/external/${idForm}/safety-induction/sign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': security.cookie },
    body: JSON.stringify(secPayload),
  });
  const secJson = await resSec.json();
  if (!resSec.ok) throw new Error(`Security sign failed: ${JSON.stringify(secJson)}`);
  console.log('Security signed and approved Safety Induction!');

  console.log('\n=== 9. VERIFYING CASCADE APPROVAL IN DATABASE ===');
  const env = Object.fromEntries(
    fs.readFileSync('.env.local', 'utf-8')
      .split('\n')
      .filter(l => l && !l.startsWith('#') && l.includes('='))
      .map(l => {
        const idx = l.indexOf('=');
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
  const { Pool } = require('pg');
  const pool = new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  });

  const parentRes = await pool.query(
    `SELECT id_form, status, current_stage, spv_approved, admin_k3_approved, sfo_approved, pga_approved, security_approved, approved_by
     FROM form_ijin_kerja WHERE id_form = $1`,
    [idForm]
  );
  console.log('Parent Form state:', parentRes.rows[0]);

  const hwRes = await pool.query(
    `SELECT id_form, id_ijin_kerja, status, spv_approved, admin_k3_approved, sfo_approved, mr_pga_approved
     FROM form_kerja_panas WHERE id_ijin_kerja = $1`,
    [idForm]
  );
  console.log('Attached Hot Work forms:', hwRes.rows);

  const hawRes = await pool.query(
    `SELECT id_form, id_ijin_kerja, status, spv_approved, admin_k3_approved, sfo_approved, mr_pga_approved
     FROM form_kerja_ketinggian WHERE id_ijin_kerja = $1`,
    [idForm]
  );
  console.log('Attached Height Work forms:', hawRes.rows);

  const wsRes = await pool.query(
    `SELECT id_form, id_ijin_kerja, status, spv_approved, admin_k3_approved, sfo_approved, mr_pga_approved
     FROM form_kerja_workshop WHERE id_ijin_kerja = $1`,
    [idForm]
  );
  console.log('Attached Workshop forms:', wsRes.rows);

  await pool.end();

  // Validate all forms are approved
  if (parentRes.rows[0].status !== 'approved') throw new Error('Parent form status is not approved!');
  if (hwRes.rows.some(r => r.status !== 'approved')) throw new Error('Not all HW attachments are approved!');
  if (hawRes.rows.some(r => r.status !== 'approved')) throw new Error('Not all HAW attachments are approved!');
  if (wsRes.rows.some(r => r.status !== 'approved')) throw new Error('Not all WS attachments are approved!');

  console.log('\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY! ===');
  console.log(`External Permit ${idForm} and all 5 attachments are fully APPROVED!`);
}

main().catch(err => {
  console.error('\n[TEST ERROR]', err);
  process.exit(1);
});
