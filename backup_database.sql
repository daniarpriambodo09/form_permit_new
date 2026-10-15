--
-- PostgreSQL database dump
--

-- Dumped from database version 16.6
-- Dumped by pg_dump version 16.6

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
-- Name: admin_k3_email_routing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_k3_email_routing (
    jenis_form character varying(20) NOT NULL,
    user_id integer NOT NULL,
    updated_at timestamp without time zone DEFAULT now(),
    updated_by integer,
    CONSTRAINT admin_k3_email_routing_jenis_form_check CHECK (((jenis_form)::text = ANY ((ARRAY['hot-work'::character varying, 'height-work'::character varying, 'workshop'::character varying])::text[])))
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
    nik_spv_terkait_pj character varying(100)
);


ALTER TABLE public.form_ijin_kerja OWNER TO postgres;

--
-- Name: form_ijin_kerja_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.form_ijin_kerja_id_seq
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
    id_ijin_kerja character varying(20)
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
    jsa_data jsonb
);


ALTER TABLE public.form_kerja_panas OWNER TO postgres;

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
    id_ijin_kerja character varying(20)
);


ALTER TABLE public.form_kerja_workshop OWNER TO postgres;

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

ALTER TABLE public.master_lisence ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.master_lisence_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


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
-- Data for Name: admin_k3_email_routing; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.admin_k3_email_routing VALUES ('hot-work', 29, '2026-08-29 15:26:34.561159', 1);
INSERT INTO public.admin_k3_email_routing VALUES ('height-work', 29, '2026-08-29 15:26:39.096108', 1);
INSERT INTO public.admin_k3_email_routing VALUES ('workshop', 79, '2026-08-29 15:27:32.442642', 1);


--
-- Data for Name: departemen; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.departemen VALUES (1, 'QA', NULL, true, '2026-08-29 09:46:52.609806+07', '2026-08-29 09:46:52.609806+07');
INSERT INTO public.departemen VALUES (2, 'ENG', NULL, true, '2026-08-29 09:46:52.609806+07', '2026-08-29 09:46:52.609806+07');
INSERT INTO public.departemen VALUES (3, 'MTC', NULL, true, '2026-08-29 09:46:52.609806+07', '2026-08-29 09:46:52.609806+07');
INSERT INTO public.departemen VALUES (4, 'PRODUKSI', NULL, true, '2026-08-29 09:46:52.609806+07', '2026-08-29 09:46:52.609806+07');
INSERT INTO public.departemen VALUES (5, 'NYS', NULL, true, '2026-08-29 09:46:52.609806+07', '2026-08-29 09:46:52.609806+07');
INSERT INTO public.departemen VALUES (6, 'FATP-Exim', NULL, true, '2026-08-29 09:46:52.609806+07', '2026-08-29 09:46:52.609806+07');
INSERT INTO public.departemen VALUES (7, 'MPC-WHS', NULL, true, '2026-08-29 09:46:52.609806+07', '2026-08-29 09:46:52.609806+07');
INSERT INTO public.departemen VALUES (8, 'PGA', NULL, true, '2026-08-29 09:46:52.609806+07', '2026-08-29 09:46:52.609806+07');
INSERT INTO public.departemen VALUES (9, 'HIMIT', NULL, true, '2026-08-29 09:46:52.609806+07', '2026-08-29 09:46:52.609806+07');


--
-- Data for Name: form_ijin_kerja; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: form_kerja_ketinggian; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.form_kerja_ketinggian VALUES (50, 'HAW-0001', '2026-08-29 16:22:31.162+07', '2026-08-29 07:00:00+07', 'submitted', 'Internal / Karyawan PT.JAI', 'Pergantian ID Conveyor', 'Genba A CV AB5', '16:00:00', '16:15:00', NULL, 'Dahana Pratama Putra', false, NULL, false, NULL, false, NULL, false, NULL, false, NULL, false, NULL, false, NULL, false, NULL, false, NULL, false, true, false, NULL, true, 1, true, 1, true, false, false, false, false, true, false, false, false, false, false, true, true, true, true, true, true, NULL, NULL, NULL, NULL, '2026-08-29 16:22:31.163128+07', '2026-08-29 16:33:23.504283+07', NULL, NULL, NULL, NULL, 34, 4, true, 'hayu', '2026-08-29 16:29:15.081+07', false, NULL, NULL, true, 'hayu.p', '2026-08-29 16:33:23.498+07', false, NULL, NULL, 'Agus Riono', 'PGA', '/form-permit/api/files/master-lisence/2796a681-25a7-4f57-94b5-8270aa30536f.jpeg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 'Dahana Pratama', '2026-08-29 16:30:33.689+07', 'internal', false, NULL, NULL, NULL, NULL, NULL, NULL, true, NULL);


--
-- Data for Name: form_kerja_panas; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.form_kerja_panas VALUES (36, 'HW-0001', '2026-06-25 09:01:47.175+07', '2026-06-25 07:00:00+07', 'submitted', NULL, NULL, 'Daniar Produksi', 'Produksi', '00:00:00', 'ARIF BUDI DARMAWAN', '22865', '', NULL, NULL, false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, false, false, false, false, false, false, NULL, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-25 09:01:47.176119+07', '2026-06-25 09:01:47.176119+07', '9J3U-63EB', NULL, NULL, NULL, 57, 1, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_panas VALUES (37, 'HW-0002', '2026-07-02 09:09:54.808+07', '2026-07-02 07:00:00+07', 'submitted', NULL, NULL, 'Fauzi', 'Gate 5 Exim', '09:00:00', 'AGUS', '11359', '', 'Supervisor', '37', false, false, false, 'meotong besi', '09:30:00', '11:30:00', NULL, NULL, NULL, 'Las pada bantalan', '13:00:00', '14:00:00', NULL, NULL, NULL, false, NULL, false, false, false, false, false, false, NULL, true, true, false, true, true, true, false, false, false, false, false, false, false, false, true, true, true, 1, 'Fire watch memastikan area aman 60 menit setelahnya', NULL, NULL, NULL, NULL, '2026-07-02 09:09:54.819639+07', '2026-08-31 13:05:34.275509+07', 'VQV4-TYTS', NULL, NULL, NULL, 34, 4, true, 'Aris Cahyono', '2026-07-02 11:43:24.22+07', false, NULL, NULL, true, 'hayu.p', '2026-08-31 13:05:34.274+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', true, 'Dahana Pratama', '2026-08-31 12:59:28.394+07', false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: form_kerja_workshop; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.form_kerja_workshop VALUES (7, 'HW-1000', '2026-05-30 12:03:49.199+07', '2026-05-31 07:00:00+07', 'submitted', NULL, NULL, 'rouf', 'workshop', '21:00:00', NULL, NULL, NULL, NULL, false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-05-30 12:03:49.200106+07', '2026-06-05 14:59:03.629276+07', NULL, NULL, NULL, NULL, NULL, 0, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (22, 'WS-0013', '2026-07-15 09:04:13.655+07', '2026-07-17 07:00:00+07', 'rejected', NULL, NULL, 'MUH. ABDUL ROUF / 1026', 'WORKSHOP JAI', '09:00:00', 'ELDESTIA F', '9123', 'Supervisor', '42', false, false, false, 'BESI, IVORY', '09:00:00', '16:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-07-15 09:04:13.656205+07', '2026-09-18 08:46:03.797968+07', NULL, 'upaya pencegahan tidak dilengkapi', 'Dahana Pratama', '2026-09-18 08:46:03.796+07', 54, 2, true, 'Toni Wijaya', '2026-07-15 10:36:40.397+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (23, 'WS-0014', '2026-07-24 07:43:42.073+07', '2026-07-24 07:00:00+07', 'rejected', NULL, NULL, 'MUH. ABDUL ROUF', 'WORKSHOP JAI', '08:30:00', 'ELDESTIA F', '9123', 'Supervisor', '42', false, false, false, 'CUTTING BESI &IVORY', '08:30:00', '00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-07-24 07:43:42.074535+07', '2026-09-18 08:46:14.26134+07', NULL, 'upaya pencegahan tidak dilengkapi', 'Dahana Pratama', '2026-09-18 08:46:14.259+07', 54, 2, true, 'Toni Wijaya', '2026-07-24 13:02:32.091+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (25, 'WS-0016', '2026-07-27 08:27:59.468+07', '2026-07-27 07:00:00+07', 'rejected', NULL, NULL, 'MUH. ABDUL ROUF / 1026', 'WORKSHOP JAI (ROUTINE)', '09:00:00', 'ELDESTIA F', '9123', 'Supervisor', '42', false, false, false, 'CUTTING BESI & IVORY', '09:00:00', '00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-07-27 08:27:59.479709+07', '2026-09-18 08:46:39.246807+07', NULL, 'upaya pencegahan tidak dilengkapi', 'Dahana Pratama', '2026-09-18 08:46:39.235+07', 54, 2, true, 'Toni Wijaya', '2026-07-27 10:39:57.027+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (14, 'WS-0005', '2026-06-23 16:29:10.788+07', '2026-06-24 07:00:00+07', 'submitted', NULL, 'PT. SKT International', 'DADANG', 'Genba JAI ( Cek Kamera Dinolite )', '10:30:00', 'ELDESTIA F', '9123', NULL, NULL, false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-06-23 16:29:10.792212+07', '2026-06-23 16:29:10.792212+07', NULL, NULL, NULL, NULL, 54, 1, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'eksternal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (16, 'WS-0007', '2026-06-24 07:41:06.969+07', NULL, 'submitted', NULL, NULL, 'WIDIK HARIANTO/7920', 'WORKSHOP', '08:00:00', 'LANI GUNAWAN', '1366', NULL, NULL, false, false, false, 'BEAM RACK', '08:00:00', '10:00:00', 'BEAM RACK', '10:00:00', '11:30:00', NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, 'Tangan tergores,kena percikan saat grinding,tertimpa benda berat', true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, NULL, NULL, NULL, NULL, NULL, '2026-06-24 07:41:06.969829+07', '2026-06-24 07:41:06.969829+07', NULL, NULL, NULL, NULL, 50, 1, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (17, 'WS-0008', '2026-06-24 07:53:29.684+07', '2026-06-24 07:00:00+07', 'draft', NULL, NULL, 'WIDIK HARIANTO/7920', 'WORKSHOP', '08:00:00', 'LANI GUNAWAN', '1366', NULL, NULL, false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, NULL, NULL, NULL, NULL, NULL, '2026-06-24 07:53:29.694113+07', '2026-06-24 07:53:29.694113+07', NULL, NULL, NULL, NULL, 50, 1, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (8, 'HW-1001', '2026-06-05 16:33:45.332+07', '2026-06-06 07:00:00+07', 'approved', NULL, NULL, 'fauzi', 'workshop', '20:35:00', 'AGUS', '11359', 'Supervisor', '36', false, false, false, 'potong', '18:34:00', '20:36:00', 'poles', '23:39:00', '12:37:00', NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-06-05 16:33:45.332814+07', '2026-06-24 17:02:53.681359+07', NULL, NULL, 'Cahyo Ady Nugroho', '2026-06-24 17:02:53.68+07', 34, 4, true, 'hayu', NULL, false, NULL, NULL, true, 'hayu.p', NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', true, 'Dahana Pratama', NULL, true, 'Cahyo Ady Nugroho', '2026-06-24 17:02:53.68+07', NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (9, 'HW-1002', '2026-06-17 16:28:23.069+07', '2026-06-18 07:00:00+07', 'approved', NULL, NULL, 'Moh. Abdul Rouf / 1026', 'Workshop', '21:27:00', 'ELDESTIA F', '9123', 'Supervisor', '42', false, false, false, 'Potong Besi', '21:28:00', '12:28:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-06-17 16:28:23.070597+07', '2026-06-24 17:03:21.258046+07', NULL, NULL, 'Cahyo Ady Nugroho', '2026-06-24 17:03:21.242+07', 54, 4, true, 'Toni Wijaya', '2026-06-17 16:29:10.334+07', false, NULL, NULL, true, 'hayu.p', '2026-06-24 16:54:13.801+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', true, 'Dahana Pratama', '2026-06-24 16:01:20.142+07', true, 'Cahyo Ady Nugroho', '2026-06-24 17:03:21.242+07', NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (11, 'WS-0002', '2026-06-18 16:09:43.379+07', '2026-06-19 07:00:00+07', 'approved', NULL, NULL, '1026', 'Workshop', '09:00:00', 'ELDESTIA F', '9123', 'Supervisor', '42', false, false, false, 'Plat Strip, Bettonesser, Ivory', '08:30:00', '10:00:00', 'Plat Strip, Bettonesser, Ivory', '10:15:00', '12:00:00', 'Plat Strip, Bettonesser', '13:00:00', '15:30:00', NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, 'Serpihan potongan plat strip, betonesser dan ivory', true, true, true, true, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-06-18 16:09:43.38033+07', '2026-06-24 17:03:35.536083+07', NULL, NULL, 'Cahyo Ady Nugroho', '2026-06-24 17:03:35.52+07', 54, 4, true, 'Toni Wijaya', '2026-06-24 08:20:45.288+07', false, NULL, NULL, true, 'hayu.p', '2026-06-24 16:54:42.496+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', true, 'Dahana Pratama', '2026-06-24 16:01:31.877+07', true, 'Cahyo Ady Nugroho', '2026-06-24 17:03:35.52+07', NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (12, 'WS-0003', '2026-06-22 16:35:03.305+07', '2026-06-23 07:00:00+07', 'approved', NULL, NULL, '1026', 'Workshop', '08:30:00', 'ELDESTIA F', '9123', 'Supervisor', '42', false, false, false, 'Potong Besi', '08:30:00', '10:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, true, true, false, true, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-06-22 16:35:03.307206+07', '2026-06-24 17:03:46.063924+07', NULL, NULL, 'Cahyo Ady Nugroho', '2026-06-24 17:03:46.048+07', 54, 4, true, 'Toni Wijaya', '2026-06-24 08:20:59.41+07', false, NULL, NULL, true, 'hayu.p', '2026-06-24 16:55:05.183+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', true, 'Dahana Pratama', '2026-06-24 16:01:07.602+07', true, 'Cahyo Ady Nugroho', '2026-06-24 17:03:46.048+07', NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (29, 'WS-0020', '2026-08-31 17:36:46.694+07', '2026-09-01 07:00:00+07', 'submitted', NULL, NULL, 'MUH. ABDUL ROUF / 1026', 'WOKRSHOP', '09:00:00', 'ELDESTIA F', '9123', NULL, NULL, false, false, false, 'CUTTING', '09:00:00', '00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-08-31 17:36:46.702795+07', '2026-08-31 17:36:46.702795+07', NULL, NULL, NULL, NULL, 54, 1, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, '1026', NULL);
INSERT INTO public.form_kerja_workshop VALUES (20, 'WS-0011', '2026-07-03 16:34:47.826+07', '2026-07-04 07:00:00+07', 'rejected', NULL, NULL, 'MOH. ABDUL ROUF', 'GENBA A ( Repair plastik rework area Toyota Gedung A )', '07:15:00', 'ELDESTIA F', '9123', 'Supervisor', '42', false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, true, true, false, true, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-07-03 16:34:47.841248+07', '2026-09-18 08:45:47.852727+07', NULL, 'upaya pencegahan tidak dilengkapi', 'Dahana Pratama', '2026-09-18 08:45:47.85+07', 54, 2, true, 'Toni Wijaya', '2026-07-06 08:28:34.198+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (28, 'WS-0019', '2026-08-29 15:22:57.581+07', '2026-08-29 07:00:00+07', 'submitted', NULL, NULL, 'Ahmad Fauzi / 17530', 'workshop', '15:30:00', 'AGUS', '11359', 'Supervisor', '36', false, false, false, 'rack lemari besi', '16:00:00', '00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, true, true, false, true, true, true, false, true, true, false, false, false, false, false, true, true, 'fire blanket', NULL, NULL, NULL, NULL, '2026-08-29 15:22:57.583334+07', '2026-09-01 09:23:25.578327+07', NULL, NULL, NULL, NULL, 34, 3, true, 'hayu', '2026-08-31 13:00:59.152+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', true, 'Dahana Pratama', '2026-09-01 09:23:25.576+07', false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, '17530', NULL);
INSERT INTO public.form_kerja_workshop VALUES (32, 'WS-0023', '2026-09-04 07:41:21.385+07', '2026-09-04 07:00:00+07', 'submitted', NULL, NULL, 'MUH. ABDUL ROUF / 1026', 'WORKSHOP', '09:00:00', 'ELDESTIA F', '9123', NULL, NULL, false, false, false, 'CUTTING BESI KOTAK', '09:00:00', '00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-09-04 07:41:21.3875+07', '2026-09-04 07:41:21.3875+07', NULL, NULL, NULL, NULL, 54, 1, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, '1026', NULL);
INSERT INTO public.form_kerja_workshop VALUES (33, 'WS-0024', '2026-09-09 16:14:45.746+07', '2026-09-10 07:00:00+07', 'submitted', NULL, NULL, 'MUH. ABDUL ROUF / 1026', 'WORKSHOP', '09:00:00', 'ELDESTIA F', '9123', NULL, NULL, false, false, false, 'CUTTING HOLLOW 3X3', '09:00:00', '10:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, 'Serpihan potongan besi hollow', true, true, false, true, true, true, true, true, true, true, true, false, true, true, true, true, NULL, NULL, NULL, NULL, NULL, '2026-09-09 16:14:45.758553+07', '2026-09-09 16:14:45.758553+07', NULL, NULL, NULL, NULL, 54, 1, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, '1026', NULL);
INSERT INTO public.form_kerja_workshop VALUES (18, 'WS-0009', '2026-07-03 14:43:19.605+07', '2026-07-04 07:00:00+07', 'submitted', NULL, NULL, 'Fauzi', 'workshop', '07:30:00', 'AGUS', '11359', 'Supervisor', '46', false, false, false, 'Potong Besi Holo Untuk kursi genba', '07:30:00', '15:00:00', 'Besi Holo Untuk kursi genba', '07:30:00', '15:00:00', 'Besi Holo Kursi Genba', '07:30:00', '15:00:00', NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, true, true, false, true, true, true, false, true, true, true, false, false, false, false, true, true, NULL, NULL, NULL, NULL, NULL, '2026-07-03 14:43:19.61479+07', '2026-08-31 13:05:38.421063+07', NULL, NULL, NULL, NULL, 34, 4, true, 'Agung Indrayana', '2026-07-06 07:46:23.982+07', false, NULL, NULL, true, 'hayu.p', '2026-08-31 13:05:38.42+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', true, 'Dahana Pratama', '2026-08-31 12:59:42.801+07', false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (27, 'WS-0018', '2026-08-29 14:32:49.087+07', '2026-08-30 07:00:00+07', 'submitted', NULL, NULL, 'fauzi / 17530', 'workshop karyawan', '06:00:00', 'AGUS', '11359', 'Supervisor', '36', false, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, NULL, NULL, NULL, NULL, NULL, '2026-08-29 14:32:49.100856+07', '2026-09-01 09:23:49.98306+07', NULL, NULL, NULL, NULL, 34, 3, true, 'hayu', '2026-08-31 13:00:53.115+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', true, 'Dahana Pratama', '2026-09-01 09:23:49.98+07', false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, '17530', NULL);
INSERT INTO public.form_kerja_workshop VALUES (30, 'WS-0021', '2026-09-01 16:23:17.07+07', '2026-09-02 07:00:00+07', 'submitted', NULL, NULL, 'MUH. ABDUL ROUF / 1026', 'WOKRSHOP', '09:00:00', 'ELDESTIA F', '9123', NULL, NULL, false, false, false, 'CUTTING BESI KOTAK (3X3 & 4X4)', '09:00:00', '00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, true, true, false, true, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-09-01 16:23:17.072668+07', '2026-09-01 16:23:17.072668+07', NULL, NULL, NULL, NULL, 54, 1, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, '1026', NULL);
INSERT INTO public.form_kerja_workshop VALUES (31, 'WS-0022', '2026-09-02 16:29:52.983+07', '2026-09-03 07:00:00+07', 'submitted', NULL, NULL, 'MUH. ABDUL ROUF / 1026', 'WORKSHOP', '09:00:00', 'ELDESTIA F', '9123', NULL, NULL, false, false, false, 'CUTTING BESI KOTAK', '09:00:00', '00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, true, true, false, true, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-09-02 16:29:52.99216+07', '2026-09-02 16:29:52.99216+07', NULL, NULL, NULL, NULL, 54, 1, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, '1026', NULL);
INSERT INTO public.form_kerja_workshop VALUES (34, 'WS-0025', '2026-09-11 08:04:31.779+07', '2026-09-11 07:00:00+07', 'submitted', NULL, NULL, 'MUH. ABDUL ROUF / 1026', 'WORKSHOP', '09:00:00', 'ELDESTIA F', '9123', NULL, NULL, false, false, false, 'CUTTING BESI KOTAK', '09:00:00', '00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, true, false, true, true, true, true, true, true, true, true, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-09-11 08:04:31.781544+07', '2026-09-11 08:04:31.781544+07', NULL, NULL, NULL, NULL, 54, 1, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, '1026', NULL);
INSERT INTO public.form_kerja_workshop VALUES (35, 'WS-0026', '2026-09-11 16:14:30.206+07', '2026-09-12 07:00:00+07', 'submitted', NULL, NULL, 'MUH. ABDUL ROUF / 1026', 'WORKSHOP', '09:00:00', 'ELDESTIA F', '9123', NULL, NULL, false, false, false, 'CUTTING BESI KOTAK', '09:00:00', '00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, true, true, false, true, true, true, true, true, true, true, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-09-11 16:14:30.211278+07', '2026-09-11 16:14:30.211278+07', NULL, NULL, NULL, NULL, 54, 1, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, '1026', NULL);
INSERT INTO public.form_kerja_workshop VALUES (26, 'WS-0017', '2026-07-27 15:58:10.547+07', '2026-07-28 07:00:00+07', 'rejected', NULL, NULL, 'MUH. ABDUL ROUF / 1026', 'WORKSHOP JAI', '09:00:00', 'ELDESTIA F', '9123', 'Supervisor', '42', false, false, false, 'CUTTING BESI & IVORY', '09:00:00', '00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-07-27 15:58:10.56203+07', '2026-09-18 08:45:38.873596+07', NULL, 'upaya pencegahan tidak dilengkapi', 'Dahana Pratama', '2026-09-18 08:45:38.871+07', 54, 2, true, 'Toni Wijaya', '2026-07-27 16:33:03.626+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (21, 'WS-0012', '2026-07-15 09:02:10.331+07', '2026-07-16 07:00:00+07', 'rejected', NULL, NULL, 'MUH. ABDUL ROUF / 1026', 'WORKSHOP JAI', '09:00:00', 'ELDESTIA F', '9123', 'Supervisor', '42', false, false, false, 'CUTTING', '09:00:00', '16:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, false, NULL, false, false, false, false, false, false, NULL, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, NULL, NULL, NULL, NULL, NULL, '2026-07-15 09:02:10.335144+07', '2026-09-18 08:45:55.851829+07', NULL, 'upaya pencegahan tidak dilengkapi', 'Dahana Pratama', '2026-09-18 08:45:55.849+07', 54, 2, true, 'Toni Wijaya', '2026-07-15 10:36:30.265+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.form_kerja_workshop VALUES (24, 'WS-0015', '2026-07-24 16:02:43.263+07', '2026-07-25 07:00:00+07', 'rejected', NULL, NULL, 'MUH. ABDUL ROUF / 1026 ( TEMPAT TUTUP POLYTENER TNGA )', 'WORKSHOP JAI', '08:00:00', 'ELDESTIA F', '9123', 'Supervisor', '42', false, false, false, 'CUTTING BESI SIKU & PLAT', '08:00:00', '10:00:00', 'GRINDING BESI SIKU & PLAT', '10:00:00', '11:00:00', 'WELDING BESI SIKU & PLAT', '11:01:00', '02:45:00', 'PAINTING BESI SIKU & PLAT', '02:46:00', '04:10:00', true, true, false, NULL, false, false, false, false, false, false, NULL, true, true, false, true, false, true, false, true, false, false, true, false, false, false, false, false, '', NULL, NULL, NULL, NULL, '2026-07-24 16:02:43.276927+07', '2026-09-18 08:46:32.555253+07', NULL, 'upaya pencegahan tidak dilengkapi', 'Dahana Pratama', '2026-09-18 08:46:32.553+07', 54, 2, true, 'Toni Wijaya', '2026-07-27 10:36:18.196+07', false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, false, NULL, NULL, 'internal', false, NULL, NULL, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: master_lisence; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.master_lisence VALUES (3, 'AHMAD FAUZI', '17529', 'height_work', '/form-permit/api/files/master-lisence/ac4b7857-c518-4046-a618-33bf5c6aa0e4.jpeg', 'image', 'Ahmad Fauzi.jpg', '2028-05-09', true, 1, 1, '2026-09-01 10:12:12.119429+07', '2026-09-01 10:12:12.119429+07', 'PGA');
INSERT INTO public.master_lisence VALUES (5, 'AHMAD ZAINUL ARIF', '16416', 'height_work', '/form-permit/api/files/master-lisence/954455bc-a7bd-4921-8d5a-2d18862ee81e.jpeg', 'image', 'Ahmad Zainul Arif.jpg', '2031-07-14', true, 1, 1, '2026-09-01 10:14:26.733883+07', '2026-09-01 10:14:26.733883+07', 'PGA');
INSERT INTO public.master_lisence VALUES (7, 'AHMAD FAUZI', '17529', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:24:01.727939+07', '2026-09-01 10:24:01.727939+07', 'PGA');
INSERT INTO public.master_lisence VALUES (8, 'AGUS RIONO', '11359', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:27:32.581484+07', '2026-09-01 10:27:32.581484+07', 'PGA');
INSERT INTO public.master_lisence VALUES (9, 'AHMAD ZAINUL ARIF', '16416', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:28:05.172503+07', '2026-09-01 10:28:05.172503+07', 'PGA');
INSERT INTO public.master_lisence VALUES (10, 'HADITIAN SYEH ACHMAD WICAKSONO', '16660', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:29:34.87094+07', '2026-09-01 10:29:34.87094+07', 'PGA');
INSERT INTO public.master_lisence VALUES (11, 'HADITIAN SYEH A. W.', '16660', 'height_work', '/form-permit/api/files/master-lisence/c22618fe-bd94-45e6-aa50-f00b394da9da.jpeg', 'image', 'Haditian Syech Achmad Wicaksono.jpg', '2028-04-09', true, 1, 1, '2026-09-01 10:35:35.383305+07', '2026-09-01 10:35:35.383305+07', 'PGA');
INSERT INTO public.master_lisence VALUES (2, 'DAHANA PRATAMA PUTRA', '17530', 'height_work', '/form-permit/api/files/master-lisence/2796a681-25a7-4f57-94b5-8270aa30536f.jpeg', 'image', 'Dahana Pratama Putra.jpg', '2028-06-04', true, 1, 1, '2026-08-29 15:40:19.07963+07', '2026-08-29 15:40:19.07963+07', 'PGA');
INSERT INTO public.master_lisence VALUES (12, 'MUCHAMMAD JAINURI', '3936', 'height_work', '/form-permit/api/files/master-lisence/fdb2d529-e9cb-4de5-ab6a-c509c43af578.jpeg', 'image', 'Muchammad Jainuri.jpg', '2029-01-30', true, 1, 1, '2026-09-01 10:42:41.332469+07', '2026-09-01 10:42:41.332469+07', 'PGA');
INSERT INTO public.master_lisence VALUES (13, 'YOGIE MUHAMMAD ZARKASYI', '17191', 'height_work', '/form-permit/api/files/master-lisence/d52548a7-42ce-496b-90b0-b3fcc68f7c83.jpeg', 'image', 'Yogie Mohammad Zarkasyi.jpg', '2028-06-13', true, 1, 1, '2026-09-01 10:43:37.296428+07', '2026-09-01 10:43:37.296428+07', 'PGA');
INSERT INTO public.master_lisence VALUES (14, 'ERVIN SURYA KURNIAWAN', '26798', 'height_work', '/form-permit/api/files/master-lisence/cb5525d3-cc9d-4d1d-af2e-ad3998c11419.jpeg', 'image', 'Ervin Surya Kurniawan.jpg', '2029-01-30', true, 1, 1, '2026-09-01 10:44:19.654924+07', '2026-09-01 10:44:19.654924+07', 'PGA');
INSERT INTO public.master_lisence VALUES (15, 'M. IBNU ALWAN', '8554', 'height_work', '/form-permit/api/files/master-lisence/ff6429fc-c8c4-4db9-8777-b58a78a66d48.jpeg', 'image', 'Yogie Mohammad Zarkasyi.jpg', '2028-06-13', true, 1, 1, '2026-09-01 10:45:10.256107+07', '2026-09-01 10:45:10.256107+07', 'PGA');
INSERT INTO public.master_lisence VALUES (16, 'YOGIE MUHAMMAD ZARKASYI', '17191', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:45:49.360066+07', '2026-09-01 10:45:49.360066+07', 'PGA');
INSERT INTO public.master_lisence VALUES (17, 'MOH. ABDUL ROUF', '1026', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:47:00.541933+07', '2026-09-01 10:47:00.541933+07', 'QA');
INSERT INTO public.master_lisence VALUES (18, 'MOH. ABDUL ROUF', '1026', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:47:08.400272+07', '2026-09-01 10:47:08.400272+07', 'QA');
INSERT INTO public.master_lisence VALUES (19, 'MOCH. SIGIT', '547', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:56:30.21359+07', '2026-09-01 10:56:30.21359+07', 'NYS');
INSERT INTO public.master_lisence VALUES (20, 'EKO WAHYUDI', '16572', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:57:18.426671+07', '2026-09-01 10:57:18.426671+07', 'NYS');
INSERT INTO public.master_lisence VALUES (21, 'ANDRI B.', '7921', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:57:40.008067+07', '2026-09-01 10:57:40.008067+07', 'NYS');
INSERT INTO public.master_lisence VALUES (22, 'M.NUR ROFI''IN', '2437', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:58:00.110967+07', '2026-09-01 10:58:00.110967+07', 'NYS');
INSERT INTO public.master_lisence VALUES (23, 'ICHWAN HAKIM', '582', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:58:17.756397+07', '2026-09-01 10:58:17.756397+07', 'NYS');
INSERT INTO public.master_lisence VALUES (24, 'M.NUR ROFI''IN', '2437', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:58:57.108132+07', '2026-09-01 10:58:57.108132+07', 'NYS');
INSERT INTO public.master_lisence VALUES (25, 'YUSUF FIRMANSYAH', '23571', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:59:17.575388+07', '2026-09-01 10:59:17.575388+07', 'NYS');
INSERT INTO public.master_lisence VALUES (26, 'ARMANDO KARYANTO', '14433', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:59:35.011197+07', '2026-09-01 10:59:35.011197+07', 'NYS');
INSERT INTO public.master_lisence VALUES (27, 'SYAIFUL RIZAL', '17542', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 10:59:51.473089+07', '2026-09-01 10:59:51.473089+07', 'NYS');
INSERT INTO public.master_lisence VALUES (28, 'EKO WAHYUDI', '16572', 'height_work', '/form-permit/api/files/master-lisence/a5a55e7e-a0bc-41c0-80db-54f2a908627c.jpeg', 'image', 'Eko Wahyudi.jpg', '2028-06-05', true, 1, 1, '2026-09-01 11:01:30.033247+07', '2026-09-01 11:01:30.033247+07', 'NYS');
INSERT INTO public.master_lisence VALUES (29, 'ICHWAN HAKIM', '582', 'height_work', '/form-permit/api/files/master-lisence/7e8b62fd-f530-4a91-83e0-8a2070b6314c.jpeg', 'image', 'Ichwan Hakim.jpg', '2028-06-05', true, 1, 1, '2026-09-01 11:02:14.864056+07', '2026-09-01 11:02:14.864056+07', 'NYS');
INSERT INTO public.master_lisence VALUES (30, 'YUSUF FIRMANSYAH', '23571', 'height_work', '/form-permit/api/files/master-lisence/74a8d713-798d-475a-b449-d117e4abfb64.jpeg', 'image', 'Yusuf Firmansyah.jpg', '2028-05-09', true, 1, 1, '2026-09-01 11:02:50.209091+07', '2026-09-01 11:02:50.209091+07', 'NYS');
INSERT INTO public.master_lisence VALUES (31, 'DARUSMAN SIREGAR', '10983', 'height_work', '/form-permit/api/files/master-lisence/b052afef-51bf-4e9b-9784-51798cdd387c.jpeg', 'image', 'Darusman Siregar.jpg', '2029-01-30', true, 1, 1, '2026-09-01 11:03:27.71832+07', '2026-09-01 11:03:27.71832+07', 'NYS');
INSERT INTO public.master_lisence VALUES (32, 'MOKHAMAD SARIFUDIN', '12180', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:09:39.932058+07', '2026-09-01 11:09:39.932058+07', 'ENG');
INSERT INTO public.master_lisence VALUES (33, 'M. FARUK A.', '14180', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:09:58.681484+07', '2026-09-01 11:09:58.681484+07', 'ENG');
INSERT INTO public.master_lisence VALUES (34, 'MOCH. DARMAWAN SUSANTO', '15995', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:10:15.087864+07', '2026-09-01 11:10:15.087864+07', 'ENG');
INSERT INTO public.master_lisence VALUES (35, 'FERI AGAM ANDRIANSYAH', '20265', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:10:32.826935+07', '2026-09-01 11:10:32.826935+07', 'ENG');
INSERT INTO public.master_lisence VALUES (36, 'MOCH CHILMI ARDIANSYAH', '22393', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:11:00.081415+07', '2026-09-01 11:11:00.081415+07', 'ENG');
INSERT INTO public.master_lisence VALUES (37, 'LANI GUNAWAN', '7920', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:22:19.938562+07', '2026-09-01 11:22:19.938562+07', 'MPC-WHS');
INSERT INTO public.master_lisence VALUES (38, 'LANI GUNAWAN', '7920', 'height_work', '/form-permit/api/files/master-lisence/fb785ed3-743d-4bc5-a17f-ff7b7951c4ba.jpeg', 'image', 'Lani Gunawan.jpg', '2028-09-08', true, 1, 1, '2026-09-01 11:23:00.707838+07', '2026-09-01 11:23:00.707838+07', 'MPC-WHS');
INSERT INTO public.master_lisence VALUES (39, 'LANI GUNAWAN', '7920', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:23:08.041243+07', '2026-09-01 11:23:08.041243+07', 'MPC-WHS');
INSERT INTO public.master_lisence VALUES (40, 'ILHAM ADI ASTANA', '1366', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:25:02.701138+07', '2026-09-01 11:25:02.701138+07', 'MPC-WHS');
INSERT INTO public.master_lisence VALUES (41, 'WIDIK HARIYANTO', '33624', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:25:58.469802+07', '2026-09-01 11:25:58.469802+07', 'MPC-WHS');
INSERT INTO public.master_lisence VALUES (42, 'WIDIK HARIYANTO', '33624', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:26:10.367788+07', '2026-09-01 11:26:10.367788+07', 'MPC-WHS');
INSERT INTO public.master_lisence VALUES (43, 'EKO WAHYUDI', '7922', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:27:01.048223+07', '2026-09-01 11:27:01.048223+07', 'MPC-WHS');
INSERT INTO public.master_lisence VALUES (44, 'ILHAM ADI ASTANA', '1366', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:28:18.443617+07', '2026-09-01 11:28:18.443617+07', 'MPC-WHS');
INSERT INTO public.master_lisence VALUES (45, 'YUNISAR ISMAWANTO', '2431', 'height_work', '/form-permit/api/files/master-lisence/0c51374d-b97f-408f-a5fc-184b7bf91916.jpeg', 'image', 'Yunisar Ismawanto.jpg', '2028-06-05', true, 1, 1, '2026-09-01 11:29:09.323481+07', '2026-09-01 11:29:09.323481+07', 'MPC-WHS');
INSERT INTO public.master_lisence VALUES (46, 'M. SHIROT', '26799', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:33:06.023733+07', '2026-09-01 11:33:06.023733+07', 'PRODUKSI');
INSERT INTO public.master_lisence VALUES (47, 'M. SHIROT', '26799', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-01 11:33:08.597403+07', '2026-09-01 11:33:08.597403+07', 'PRODUKSI');
INSERT INTO public.master_lisence VALUES (48, 'SERLY ARGO FERDIAN', '23466', 'height_work', NULL, NULL, NULL, '2028-06-05', true, 1, 1, '2026-09-03 09:40:49.087188+07', '2026-09-03 09:40:49.087188+07', 'ENG');
INSERT INTO public.master_lisence VALUES (51, 'YANUAR TRI WIBOWO', '16045', 'height_work', NULL, NULL, NULL, '2028-06-05', true, 1, 1, '2026-09-03 09:43:01.806446+07', '2026-09-03 09:43:01.806446+07', 'ENG');
INSERT INTO public.master_lisence VALUES (52, 'MISKAN', '546', 'height_work', NULL, NULL, NULL, '2028-06-05', true, 1, 1, '2026-09-03 09:44:04.084082+07', '2026-09-03 09:44:04.084082+07', 'MTC');
INSERT INTO public.master_lisence VALUES (53, 'MOCHAMMAD JUNAEDI WAHAB', '8564', 'height_work', NULL, NULL, NULL, '2028-06-05', true, 1, 1, '2026-09-03 09:44:58.490726+07', '2026-09-03 09:44:58.490726+07', 'MTC');
INSERT INTO public.master_lisence VALUES (55, 'DIANTORO', '21894', 'height_work', NULL, NULL, NULL, '2028-06-05', true, 1, 1, '2026-09-03 09:47:08.901329+07', '2026-09-03 09:47:08.901329+07', 'MTC');
INSERT INTO public.master_lisence VALUES (56, 'MUCHAMMAD CHILMI A.', '22393', 'height_work', NULL, NULL, NULL, '2028-06-05', true, 1, 1, '2026-09-03 09:48:26.794926+07', '2026-09-03 09:48:26.794926+07', 'ENG');
INSERT INTO public.master_lisence VALUES (57, 'CANDRA KRISDIANTO', '12997', 'height_work', NULL, NULL, NULL, '2028-06-05', true, 1, 1, '2026-09-03 09:49:28.788698+07', '2026-09-03 09:49:28.788698+07', 'ENG');
INSERT INTO public.master_lisence VALUES (58, 'BAMBANG KARDYONO', '741', 'height_work', NULL, NULL, NULL, '2028-06-05', true, 1, 1, '2026-09-03 09:50:25.646389+07', '2026-09-03 09:50:25.646389+07', 'ENG');
INSERT INTO public.master_lisence VALUES (59, 'HENGKI SETIANTO', '219', 'height_work', NULL, NULL, NULL, '2028-06-05', true, 1, 1, '2026-09-03 09:50:49.864917+07', '2026-09-03 09:50:49.864917+07', 'ENG');
INSERT INTO public.master_lisence VALUES (60, 'ANWAR ANAS', '1377', 'height_work', NULL, NULL, NULL, '2031-07-14', true, 1, 1, '2026-09-03 10:33:30.417471+07', '2026-09-03 10:33:30.417471+07', 'PGA');
INSERT INTO public.master_lisence VALUES (61, 'ALIMIN AGUS TRIONO', '7992', 'height_work', NULL, NULL, NULL, '2031-07-14', true, 1, 1, '2026-09-03 10:34:02.756165+07', '2026-09-03 10:34:02.756165+07', 'ENG');
INSERT INTO public.master_lisence VALUES (62, 'MIFTACHUL ABDILLAH', '12029', 'height_work', NULL, NULL, NULL, '2031-07-14', true, 1, 1, '2026-09-03 10:34:46.815389+07', '2026-09-03 10:34:46.815389+07', 'PGA');
INSERT INTO public.master_lisence VALUES (63, 'WAHYU GANANG EKO PRAKOSO', '15904', 'height_work', NULL, NULL, NULL, '2031-07-14', true, 1, 1, '2026-09-03 10:35:37.676488+07', '2026-09-03 10:35:37.676488+07', 'ENG');
INSERT INTO public.master_lisence VALUES (64, 'BAMBANG EKO PURNOMO', '15528', 'height_work', NULL, NULL, NULL, '2031-07-14', true, 1, 1, '2026-09-03 10:36:19.289387+07', '2026-09-03 10:36:19.289387+07', 'ENG');
INSERT INTO public.master_lisence VALUES (65, 'MOCH. DARMAWAN SUSANTO', '15995', 'height_work', NULL, NULL, NULL, '2031-07-14', true, 1, 1, '2026-09-03 10:37:05.105896+07', '2026-09-03 10:37:05.105896+07', 'ENG');
INSERT INTO public.master_lisence VALUES (66, 'KIKI ANGGA KURNIAWAN', '26929', 'height_work', NULL, NULL, NULL, '2027-03-24', true, 1, 1, '2026-09-03 10:38:13.515587+07', '2026-09-03 10:38:13.515587+07', 'MTC');
INSERT INTO public.master_lisence VALUES (67, 'NANANG HIDAYAT', '1380', 'height_work', NULL, NULL, NULL, '2027-03-24', true, 1, 1, '2026-09-03 10:40:32.634287+07', '2026-09-03 10:40:32.634287+07', 'MTC');
INSERT INTO public.master_lisence VALUES (68, 'AHMAD FAUZI', '21708', 'height_work', NULL, NULL, NULL, '2028-09-08', true, 1, 1, '2026-09-03 10:42:09.135434+07', '2026-09-03 10:42:09.135434+07', 'MTC');
INSERT INTO public.master_lisence VALUES (69, 'SYAIFUL RIZAL', '17542', 'height_work', NULL, NULL, NULL, '2028-05-09', true, 1, 1, '2026-09-03 10:43:40.798913+07', '2026-09-03 10:43:40.798913+07', 'NYS');
INSERT INTO public.master_lisence VALUES (70, 'AKHMAD SYAFII', '11287', 'height_work', NULL, NULL, NULL, '2029-01-30', true, 1, 1, '2026-09-03 10:50:38.069377+07', '2026-09-03 10:50:38.069377+07', 'ENG');
INSERT INTO public.master_lisence VALUES (71, 'MOKHAMAD SARIFUDIN', '12180', 'height_work', NULL, NULL, NULL, '2029-01-30', true, 1, 1, '2026-09-03 10:51:16.473353+07', '2026-09-03 10:51:16.473353+07', 'ENG');
INSERT INTO public.master_lisence VALUES (72, 'ARI ASTOMI', '300', 'height_work', NULL, NULL, NULL, '2029-01-30', true, 1, 1, '2026-09-03 10:51:57.754778+07', '2026-09-03 10:51:57.754778+07', 'MTC');
INSERT INTO public.master_lisence VALUES (73, 'KHOIRUL ANAM', '12998', 'height_work', NULL, NULL, NULL, '2029-01-30', true, 1, 1, '2026-09-03 10:52:33.299259+07', '2026-09-03 10:52:33.299259+07', 'ENG');
INSERT INTO public.master_lisence VALUES (74, 'HADI SUCIPTO', '26927', 'height_work', NULL, NULL, NULL, '2029-01-30', true, 1, 1, '2026-09-03 10:53:01.00886+07', '2026-09-03 10:53:01.00886+07', 'ENG');
INSERT INTO public.master_lisence VALUES (75, 'ANDRI BUSOHIRI', '7921', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:40:44.374352+07', '2026-09-04 08:40:44.374352+07', 'NYS');
INSERT INTO public.master_lisence VALUES (77, 'AHMAD ZAINUL ARIF', '16416', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:42:14.17679+07', '2026-09-04 08:42:14.17679+07', 'PGA');
INSERT INTO public.master_lisence VALUES (78, 'EKO WAHYUDI', '16572', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:44:31.12845+07', '2026-09-04 08:44:31.12845+07', 'NYS');
INSERT INTO public.master_lisence VALUES (82, 'MOCHAMMAD IRFAK', '7406', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:45:42.767399+07', '2026-09-04 08:45:42.767399+07', 'PRODUKSI');
INSERT INTO public.master_lisence VALUES (83, 'MOCHAMMAD IRFAK', '7406', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:45:45.491505+07', '2026-09-04 08:45:45.491505+07', 'PRODUKSI');
INSERT INTO public.master_lisence VALUES (84, 'MOHAMMAD MAULUDIN', '221', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:50:28.134829+07', '2026-09-04 08:50:28.134829+07', 'MTC');
INSERT INTO public.master_lisence VALUES (85, 'MOHAMMAD MAULUDIN', '221', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:50:30.629657+07', '2026-09-04 08:50:30.629657+07', 'MTC');
INSERT INTO public.master_lisence VALUES (86, 'SERLY AGO FERDIAN', '23466', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:51:15.575889+07', '2026-09-04 08:51:15.575889+07', 'ENG');
INSERT INTO public.master_lisence VALUES (87, 'SERLY AGO FERDIAN', '23466', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:51:31.37367+07', '2026-09-04 08:51:31.37367+07', 'ENG');
INSERT INTO public.master_lisence VALUES (88, 'M. ABDUL WAHAB CHASBULLAH', '16258', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:52:23.310691+07', '2026-09-04 08:52:23.310691+07', 'MTC');
INSERT INTO public.master_lisence VALUES (89, 'M. ABDUL WAHAB CHASBULLAH', '16258', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:52:26.392811+07', '2026-09-04 08:52:26.392811+07', 'MTC');
INSERT INTO public.master_lisence VALUES (90, 'MUCHAMMAD JUNAEDI WAHAB', '8564', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:53:08.295844+07', '2026-09-04 08:53:08.295844+07', 'MTC');
INSERT INTO public.master_lisence VALUES (91, 'MUCHAMMAD JUNAEDI WAHAB', '8564', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:53:19.457491+07', '2026-09-04 08:53:19.457491+07', 'MTC');
INSERT INTO public.master_lisence VALUES (92, 'SATRIYO', '2202', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:53:39.745542+07', '2026-09-04 08:53:39.745542+07', 'MTC');
INSERT INTO public.master_lisence VALUES (93, 'SATRIYO', '2202', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:53:42.984818+07', '2026-09-04 08:53:42.984818+07', 'MTC');
INSERT INTO public.master_lisence VALUES (94, 'AGUS RIONO', '11359', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-04 08:54:26.817013+07', '2026-09-04 08:54:26.817013+07', 'PGA');
INSERT INTO public.master_lisence VALUES (96, 'AHMAD FAUZI', '17529', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-09 14:14:51.19933+07', '2026-09-09 14:14:51.19933+07', 'PGA');
INSERT INTO public.master_lisence VALUES (98, 'ARMANDO KARYANTO', '14433', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-09 14:16:24.994765+07', '2026-09-09 14:16:24.994765+07', 'PGA');
INSERT INTO public.master_lisence VALUES (99, 'ICHWAN HAKIM', '582', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-09 14:17:37.338832+07', '2026-09-09 14:17:37.338832+07', 'NYS');
INSERT INTO public.master_lisence VALUES (100, 'EKO WAHYUDI', '7922', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-09 14:19:26.224917+07', '2026-09-09 14:19:26.224917+07', 'MPC-WHS');
INSERT INTO public.master_lisence VALUES (101, 'FERI AGAM ANDRIANSYAH', '20265', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-09 14:20:20.050635+07', '2026-09-09 14:20:20.050635+07', 'ENG');
INSERT INTO public.master_lisence VALUES (102, 'HADITIAN SYEH A. W.', '16660', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-09 14:21:33.328514+07', '2026-09-09 14:21:33.328514+07', 'PGA');
INSERT INTO public.master_lisence VALUES (103, 'M. FARUK A.', '14180', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-09 14:22:07.450196+07', '2026-09-09 14:22:07.450196+07', 'ENG');
INSERT INTO public.master_lisence VALUES (104, 'MOCH. SIGIT', '547', 'hot_work', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-09 14:23:05.8964+07', '2026-09-09 14:23:05.8964+07', 'NYS');
INSERT INTO public.master_lisence VALUES (105, 'YUSUF FIRMANSYAH', '23571', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-09 14:25:01.724399+07', '2026-09-09 14:25:01.724399+07', 'NYS');
INSERT INTO public.master_lisence VALUES (106, 'YOGIE MUHAMMAD ZARKASYI', '17191', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-09 14:25:33.043465+07', '2026-09-09 14:25:33.043465+07', 'PGA');
INSERT INTO public.master_lisence VALUES (108, 'SYAIFUL RIZAL', '17542', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-09 14:26:25.089686+07', '2026-09-09 14:26:25.089686+07', 'NYS');
INSERT INTO public.master_lisence VALUES (109, 'MOKHAMAD SARIFUDIN', '12180', 'workshop', NULL, NULL, NULL, NULL, true, 1, 1, '2026-09-09 14:26:59.029516+07', '2026-09-09 14:26:59.029516+07', 'ENG');


--
-- Data for Name: pengawas_departemen; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: smtp_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.smtp_settings VALUES (1, '10.62.231.17', 25, NULL, NULL, 'noreplay.pens@jai.co.id', false, false, 'http://10.62.230.51/form-permit', true, '2026-06-18 15:54:12.109633+07', '2026-06-25 08:54:21.042084+07');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES (4, 'manager01', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Manager', 'MANAGER', 'approver', true, '2026-02-16 18:16:06.201607+07', '2026-02-18 10:18:43.487623+07', 'manager01@jai.co.id', 'PT JAI', '081234567893', NULL, 'Unknown', NULL);
INSERT INTO public.users VALUES (6, 'daniar1', '$2b$10$nC599t.VWA2BJH5BH9nRfO8YjMThECOKumjo7gnm0lNXGUUWwWVgq', 'Daniar Priambodo', 'Pekerja', 'worker', true, '2026-02-18 11:32:55.881543+07', '2026-02-18 11:32:55.881543+07', NULL, 'PT JAI', '081234567891', NULL, 'Unknown', NULL);
INSERT INTO public.users VALUES (7, 'daniar2', '$2b$10$x2XryU4ZvnobH7GbEfhh2u.p4w3Ee3JgrZj.vFJLKqGfSURf.Vjyu', 'Daniar P', 'Pekerja', 'worker', true, '2026-02-18 11:52:41.37034+07', '2026-02-18 11:52:41.37034+07', NULL, 'PT JAI', '0890909090', NULL, 'Unknown', NULL);
INSERT INTO public.users VALUES (13, 'daniar_ctr', '$2b$10$zMh4XfrctzbLMFtkQhpaVulAZYgWl6vDUBMKd7wg17b.KS43avtGu', 'Daniar_CTR', 'Contractor', 'kontraktor', true, '2026-02-19 08:46:12.313005+07', '2026-02-19 08:46:12.313005+07', NULL, NULL, NULL, NULL, 'Unknown', NULL);
INSERT INTO public.users VALUES (14, 'daniar_sfo', '$2b$10$zMh4XfrctzbLMFtkQhpaVulAZYgWl6vDUBMKd7wg17b.KS43avtGu', 'Daniar_SFO', 'Safety Officer', 'sfo', true, '2026-02-19 08:46:12.313005+07', '2026-02-19 08:46:12.313005+07', NULL, NULL, NULL, NULL, 'Unknown', NULL);
INSERT INTO public.users VALUES (21, 'daniar_sfo1', '$2b$10$IqRZwyk9FZUQ11GRwd.Zs.EF64twPpM6MBOrHYk2CXwZLmbsSbxKG', 'Daniar_sfo1', 'Safety Officer', 'sfo', true, '2026-02-20 09:10:30.803741+07', '2026-02-20 09:10:30.803741+07', NULL, NULL, NULL, NULL, 'Unknown', NULL);
INSERT INTO public.users VALUES (22, 'firewatch1', '$2b$10$SAUblN9wscELpQYvWh7Ko.kul1YiKz2040pDhPWZHSkMi1iZRNehK', 'firewatch Daniar', 'Fire Watch', 'firewatch', true, '2026-04-12 18:41:52.477117+07', '2026-04-14 07:40:30.142233+07', NULL, NULL, NULL, '1234
', 'Unknown', NULL);
INSERT INTO public.users VALUES (12, 'daniar_spv', '$2b$10$zMh4XfrctzbLMFtkQhpaVulAZYgWl6vDUBMKd7wg17b.KS43avtGu', 'Daniar_SPV', 'Supervisor', 'spv', true, '2026-02-19 08:46:12.313005+07', '2026-04-14 14:04:10.592159+07', NULL, NULL, NULL, '4321', 'Unknown', NULL);
INSERT INTO public.users VALUES (23, 'daniark3', '$2b$10$SAUblN9wscELpQYvWh7Ko.kul1YiKz2040pDhPWZHSkMi1iZRNehK', 'daniar k3', 'Admin K3', 'admin_k3', true, '2026-04-16 10:01:41.753525+07', '2026-04-16 10:01:41.753525+07', NULL, NULL, NULL, '123456', 'Unknown', NULL);
INSERT INTO public.users VALUES (35, 'hpu_sfo', '$2b$10$3goJdf4uMz9xbowp3/gP0.b6MuJf2A77NIcVc47lE1OEKRGW9MG3m', 'hayu.p', 'SFO', 'sfo', true, '2026-06-05 16:29:53.828456+07', '2026-08-31 13:05:00.986883+07', 'hayu.p@jai.co.id', NULL, NULL, NULL, NULL, '3190022b5db68dd2f6f18752:e8a2dca178ad763eb413695cce9461c8:075c5b171e9374');
INSERT INTO public.users VALUES (27, 'daniar_admin', '$2b$10$kav5FrA6eeguAAF2rhOPeeIQzgtkod9Jyvk5zviu2eDl237.3vWQC', 'Daniar Priambodo', 'ADMIN', 'admin', true, '2026-06-05 14:34:06.540438+07', '2026-06-05 14:34:06.540438+07', NULL, NULL, NULL, NULL, 'Unknown', NULL);
INSERT INTO public.users VALUES (28, 'admin2', '$2b$10$N9l9TIuvmyFqjiqMWeIbmudFEWL.Hqjg3iHYxrqLCy1LHeMwJWLuK', 'Daniar Priambodo', 'Administrator', 'admin', true, '2026-06-05 15:24:39.550811+07', '2026-06-05 15:24:39.550811+07', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.users VALUES (31, 'daniar_worker3', '$2b$10$nnRuvjbfa4BpaoM15xKHUu1WXVvkAZ2xdI20lnw2buTtO7/hN4K0a', 'Daniar Priambodo', 'Administrator Departemen', 'worker', true, '2026-06-05 15:58:52.756844+07', '2026-06-05 15:58:52.756844+07', NULL, 'PT JAI', NULL, NULL, 'QA', NULL);
INSERT INTO public.users VALUES (32, 'daniar23', '$2b$10$RJxSNKftSfsm0hJBe6dPmu0eMB3M5L6cMa/1yqwxj3b3xeekoxqj2', 'Daniar Priambodo', 'Administrator Departemen', 'worker', true, '2026-06-05 16:11:44.745234+07', '2026-06-05 16:11:44.745234+07', 'daniarpriambodo11@gmail.com', 'PT JAI', NULL, NULL, 'QA', NULL);
INSERT INTO public.users VALUES (33, 'admin23', '$2b$10$kE3Aw4dJrEQZU4cZ43EVCutUq6y566ecKqncRF3SBG/sdWHo/xa2u', 'Admin 23', 'Administrator', 'admin', true, '2026-06-05 16:12:44.619404+07', '2026-06-05 16:12:44.619404+07', 'daniarpriambodo11@gmail.com', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.users VALUES (34, 'dahana_smk3', '$2b$10$f8oVOxUl8F8cFJLVmk/cA.9zQR1Yzd5rz4pirXJBDxuCqM5yVB6aO', 'dahana', 'Administrator Departemen', 'worker', true, '2026-06-05 16:14:47.496332+07', '2026-06-05 16:14:47.496332+07', 'gags08@jai.co.id', 'PT JAI', NULL, NULL, 'PGA', NULL);
INSERT INTO public.users VALUES (40, 'daniar_qa', '$2b$10$ghb8pFq0y96u.VPVVL0ArO8w6inVVTDKwcEOOQ.XaMToDa/uucr8m', 'Daniar Priambodo', 'Administrator Departemen', 'worker', true, '2026-06-08 14:28:46.968603+07', '2026-06-08 14:28:46.968603+07', 'daniarpriambodo11@gmail.com', 'PT JAI', NULL, NULL, 'PGA', NULL);
INSERT INTO public.users VALUES (42, 'twi', '$2b$10$AnKupiLL9cxNvWRkEQA70O8Y.byjEA4bERu/dtx0FhBstd87PBqXK', 'Toni Wijaya', 'Supervisor', 'spv', true, '2026-06-09 08:45:36.082061+07', '2026-06-09 08:45:36.082061+07', 'toni.w@jai.co.id', NULL, NULL, NULL, 'QA', NULL);
INSERT INTO public.users VALUES (15, 'daniar_pga', '$2b$10$zMh4XfrctzbLMFtkQhpaVulAZYgWl6vDUBMKd7wg17b.KS43avtGu', 'Daniar_PGA', 'PGA Manager', 'smr', true, '2026-02-19 08:46:12.313005+07', '2026-06-09 08:59:15.807705+07', NULL, NULL, NULL, NULL, 'Unknown', NULL);
INSERT INTO public.users VALUES (39, 'daniar_spv2', '$2b$10$.euONHWZ5/s.cc8Lpq.z/OLL0TyDpyYn4jEbnYXc6vBdRO1UhL2Dq', 'Daniar Priambodo', 'Supervisor', 'spv', true, '2026-06-08 13:28:46.822669+07', '2026-06-09 16:24:53.310485+07', 'daniarpriambodo11@gmail.com', NULL, NULL, NULL, 'QA', '492ef21c628690932af22436:0238621349a205b4401d3a414eeb58ad:f3401e99a164');
INSERT INTO public.users VALUES (43, 'mcb', '$2b$10$d.ZVlj2MNFqcQtm4pSgZvuh1JIjy1UpgAT703ZbRAtVFhh6LUA5jK', 'M Chasan Basri', 'Supervisor', 'spv', true, '2026-06-10 14:36:42.264674+07', '2026-06-10 14:36:42.264674+07', 'm.chasan@jai.co.id', NULL, NULL, NULL, 'MTC', '2223642bd01c80ba049fbfe0:dac49127365cacf6620e8348913eb266:017a8e9d298909');
INSERT INTO public.users VALUES (44, 'dhs', '$2b$10$h4XFHybBSVIYIsf3.HXXEOcwbU4WJqCfKQLeXEnSmwaxYwB1CHecS', 'Danny Harly Susanto', 'Supervisor', 'spv', true, '2026-06-10 14:48:18.184509+07', '2026-06-10 14:48:18.184509+07', 'danny.h@jai.co.id', NULL, NULL, NULL, 'ENG', '4dc13901dc3709f6be888e73:2c59b9b600f8d7c8a53d86f211934d10:c746bb83d4a5');
INSERT INTO public.users VALUES (45, 'ufa', '$2b$10$JZQ8p7mP5O4dZsA4IUi1WOS97tXXJh2bzeFUnBFtDvoJxe.Chk2q6', 'Umar Fahroni', 'Supervisor', 'spv', true, '2026-06-10 14:51:46.324012+07', '2026-06-10 14:51:46.324012+07', 'umar.f@jai.co.id', NULL, NULL, NULL, 'NYS', '8442dffe63fe9d3063ab72e7:3d16d434d8ec0f55551e26c738ca7041:d2452db98404');
INSERT INTO public.users VALUES (46, 'ain', '$2b$10$.5VulNe/tlhgPCpljWMamOqsyJJPRydNoNX/KapPL1gSCMIQ.n8gi', 'Agung Indrayana', 'Supervisor', 'spv', true, '2026-06-10 14:53:33.635441+07', '2026-06-10 14:53:33.635441+07', 'agung.i@jai.co.id', NULL, NULL, NULL, 'PGA', '01922d80a07a77e246ad9001:a8a2f20cb2f20c4af3ea4a30765c6e7f:661cf3b032ec');
INSERT INTO public.users VALUES (49, 'fir', '$2b$10$HIAQLqLLAAUVNdXsLmrFF.5PryHmLKfZpR6YUMAMj0TmZMQqz7yi6', 'Ferry Irawan', 'Supervisor', 'spv', true, '2026-06-11 09:10:12.075797+07', '2026-06-11 09:10:12.075797+07', 'ferry.i@jai.co.id', NULL, NULL, NULL, 'MPC-WHS', '6add78de72fc9b1087fa8c3d:b61a3238b8e61b7774717f9559559933:9fa4170cc7e11f');
INSERT INTO public.users VALUES (50, 'lgu', '$2b$10$.icEZ3n2/aB7gdbw/V0ViepU/FbMuDiCyj.t2kJVnGG/2l3bcD5VS', 'Lani Gunawan', 'Administrator Departemen', 'worker', true, '2026-06-11 10:07:03.958718+07', '2026-06-11 10:07:03.958718+07', 'lani.g@jai.co.id', 'PT JAI', NULL, NULL, 'MPC-WHS', '6d08ce7cf4c612f0b9f58bab:51a5da7fbc01a6f0f64a544ed999ec3c:f008c4e8f9da9c');
INSERT INTO public.users VALUES (51, 'mnf', '$2b$10$QHGidcUziN3lapwbEpdypOwV7QfH6eXAjWsmjBw4.MY1pVhT901Gq', 'M. Nur Fuad', 'Administrator Departemen', 'worker', true, '2026-06-11 10:16:00.140011+07', '2026-06-11 10:16:00.140011+07', 'm.fuad@jai.co.id', 'PT JAI', NULL, NULL, 'MPC-WHS', '2cfeec673b09fc2389390519:819c90779d2cb4a82a7da05bd9b9929a:abf7760c6ac1d2');
INSERT INTO public.users VALUES (52, 'aro', '$2b$10$4hh5o6juxTCoB07r.fpu/uXAmmcTqBYx8nmcI3iG2w5DCXsY9JzI6', 'Abdul Rohman', 'Administrator Departemen', 'worker', true, '2026-06-11 10:18:51.434351+07', '2026-06-11 10:18:51.434351+07', 'a.rohman@jai.co.id', 'PT JAI', NULL, NULL, 'MPC-WHS', '87aeb6d0c776ed15422a0427:904cf91f70096ffbb9da2be7b28b028c:05e958f36638');
INSERT INTO public.users VALUES (53, 'rmn', '$2b$10$Pla4myiDjPOOzcU7KjMwWOxEG1GECctjcyvLS3/yAMOk3benLVSoK', 'Abdul Rohman', 'Administrator Departemen', 'worker', true, '2026-06-11 11:37:21.322259+07', '2026-06-11 11:37:21.322259+07', 'a.rohman@jai.co.id', 'PT JAI', NULL, NULL, 'MPC-WHS', '70c4659cab5b0350a77ad4e0:139714352d3fdefe2fe8017be9248638:b0bb741257d4');
INSERT INTO public.users VALUES (54, 'tia', '$2b$10$OPPv7o9RJlb7z8zs3bVQY.Hv.8fz7xo7omL82GeLg2ORuknRASvnu', 'Tita Indah Astutik', 'Administrator Departemen', 'worker', true, '2026-06-11 11:46:33.194042+07', '2026-06-11 11:46:33.194042+07', 'qa1@jai.co.id', 'PT JAI', '0857032004447', NULL, 'QA', '63a0001c888170a857caa92b:d026f3c0825ea19b8845b1df293dba9d:a0bd3a12168731ce7336b9f994');
INSERT INTO public.users VALUES (1, 'Super_Admin', '$2b$10$BT6B66BiKUvGvyxDcq6vpuLlLntgrYISkIiyxz/WeUhpz8Y729sqW', 'Administrator', 'ADMIN', 'admin', true, '2026-02-16 18:16:06.201607+07', '2026-07-28 14:02:19.7991+07', 'admin@jai.co.id', 'PT JAI', '081234567890', NULL, 'Unknown', NULL);
INSERT INTO public.users VALUES (38, 'utility', '$2b$10$9LTMRp5JT17v6uE7cxldOuTLGDIi30fw421yf7BN5KHzktqu3xRhe', 'Utility', 'Administrator Departemen', 'worker', true, '2026-06-06 11:10:16.682155+07', '2026-08-31 13:13:31.99937+07', 'anwar.a@jai.co.id', 'PT. JAI', NULL, NULL, 'PGA', 'c642a92f5f465b0e398a6779:2bad2dc3222cf53ebb6379c01725ce87:692f2ac03980e3');
INSERT INTO public.users VALUES (37, 'aca', '$2b$10$JkHxcPhM.Ar6OcGPBN6BIe.QrtRfL14cO/QvWYz2XeDGzsmaLGLdm', 'Aris Cahyono', 'Supervisor', 'spv', true, '2026-06-06 11:02:11.367151+07', '2026-08-31 13:16:48.025277+07', 'aris.c@jai.co.id', NULL, NULL, NULL, 'PGA', '4347efc94bc525125da53a6d:58108f722083b1829360985e5f6fccf1:235532a3d6ac');
INSERT INTO public.users VALUES (29, 'dahana', '$2b$10$3TLIhxTGpwFK3kO3yJUOoeH1rkJoXwS4vVD8aimuEJonRA0IvOIHy', 'Dahana Pratama', 'Admin K3', 'admin_k3', true, '2026-06-05 15:26:13.317812+07', '2026-08-31 13:30:13.857742+07', 'gags08@jai.co.id', NULL, '0', NULL, NULL, '3ad058c7f28c62eb011ca44d:f33d6f03f8692d7be46b9552d0fb2c3b:e7c287be368f8fbe');
INSERT INTO public.users VALUES (36, 'hpu_sspv', '$2b$10$1XstvkE7GQKO43fQgEbLQeJGfk8vGFHBLc939J9Ls/YdJ6PS6Drr6', 'hayu', 'Supervisor', 'spv', true, '2026-06-05 16:31:37.537147+07', '2026-08-31 13:23:47.283953+07', 'hayu.p@jai.co.id', NULL, NULL, NULL, 'PGA', '9fef1bae5410c36283363b38:6befe27bec375e65916a1349b52511a7:f364b4240af7b6');
INSERT INTO public.users VALUES (55, 'eldestia_f', '$2b$10$Ja23se5o8w4bW.8vkcJdJeg2fc1xWDxXTkKOV1wCvcqhTS0nQVrP2', 'ELDESTIA.F', 'Administrator Departemen', 'worker', true, '2026-06-24 08:33:46.269315+07', '2026-06-24 08:33:46.269315+07', 'eldestia.f@jai.co.id', 'PT JAI', '085691820922', NULL, 'QA', '057252ed70ad961597328b88:bfabb1baf0f135e997299260671eb84a:b7f1ed271609');
INSERT INTO public.users VALUES (57, 'daniar_produksi', '$2b$10$vjMnBkwJNW6jNOD2p7yRyeYVajBq30PGp5djW5lMZp9EFq0R6S3rq', 'Daniar Produksi', 'Administrator Departemen', 'worker', true, '2026-06-25 08:59:51.967984+07', '2026-06-25 08:59:51.967984+07', 'untuksemua0309@gmail.com', 'PT JAI', NULL, NULL, 'PRODUKSI', '5671989d0265a7c1b80357dd:7aeed61d850778e13cd2b5dc6a031fa9:f4ece75b41a742b2');
INSERT INTO public.users VALUES (58, 'daniar_produksi_spv', '$2b$10$qJP7Tz2AudvURZuPzTBwk.TsjhAHGz7ZIo.0PNveqZjkhs1RozBcq', 'Daniar SPV Produksi', 'Supervisor', 'spv', true, '2026-06-25 09:01:06.027914+07', '2026-06-25 09:01:06.027914+07', 'untuksemua0309@gmail.com', NULL, NULL, NULL, 'PRODUKSI', 'b438e5e2ca68df9df9716c52:67840de5fb5b966a97ae0fc1508adee4:b7ed97259e5dcef0');
INSERT INTO public.users VALUES (59, 'irawati', '$2b$10$QISRlNxoVId4ekL8QBbCn.XkJGgG/wCJnjHuf5PCoo3p/U8ecTFIq', 'irawati', 'Administrator Departemen', 'worker', true, '2026-06-30 15:29:10.013704+07', '2026-06-30 15:29:10.013704+07', 'gags2@jai.co.id', 'PT JAI', NULL, NULL, 'PGA', '7b17a06faf2e818feec4d847:3344eb5cc2d0b64bcd7245958b25ef9c:f75823a90d33');
INSERT INTO public.users VALUES (61, 'rfi', '$2b$10$0kbYEyOMaOSR7ylJ5UF6qu6DAAXCSwJf1VkbB3vXlw83ODFT9woK2', 'Rizal Firmansyah', 'Administrator Departemen', 'worker', true, '2026-07-28 11:41:06.58243+07', '2026-07-28 11:41:06.58243+07', 'rizal.f@jai.co.id', 'PT. JAI', '08990306197', NULL, 'MTC', '2b8edbf723ce58c8f74e473c:cba9772b5380ef8b7323d2fa898d3fe7:3bf3fa9d3612');
INSERT INTO public.users VALUES (62, 'hsw', '$2b$10$LNXVlr66aHtO1OZ33obEhuf9m93K2OkYGNEBHR0C..Sy0tJFM5kXi', 'Hary Setyo Wahyudi', 'Administrator Departemen', 'worker', true, '2026-07-28 11:41:46.996356+07', '2026-07-28 11:41:46.996356+07', 'hary.sw@jai.co.id', 'PT JAI', NULL, NULL, 'NYS', '7971604cf5fa0f6ff45a64ac:3c2b995a4dc9055250ae4501661dc022:17333ddff05843cd');
INSERT INTO public.users VALUES (63, 'tkr', '$2b$10$OYYeYpNxFZmWkxk/Hnz9qOnnGhCFubV0axDXaA5rwFoDryxmmq.VK', 'Tatag Kristiyantoro', 'Administrator Departemen', 'worker', true, '2026-07-28 11:42:11.591327+07', '2026-07-28 11:42:11.591327+07', 'tatag.k@jai.co.id', 'PT JAI', '082235403940', NULL, 'ENG', 'f99108a42a8f86adbac94036:7dd7985c4a7157da61204e816f249b5b:24863afd8e36bb87');
INSERT INTO public.users VALUES (64, 'dsu', '$2b$10$/M6Mk7w1573b3j9sCbBiVu.Z8sMsx4bPb8avD7iLjocJ09/.W1HZq', 'Dedik Sutono', 'Administrator Departemen', 'worker', true, '2026-07-28 11:43:19.596189+07', '2026-07-28 11:43:19.596189+07', 'ghaitsul.a@jai.co.id', 'PT. JAI', '081231206593', NULL, 'MTC', '4d21903761515675983f2b23:708ab03316860ae1cdd084d98cdb6205:1f972819d80c');
INSERT INTO public.users VALUES (65, 'daf', '$2b$10$cllk1zHavDgFKQa6m8iCCeIWIaygLbsBFQn76gm/VSub13GwDI50G', 'David Agung Fitrianto', 'Administrator Departemen', 'worker', true, '2026-07-28 11:43:32.534873+07', '2026-07-28 11:43:32.534873+07', 'david.a@jai.co.id', 'PT JAI', NULL, NULL, 'ENG', 'a6e59cfe372bf0cda7c26ea9:2d5c93f1934fc78190fecd6da67bcc1c:221325cbb32b8b58');
INSERT INTO public.users VALUES (66, 'iba', '$2b$10$nYh4HlVlvZy5rSFFdYOsJObv3w9GLIEqCkej7K63loU18SoiCf1za', 'Imam Basuki', 'Administrator Departemen', 'worker', true, '2026-07-28 11:44:11.040091+07', '2026-07-28 11:44:11.040091+07', 'imam.b@jai.co.id', 'PT. JAI', '081330229993', NULL, 'MTC', 'd4419cd7bc714d821ee55360:9c34ee63be9e1332ab0c61d1d49d6ccd:55020649da1b');
INSERT INTO public.users VALUES (67, 'aap', '$2b$10$EELSMVN7ufuL.kAsLZ3UbeVwfOTRYp..wdro5A.sxIuyMaLNI5002', 'A. Adi Putra', 'Administrator Departemen', 'worker', true, '2026-07-28 11:45:20.505936+07', '2026-07-28 11:45:20.505936+07', 'aa.putra@jai.co.id', 'PT. JAI', '082230031414', NULL, 'MTC', '90875bb389fda1812cba97ae:de313dcd4fa48b2102734a2be4f1f722:e5c00f428b4b');
INSERT INTO public.users VALUES (68, 'tis', '$2b$10$9T5JLSqqI.2Nl96ev4IsH.g6KRBzxZQ0QqqZ9vro6xUc1MVgpdkFi', 'Tedi Iswantara', 'Administrator Departemen', 'worker', true, '2026-07-28 11:46:17.131288+07', '2026-07-28 11:46:17.131288+07', 'tedi.i@jai.co.id', 'PT. JAI', '085745298454', NULL, 'MTC', 'a280ea7df9c2742db960a2f4:50f5b6312b96d2ac35ddd36b6ad3c74e:d0cb3be28de0');
INSERT INTO public.users VALUES (69, 'esi', '$2b$10$b12VXZMWQbCg1FlPWTvdeedLJxe0BAjORfyEAJoBoAfO1lC.I1SJS', 'ELLY SISWATI', 'Administrator Departemen', 'worker', true, '2026-07-28 11:46:18.60209+07', '2026-07-28 11:46:18.60209+07', 'elly.s@jai.co.id', 'PT JAI', NULL, NULL, 'NYS', '5e7ac1f654c2837f951dd4e8:acad2b8ff1d4a6e8ba05849b652a297f:2de17d6cfec7af61');
INSERT INTO public.users VALUES (70, 'aep', '$2b$10$O8PNYz0Qihf0DaxrR3m17eqF4Frdfdj0vNdVIBoYHBnncaEj76fkq', 'ANDIK EKA PRASTIA', 'Administrator Departemen', 'worker', true, '2026-07-28 11:52:42.391084+07', '2026-07-28 11:52:42.391084+07', 'a.eka@jai.co.id', 'PT JAI', NULL, NULL, 'NYS', '6f94774cd7bfe078426efb75:28b5a6f999db5a8495d80c1caa56e5b4:847e199bc5978e54');
INSERT INTO public.users VALUES (71, 'dri', '$2b$10$/cZwxVo2H9z6S/CF4QgEpuyPuP5q69Y2mHmxlovsV3nAGdFz.clWW', 'DESNA RIATTAMA', 'Administrator Departemen', 'worker', true, '2026-07-28 11:54:50.705403+07', '2026-07-28 11:54:50.705403+07', 'desna.r@jai.co.id', 'PT JAI', NULL, NULL, 'NYS', 'de7115e1b5b6018a12a18873:707a33cb305fbf738c9d5ec565b0e7dc:cd51a5aa7d9f085c');
INSERT INTO public.users VALUES (72, 'mus', '$2b$10$aBrHr7J4o.BJz1Fk1LxV1uGgqmT5f357UaEYD9tcgpmc080UjAVmi', 'MUSHARIYANTO', 'Administrator Departemen', 'worker', true, '2026-07-28 12:05:42.81947+07', '2026-07-28 12:05:42.81947+07', 'mushariyanto@jai.co.id', 'PT JAI', NULL, NULL, 'NYS', '8b2fd47c9bb63d03fedecef4:874b845815000c17af815953c093d785:d2503d22e7e35dbd');
INSERT INTO public.users VALUES (73, 'lse', '$2b$10$luVTf.gCH.iFxmQcr0oHWOFOzh1WE7zCoEsvdtAkGARE2lF5pDDie', 'LILIS SETYOWATI', 'Administrator Departemen', 'worker', true, '2026-07-28 12:07:22.896161+07', '2026-07-28 12:07:22.896161+07', 'lilis.s@jai.co.id', 'PT JAI', NULL, NULL, 'NYS', '8ca93af22fd95d0fbc45ccef:1cc2473dc00a3f36c1ca1a727e381dd7:234e9645bfcd675f');
INSERT INTO public.users VALUES (74, 'hsw_spv', '$2b$10$mHxxm2h.s7KBhk.5/ZevI.bda0KNT3lyfEo/g.THj31x2wajWj6Iq', 'Hari Setyo W', 'Supervisor', 'spv', true, '2026-07-28 13:18:33.500583+07', '2026-07-28 13:18:33.500583+07', 'hary.sw@jai.co.id', NULL, NULL, NULL, 'NYS', 'e338ff65e82caba829a38dd4:97c1195659f19c4dc03c181ff4358916:81650456881fdbbf');
INSERT INTO public.users VALUES (75, 'daf_spv', '$2b$10$423P8j26Lh4M12wQhhB/zOMyo79CsTTnxCXLcxNRUkJSgd/ZnL8NK', 'David Agung F', 'Supervisor', 'spv', true, '2026-07-28 13:26:13.4828+07', '2026-07-28 13:26:13.4828+07', 'david.a@jai.co.id', NULL, NULL, NULL, 'ENG', '4ba75bdd5abe7efdc0f2d196:a3cb79f6e623975249d2f3c37bb33aef:bda80931028c941f');
INSERT INTO public.users VALUES (76, 'rfi_spv', '$2b$10$ZfuXT0GJFAwCvOVEMNL5pOQjNstUgf7Pg6f.3wclHK8eVLwSZPtZS', 'Rizal F', 'Supervisor', 'spv', true, '2026-07-28 13:40:42.651161+07', '2026-07-28 13:40:42.651161+07', 'rizal.f@jai.co.id', NULL, NULL, NULL, 'MTC', '918772d31b250a5a626ddf2d:7a22a1ad611bb305f6cbf912df047138:d95cfd3ff2c9b68b');
INSERT INTO public.users VALUES (77, 'esr_sspv', '$2b$10$GyRrhgEU.GINZtnoLre2EuRTwviVGIjo/EWrbrm9fI78aWSgD47RC', 'Endang Sriningsih', 'Supervisor', 'spv', true, '2026-07-28 13:47:57.197083+07', '2026-07-28 13:47:57.197083+07', 'endang.s@jai.co.id', NULL, NULL, NULL, 'PRODUKSI', 'fee8af0d79bc48f5f3074faa:a03c6ddf8281279ecdd95d0d02fdc788:afd13510e37c');
INSERT INTO public.users VALUES (78, 'tkr_spv', '$2b$10$G7iXvOrzII7khRsIuxyqN.7RrjnvnSNL6A5oqeWtGPT8mpT4IaoKu', 'Tatag K', 'Supervisor', 'spv', true, '2026-07-28 13:51:23.841662+07', '2026-07-28 13:51:23.841662+07', 'tatag.k@jai.co.id', NULL, NULL, NULL, 'ENG', 'cae1ecc07e7b70a424a56e6d:86112587602f4a3b7f4ccaab0098805a:0d6ead8056daeeb7');
INSERT INTO public.users VALUES (79, 'irw', '$2b$10$EwM6y4lRMzUm0TOPSlx73.gF76zqSDnTNG0dWxJfI1TxigCF6dv42', 'Irawati', 'Admin K3', 'admin_k3', true, '2026-07-29 16:17:00.685512+07', '2026-07-29 16:17:00.685512+07', 'gags2@jai.co.id', NULL, NULL, '000452', NULL, '5d4f15a50c5436914ca685ca:276c6a267e0bc926428ccaea976c5d3f:58386ed894ea');
INSERT INTO public.users VALUES (80, 'JAZ', '$2b$10$HiFYU93xo39cs.RBfVzqwugWAiNzTxtypNSByloV1v27mgGwihrW.', 'JAJILA', 'Administrator Departemen', 'worker', true, '2026-07-31 13:22:52.765679+07', '2026-07-31 13:22:52.765679+07', 'engprocess1@jai.co.id', 'JAI', NULL, '15690', 'ENG', '73147e3b412c4c825718ecc9:b8be0535c60c3680c1b406ae7c45df07:928fcb8f38fc20b4');
INSERT INTO public.users VALUES (81, 'security01', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Security Officer', 'Security', 'security', true, '2026-08-29 15:19:29.550398+07', '2026-08-29 15:19:29.550398+07', NULL, NULL, NULL, NULL, 'Security', NULL);
INSERT INTO public.users VALUES (82, 'can', '$2b$10$UNsOBvr12WAVtSurCWHSie.BqdSWB9D90xNcFnYrPqZnmqJn4AvFu', 'Cahyo Adi Nugroho', 'SMR', 'smr', true, '2026-08-31 12:57:25.015858+07', '2026-08-31 12:57:25.015858+07', 'cahyo@jai.co.id', NULL, NULL, '000013', NULL, '67e7627d2a054eabf355f416:b232d0b7bcf08c40e23b583aed55f1ed:19aea2a76f02d989');
INSERT INTO public.users VALUES (83, 'ain_sfo', '$2b$10$AKoRMS2adsqpGwzzRWOEruKYpynDbhxrqvfDKVxn81rNmrFH4nInG', 'Agung Indrayana', 'SFO', 'sfo', true, '2026-10-05 09:26:58.211412+07', '2026-10-05 09:26:58.211412+07', 'agung.i@jai.co.id', NULL, NULL, '000745', NULL, '3e5cabd518a30743d2727284:14c4c6dc3a13f3145f84b480d1943816:6471726ea3e4');
INSERT INTO public.users VALUES (84, 'security02', '$2b$10$yFHJh/Z4ltBKxg.hlf5F0e1LPQpjGWIXKNKohtI0Coyvnm.Bp.zYe', 'SECURITY JAI 2', 'Security', 'security', true, '2026-10-05 15:48:25.337939+07', '2026-10-05 15:48:25.337939+07', 'jai@jai.co.id', NULL, NULL, '00908', NULL, '6368206bf66a568f22494463:69f154c242eca4a7c3cbcffe0cd05405:767f824b20c10016');


--
-- Name: departemen_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departemen_id_seq', 9, true);


--
-- Name: form_ijin_kerja_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.form_ijin_kerja_id_seq', 1, false);


--
-- Name: form_kerja_ketinggian_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.form_kerja_ketinggian_id_seq', 50, true);


--
-- Name: form_kerja_panas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.form_kerja_panas_id_seq', 37, true);


--
-- Name: form_kerja_workshop_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.form_kerja_workshop_id_seq', 35, true);


--
-- Name: master_lisence_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.master_lisence_id_seq', 109, true);


--
-- Name: pengawas_departemen_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pengawas_departemen_id_seq', 1, false);


--
-- Name: smtp_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.smtp_settings_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 84, true);


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

