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

// 1. Users (ASN & Admin/Asesor)
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  nip: varchar("nip", { length: 50 }).notNull().unique(),
  nama: varchar("nama", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["ADMIN", "PESERTA"]).default("PESERTA").notNull(),
  jabatan: varchar("jabatan", { length: 255 }),
  instansi: varchar("instansi", { length: 255 }),
  unit_kerja: varchar("unit_kerja", { length: 255 }),
  jenjang_jabatan: mysqlEnum("jenjang_jabatan", [
    "PELAKSANA",
    "PENGAWAS",
    "ADMINISTRATOR",
    "JPT",
  ]).default("PELAKSANA"),
  created_at: timestamp("created_at").defaultNow(),
});

// 2. Competencies (PermenPANRB 38/2017: 8 Manajerial + 1 Sosio Kultural)
export const competencies = mysqlTable("competencies", {
  id: int("id").primaryKey().autoincrement(),
  kode: varchar("kode", { length: 50 }).notNull().unique(),
  nama: varchar("nama", { length: 255 }).notNull(),
  kategori: mysqlEnum("kategori", ["MANAJERIAL", "SOSIO_KULTURAL"]).notNull(),
  deskripsi: text("deskripsi"),
  bobot_standar: decimal("bobot_standar", { precision: 4, scale: 2 }).default("3.00"),
});

// 3. Questions (Situational Judgment Test / SJT)
export const questions = mysqlTable("questions", {
  id: int("id").primaryKey().autoincrement(),
  competency_id: int("competency_id").references(() => competencies.id),
  kode_soal: varchar("kode_soal", { length: 50 }),
  skenario_kasus: text("skenario_kasus").notNull(),
  target_level: int("target_level").default(1),
  created_at: timestamp("created_at").defaultNow(),
});

// 4. Question Options (4 Opsi berbobot 1 s.d. 4)
export const questionOptions = mysqlTable("question_options", {
  id: int("id").primaryKey().autoincrement(),
  question_id: int("question_id").references(() => questions.id),
  label: varchar("label", { length: 5 }).notNull(), // A, B, C, D
  teks_opsi: text("teks_opsi").notNull(),
  bobot_nilai: int("bobot_nilai").notNull(), // 1, 2, 3, 4
});

// 5. Assessment Sessions
export const assessmentSessions = mysqlTable("assessment_sessions", {
  id: int("id").primaryKey().autoincrement(),
  judul: varchar("judul", { length: 255 }).notNull(),
  deskripsi: text("deskripsi"),
  kode_sesi: varchar("kode_sesi", { length: 50 }).notNull().unique(),
  waktu_mulai: timestamp("waktu_mulai").notNull(),
  waktu_selesai: timestamp("waktu_selesai").notNull(),
  durasi_menit: int("durasi_menit").default(60).notNull(),
  target_jenjang: mysqlEnum("target_jenjang", [
    "PELAKSANA",
    "PENGAWAS",
    "ADMINISTRATOR",
    "JPT",
  ]),
  status: mysqlEnum("status", ["DRAFT", "BERJALAN", "SELESAI"])
    .default("DRAFT")
    .notNull(),
});

// 6. Session Participants
export const sessionParticipants = mysqlTable("session_participants", {
  id: int("id").primaryKey().autoincrement(),
  session_id: int("session_id").references(() => assessmentSessions.id),
  user_id: int("user_id").references(() => users.id),
  token_akses: varchar("token_akses", { length: 50 }),
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

// 7. Participant Answers (Autosave & Proctoring Record)
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
export const usersRelations = relations(users, ({ many }) => ({
  participants: many(sessionParticipants),
}));

export const competenciesRelations = relations(competencies, ({ many }) => ({
  questions: many(questions),
}));

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
  ({ many }) => ({
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
