-- =====================================================================
-- Sinkronisasi schema database SERVER (jai_permit_db) agar sama dengan MINE
-- Jalankan di SERVER:
--   psql -U postgres -d jai_permit_db -v ON_ERROR_STOP=1 -f sync_server_to_mine.sql
-- Sangat disarankan BACKUP dulu:
--   pg_dump -U postgres -d jai_permit_db -Fc -f backup_sebelum_sync.dump
-- =====================================================================

BEGIN;

-- 1) Hapus CHECK constraint yang tidak ada di mine
ALTER TABLE public.admin_k3_email_routing
    DROP CONSTRAINT IF EXISTS admin_k3_email_routing_jenis_form_check;

-- 2) Tambah kolom baru
ALTER TABLE public.form_kerja_ketinggian
    ADD COLUMN IF NOT EXISTS kontraktor_signature_url text;

ALTER TABLE public.form_kerja_workshop
    ADD COLUMN IF NOT EXISTS kontraktor_signature_url text;

ALTER TABLE public.form_kerja_workshop
    ADD COLUMN IF NOT EXISTS waktu_selesai time without time zone;

-- 3) form_ijin_kerja.admin_k3_approved menjadi NOT NULL
--    (default sudah false; baris lama yang NULL diisi false dulu agar tidak error)
UPDATE public.form_ijin_kerja
   SET admin_k3_approved = false
 WHERE admin_k3_approved IS NULL;

ALTER TABLE public.form_ijin_kerja
    ALTER COLUMN admin_k3_approved SET NOT NULL;

-- 4) master_lisence.id: dari IDENTITY (server) menjadi SERIAL/sequence biasa (mine)
--    Nilai sequence terakhir dipertahankan supaya ID baru tidak bentrok.
DO $$
DECLARE
    v_last   bigint;
    v_called boolean;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_attribute
        WHERE attrelid = 'public.master_lisence'::regclass
          AND attname = 'id'
          AND attidentity <> ''
    ) THEN
        EXECUTE 'SELECT last_value, is_called FROM public.master_lisence_id_seq'
           INTO v_last, v_called;

        ALTER TABLE public.master_lisence ALTER COLUMN id DROP IDENTITY;

        CREATE SEQUENCE public.master_lisence_id_seq
            AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

        PERFORM setval('public.master_lisence_id_seq', v_last, v_called);

        ALTER TABLE public.master_lisence
            ALTER COLUMN id SET DEFAULT nextval('public.master_lisence_id_seq'::regclass);

        ALTER SEQUENCE public.master_lisence_id_seq OWNED BY public.master_lisence.id;
    END IF;
END
$$;

-- 5) Fungsi (CREATE OR REPLACE, isinya sama dengan mine)
CREATE OR REPLACE FUNCTION public.update_smtp_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 6) Trigger yang belum ada di server
DROP TRIGGER IF EXISTS trg_master_lisence_updated ON public.master_lisence;
CREATE TRIGGER trg_master_lisence_updated
    BEFORE UPDATE ON public.master_lisence
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 7) Tabel backup yang ada di mine (struktur saja, tanpa data)
CREATE TABLE IF NOT EXISTS public.form_kerja_ketinggian_backup_20260618 (
    id integer,
    id_form character varying(20),
    tanggal timestamp with time zone,
    tanggal_pelaksanaan timestamp with time zone,
    status character varying(20),
    petugas_ketinggian character varying(50),
    deskripsi_pekerjaan text,
    lokasi character varying(255),
    waktu_mulai time without time zone,
    waktu_selesai time without time zone,
    nama_pengawas_kontraktor character varying(255),
    nama_petugas_1 character varying(255),
    petugas_1_sehat boolean,
    nama_petugas_2 character varying(255),
    petugas_2_sehat boolean,
    nama_petugas_3 character varying(255),
    petugas_3_sehat boolean,
    nama_petugas_4 character varying(255),
    petugas_4_sehat boolean,
    nama_petugas_5 character varying(255),
    petugas_5_sehat boolean,
    nama_petugas_6 character varying(255),
    petugas_6_sehat boolean,
    nama_petugas_7 character varying(255),
    petugas_7_sehat boolean,
    nama_petugas_8 character varying(255),
    petugas_8_sehat boolean,
    nama_petugas_9 character varying(255),
    petugas_9_sehat boolean,
    nama_petugas_10 character varying(255),
    petugas_10_sehat boolean,
    ada_kunci_pagar boolean,
    ada_rompi_ketinggian boolean,
    no_rompi numeric,
    ada_safety_helmet boolean,
    jumlah_safety_helmet numeric,
    ada_full_body_harmess boolean,
    jumlah_full_body_harness numeric,
    area_diperiksa_aman boolean,
    paham_cara_menggunakan_alat_pemadam_kebakaran boolean,
    ada_kerja_listrik boolean,
    prosedur_loto boolean,
    menutupi_area_bawah_prisai boolean,
    safetyline_tersedia boolean,
    alat_bantu_kerja_aman boolean,
    menggunakan_rompi boolean,
    beban_tidak_5kg boolean,
    helm_sesuai_sop boolean,
    rambu2_tersedia boolean,
    webbing_kondisi_baik boolean,
    dring_kondisi_baik boolean,
    gesper_kondisi_baik boolean,
    absorter_dan_timbes_kondisi_baik boolean,
    snap_hook_kondisi_baik boolean,
    rope_lanyard_kondisi_baik boolean,
    spv_terkait character varying(255),
    nama_kontraktor character varying(255),
    sfo character varying(255),
    mr_pga_mgr character varying(255),
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    edit_token character varying(20),
    catatan_reject text,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    user_id integer,
    current_stage integer,
    spv_approved boolean,
    spv_approved_by character varying(255),
    spv_approved_at timestamp with time zone,
    kontraktor_approved boolean,
    kontraktor_approved_by character varying(255),
    kontraktor_approved_at timestamp with time zone,
    sfo_approved boolean,
    sfo_approved_by character varying(255),
    sfo_approved_at timestamp with time zone,
    mr_pga_approved boolean,
    mr_pga_approved_by character varying(255),
    mr_pga_approved_at timestamp with time zone,
    nama_pengawas_departemen character varying(255),
    nama_departemen character varying(255),
    foto_lisensi_1 text,
    foto_lisensi_2 text,
    foto_lisensi_3 text,
    foto_lisensi_4 text,
    foto_lisensi_5 text,
    foto_lisensi_6 text,
    foto_lisensi_7 text,
    foto_lisensi_8 text,
    foto_lisensi_9 text,
    foto_lisensi_10 text,
    admin_k3_approved boolean,
    admin_k3_approved_by character varying(255),
    admin_k3_approved_at timestamp with time zone,
    tipe_perusahaan character varying(20),
    perlu_jsa boolean,
    jsa_file_url text,
    kontraktor_nik character varying(100),
    spv_nik character varying(100),
    admin_k3_nik character varying(100),
    sfo_nik character varying(100),
    mr_pga_nik character varying(100)
);

CREATE TABLE IF NOT EXISTS public.form_kerja_panas_backup_20260618 (
    id integer,
    id_form character varying(20),
    tanggal timestamp with time zone,
    tanggal_pelaksanaan timestamp with time zone,
    status character varying(20),
    no_registrasi character varying(100),
    nama_kontraktor_nik character varying(255),
    nama_pekerja_nik character varying(255),
    lokasi_pekerjaan character varying(255),
    waktu_pukul time without time zone,
    nama_fire_watch character varying(255),
    nik_fire_watch character varying(100),
    tanda_tangan_fw text,
    jabatan_pemberi_izin character varying(255),
    nik_pemberi_ijin character varying(100),
    preventive_genset_pump_room boolean,
    tangki_solar boolean,
    panel_listrik boolean,
    detail_cutting text,
    t_mulai_cutting time without time zone,
    t_selesai_cutting time without time zone,
    detail_grinding text,
    t_mulai_grinding time without time zone,
    t_selesai_grinding time without time zone,
    detail_welding text,
    t_mulai_welding time without time zone,
    t_selesai_welding time without time zone,
    detail_painting text,
    t_mulai_painting time without time zone,
    t_selesai_painting time without time zone,
    ada_kerja_lainnya boolean,
    jenis_kerjaan_lainnya text,
    ruang_tertutup boolean,
    bahan_mudah_terbakar boolean,
    gas_bejana_tangki boolean,
    height_work boolean,
    cairan_gas_bertekan boolean,
    cairan_hydrocarbon boolean,
    bahaya_lain text,
    kondisi_tools_baik boolean,
    tersedia_apar_hydrant boolean,
    sensor_smoke_detector_non_aktif boolean,
    apd_lengkap boolean,
    tidak_ada_cairan_mudah_terbakar boolean,
    lantai_bersih boolean,
    lantai_sudah_dibasahi boolean,
    cairan_mudah_tebakar_tertutup boolean,
    lembaran_dibawah_pekerjaan boolean,
    lindungi_conveyor_dll boolean,
    alat_telah_bersih boolean,
    uap_menyala_telah_dibuang boolean,
    kerja_pada_dinding_lagit boolean,
    bahan_mudah_terbakar_dipindahkan_dari_dinding boolean,
    fire_watch_memastikan_area_aman boolean,
    firwatch_terlatih boolean,
    kondisi_fire_blanket boolean,
    jumlah_fire_blanket integer,
    permintaan_tambahan text,
    spv_terkait character varying(255),
    kontraktor character varying(255),
    sfo character varying(255),
    pga character varying(255),
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    edit_token character varying(20),
    catatan_reject text,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    user_id integer,
    current_stage integer,
    spv_approved boolean,
    spv_approved_by character varying(255),
    spv_approved_at timestamp with time zone,
    kontraktor_approved boolean,
    kontraktor_approved_by character varying(255),
    kontraktor_approved_at timestamp with time zone,
    sfo_approved boolean,
    sfo_approved_by character varying(255),
    sfo_approved_at timestamp with time zone,
    pga_approved boolean,
    pga_approved_by character varying(255),
    pga_approved_at timestamp with time zone,
    fw_approved boolean,
    fw_approved_by character varying(255),
    fw_approved_at timestamp with time zone,
    pemberi_izin_approved boolean,
    pemberi_izin_approved_by character varying(255),
    pemberi_izin_approved_at timestamp with time zone,
    tipe_perusahaan character varying(20),
    admin_k3_approved boolean,
    admin_k3_approved_by character varying(255),
    admin_k3_approved_at timestamp with time zone,
    mr_pga_approved boolean,
    mr_pga_approved_by character varying(255),
    mr_pga_approved_at timestamp with time zone,
    mr_pga_mgr character varying(255),
    perlu_jsa boolean,
    jsa_file_url text,
    kontraktor_nik character varying(100),
    spv_nik character varying(100),
    admin_k3_nik character varying(100),
    sfo_nik character varying(100),
    mr_pga_nik character varying(100)
);

CREATE TABLE IF NOT EXISTS public.form_kerja_workshop_backup_20260618 (
    id integer,
    id_form character varying(20),
    tanggal timestamp with time zone,
    tanggal_pelaksanaan timestamp with time zone,
    status character varying(20),
    no_registrasi character varying(100),
    nama_kontraktor_nik character varying(255),
    nama_pekerja_nik character varying(255),
    lokasi_pekerjaan character varying(255),
    waktu_pukul time without time zone,
    nama_fire_watch character varying(255),
    nik_fire_watch character varying(100),
    jabatan_pemberi_izin character varying(255),
    nik_pemberi_ijin character varying(100),
    preventive_genset_pump_room boolean,
    tangki_solar boolean,
    panel_listrik boolean,
    detail_cutting text,
    t_mulai_cutting time without time zone,
    t_selesai_cutting time without time zone,
    detail_grinding text,
    t_mulai_grinding time without time zone,
    t_selesai_grinding time without time zone,
    detail_welding text,
    t_mulai_welding time without time zone,
    t_selesai_welding time without time zone,
    detail_painting text,
    t_mulai_painting time without time zone,
    t_selesai_painting time without time zone,
    painting_spray boolean,
    painting_non_spray boolean,
    ada_kerja_lainnya boolean,
    jenis_kerjaan_lainnya text,
    ruang_tertutup boolean,
    bahan_mudah_terbakar boolean,
    gas_bejana_tangki boolean,
    height_work boolean,
    cairan_gas_bertekan boolean,
    cairan_hydrocarbon boolean,
    bahaya_lain text,
    kondisi_tools_baik boolean,
    tersedia_apar_hydrant boolean,
    sensor_smoke_detector_non_aktif boolean,
    apd_lengkap boolean,
    tidak_ada_cairan_mudah_terbakar boolean,
    lantai_bersih boolean,
    lantai_sudah_dibasahi boolean,
    cairan_mudah_tebakar_tertutup boolean,
    lembaran_dibawah_pekerjaan boolean,
    lindungi_conveyor_dll boolean,
    alat_telah_bersih boolean,
    uap_menyala_telah_dibuang boolean,
    kerja_pada_dinding_lagit boolean,
    bahan_mudah_terbakar_dipindahkan_dari_dinding boolean,
    fire_watch_memastikan_area_aman boolean,
    firwatch_terlatih boolean,
    permintaan_tambahan text,
    spv_terkait character varying(255),
    kontraktor character varying(255),
    sfo character varying(255),
    pga character varying(255),
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    edit_token character varying(20),
    catatan_reject text,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    user_id integer,
    current_stage integer,
    spv_approved boolean,
    spv_approved_by character varying(255),
    spv_approved_at timestamp with time zone,
    kontraktor_approved boolean,
    kontraktor_approved_by character varying(255),
    kontraktor_approved_at timestamp with time zone,
    sfo_approved boolean,
    sfo_approved_by character varying(255),
    sfo_approved_at timestamp with time zone,
    pga_approved boolean,
    pga_approved_by character varying(255),
    pga_approved_at timestamp with time zone,
    fw_approved boolean,
    fw_approved_by character varying(255),
    fw_approved_at timestamp with time zone,
    pemberi_izin_approved boolean,
    pemberi_izin_approved_by character varying(255),
    pemberi_izin_approved_at timestamp with time zone,
    tipe_perusahaan character varying(20),
    admin_k3_approved boolean,
    admin_k3_approved_by character varying(255),
    admin_k3_approved_at timestamp with time zone,
    mr_pga_approved boolean,
    mr_pga_approved_by character varying(255),
    mr_pga_approved_at timestamp with time zone,
    mr_pga_mgr character varying(255),
    perlu_jsa boolean,
    jsa_file_url text,
    kontraktor_nik character varying(100),
    spv_nik character varying(100),
    admin_k3_nik character varying(100),
    sfo_nik character varying(100),
    mr_pga_nik character varying(100)
);


-- 8) Tipe sequence disamakan dengan mine (bigint -> integer); nilai sequence tetap
ALTER SEQUENCE public.departemen_id_seq AS integer;
ALTER SEQUENCE public.form_ijin_kerja_id_seq AS integer;

-- 9) Komentar kolom yang ada di mine
COMMENT ON COLUMN public.form_kerja_ketinggian.jsa_file_url IS 'URL/path file JSA yang diupload (PDF/XLSX/XLS). NULL jika tidak perlu JSA.';
COMMENT ON COLUMN public.form_kerja_ketinggian.perlu_jsa IS 'TRUE jika user memilih "Perlu JSA" saat mengisi form';
COMMENT ON COLUMN public.form_kerja_panas.jsa_file_url IS 'URL/path file JSA yang diupload (PDF/XLSX/XLS). NULL jika tidak perlu JSA.';
COMMENT ON COLUMN public.form_kerja_panas.perlu_jsa IS 'TRUE jika user memilih "Perlu JSA" saat mengisi form';
COMMENT ON COLUMN public.form_kerja_workshop.jsa_file_url IS 'URL/path file JSA yang diupload (PDF/XLSX/XLS). NULL jika tidak perlu JSA.';
COMMENT ON COLUMN public.form_kerja_workshop.perlu_jsa IS 'TRUE jika user memilih "Perlu JSA" saat mengisi form';

COMMIT;
