// lib/firewatch.ts
// Mapping Fire Watch per departemen

export interface FireWatch {
  nama: string;
  nik: string;
}

export const FIREWATCH_MAP: Record<string, FireWatch[]> = {
  QA: [
    { nama: 'ELDESTIA F', nik: '9123' }
  ],
  ENG: [],
  MTC: [
    { nama: "ASY'AT NUR BASUKI", nik: '14234' },
    { nama: 'M. ABDUL WAHAB C.', nik: '16258' },
    { nama: 'HERU SISWANTO', nik: '5759' }
  ],
  PRODUKSI: [
    { nama: 'ARIF BUDI DARMAWAN', nik: '22865' }
  ],
  NYS: [
    { nama: 'YUSUF FIRMANSYAH', nik: '023571' },
    { nama: 'ANDRI BUSOHIRI', nik: '7921' },
    { nama: 'SYAIFUL RIZAL', nik: '017542' },
    { nama: 'ICHWAN HAKIM', nik: '582' },
    { nama: "MOHAMAD NUR ROFI'IN", nik: '2437' }
  ],
  'FATP-Exim': [
    { nama: 'Zainul Arifin', nik: '1811' },
    { nama: 'Yudi Imansyah', nik: '1373' }
  ],
  'MPC-WHS': [
    { nama: 'LANI GUNAWAN', nik: '1366' },
    { nama: 'ABDUL ROHMAN', nik: '381' },
    { nama: 'M NUR FUAD', nik: '2126' }
  ],
  PGA: [
    { nama: 'AHMAD FAUZI', nik: '17530' },
    { nama: 'AGUS', nik: '11359' },
    { nama: 'DAHANA PRATAMA P,', nik: '017530' },
    { nama: 'MALIK IBRAHIM', nik: '003084' },
    { nama: 'ANWAR ANAS', nik: '001377' },
    { nama: 'HADITIAN SYEH A. W.', nik: '16660' },
    { nama: 'YOGIE M. Z.', nik: '17191' },
    { nama: 'M. IBNU A.', nik: '8554' }
  ]
};

export function getFireWatchByDept(dept: string): FireWatch[] {
  return FIREWATCH_MAP[dept] || [];
}

export function getAllDepartments(): string[] {
  return Object.keys(FIREWATCH_MAP).filter(dept => FIREWATCH_MAP[dept].length > 0);
}

export function getFireWatchNIK(dept: string, nama: string): string | null {
  const list = getFireWatchByDept(dept);
  const fw = list.find(f => f.nama === nama);
  return fw?.nik || null;
}
