/**
 * Data Contracts & TypeScript Types — Sistem Asesmen ASN
 */

export type Role = "ADMIN" | "PESERTA";

export type JenjangJabatan = "PELAKSANA" | "PENGAWAS" | "ADMINISTRATOR" | "JPT";

export type KategoriKompetensi = "MANAJERIAL" | "SOSIO_KULTURAL";

export type SessionStatus = "DRAFT" | "BERJALAN" | "SELESAI";

export type ParticipantStatus = "TERDAFTAR" | "SEDANG_MENGERJAKAN" | "SELESAI";

export type KategoriKelulusan = "MS" | "MMS" | "KMS";

export interface User {
  id: number;
  nip: string;
  nama: string;
  email: string | null;
  role: Role;
  jabatan: string;
  instansi: string;
  unit_kerja: string;
  jenjang_jabatan: JenjangJabatan;
  created_at: string;
  updated_at: string;
}

export interface Competency {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string;
  kategori: KategoriKompetensi;
  bobot_standar: string;
}

export interface QuestionOption {
  id: number;
  question_id: number;
  label: "A" | "B" | "C" | "D";
  teks_opsi: string;
  bobot?: number; // Hanya tersedia untuk Admin/Asesor, dirahasiakan saat Ujian
}

export interface Question {
  id: number;
  competency_id: number;
  kasus: string;
  target_level: number;
  created_at: string;
  competency?: Competency;
  options: QuestionOption[];
}

export interface AssessmentSession {
  id: number;
  kode_sesi: string;
  judul: string;
  deskripsi: string | null;
  waktu_mulai: string;
  waktu_selesai: string;
  durasi_menit: number;
  status: SessionStatus;
  created_at: string;
  total_peserta?: number;
  participants?: SessionParticipant[];
}

export interface SessionParticipant {
  id: number;
  session_id: number;
  user_id: number;
  status: ParticipantStatus;
  token_akses: string;
  waktu_login: string | null;
  waktu_submit: string | null;
  tab_switch_count: number;
  total_score: number | null;
  jpm_percentage: string | null;
  kategori_kelulusan: KategoriKelulusan | null;
  user?: User;
}

export interface ExamStatusResponse {
  participant_id: number;
  status: ParticipantStatus;
  durasi_menit: number;
  sisa_detik: number;
  is_waktu_habis: boolean;
  total_soal: number;
  total_terjawab: number;
  total_ragu: number;
  tab_switch_count: number;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
}

export interface RadarDimensionItem {
  kode: string;
  nama: string;
  kategori: KategoriKompetensi;
  skor: number;
  standar: number;
  gap: number;
  persentase_pemenuhan: number;
}

export interface ParticipantReport {
  participant: {
    id: number;
    user_id: number;
    nip: string;
    nama: string;
    email: string | null;
    jabatan: string;
    instansi: string;
    unit_kerja: string;
    jenjang_jabatan: JenjangJabatan;
    status: ParticipantStatus;
    tab_switch_count: number;
    waktu_login: string | null;
    waktu_submit: string | null;
  };
  session: {
    id: number;
    kode_sesi: string;
    judul: string;
    durasi_menit: number;
  };
  summary: {
    total_score: number;
    max_possible_score: number;
    jpm_percentage: number;
    kategori_kelulusan: KategoriKelulusan;
    kategori_label: string;
    total_answered: number;
  };
  radar_chart: RadarDimensionItem[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: any;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
