--
-- PostgreSQL database dump
--

\restrict RLQHkdygNpsNw6Z1Fqscq7g5MSHtWmLvt2iyk9wXgjxDTUgBFGwM6wkDjiDqJGi

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_smtp_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_smtp_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_smtp_settings_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._schema_migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public._schema_migrations OWNER TO postgres;

--
-- Name: _schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public._schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public._schema_migrations_id_seq OWNER TO postgres;

--
-- Name: _schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public._schema_migrations_id_seq OWNED BY public._schema_migrations.id;


--
-- Name: admin_k3_email_routing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_k3_email_routing (
    jenis_form character varying(20) NOT NULL,
    user_id integer NOT NULL,
    updated_at timestamp without time zone DEFAULT now(),
    updated_by integer
);


ALTER TABLE public.admin_k3_email_routing OWNER TO postgres;

--
-- Name: departemen; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departemen (
    id integer NOT NULL,
    nama_departemen character varying(100) NOT NULL,
    keterangan text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.departemen OWNER TO postgres;

--
-- Name: departemen_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departemen_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departemen_id_seq OWNER TO postgres;

--
-- Name: departemen_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departemen_id_seq OWNED BY public.departemen.id;


--
-- Name: form_approver_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_approver_assignments (
    id_form character varying(50) NOT NULL,
    role character varying(30) NOT NULL,
    user_id integer NOT NULL,
    assigned_by integer,
    assigned_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.form_approver_assignments OWNER TO postgres;

--
-- Name: form_ijin_kerja; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_ijin_kerja (
    id integer NOT NULL,
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
    waktu_selesai time without time zone,
    admin_k3_approved boolean DEFAULT false NOT NULL,
    admin_k3_approved_by character varying(255),
    admin_k3_approved_at timestamp with time zone,
    admin_k3_nik character varying(100)
);


ALTER TABLE public.form_ijin_kerja OWNER TO postgres;

--
-- Name: form_ijin_kerja_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.form_ijin_kerja_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.form_ijin_kerja_id_seq OWNER TO postgres;

--
-- Name: form_ijin_kerja_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_ijin_kerja_id_seq OWNED BY public.form_ijin_kerja.id;


--
-- Name: form_kerja_ketinggian; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_kerja_ketinggian (
    id integer NOT NULL,
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
    perlu_scaffolding boolean DEFAULT false
);


ALTER TABLE public.form_kerja_ketinggian OWNER TO postgres;

--
-- Name: COLUMN form_kerja_ketinggian.foto_lisensi_1; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_1 IS 'URL foto lisensi petugas 1 (Supabase Storage)';


--
-- Name: COLUMN form_kerja_ketinggian.foto_lisensi_2; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_2 IS 'URL foto lisensi petugas 2 (Supabase Storage)';


--
-- Name: COLUMN form_kerja_ketinggian.foto_lisensi_3; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_3 IS 'URL foto lisensi petugas 3 (Supabase Storage)';


--
-- Name: COLUMN form_kerja_ketinggian.foto_lisensi_4; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_4 IS 'URL foto lisensi petugas 4 (Supabase Storage)';


--
-- Name: COLUMN form_kerja_ketinggian.foto_lisensi_5; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_5 IS 'URL foto lisensi petugas 5 (Supabase Storage)';


--
-- Name: COLUMN form_kerja_ketinggian.foto_lisensi_6; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_6 IS 'URL foto lisensi petugas 6 (Supabase Storage)';


--
-- Name: COLUMN form_kerja_ketinggian.foto_lisensi_7; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_7 IS 'URL foto lisensi petugas 7 (Supabase Storage)';


--
-- Name: COLUMN form_kerja_ketinggian.foto_lisensi_8; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_8 IS 'URL foto lisensi petugas 8 (Supabase Storage)';


--
-- Name: COLUMN form_kerja_ketinggian.foto_lisensi_9; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_9 IS 'URL foto lisensi petugas 9 (Supabase Storage)';


--
-- Name: COLUMN form_kerja_ketinggian.foto_lisensi_10; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_ketinggian.foto_lisensi_10 IS 'URL foto lisensi petugas 10 (Supabase Storage)';


--
-- Name: COLUMN form_kerja_ketinggian.perlu_jsa; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_ketinggian.perlu_jsa IS 'TRUE jika user memilih "Perlu JSA" saat mengisi form';


--
-- Name: COLUMN form_kerja_ketinggian.jsa_file_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_ketinggian.jsa_file_url IS 'URL/path file JSA yang diupload (PDF/XLSX/XLS). NULL jika tidak perlu JSA.';


--
-- Name: COLUMN form_kerja_ketinggian.perlu_scaffolding; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_ketinggian.perlu_scaffolding IS 'TRUE jika form eksternal memerlukan inspeksi scaffolding';


--
-- Name: form_kerja_ketinggian_backup_20260618; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_kerja_ketinggian_backup_20260618 (
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


ALTER TABLE public.form_kerja_ketinggian_backup_20260618 OWNER TO postgres;

--
-- Name: form_kerja_ketinggian_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.form_kerja_ketinggian_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.form_kerja_ketinggian_id_seq OWNER TO postgres;

--
-- Name: form_kerja_ketinggian_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_kerja_ketinggian_id_seq OWNED BY public.form_kerja_ketinggian.id;


--
-- Name: form_kerja_panas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_kerja_panas (
    id integer NOT NULL,
    id_form character varying(20) NOT NULL,
    tanggal timestamp with time zone DEFAULT now() NOT NULL,
    tanggal_pelaksanaan timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
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
    waktu_selesai time without time zone
);


ALTER TABLE public.form_kerja_panas OWNER TO postgres;

--
-- Name: COLUMN form_kerja_panas.perlu_jsa; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_panas.perlu_jsa IS 'TRUE jika user memilih "Perlu JSA" saat mengisi form';


--
-- Name: COLUMN form_kerja_panas.jsa_file_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_panas.jsa_file_url IS 'URL/path file JSA yang diupload (PDF/XLSX/XLS). NULL jika tidak perlu JSA.';


--
-- Name: form_kerja_panas_backup_20260618; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_kerja_panas_backup_20260618 (
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


ALTER TABLE public.form_kerja_panas_backup_20260618 OWNER TO postgres;

--
-- Name: form_kerja_panas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.form_kerja_panas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.form_kerja_panas_id_seq OWNER TO postgres;

--
-- Name: form_kerja_panas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_kerja_panas_id_seq OWNED BY public.form_kerja_panas.id;


--
-- Name: form_kerja_workshop; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_kerja_workshop (
    id integer NOT NULL,
    id_form character varying(20) NOT NULL,
    tanggal timestamp with time zone DEFAULT now() NOT NULL,
    tanggal_pelaksanaan timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    no_registrasi character varying(100),
    nama_kontraktor_nik character varying(255),
    nama_pekerja_nik character varying(255),
    lokasi_pekerjaan character varying(255),
    waktu_pukul time without time zone,
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
    waktu_selesai time without time zone
);


ALTER TABLE public.form_kerja_workshop OWNER TO postgres;

--
-- Name: COLUMN form_kerja_workshop.perlu_jsa; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_workshop.perlu_jsa IS 'TRUE jika user memilih "Perlu JSA" saat mengisi form';


--
-- Name: COLUMN form_kerja_workshop.jsa_file_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.form_kerja_workshop.jsa_file_url IS 'URL/path file JSA yang diupload (PDF/XLSX/XLS). NULL jika tidak perlu JSA.';


--
-- Name: form_kerja_workshop_backup_20260618; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_kerja_workshop_backup_20260618 (
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


ALTER TABLE public.form_kerja_workshop_backup_20260618 OWNER TO postgres;

--
-- Name: form_kerja_workshop_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.form_kerja_workshop_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.form_kerja_workshop_id_seq OWNER TO postgres;

--
-- Name: form_kerja_workshop_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_kerja_workshop_id_seq OWNED BY public.form_kerja_workshop.id;


--
-- Name: inspeksi_scaffolding; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inspeksi_scaffolding (
    id integer NOT NULL,
    id_form character varying(50) NOT NULL,
    id_ijin_kerja character varying(50),
    nama_inspektor character varying(255),
    tanggal_inspeksi date,
    lokasi character varying(255),
    tipe_perancah character varying(255),
    status character varying(50) DEFAULT 'draft'::character varying,
    current_stage integer DEFAULT 1,
    items jsonb DEFAULT '[]'::jsonb,
    ketentuan_lainnya jsonb DEFAULT '[]'::jsonb,
    pengawas_id integer,
    pengawas_nama character varying(255),
    pengawas_submitted_at timestamp with time zone,
    spv_approved boolean DEFAULT false,
    spv_approved_by character varying(255),
    spv_approved_at timestamp with time zone,
    sfo_approved boolean DEFAULT false,
    sfo_approved_by character varying(255),
    sfo_approved_at timestamp with time zone,
    kontraktor_approved boolean DEFAULT false,
    kontraktor_approved_by character varying(255),
    kontraktor_approved_at timestamp with time zone,
    catatan_reject text,
    rejected_by character varying(255),
    rejected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.inspeksi_scaffolding OWNER TO postgres;

--
-- Name: inspeksi_scaffolding_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inspeksi_scaffolding_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inspeksi_scaffolding_id_seq OWNER TO postgres;

--
-- Name: inspeksi_scaffolding_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inspeksi_scaffolding_id_seq OWNED BY public.inspeksi_scaffolding.id;


--
-- Name: master_lisence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.master_lisence (
    id integer NOT NULL,
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
    CONSTRAINT master_lisence_file_type_check CHECK (((file_type)::text = ANY ((ARRAY['pdf'::character varying, 'image'::character varying])::text[]))),
    CONSTRAINT master_lisence_jenis_kerja_check CHECK (((jenis_kerja)::text = ANY ((ARRAY['hot_work'::character varying, 'height_work'::character varying, 'workshop'::character varying])::text[])))
);


ALTER TABLE public.master_lisence OWNER TO postgres;

--
-- Name: master_lisence_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.master_lisence_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.master_lisence_id_seq OWNER TO postgres;

--
-- Name: master_lisence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.master_lisence_id_seq OWNED BY public.master_lisence.id;


--
-- Name: pengawas_departemen; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pengawas_departemen (
    id integer NOT NULL,
    nama character varying(255) NOT NULL,
    nik character varying(50) NOT NULL,
    departemen character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pengawas_departemen OWNER TO postgres;

--
-- Name: pengawas_departemen_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pengawas_departemen_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pengawas_departemen_id_seq OWNER TO postgres;

--
-- Name: pengawas_departemen_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pengawas_departemen_id_seq OWNED BY public.pengawas_departemen.id;


--
-- Name: smtp_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.smtp_settings (
    id integer NOT NULL,
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
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.smtp_settings OWNER TO postgres;

--
-- Name: smtp_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.smtp_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.smtp_settings_id_seq OWNER TO postgres;

--
-- Name: smtp_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.smtp_settings_id_seq OWNED BY public.smtp_settings.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
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
    password_encrypted text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: _schema_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._schema_migrations ALTER COLUMN id SET DEFAULT nextval('public._schema_migrations_id_seq'::regclass);


--
-- Name: departemen id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departemen ALTER COLUMN id SET DEFAULT nextval('public.departemen_id_seq'::regclass);


--
-- Name: form_ijin_kerja id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_ijin_kerja ALTER COLUMN id SET DEFAULT nextval('public.form_ijin_kerja_id_seq'::regclass);


--
-- Name: form_kerja_ketinggian id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_ketinggian ALTER COLUMN id SET DEFAULT nextval('public.form_kerja_ketinggian_id_seq'::regclass);


--
-- Name: form_kerja_panas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_panas ALTER COLUMN id SET DEFAULT nextval('public.form_kerja_panas_id_seq'::regclass);


--
-- Name: form_kerja_workshop id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_workshop ALTER COLUMN id SET DEFAULT nextval('public.form_kerja_workshop_id_seq'::regclass);


--
-- Name: inspeksi_scaffolding id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspeksi_scaffolding ALTER COLUMN id SET DEFAULT nextval('public.inspeksi_scaffolding_id_seq'::regclass);


--
-- Name: master_lisence id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_lisence ALTER COLUMN id SET DEFAULT nextval('public.master_lisence_id_seq'::regclass);


--
-- Name: pengawas_departemen id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pengawas_departemen ALTER COLUMN id SET DEFAULT nextval('public.pengawas_departemen_id_seq'::regclass);


--
-- Name: smtp_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smtp_settings ALTER COLUMN id SET DEFAULT nextval('public.smtp_settings_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: _schema_migrations _schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._schema_migrations
    ADD CONSTRAINT _schema_migrations_filename_key UNIQUE (filename);


--
-- Name: _schema_migrations _schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._schema_migrations
    ADD CONSTRAINT _schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: admin_k3_email_routing admin_k3_email_routing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_k3_email_routing
    ADD CONSTRAINT admin_k3_email_routing_pkey PRIMARY KEY (jenis_form);


--
-- Name: departemen departemen_nama_departemen_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departemen
    ADD CONSTRAINT departemen_nama_departemen_key UNIQUE (nama_departemen);


--
-- Name: departemen departemen_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departemen
    ADD CONSTRAINT departemen_pkey PRIMARY KEY (id);


--
-- Name: form_approver_assignments form_approver_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_approver_assignments
    ADD CONSTRAINT form_approver_assignments_pkey PRIMARY KEY (id_form, role);


--
-- Name: form_ijin_kerja form_ijin_kerja_edit_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_ijin_kerja
    ADD CONSTRAINT form_ijin_kerja_edit_token_key UNIQUE (edit_token);


--
-- Name: form_ijin_kerja form_ijin_kerja_id_form_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_ijin_kerja
    ADD CONSTRAINT form_ijin_kerja_id_form_key UNIQUE (id_form);


--
-- Name: form_ijin_kerja form_ijin_kerja_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_ijin_kerja
    ADD CONSTRAINT form_ijin_kerja_pkey PRIMARY KEY (id);


--
-- Name: form_kerja_ketinggian form_kerja_ketinggian_edit_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_ketinggian
    ADD CONSTRAINT form_kerja_ketinggian_edit_token_key UNIQUE (edit_token);


--
-- Name: form_kerja_ketinggian form_kerja_ketinggian_id_form_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_ketinggian
    ADD CONSTRAINT form_kerja_ketinggian_id_form_key UNIQUE (id_form);


--
-- Name: form_kerja_ketinggian form_kerja_ketinggian_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_ketinggian
    ADD CONSTRAINT form_kerja_ketinggian_pkey PRIMARY KEY (id);


--
-- Name: form_kerja_panas form_kerja_panas_edit_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_panas
    ADD CONSTRAINT form_kerja_panas_edit_token_key UNIQUE (edit_token);


--
-- Name: form_kerja_panas form_kerja_panas_id_form_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_panas
    ADD CONSTRAINT form_kerja_panas_id_form_key UNIQUE (id_form);


--
-- Name: form_kerja_panas form_kerja_panas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_panas
    ADD CONSTRAINT form_kerja_panas_pkey PRIMARY KEY (id);


--
-- Name: form_kerja_workshop form_kerja_workshop_edit_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_workshop
    ADD CONSTRAINT form_kerja_workshop_edit_token_key UNIQUE (edit_token);


--
-- Name: form_kerja_workshop form_kerja_workshop_id_form_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_workshop
    ADD CONSTRAINT form_kerja_workshop_id_form_key UNIQUE (id_form);


--
-- Name: form_kerja_workshop form_kerja_workshop_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_workshop
    ADD CONSTRAINT form_kerja_workshop_pkey PRIMARY KEY (id);


--
-- Name: inspeksi_scaffolding inspeksi_scaffolding_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspeksi_scaffolding
    ADD CONSTRAINT inspeksi_scaffolding_pkey PRIMARY KEY (id);


--
-- Name: master_lisence master_lisence_nik_jenis_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_lisence
    ADD CONSTRAINT master_lisence_nik_jenis_unique UNIQUE (nik, jenis_kerja);


--
-- Name: master_lisence master_lisence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_lisence
    ADD CONSTRAINT master_lisence_pkey PRIMARY KEY (id);


--
-- Name: pengawas_departemen pengawas_departemen_nama_nik_departemen_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pengawas_departemen
    ADD CONSTRAINT pengawas_departemen_nama_nik_departemen_key UNIQUE (nama, nik, departemen);


--
-- Name: pengawas_departemen pengawas_departemen_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pengawas_departemen
    ADD CONSTRAINT pengawas_departemen_pkey PRIMARY KEY (id);


--
-- Name: smtp_settings smtp_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.smtp_settings
    ADD CONSTRAINT smtp_settings_pkey PRIMARY KEY (id);


--
-- Name: inspeksi_scaffolding uq_inspeksi_scaffolding_id_form; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspeksi_scaffolding
    ADD CONSTRAINT uq_inspeksi_scaffolding_id_form UNIQUE (id_form);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_departemen_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departemen_active ON public.departemen USING btree (is_active);


--
-- Name: idx_departemen_nama; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departemen_nama ON public.departemen USING btree (nama_departemen);


--
-- Name: idx_hew_edit_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hew_edit_token ON public.form_kerja_ketinggian USING btree (edit_token);


--
-- Name: idx_hew_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hew_status ON public.form_kerja_ketinggian USING btree (status);


--
-- Name: idx_hew_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hew_user_id ON public.form_kerja_ketinggian USING btree (user_id);


--
-- Name: idx_ijk_edit_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ijk_edit_token ON public.form_ijin_kerja USING btree (edit_token);


--
-- Name: idx_ijk_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ijk_status ON public.form_ijin_kerja USING btree (status);


--
-- Name: idx_ijk_tanggal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ijk_tanggal ON public.form_ijin_kerja USING btree (tanggal DESC);


--
-- Name: idx_ijk_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ijk_user_id ON public.form_ijin_kerja USING btree (user_id);


--
-- Name: idx_inspeksi_scaffolding_id_form; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inspeksi_scaffolding_id_form ON public.inspeksi_scaffolding USING btree (id_form);


--
-- Name: idx_inspeksi_scaffolding_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inspeksi_scaffolding_stage ON public.inspeksi_scaffolding USING btree (current_stage);


--
-- Name: idx_inspeksi_scaffolding_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inspeksi_scaffolding_status ON public.inspeksi_scaffolding USING btree (status);


--
-- Name: idx_ketinggian_admin_k3; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ketinggian_admin_k3 ON public.form_kerja_ketinggian USING btree (admin_k3_approved);


--
-- Name: idx_ketinggian_id_ijin_kerja; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ketinggian_id_ijin_kerja ON public.form_kerja_ketinggian USING btree (id_ijin_kerja);


--
-- Name: idx_ketinggian_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ketinggian_status ON public.form_kerja_ketinggian USING btree (status);


--
-- Name: idx_ketinggian_tanggal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ketinggian_tanggal ON public.form_kerja_ketinggian USING btree (tanggal DESC);


--
-- Name: idx_master_lisence_departemen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_master_lisence_departemen ON public.master_lisence USING btree (departemen);


--
-- Name: idx_master_lisence_exp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_master_lisence_exp ON public.master_lisence USING btree (tanggal_exp);


--
-- Name: idx_master_lisence_jenis_kerja; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_master_lisence_jenis_kerja ON public.master_lisence USING btree (jenis_kerja);


--
-- Name: idx_master_lisence_nama; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_master_lisence_nama ON public.master_lisence USING btree (nama);


--
-- Name: idx_master_lisence_nik; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_master_lisence_nik ON public.master_lisence USING btree (nik);


--
-- Name: idx_panas_edit_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_panas_edit_token ON public.form_kerja_panas USING btree (edit_token);


--
-- Name: idx_panas_id_ijin_kerja; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_panas_id_ijin_kerja ON public.form_kerja_panas USING btree (id_ijin_kerja);


--
-- Name: idx_panas_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_panas_status ON public.form_kerja_panas USING btree (status);


--
-- Name: idx_panas_tanggal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_panas_tanggal ON public.form_kerja_panas USING btree (tanggal DESC);


--
-- Name: idx_panas_tipe; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_panas_tipe ON public.form_kerja_panas USING btree (tipe_perusahaan);


--
-- Name: idx_panas_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_panas_user_id ON public.form_kerja_panas USING btree (user_id);


--
-- Name: idx_pengawas_departemen_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pengawas_departemen_active ON public.pengawas_departemen USING btree (is_active);


--
-- Name: idx_pengawas_departemen_departemen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pengawas_departemen_departemen ON public.pengawas_departemen USING btree (departemen);


--
-- Name: idx_workshop_edit_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workshop_edit_token ON public.form_kerja_workshop USING btree (edit_token);


--
-- Name: idx_workshop_id_ijin_kerja; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workshop_id_ijin_kerja ON public.form_kerja_workshop USING btree (id_ijin_kerja);


--
-- Name: idx_workshop_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workshop_status ON public.form_kerja_workshop USING btree (status);


--
-- Name: idx_workshop_tanggal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workshop_tanggal ON public.form_kerja_workshop USING btree (tanggal DESC);


--
-- Name: idx_workshop_tipe; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workshop_tipe ON public.form_kerja_workshop USING btree (tipe_perusahaan);


--
-- Name: idx_workshop_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workshop_user_id ON public.form_kerja_workshop USING btree (user_id);


--
-- Name: smtp_settings_one_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX smtp_settings_one_active ON public.smtp_settings USING btree (is_active) WHERE (is_active = true);


--
-- Name: users set_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: form_ijin_kerja trg_ijk_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ijk_updated BEFORE UPDATE ON public.form_ijin_kerja FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: form_kerja_ketinggian trg_ketinggian_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ketinggian_updated BEFORE UPDATE ON public.form_kerja_ketinggian FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: master_lisence trg_master_lisence_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_master_lisence_updated BEFORE UPDATE ON public.master_lisence FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: form_kerja_panas trg_panas_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_panas_updated BEFORE UPDATE ON public.form_kerja_panas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: smtp_settings trg_smtp_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_smtp_settings_updated_at BEFORE UPDATE ON public.smtp_settings FOR EACH ROW EXECUTE FUNCTION public.update_smtp_settings_updated_at();


--
-- Name: form_kerja_workshop trg_workshop_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_workshop_updated BEFORE UPDATE ON public.form_kerja_workshop FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: admin_k3_email_routing admin_k3_email_routing_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_k3_email_routing
    ADD CONSTRAINT admin_k3_email_routing_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: admin_k3_email_routing admin_k3_email_routing_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_k3_email_routing
    ADD CONSTRAINT admin_k3_email_routing_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: form_approver_assignments form_approver_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_approver_assignments
    ADD CONSTRAINT form_approver_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: form_ijin_kerja form_ijin_kerja_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_ijin_kerja
    ADD CONSTRAINT form_ijin_kerja_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: form_kerja_ketinggian form_kerja_ketinggian_id_ijin_kerja_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_ketinggian
    ADD CONSTRAINT form_kerja_ketinggian_id_ijin_kerja_fkey FOREIGN KEY (id_ijin_kerja) REFERENCES public.form_ijin_kerja(id_form) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: form_kerja_ketinggian form_kerja_ketinggian_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_ketinggian
    ADD CONSTRAINT form_kerja_ketinggian_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: form_kerja_panas form_kerja_panas_id_ijin_kerja_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_panas
    ADD CONSTRAINT form_kerja_panas_id_ijin_kerja_fkey FOREIGN KEY (id_ijin_kerja) REFERENCES public.form_ijin_kerja(id_form) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: form_kerja_panas form_kerja_panas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_panas
    ADD CONSTRAINT form_kerja_panas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: form_kerja_workshop form_kerja_workshop_id_ijin_kerja_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_workshop
    ADD CONSTRAINT form_kerja_workshop_id_ijin_kerja_fkey FOREIGN KEY (id_ijin_kerja) REFERENCES public.form_ijin_kerja(id_form) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: form_kerja_workshop form_kerja_workshop_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_kerja_workshop
    ADD CONSTRAINT form_kerja_workshop_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: master_lisence master_lisence_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_lisence
    ADD CONSTRAINT master_lisence_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: master_lisence master_lisence_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_lisence
    ADD CONSTRAINT master_lisence_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict RLQHkdygNpsNw6Z1Fqscq7g5MSHtWmLvt2iyk9wXgjxDTUgBFGwM6wkDjiDqJGi

