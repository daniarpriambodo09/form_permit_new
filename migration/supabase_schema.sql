-- =============================================================================
-- SUPABASE DATABASE SCHEMA MIGRATION / REPLICATION SCRIPT
-- Project: Form Permit (PT JAI)
-- Database Target: Supabase (PostgreSQL)
-- Schema: public
-- =============================================================================
-- CATATAN PENGGUNAAN DI SUPABASE:
-- 1. Buka Supabase Dashboard -> Masuk ke project Anda.
-- 2. Buka menu "SQL Editor" di sidebar kiri.
-- 3. Buat query baru, paste seluruh isi file ini, lalu klik "Run".
-- 4. Skrip ini akan membuat:
--    - Trigger functions (update_updated_at, dll.)
--    - Sequences & Tabel-tabel utama (10 tabel)
--    - Primary Keys, Foreign Keys, Unique & Check Constraints
--    - Indexes untuk optimasi query
--    - Triggers otomatis untuk update updated_at
-- =============================================================================

-- Pastikan menggunakan schema public
SET search_path = public;

-- =============================================================================
-- 1. TRIGGER FUNCTIONS (Fungsi Update Timestamp Otomatis)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_smtp_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. SEQUENCES
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.users_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.departemen_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.pengawas_departemen_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.smtp_settings_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.master_lisence_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.form_ijin_kerja_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.form_kerja_ketinggian_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.form_kerja_panas_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE IF NOT EXISTS public.form_kerja_workshop_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- =============================================================================
-- 3. TABLES DEFINITIONS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 Tabel: users (Manajemen Pengguna & Hak Akses)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id integer NOT NULL DEFAULT nextval('public.users_id_seq'::regclass),
    username character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    nama character varying(255) NOT NULL,
    jabatan character varying(100),
    role character varying(50) DEFAULT 'approver'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email character varying(255),
    perusahaan character varying(255),
    no_telp character varying(50),
    nik character varying(50),
    departmen character varying(255) DEFAULT 'Unknown'::character varying,
    password_encrypted text,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_username_key UNIQUE (username)
);

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

-- -----------------------------------------------------------------------------
-- 3.2 Tabel: departemen (Master Departemen Perusahaan)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departemen (
    id integer NOT NULL DEFAULT nextval('public.departemen_id_seq'::regclass),
    nama_departemen character varying(100) NOT NULL,
    keterangan text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT departemen_pkey PRIMARY KEY (id),
    CONSTRAINT departemen_nama_departemen_key UNIQUE (nama_departemen)
);

ALTER SEQUENCE public.departemen_id_seq OWNED BY public.departemen.id;

-- -----------------------------------------------------------------------------
-- 3.3 Tabel: pengawas_departemen (Master Pengawas per Departemen)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pengawas_departemen (
    id integer NOT NULL DEFAULT nextval('public.pengawas_departemen_id_seq'::regclass),
    nama character varying(255) NOT NULL,
    nik character varying(50) NOT NULL,
    departemen character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pengawas_departemen_pkey PRIMARY KEY (id),
    CONSTRAINT pengawas_departemen_nama_nik_departemen_key UNIQUE (nama, nik, departemen)
);

ALTER SEQUENCE public.pengawas_departemen_id_seq OWNED BY public.pengawas_departemen.id;

-- -----------------------------------------------------------------------------
-- 3.4 Tabel: admin_k3_email_routing (Konfigurasi Routing Notifikasi Email Admin K3)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_k3_email_routing (
    jenis_form character varying(20) NOT NULL,
    user_id integer NOT NULL,
    updated_at timestamp without time zone DEFAULT now(),
    updated_by integer,
    CONSTRAINT admin_k3_email_routing_pkey PRIMARY KEY (jenis_form),
    CONSTRAINT admin_k3_email_routing_jenis_form_check CHECK (
        (jenis_form)::text = ANY (ARRAY['hot-work'::character varying, 'height-work'::character varying, 'workshop'::character varying]::text[])
    )
);

-- -----------------------------------------------------------------------------
-- 3.5 Tabel: smtp_settings (Konfigurasi Pengiriman Email SMTP)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.smtp_settings (
    id integer NOT NULL DEFAULT nextval('public.smtp_settings_id_seq'::regclass),
    smtp_host character varying(255) NOT NULL,
    smtp_port integer DEFAULT 25 NOT NULL,
    smtp_username character varying(255),
    smtp_password character varying(255),
    email_sender character varying(255) NOT NULL,
    use_tls boolean DEFAULT false NOT NULL,
    use_ssl boolean DEFAULT false NOT NULL,
    app_url character varying(500) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT smtp_settings_pkey PRIMARY KEY (id)
);

ALTER SEQUENCE public.smtp_settings_id_seq OWNED BY public.smtp_settings.id;

-- -----------------------------------------------------------------------------
-- 3.6 Tabel: master_lisence (Master Lisensi/Sertifikat Pekerja)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.master_lisence (
    id integer NOT NULL DEFAULT nextval('public.master_lisence_id_seq'::regclass),
    nama character varying(255) NOT NULL,
    nik character varying(50) NOT NULL,
    jenis_kerja character varying(20) NOT NULL,
    file_url text,
    file_type character varying(10),
    file_name character varying(255),
    tanggal_exp date,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    departemen character varying(50),
    CONSTRAINT master_lisence_pkey PRIMARY KEY (id),
    CONSTRAINT master_lisence_nik_jenis_unique UNIQUE (nik, jenis_kerja),
    CONSTRAINT master_lisence_file_type_check CHECK (
        (file_type)::text = ANY (ARRAY['pdf'::character varying, 'image'::character varying]::text[])
    ),
    CONSTRAINT master_lisence_jenis_kerja_check CHECK (
        (jenis_kerja)::text = ANY (ARRAY['hot_work'::character varying, 'height_work'::character varying, 'workshop'::character varying]::text[])
    )
);

ALTER SEQUENCE public.master_lisence_id_seq OWNED BY public.master_lisence.id;

-- -----------------------------------------------------------------------------
-- 3.7 Tabel: form_ijin_kerja (Permit to Work - General / Ijin Kerja Induk)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.form_ijin_kerja (
    id integer NOT NULL DEFAULT nextval('public.form_ijin_kerja_id_seq'::regclass),
    id_form character varying(20) NOT NULL,
    tanggal timestamp with time zone DEFAULT now() NOT NULL,
    tanggal_pelaksanaan timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    nama_kontraktor_pekerja character varying(255),
    nama_pengawas_pic_subkont character varying(255),
    jumlah_tenaga_kerja numeric,
    tgl_mulai_kerja timestamp with time zone,
    tgl_akhir_kerja_rencana timestamp with time zone,
    waktu_kerja time without time zone,
    actual_tanggal_kerja timestamp with time zone,
    spek_area_workshop boolean DEFAULT false NOT NULL,
    spek_ruang_tertutup boolean DEFAULT false NOT NULL,
    spek_ketinggian boolean DEFAULT false NOT NULL,
    spek_tegangan_tinggi boolean DEFAULT false NOT NULL,
    spek_pemakaian_loto boolean DEFAULT false NOT NULL,
    spek_forklift boolean DEFAULT false NOT NULL,
    spek_temperatur_tinggi boolean DEFAULT false NOT NULL,
    deskripsi_pekerjaan text,
    spesifikasi_lainnya text,
    alat_mesin_potong boolean DEFAULT false NOT NULL,
    alat_mesin_potong_kondisi character varying(10),
    alat_mesin_las_gerinda boolean DEFAULT false NOT NULL,
    alat_mesin_las_gerinda_kondisi character varying(10),
    alat_genset boolean DEFAULT false NOT NULL,
    alat_genset_kondisi character varying(10),
    alat_tabung_gas boolean DEFAULT false NOT NULL,
    alat_tabung_gas_kondisi character varying(10),
    alat_tangga_listrik_awp boolean DEFAULT false NOT NULL,
    alat_tangga_listrik_awp_kondisi character varying(10),
    alat_forklift boolean DEFAULT false NOT NULL,
    alat_forklift_kondisi character varying(10),
    alat_lift_barang boolean DEFAULT false NOT NULL,
    alat_lift_barang_kondisi character varying(10),
    alat_lainnya text,
    alat_lainnya_kondisi character varying(10),
    lokasi_pekerjaan text,
    lokasi_dalam_gedung boolean DEFAULT false NOT NULL,
    lokasi_luar_gedung boolean DEFAULT false NOT NULL,
    lokasi_luar_pagar_gedung boolean DEFAULT false NOT NULL,
    lokasi_di_atas_gedung boolean DEFAULT false NOT NULL,
    lokasi_lainnya text,
    pengawas_bagian character varying(255),
    pic_loto_station_loto character varying(255),
    bahan_mudah_terbakar boolean DEFAULT false NOT NULL,
    bahan_mudah_meledak boolean DEFAULT false NOT NULL,
    bahan_kimia_beracun_iritan boolean DEFAULT false NOT NULL,
    bahan_lainnya text,
    dampak_ledakan_kebakaran boolean DEFAULT false NOT NULL,
    dampak_jatuh_ketinggian boolean DEFAULT false NOT NULL,
    dampak_kepala_tertimpa boolean DEFAULT false NOT NULL,
    dampak_kaki_tertimpa boolean DEFAULT false NOT NULL,
    dampak_tumpahan_oli_bbm_b3 boolean DEFAULT false NOT NULL,
    dampak_tersengat_listrik boolean DEFAULT false NOT NULL,
    dampak_terjepit_mesin boolean DEFAULT false NOT NULL,
    dampak_tersayat_tertusuk boolean DEFAULT false NOT NULL,
    dampak_infeksi_pernafasan boolean DEFAULT false NOT NULL,
    dampak_iritasi_mata boolean DEFAULT false NOT NULL,
    dampak_radiasi_sinar_las boolean DEFAULT false NOT NULL,
    dampak_iritasi_kulit boolean DEFAULT false NOT NULL,
    dampak_kebisingan boolean DEFAULT false NOT NULL,
    dampak_keracunan_zat_kimia boolean DEFAULT false NOT NULL,
    dampak_lainnya text,
    apd_masker boolean DEFAULT false NOT NULL,
    apd_masker_kimia boolean DEFAULT false NOT NULL,
    apd_kacamata_biasa boolean DEFAULT false NOT NULL,
    apd_kacamata_las boolean DEFAULT false NOT NULL,
    apd_ear_plug boolean DEFAULT false NOT NULL,
    apd_gloves boolean DEFAULT false NOT NULL,
    apd_full_body_harness boolean DEFAULT false NOT NULL,
    apd_sarung_tangan_bintil boolean DEFAULT false NOT NULL,
    apd_sarung_tangan_listrik boolean DEFAULT false NOT NULL,
    apd_sarung_tangan_kulit boolean DEFAULT false NOT NULL,
    apd_helm boolean DEFAULT false NOT NULL,
    apd_safety_shoes boolean DEFAULT false NOT NULL,
    apd_sepatu_karet boolean DEFAULT false NOT NULL,
    apd_topi_kerja boolean DEFAULT false NOT NULL,
    apd_lainnya text,
    license_sertifikasi text,
    apar_dry_powder boolean DEFAULT false NOT NULL,
    apar_gas_cair boolean DEFAULT false NOT NULL,
    apar_tidak_perlu boolean DEFAULT false NOT NULL,
    apar_lainnya text,
    limbah_kontraktor boolean DEFAULT false NOT NULL,
    limbah_pt_jai boolean DEFAULT false NOT NULL,
    limbah_lokasi_pt character varying(255),
    limbah_luar_jai boolean DEFAULT false NOT NULL,
    izin_kerja_dari time without time zone,
    izin_kerja_sampai time without time zone,
    kontraktor_pj character varying(255),
    spv_terkait_pj character varying(255),
    current_stage integer DEFAULT 1,
    security_approved boolean DEFAULT false NOT NULL,
    security_approved_by character varying(255),
    security_approved_at timestamp with time zone,
    security_nik character varying(100),
    sfo_approved boolean DEFAULT false NOT NULL,
    sfo_approved_by character varying(255),
    sfo_approved_at timestamp with time zone,
    sfo_nik character varying(100),
    pga_approved boolean DEFAULT false NOT NULL,
    pga_approved_by character varying(255),
    pga_approved_at timestamp with time zone,
    pga_nik character varying(100),
    handover_pengawas_lama character varying(255),
    handover_pengawas_baru character varying(255),
    handover_tanggal timestamp with time zone,
    handover_jam character varying(20),
    pernyataan_diperiksa boolean DEFAULT false NOT NULL,
    pengawas_pekerjaan_user character varying(255),
    eval_area_bersih_rapi boolean,
    eval_limbah_ditangani_baik boolean,
    eval_instalasi_listrik_aman boolean,
    eval_tdk_ada_kerusakan_property boolean,
    eval_ada_tumpahan_kimia_bbm boolean,
    eval_tdk_ada_kehilangan_property boolean,
    evaluasi_status character varying(20),
    evaluasi_submitted_by character varying(255),
    evaluasi_submitted_at timestamp with time zone,
    pengesahan_current_stage integer,
    pengesahan_pengawas_approved boolean DEFAULT false NOT NULL,
    pengesahan_pengawas_approved_by character varying(255),
    pengesahan_pengawas_approved_at timestamp with time zone,
    pengesahan_security_approved boolean DEFAULT false NOT NULL,
    pengesahan_security_approved_by character varying(255),
    pengesahan_security_approved_at timestamp with time zone,
    pengesahan_sfo_approved boolean DEFAULT false NOT NULL,
    pengesahan_sfo_approved_by character varying(255),
    pengesahan_sfo_approved_at timestamp with time zone,
    pengesahan_status character varying(20),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    edit_token character varying(20),
    catatan_reject text,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    user_id integer,
    perlu_jsa boolean DEFAULT false,
    jsa_file_url text,
    license_files jsonb DEFAULT '[]'::jsonb,
    jsa_data jsonb,
    izin_kerja_tanggal_dari date,
    izin_kerja_tanggal_sampai date,
    safety_induction jsonb,
    kontraktor_signature_url text,
    security_signature_url text,
    spv_approved boolean DEFAULT false NOT NULL,
    spv_approved_by character varying(255),
    spv_approved_at timestamp with time zone,
    spv_nik character varying(100),
    penilaian_subkontraktor jsonb,
    nik_spv_terkait_pj character varying(100),
    CONSTRAINT form_ijin_kerja_pkey PRIMARY KEY (id),
    CONSTRAINT form_ijin_kerja_edit_token_key UNIQUE (edit_token),
    CONSTRAINT form_ijin_kerja_id_form_key UNIQUE (id_form)
);

ALTER SEQUENCE public.form_ijin_kerja_id_seq OWNED BY public.form_ijin_kerja.id;

-- -----------------------------------------------------------------------------
-- 3.8 Tabel: form_kerja_ketinggian (Permit Kerja Ketinggian / Height Work)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.form_kerja_ketinggian (
    id integer NOT NULL DEFAULT nextval('public.form_kerja_ketinggian_id_seq'::regclass),
    id_form character varying(20) NOT NULL,
    tanggal timestamp with time zone DEFAULT now() NOT NULL,
    tanggal_pelaksanaan timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    petugas_ketinggian character varying(50),
    deskripsi_pekerjaan text,
    lokasi character varying(255),
    waktu_mulai time without time zone,
    waktu_selesai time without time zone,
    nama_pengawas_kontraktor character varying(255),
    nama_petugas_1 character varying(255),
    petugas_1_sehat boolean DEFAULT false,
    nama_petugas_2 character varying(255),
    petugas_2_sehat boolean DEFAULT false,
    nama_petugas_3 character varying(255),
    petugas_3_sehat boolean DEFAULT false,
    nama_petugas_4 character varying(255),
    petugas_4_sehat boolean DEFAULT false,
    nama_petugas_5 character varying(255),
    petugas_5_sehat boolean DEFAULT false,
    nama_petugas_6 character varying(255),
    petugas_6_sehat boolean DEFAULT false,
    nama_petugas_7 character varying(255),
    petugas_7_sehat boolean DEFAULT false,
    nama_petugas_8 character varying(255),
    petugas_8_sehat boolean DEFAULT false,
    nama_petugas_9 character varying(255),
    petugas_9_sehat boolean DEFAULT false,
    nama_petugas_10 character varying(255),
    petugas_10_sehat boolean DEFAULT false,
    ada_kunci_pagar boolean DEFAULT false,
    ada_rompi_ketinggian boolean DEFAULT false,
    no_rompi numeric,
    ada_safety_helmet boolean DEFAULT false,
    jumlah_safety_helmet numeric,
    ada_full_body_harmess boolean DEFAULT false,
    jumlah_full_body_harness numeric,
    area_diperiksa_aman boolean DEFAULT false,
    paham_cara_menggunakan_alat_pemadam_kebakaran boolean DEFAULT false,
    ada_kerja_listrik boolean DEFAULT false,
    prosedur_loto boolean DEFAULT false,
    menutupi_area_bawah_prisai boolean DEFAULT false,
    safetyline_tersedia boolean DEFAULT false,
    alat_bantu_kerja_aman boolean DEFAULT false,
    menggunakan_rompi boolean DEFAULT false,
    beban_tidak_5kg boolean DEFAULT false,
    helm_sesuai_sop boolean DEFAULT false,
    rambu2_tersedia boolean DEFAULT false,
    webbing_kondisi_baik boolean DEFAULT false,
    dring_kondisi_baik boolean DEFAULT false,
    gesper_kondisi_baik boolean DEFAULT false,
    absorter_dan_timbes_kondisi_baik boolean DEFAULT false,
    snap_hook_kondisi_baik boolean DEFAULT false,
    rope_lanyard_kondisi_baik boolean DEFAULT false,
    spv_terkait character varying(255),
    nama_kontraktor character varying(255),
    sfo character varying(255),
    mr_pga_mgr character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    edit_token character varying(20),
    catatan_reject text,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    user_id integer,
    current_stage integer DEFAULT 1,
    spv_approved boolean DEFAULT false,
    spv_approved_by character varying(255),
    spv_approved_at timestamp with time zone,
    kontraktor_approved boolean DEFAULT false,
    kontraktor_approved_by character varying(255),
    kontraktor_approved_at timestamp with time zone,
    sfo_approved boolean DEFAULT false,
    sfo_approved_by character varying(255),
    sfo_approved_at timestamp with time zone,
    mr_pga_approved boolean DEFAULT false,
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
    admin_k3_approved boolean DEFAULT false NOT NULL,
    admin_k3_approved_by character varying(255),
    admin_k3_approved_at timestamp with time zone,
    tipe_perusahaan character varying(20),
    perlu_jsa boolean DEFAULT false NOT NULL,
    jsa_file_url text,
    kontraktor_nik character varying(100),
    spv_nik character varying(100),
    admin_k3_nik character varying(100),
    sfo_nik character varying(100),
    mr_pga_nik character varying(100),
    helm_kondisi_baik boolean DEFAULT false NOT NULL,
    id_ijin_kerja character varying(20),
    kontraktor_signature_url text,
    jsa_data jsonb,
    CONSTRAINT form_kerja_ketinggian_pkey PRIMARY KEY (id),
    CONSTRAINT form_kerja_ketinggian_edit_token_key UNIQUE (edit_token),
    CONSTRAINT form_kerja_ketinggian_id_form_key UNIQUE (id_form)
);

ALTER SEQUENCE public.form_kerja_ketinggian_id_seq OWNED BY public.form_kerja_ketinggian.id;

-- Komentar dokumentasi storage untuk foto lisensi ketinggian
COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_1 IS 'URL foto lisensi petugas 1 (Supabase Storage)';
COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_2 IS 'URL foto lisensi petugas 2 (Supabase Storage)';
COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_3 IS 'URL foto lisensi petugas 3 (Supabase Storage)';
COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_4 IS 'URL foto lisensi petugas 4 (Supabase Storage)';
COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_5 IS 'URL foto lisensi petugas 5 (Supabase Storage)';
COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_6 IS 'URL foto lisensi petugas 6 (Supabase Storage)';
COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_7 IS 'URL foto lisensi petugas 7 (Supabase Storage)';
COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_8 IS 'URL foto lisensi petugas 8 (Supabase Storage)';
COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_9 IS 'URL foto lisensi petugas 9 (Supabase Storage)';
COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_10 IS 'URL foto lisensi petugas 10 (Supabase Storage)';
COMMENT ON COLUMN public.form_kerja_ketinggian.perlu_jsa IS 'TRUE jika user memilih "Perlu JSA" saat mengisi form';
COMMENT ON COLUMN public.form_kerja_ketinggian.jsa_file_url IS 'URL/path file JSA yang diupload (PDF/XLSX/XLS). NULL jika tidak perlu JSA.';

-- -----------------------------------------------------------------------------
-- 3.9 Tabel: form_kerja_panas (Permit Kerja Panas / Hot Work)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.form_kerja_panas (
    id integer NOT NULL DEFAULT nextval('public.form_kerja_panas_id_seq'::regclass),
    id_form character varying(20) NOT NULL,
    tanggal timestamp with time zone DEFAULT now() NOT NULL,
    tanggal_pelaksanaan timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    no_registrasi character varying(100),
    nama_kontraktor_nik character varying(255),
    nama_pekerja_nik character varying(255),
    lokasi_pekerjaan character varying(255),
    waktu_pukul time without time zone,
    waktu_selesai time without time zone,
    nama_fire_watch character varying(255),
    nik_fire_watch character varying(100),
    tanda_tangan_fw text,
    jabatan_pemberi_izin character varying(255),
    nik_pemberi_ijin character varying(100),
    preventive_genset_pump_room boolean DEFAULT false,
    tangki_solar boolean DEFAULT false,
    panel_listrik boolean DEFAULT false,
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
    ada_kerja_lainnya boolean DEFAULT false,
    jenis_kerjaan_lainnya text,
    ruang_tertutup boolean DEFAULT false,
    bahan_mudah_terbakar boolean DEFAULT false,
    gas_bejana_tangki boolean DEFAULT false,
    height_work boolean DEFAULT false,
    cairan_gas_bertekan boolean DEFAULT false,
    cairan_hydrocarbon boolean DEFAULT false,
    bahaya_lain text,
    kondisi_tools_baik boolean DEFAULT false,
    tersedia_apar_hydrant boolean DEFAULT false,
    sensor_smoke_detector_non_aktif boolean DEFAULT false,
    apd_lengkap boolean DEFAULT false,
    tidak_ada_cairan_mudah_terbakar boolean DEFAULT false,
    lantai_bersih boolean DEFAULT false,
    lantai_sudah_dibasahi boolean DEFAULT false,
    cairan_mudah_tebakar_tertutup boolean DEFAULT false,
    lembaran_dibawah_pekerjaan boolean DEFAULT false,
    lindungi_conveyor_dll boolean DEFAULT false,
    alat_telah_bersih boolean DEFAULT false,
    uap_menyala_telah_dibuang boolean DEFAULT false,
    kerja_pada_dinding_lagit boolean DEFAULT false,
    bahan_mudah_terbakar_dipindahkan_dari_dinding boolean DEFAULT false,
    fire_watch_memastikan_area_aman boolean DEFAULT false,
    firwatch_terlatih boolean DEFAULT false,
    kondisi_fire_blanket boolean DEFAULT false,
    jumlah_fire_blanket integer,
    permintaan_tambahan text,
    spv_terkait character varying(255),
    kontraktor character varying(255),
    sfo character varying(255),
    pga character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    edit_token character varying(20),
    catatan_reject text,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    user_id integer,
    current_stage integer DEFAULT 0,
    spv_approved boolean DEFAULT false,
    spv_approved_by character varying(255),
    spv_approved_at timestamp with time zone,
    kontraktor_approved boolean DEFAULT false,
    kontraktor_approved_by character varying(255),
    kontraktor_approved_at timestamp with time zone,
    sfo_approved boolean DEFAULT false,
    sfo_approved_by character varying(255),
    sfo_approved_at timestamp with time zone,
    pga_approved boolean DEFAULT false,
    pga_approved_by character varying(255),
    pga_approved_at timestamp with time zone,
    fw_approved boolean DEFAULT false NOT NULL,
    fw_approved_by character varying(255),
    fw_approved_at timestamp with time zone,
    pemberi_izin_approved boolean DEFAULT false NOT NULL,
    pemberi_izin_approved_by character varying(255),
    pemberi_izin_approved_at timestamp with time zone,
    tipe_perusahaan character varying(20) DEFAULT 'eksternal'::character varying,
    admin_k3_approved boolean DEFAULT false NOT NULL,
    admin_k3_approved_by character varying(255),
    admin_k3_approved_at timestamp with time zone,
    mr_pga_approved boolean DEFAULT false NOT NULL,
    mr_pga_approved_by character varying(255),
    mr_pga_approved_at timestamp with time zone,
    mr_pga_mgr character varying(255),
    perlu_jsa boolean DEFAULT false NOT NULL,
    jsa_file_url text,
    kontraktor_nik character varying(100),
    spv_nik character varying(100),
    admin_k3_nik character varying(100),
    sfo_nik character varying(100),
    mr_pga_nik character varying(100),
    id_ijin_kerja character varying(20),
    kontraktor_signature_url text,
    jsa_data jsonb,
    CONSTRAINT form_kerja_panas_pkey PRIMARY KEY (id),
    CONSTRAINT form_kerja_panas_edit_token_key UNIQUE (edit_token),
    CONSTRAINT form_kerja_panas_id_form_key UNIQUE (id_form)
);

ALTER SEQUENCE public.form_kerja_panas_id_seq OWNED BY public.form_kerja_panas.id;

COMMENT ON COLUMN public.form_kerja_panas.perlu_jsa IS 'TRUE jika user memilih "Perlu JSA" saat mengisi form';
COMMENT ON COLUMN public.form_kerja_panas.jsa_file_url IS 'URL/path file JSA yang diupload (PDF/XLSX/XLS). NULL jika tidak perlu JSA.';

-- -----------------------------------------------------------------------------
-- 3.10 Tabel: form_kerja_workshop (Permit Kerja Workshop)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.form_kerja_workshop (
    id integer NOT NULL DEFAULT nextval('public.form_kerja_workshop_id_seq'::regclass),
    id_form character varying(20) NOT NULL,
    tanggal timestamp with time zone DEFAULT now() NOT NULL,
    tanggal_pelaksanaan timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    no_registrasi character varying(100),
    nama_kontraktor_nik character varying(255),
    nama_pekerja_nik character varying(255),
    lokasi_pekerjaan character varying(255),
    waktu_pukul time without time zone,
    waktu_selesai time without time zone,
    nama_fire_watch character varying(255),
    nik_fire_watch character varying(100),
    jabatan_pemberi_izin character varying(255),
    nik_pemberi_ijin character varying(100),
    preventive_genset_pump_room boolean DEFAULT false,
    tangki_solar boolean DEFAULT false,
    panel_listrik boolean DEFAULT false,
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
    painting_spray boolean DEFAULT false,
    painting_non_spray boolean DEFAULT false,
    ada_kerja_lainnya boolean DEFAULT false,
    jenis_kerjaan_lainnya text,
    ruang_tertutup boolean DEFAULT false,
    bahan_mudah_terbakar boolean DEFAULT false,
    gas_bejana_tangki boolean DEFAULT false,
    height_work boolean DEFAULT false,
    cairan_gas_bertekan boolean DEFAULT false,
    cairan_hydrocarbon boolean DEFAULT false,
    bahaya_lain text,
    kondisi_tools_baik boolean DEFAULT false,
    tersedia_apar_hydrant boolean DEFAULT false,
    sensor_smoke_detector_non_aktif boolean DEFAULT false,
    apd_lengkap boolean DEFAULT false,
    tidak_ada_cairan_mudah_terbakar boolean DEFAULT false,
    lantai_bersih boolean DEFAULT false,
    lantai_sudah_dibasahi boolean DEFAULT false,
    cairan_mudah_tebakar_tertutup boolean DEFAULT false,
    lembaran_dibawah_pekerjaan boolean DEFAULT false,
    lindungi_conveyor_dll boolean DEFAULT false,
    alat_telah_bersih boolean DEFAULT false,
    uap_menyala_telah_dibuang boolean DEFAULT false,
    kerja_pada_dinding_lagit boolean DEFAULT false,
    bahan_mudah_terbakar_dipindahkan_dari_dinding boolean DEFAULT false,
    fire_watch_memastikan_area_aman boolean DEFAULT false,
    firwatch_terlatih boolean DEFAULT false,
    permintaan_tambahan text,
    spv_terkait character varying(255),
    kontraktor character varying(255),
    sfo character varying(255),
    pga character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    edit_token character varying(20),
    catatan_reject text,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    user_id integer,
    current_stage integer DEFAULT 0,
    spv_approved boolean DEFAULT false,
    spv_approved_by character varying(255),
    spv_approved_at timestamp with time zone,
    kontraktor_approved boolean DEFAULT false,
    kontraktor_approved_by character varying(255),
    kontraktor_approved_at timestamp with time zone,
    sfo_approved boolean DEFAULT false,
    sfo_approved_by character varying(255),
    sfo_approved_at timestamp with time zone,
    pga_approved boolean DEFAULT false,
    pga_approved_by character varying(255),
    pga_approved_at timestamp with time zone,
    fw_approved boolean DEFAULT false NOT NULL,
    fw_approved_by character varying(255),
    fw_approved_at timestamp with time zone,
    pemberi_izin_approved boolean DEFAULT false NOT NULL,
    pemberi_izin_approved_by character varying(255),
    pemberi_izin_approved_at timestamp with time zone,
    tipe_perusahaan character varying(20) DEFAULT 'eksternal'::character varying,
    admin_k3_approved boolean DEFAULT false NOT NULL,
    admin_k3_approved_by character varying(255),
    admin_k3_approved_at timestamp with time zone,
    mr_pga_approved boolean DEFAULT false NOT NULL,
    mr_pga_approved_by character varying(255),
    mr_pga_approved_at timestamp with time zone,
    mr_pga_mgr character varying(255),
    perlu_jsa boolean DEFAULT false NOT NULL,
    jsa_file_url text,
    kontraktor_nik character varying(100),
    spv_nik character varying(100),
    admin_k3_nik character varying(100),
    sfo_nik character varying(100),
    mr_pga_nik character varying(100),
    nik_pekerja character varying(100),
    id_ijin_kerja character varying(20),
    kontraktor_signature_url text,
    checklist_pencegahan jsonb,
    jsa_data jsonb,
    CONSTRAINT form_kerja_workshop_pkey PRIMARY KEY (id),
    CONSTRAINT form_kerja_workshop_edit_token_key UNIQUE (edit_token),
    CONSTRAINT form_kerja_workshop_id_form_key UNIQUE (id_form)
);

ALTER SEQUENCE public.form_kerja_workshop_id_seq OWNED BY public.form_kerja_workshop.id;

COMMENT ON COLUMN public.form_kerja_workshop.perlu_jsa IS 'TRUE jika user memilih "Perlu JSA" saat mengisi form';
COMMENT ON COLUMN public.form_kerja_workshop.jsa_file_url IS 'URL/path file JSA yang diupload (PDF/XLSX/XLS). NULL jika tidak perlu JSA.';

-- =============================================================================
-- 4. FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- admin_k3_email_routing FK
ALTER TABLE ONLY public.admin_k3_email_routing
    DROP CONSTRAINT IF EXISTS admin_k3_email_routing_user_id_fkey,
    ADD CONSTRAINT admin_k3_email_routing_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.admin_k3_email_routing
    DROP CONSTRAINT IF EXISTS admin_k3_email_routing_updated_by_fkey,
    ADD CONSTRAINT admin_k3_email_routing_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);

-- master_lisence FK
ALTER TABLE ONLY public.master_lisence
    DROP CONSTRAINT IF EXISTS master_lisence_created_by_fkey,
    ADD CONSTRAINT master_lisence_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.master_lisence
    DROP CONSTRAINT IF EXISTS master_lisence_updated_by_fkey,
    ADD CONSTRAINT master_lisence_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- form_ijin_kerja FK
ALTER TABLE ONLY public.form_ijin_kerja
    DROP CONSTRAINT IF EXISTS form_ijin_kerja_user_id_fkey,
    ADD CONSTRAINT form_ijin_kerja_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- form_kerja_ketinggian FK
ALTER TABLE ONLY public.form_kerja_ketinggian
    DROP CONSTRAINT IF EXISTS form_kerja_ketinggian_user_id_fkey,
    ADD CONSTRAINT form_kerja_ketinggian_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.form_kerja_ketinggian
    DROP CONSTRAINT IF EXISTS form_kerja_ketinggian_id_ijin_kerja_fkey,
    ADD CONSTRAINT form_kerja_ketinggian_id_ijin_kerja_fkey FOREIGN KEY (id_ijin_kerja) REFERENCES public.form_ijin_kerja(id_form) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- form_kerja_panas FK
ALTER TABLE ONLY public.form_kerja_panas
    DROP CONSTRAINT IF EXISTS form_kerja_panas_user_id_fkey,
    ADD CONSTRAINT form_kerja_panas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.form_kerja_panas
    DROP CONSTRAINT IF EXISTS form_kerja_panas_id_ijin_kerja_fkey,
    ADD CONSTRAINT form_kerja_panas_id_ijin_kerja_fkey FOREIGN KEY (id_ijin_kerja) REFERENCES public.form_ijin_kerja(id_form) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- form_kerja_workshop FK
ALTER TABLE ONLY public.form_kerja_workshop
    DROP CONSTRAINT IF EXISTS form_kerja_workshop_user_id_fkey,
    ADD CONSTRAINT form_kerja_workshop_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.form_kerja_workshop
    DROP CONSTRAINT IF EXISTS form_kerja_workshop_id_ijin_kerja_fkey,
    ADD CONSTRAINT form_kerja_workshop_id_ijin_kerja_fkey FOREIGN KEY (id_ijin_kerja) REFERENCES public.form_ijin_kerja(id_form) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- =============================================================================
-- 5. INDEXES
-- =============================================================================

-- departemen
CREATE INDEX IF NOT EXISTS idx_departemen_active ON public.departemen USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_departemen_nama ON public.departemen USING btree (nama_departemen);

-- pengawas_departemen
CREATE INDEX IF NOT EXISTS idx_pengawas_departemen_active ON public.pengawas_departemen USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_pengawas_departemen_departemen ON public.pengawas_departemen USING btree (departemen);

-- smtp_settings
CREATE UNIQUE INDEX IF NOT EXISTS smtp_settings_one_active ON public.smtp_settings USING btree (is_active) WHERE (is_active = true);

-- master_lisence
CREATE INDEX IF NOT EXISTS idx_master_lisence_departemen ON public.master_lisence USING btree (departemen);
CREATE INDEX IF NOT EXISTS idx_master_lisence_exp ON public.master_lisence USING btree (tanggal_exp);
CREATE INDEX IF NOT EXISTS idx_master_lisence_jenis_kerja ON public.master_lisence USING btree (jenis_kerja);
CREATE INDEX IF NOT EXISTS idx_master_lisence_nama ON public.master_lisence USING btree (nama);
CREATE INDEX IF NOT EXISTS idx_master_lisence_nik ON public.master_lisence USING btree (nik);

-- form_ijin_kerja
CREATE INDEX IF NOT EXISTS idx_ijk_edit_token ON public.form_ijin_kerja USING btree (edit_token);
CREATE INDEX IF NOT EXISTS idx_ijk_status ON public.form_ijin_kerja USING btree (status);
CREATE INDEX IF NOT EXISTS idx_ijk_tanggal ON public.form_ijin_kerja USING btree (tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_ijk_user_id ON public.form_ijin_kerja USING btree (user_id);

-- form_kerja_ketinggian
CREATE INDEX IF NOT EXISTS idx_hew_edit_token ON public.form_kerja_ketinggian USING btree (edit_token);
CREATE INDEX IF NOT EXISTS idx_hew_status ON public.form_kerja_ketinggian USING btree (status);
CREATE INDEX IF NOT EXISTS idx_hew_user_id ON public.form_kerja_ketinggian USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_ketinggian_admin_k3 ON public.form_kerja_ketinggian USING btree (admin_k3_approved);
CREATE INDEX IF NOT EXISTS idx_ketinggian_id_ijin_kerja ON public.form_kerja_ketinggian USING btree (id_ijin_kerja);
CREATE INDEX IF NOT EXISTS idx_ketinggian_status ON public.form_kerja_ketinggian USING btree (status);
CREATE INDEX IF NOT EXISTS idx_ketinggian_tanggal ON public.form_kerja_ketinggian USING btree (tanggal DESC);

-- form_kerja_panas
CREATE INDEX IF NOT EXISTS idx_panas_edit_token ON public.form_kerja_panas USING btree (edit_token);
CREATE INDEX IF NOT EXISTS idx_panas_id_ijin_kerja ON public.form_kerja_panas USING btree (id_ijin_kerja);
CREATE INDEX IF NOT EXISTS idx_panas_status ON public.form_kerja_panas USING btree (status);
CREATE INDEX IF NOT EXISTS idx_panas_tanggal ON public.form_kerja_panas USING btree (tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_panas_tipe ON public.form_kerja_panas USING btree (tipe_perusahaan);
CREATE INDEX IF NOT EXISTS idx_panas_user_id ON public.form_kerja_panas USING btree (user_id);

-- form_kerja_workshop
CREATE INDEX IF NOT EXISTS idx_workshop_edit_token ON public.form_kerja_workshop USING btree (edit_token);
CREATE INDEX IF NOT EXISTS idx_workshop_id_ijin_kerja ON public.form_kerja_workshop USING btree (id_ijin_kerja);
CREATE INDEX IF NOT EXISTS idx_workshop_status ON public.form_kerja_workshop USING btree (status);
CREATE INDEX IF NOT EXISTS idx_workshop_tanggal ON public.form_kerja_workshop USING btree (tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_tipe ON public.form_kerja_workshop USING btree (tipe_perusahaan);
CREATE INDEX IF NOT EXISTS idx_workshop_user_id ON public.form_kerja_workshop USING btree (user_id);

-- =============================================================================
-- 6. TRIGGERS
-- =============================================================================

-- users
DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- smtp_settings
DROP TRIGGER IF EXISTS trg_smtp_settings_updated_at ON public.smtp_settings;
CREATE TRIGGER trg_smtp_settings_updated_at
    BEFORE UPDATE ON public.smtp_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_smtp_settings_updated_at();

-- master_lisence
DROP TRIGGER IF EXISTS trg_master_lisence_updated ON public.master_lisence;
CREATE TRIGGER trg_master_lisence_updated
    BEFORE UPDATE ON public.master_lisence
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- form_ijin_kerja
DROP TRIGGER IF EXISTS trg_ijk_updated ON public.form_ijin_kerja;
CREATE TRIGGER trg_ijk_updated
    BEFORE UPDATE ON public.form_ijin_kerja
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- form_kerja_ketinggian
DROP TRIGGER IF EXISTS trg_ketinggian_updated ON public.form_kerja_ketinggian;
CREATE TRIGGER trg_ketinggian_updated
    BEFORE UPDATE ON public.form_kerja_ketinggian
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- form_kerja_panas
DROP TRIGGER IF EXISTS trg_panas_updated ON public.form_kerja_panas;
CREATE TRIGGER trg_panas_updated
    BEFORE UPDATE ON public.form_kerja_panas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- form_kerja_workshop
DROP TRIGGER IF EXISTS trg_workshop_updated ON public.form_kerja_workshop;
CREATE TRIGGER trg_workshop_updated
    BEFORE UPDATE ON public.form_kerja_workshop
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- SELESAI. SELURUH SCHEMA BERHASIL DIDEFINISIKAN.
-- =============================================================================
