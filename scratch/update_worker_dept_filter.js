const fs = require('fs');

function updateHotWork() {
  const filePath = 'app/form/hot-work/page.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  const oldCode = `  useEffect(() => {
    if (formData.tipePerusahaan !== "internal") {
      setWorkerOptions([]);
      return;
    }
    setLoadingWorkers(true);
    fetch("/api/master-lisence/workers?jenisKerja=hot_work", {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setWorkerOptions(d.data || []))
      .catch((err) => {
        console.error("Gagal memuat pekerja master lisence:", err);
        setWorkerOptions([]);
      })
      .finally(() => setLoadingWorkers(false));
  }, [formData.tipePerusahaan]);`;

  const newCode = `  useEffect(() => {
    if (formData.tipePerusahaan !== "internal") {
      setWorkerOptions([]);
      return;
    }
    const dept = user?.departmen;
    const url = dept && dept !== "Unknown"
      ? \`/api/master-lisence/workers?jenisKerja=hot_work&departemen=\${encodeURIComponent(dept)}\`
      : "/api/master-lisence/workers?jenisKerja=hot_work";

    setLoadingWorkers(true);
    fetch(url, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setWorkerOptions(d.data || []))
      .catch((err) => {
        console.error("Gagal memuat pekerja master lisence:", err);
        setWorkerOptions([]);
      })
      .finally(() => setLoadingWorkers(false));
  }, [formData.tipePerusahaan, user?.departmen]);`;

  // Normalize line endings for replacement
  const isCrlf = content.includes('\r\n');
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedOld = oldCode.replace(/\r\n/g, '\n');
  const normalizedNew = newCode.replace(/\r\n/g, '\n');

  if (!normalizedContent.includes(normalizedOld)) {
    throw new Error('oldCode not found in hot-work');
  }

  let updated = normalizedContent.replace(normalizedOld, normalizedNew);
  if (isCrlf) {
    updated = updated.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('[OK] Updated app/form/hot-work/page.tsx');
}

function updateWorkshop() {
  const filePath = 'app/form/workshop/page.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  const oldCode = `  // ── Fetch pekerja Workshop dari Master Lisence saat Internal ──
  useEffect(() => {
    if (formData.tipePerusahaan !== "internal") {
      setWorkerOptions([]);
      return;
    }
    setLoadingWorkers(true);
    fetch("/api/master-lisence/workers?jenisKerja=workshop", {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setWorkerOptions(d.data || []))
      .catch((err) => {
        console.error("Gagal memuat pekerja master lisence:", err);
        setWorkerOptions([]);
      })
      .finally(() => setLoadingWorkers(false));
  }, [formData.tipePerusahaan]);`;

  const newCode = `  // ── Fetch pekerja Workshop dari Master Lisence saat Internal (filter by departemen user) ──
  useEffect(() => {
    if (formData.tipePerusahaan !== "internal") {
      setWorkerOptions([]);
      return;
    }
    const dept = user?.departmen;
    const url = dept && dept !== "Unknown"
      ? \`/api/master-lisence/workers?jenisKerja=workshop&departemen=\${encodeURIComponent(dept)}\`
      : "/api/master-lisence/workers?jenisKerja=workshop";

    setLoadingWorkers(true);
    fetch(url, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setWorkerOptions(d.data || []))
      .catch((err) => {
        console.error("Gagal memuat pekerja master lisence:", err);
        setWorkerOptions([]);
      })
      .finally(() => setLoadingWorkers(false));
  }, [formData.tipePerusahaan, user?.departmen]);`;

  const isCrlf = content.includes('\r\n');
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedOld = oldCode.replace(/\r\n/g, '\n');
  const normalizedNew = newCode.replace(/\r\n/g, '\n');

  if (!normalizedContent.includes(normalizedOld)) {
    throw new Error('oldCode not found in workshop');
  }

  let updated = normalizedContent.replace(normalizedOld, normalizedNew);
  if (isCrlf) {
    updated = updated.replace(/\n/g, '\r\n');
  }

  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('[OK] Updated app/form/workshop/page.tsx');
}

updateHotWork();
updateWorkshop();

