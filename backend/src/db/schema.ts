import {
  mysqlTable,
  int,
  varchar,
  text,
  mysqlEnum,
  timestamp,
  decimal,
  boolean,
  foreignKey,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// 1. Jenjang Jabatan (14 Tingkatan Jabatan ASN berdasarkan PermenPANRB No. 38 Tahun 2017)
export const jenjangJabatan = mysqlTable("jenjang_jabatan", {
  id: int("id").primaryKey().autoincrement(),
  kode: varchar("kode", { length: 50 }).notNull().unique(), // e.g. "JF_AHLI_UTAMA", "JPT_MADYA"
  nama: varchar("nama", { length: 255 }).notNull(),
  kelompok_jabatan: varchar("kelompok_jabatan", { length: 100 }).notNull(), // e.g. "JPT", "JA", "JF"
  level_standar_umum: int("level_standar_umum").notNull(), // 1 - 5
  urutan: int("urutan").default(0),
  created_at: timestamp("created_at").defaultNow(),
});

// 2. Users (ASN & Admin/Asesor)
export const users = mysqlTable(
  "users",
  {
    id: int("id").primaryKey().autoincrement(),
    nip: varchar("nip", { length: 50 }).notNull().unique(),
    nama: varchar("nama", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    password_hash: varchar("password_hash", { length: 255 }).notNull(),
    role: mysqlEnum("role", ["ADMIN", "PESERTA"]).default("PESERTA").notNull(),
    jabatan: varchar("jabatan", { length: 255 }),
    instansi: varchar("instansi", { length: 255 }),
    unit_kerja: varchar("unit_kerja", { length: 255 }),
    jenjang_jabatan_id: int("jenjang_jabatan_id"),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "fk_users_jenjang",
      columns: [table.jenjang_jabatan_id],
      foreignColumns: [jenjangJabatan.id],
    }),
  ]
);

// 3. Competencies (PermenPANRB 38/2017: 8 Manajerial + 1 Sosio Kultural)
export const competencies = mysqlTable("competencies", {
  id: int("id").primaryKey().autoincrement(),
  kode: varchar("kode", { length: 50 }).notNull().unique(),
  nama: varchar("nama", { length: 255 }).notNull(),
  kategori: mysqlEnum("kategori", ["MANAJERIAL", "SOSIO_KULTURAL"]).notNull(),
  deskripsi: text("deskripsi"),
  bobot_standar: decimal("bobot_standar", { precision: 4, scale: 2 }).default("3.00"),
});

// 4. Standar Kompetensi Jabatan (Matriks Target Level per Jenjang Jabatan & Kompetensi)
export const standarKompetensiJabatan = mysqlTable(
  "standar_kompetensi_jabatan",
  {
    id: int("id").primaryKey().autoincrement(),
    jenjang_jabatan_id: int("jenjang_jabatan_id").notNull(),
    competency_id: int("competency_id").notNull(),
    target_level: int("target_level").notNull(), // 1 - 5
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "fk_skj_jenjang",
      columns: [table.jenjang_jabatan_id],
      foreignColumns: [jenjangJabatan.id],
    }),
    foreignKey({
      name: "fk_skj_competency",
      columns: [table.competency_id],
      foreignColumns: [competencies.id],
    }),
  ]
);

// 5. Competency Levels (Deskripsi Level 1 - 5 untuk Tiap Dimensi Kompetensi)
export const competencyLevels = mysqlTable(
  "competency_levels",
  {
    id: int("id").primaryKey().autoincrement(),
    competency_id: int("competency_id").notNull(),
    level: int("level").notNull(), // 1 - 5
    nama_level: varchar("nama_level", { length: 255 }).notNull(),
    deskripsi: text("deskripsi").notNull(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "fk_cl_competency",
      columns: [table.competency_id],
      foreignColumns: [competencies.id],
    }),
  ]
);

// 6. Competency Indicators (Indikator Perilaku Per Level Kompetensi - 135 Butir)
export const competencyIndicators = mysqlTable(
  "competency_indicators",
  {
    id: int("id").primaryKey().autoincrement(),
    competency_level_id: int("competency_level_id").notNull(),
    nomor_indikator: varchar("nomor_indikator", { length: 50 }).notNull(), // e.g. "1.1", "1.2", "2.1"
    deskripsi_indikator: text("deskripsi_indikator").notNull(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "fk_ci_level",
      columns: [table.competency_level_id],
      foreignColumns: [competencyLevels.id],
    }),
  ]
);

// 7. Questions (Situational Judgment Test / SJT)
export const questions = mysqlTable("questions", {
  id: int("id").primaryKey().autoincrement(),
  competency_id: int("competency_id").references(() => competencies.id),
  kode_soal: varchar("kode_soal", { length: 50 }),
  skenario_kasus: text("skenario_kasus").notNull(),
  target_level: int("target_level").default(1),
  created_at: timestamp("created_at").defaultNow(),
});

// 8. Question Options (4 Opsi berbobot 1 s.d. 4)
export const questionOptions = mysqlTable("question_options", {
  id: int("id").primaryKey().autoincrement(),
  question_id: int("question_id").references(() => questions.id),
  label: varchar("label", { length: 5 }).notNull(), // A, B, C, D
  teks_opsi: text("teks_opsi").notNull(),
  bobot_nilai: int("bobot_nilai").notNull(), // 1, 2, 3, 4
});

// 9. Assessment Sessions
export const assessmentSessions = mysqlTable(
  "assessment_sessions",
  {
    id: int("id").primaryKey().autoincrement(),
    judul: varchar("judul", { length: 255 }).notNull(),
    deskripsi: text("deskripsi"),
    kode_sesi: varchar("kode_sesi", { length: 50 }).notNull().unique(),
    token_sesi: varchar("token_sesi", { length: 20 }),
    waktu_mulai: timestamp("waktu_mulai").notNull(),
    waktu_selesai: timestamp("waktu_selesai").notNull(),
    durasi_menit: int("durasi_menit").default(60).notNull(),
    target_jenjang_id: int("target_jenjang_id"),
    status: mysqlEnum("status", ["DRAFT", "BERJALAN", "SELESAI"])
      .default("DRAFT")
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "fk_sess_jenjang",
      columns: [table.target_jenjang_id],
      foreignColumns: [jenjangJabatan.id],
    }),
  ]
);

// 10. Session Participants
export const sessionParticipants = mysqlTable("session_participants", {
  id: int("id").primaryKey().autoincrement(),
  session_id: int("session_id").references(() => assessmentSessions.id),
  user_id: int("user_id").references(() => users.id),
  status: mysqlEnum("status", ["TERDAFTAR", "SEDANG_MENGERJAKAN", "SELESAI"])
    .default("TERDAFTAR")
    .notNull(),
  waktu_login: timestamp("waktu_login"),
  waktu_submit: timestamp("waktu_submit"),
  tab_switch_count: int("tab_switch_count").default(0).notNull(),
  total_score: decimal("total_score", { precision: 8, scale: 2 }).default("0.00"),
  jpm_percentage: decimal("jpm_percentage", { precision: 5, scale: 2 }).default("0.00"),
  kategori_kelulusan: mysqlEnum("kategori_kelulusan", ["MS", "MMS", "KMS"]),
});

// 11. Participant Answers (Autosave & Proctoring Record)
export const participantAnswers = mysqlTable(
  "participant_answers",
  {
    id: int("id").primaryKey().autoincrement(),
    session_participant_id: int("session_participant_id"),
    question_id: int("question_id").references(() => questions.id),
    selected_option_id: int("selected_option_id").references(() => questionOptions.id),
    bobot_diperoleh: int("bobot_diperoleh").default(0).notNull(),
    is_ragu: boolean("is_ragu").default(false).notNull(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "fk_ans_session_participant",
      columns: [table.session_participant_id],
      foreignColumns: [sessionParticipants.id],
    }),
  ]
);

// Relasi Drizzle ORM
export const jenjangJabatanRelations = relations(jenjangJabatan, ({ many }) => ({
  users: many(users),
  assessmentSessions: many(assessmentSessions),
  standarKompetensi: many(standarKompetensiJabatan),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  jenjangJabatan: one(jenjangJabatan, {
    fields: [users.jenjang_jabatan_id],
    references: [jenjangJabatan.id],
  }),
  participants: many(sessionParticipants),
}));

export const competenciesRelations = relations(competencies, ({ many }) => ({
  questions: many(questions),
  standarJabatan: many(standarKompetensiJabatan),
  levels: many(competencyLevels),
}));

export const standarKompetensiJabatanRelations = relations(
  standarKompetensiJabatan,
  ({ one }) => ({
    jenjangJabatan: one(jenjangJabatan, {
      fields: [standarKompetensiJabatan.jenjang_jabatan_id],
      references: [jenjangJabatan.id],
    }),
    competency: one(competencies, {
      fields: [standarKompetensiJabatan.competency_id],
      references: [competencies.id],
    }),
  })
);

export const competencyLevelsRelations = relations(
  competencyLevels,
  ({ one, many }) => ({
    competency: one(competencies, {
      fields: [competencyLevels.competency_id],
      references: [competencies.id],
    }),
    indicators: many(competencyIndicators),
  })
);

export const competencyIndicatorsRelations = relations(
  competencyIndicators,
  ({ one }) => ({
    level: one(competencyLevels, {
      fields: [competencyIndicators.competency_level_id],
      references: [competencyLevels.id],
    }),
  })
);

export const questionsRelations = relations(questions, ({ one, many }) => ({
  competency: one(competencies, {
    fields: [questions.competency_id],
    references: [competencies.id],
  }),
  options: many(questionOptions),
  answers: many(participantAnswers),
}));

export const questionOptionsRelations = relations(questionOptions, ({ one }) => ({
  question: one(questions, {
    fields: [questionOptions.question_id],
    references: [questions.id],
  }),
}));

export const assessmentSessionsRelations = relations(
  assessmentSessions,
  ({ one, many }) => ({
    targetJenjang: one(jenjangJabatan, {
      fields: [assessmentSessions.target_jenjang_id],
      references: [jenjangJabatan.id],
    }),
    participants: many(sessionParticipants),
  })
);

export const sessionParticipantsRelations = relations(
  sessionParticipants,
  ({ one, many }) => ({
    session: one(assessmentSessions, {
      fields: [sessionParticipants.session_id],
      references: [assessmentSessions.id],
    }),
    user: one(users, {
      fields: [sessionParticipants.user_id],
      references: [users.id],
    }),
    answers: many(participantAnswers),
  })
);

export const participantAnswersRelations = relations(
  participantAnswers,
  ({ one }) => ({
    sessionParticipant: one(sessionParticipants, {
      fields: [participantAnswers.session_participant_id],
      references: [sessionParticipants.id],
    }),
    question: one(questions, {
      fields: [participantAnswers.question_id],
      references: [questions.id],
    }),
    selectedOption: one(questionOptions, {
      fields: [participantAnswers.selected_option_id],
      references: [questionOptions.id],
    }),
  })
);
