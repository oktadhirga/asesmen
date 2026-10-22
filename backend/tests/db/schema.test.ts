import { describe, it, expect } from "bun:test";
import * as schema from "../../src/db/schema";
import { getTableColumns } from "drizzle-orm";

describe("Database Schema Definitions (TDD Tahap 1)", () => {
  it("should export all 7 required tables", () => {
    expect(schema.users).toBeDefined();
    expect(schema.competencies).toBeDefined();
    expect(schema.questions).toBeDefined();
    expect(schema.questionOptions).toBeDefined();
    expect(schema.assessmentSessions).toBeDefined();
    expect(schema.sessionParticipants).toBeDefined();
    expect(schema.participantAnswers).toBeDefined();
  });

  it("users table should have correct columns and constraints", () => {
    const cols = getTableColumns(schema.users);
    expect(cols.id).toBeDefined();
    expect(cols.nip).toBeDefined();
    expect(cols.nama).toBeDefined();
    expect(cols.email).toBeDefined();
    expect(cols.password_hash).toBeDefined();
    expect(cols.role).toBeDefined();
    expect(cols.jabatan).toBeDefined();
    expect(cols.instansi).toBeDefined();
    expect(cols.unit_kerja).toBeDefined();
    expect(cols.jenjang_jabatan).toBeDefined();
    expect(cols.created_at).toBeDefined();
  });

  it("competencies table should support 9 kompetensi with kategori", () => {
    const cols = getTableColumns(schema.competencies);
    expect(cols.id).toBeDefined();
    expect(cols.kode).toBeDefined();
    expect(cols.nama).toBeDefined();
    expect(cols.kategori).toBeDefined();
    expect(cols.deskripsi).toBeDefined();
    expect(cols.bobot_standar).toBeDefined();
  });

  it("questions table should have competency_id and skenario_kasus", () => {
    const cols = getTableColumns(schema.questions);
    expect(cols.id).toBeDefined();
    expect(cols.competency_id).toBeDefined();
    expect(cols.kode_soal).toBeDefined();
    expect(cols.skenario_kasus).toBeDefined();
    expect(cols.target_level).toBeDefined();
  });

  it("question_options should enforce label, teks_opsi, and bobot_nilai", () => {
    const cols = getTableColumns(schema.questionOptions);
    expect(cols.id).toBeDefined();
    expect(cols.question_id).toBeDefined();
    expect(cols.label).toBeDefined();
    expect(cols.teks_opsi).toBeDefined();
    expect(cols.bobot_nilai).toBeDefined();
  });

  it("assessment_sessions should have status enum and duration", () => {
    const cols = getTableColumns(schema.assessmentSessions);
    expect(cols.id).toBeDefined();
    expect(cols.judul).toBeDefined();
    expect(cols.kode_sesi).toBeDefined();
    expect(cols.waktu_mulai).toBeDefined();
    expect(cols.waktu_selesai).toBeDefined();
    expect(cols.durasi_menit).toBeDefined();
    expect(cols.target_jenjang).toBeDefined();
    expect(cols.status).toBeDefined();
  });

  it("session_participants should track exam state, proctoring, and scoring", () => {
    const cols = getTableColumns(schema.sessionParticipants);
    expect(cols.id).toBeDefined();
    expect(cols.session_id).toBeDefined();
    expect(cols.user_id).toBeDefined();
    expect(cols.token_akses).toBeDefined();
    expect(cols.status).toBeDefined();
    expect(cols.tab_switch_count).toBeDefined();
    expect(cols.total_score).toBeDefined();
    expect(cols.jpm_percentage).toBeDefined();
    expect(cols.kategori_kelulusan).toBeDefined();
  });

  it("participant_answers should link participant to selected option and ragu flag", () => {
    const cols = getTableColumns(schema.participantAnswers);
    expect(cols.id).toBeDefined();
    expect(cols.session_participant_id).toBeDefined();
    expect(cols.question_id).toBeDefined();
    expect(cols.selected_option_id).toBeDefined();
    expect(cols.bobot_diperoleh).toBeDefined();
    expect(cols.is_ragu).toBeDefined();
    expect(cols.updated_at).toBeDefined();
  });
});
