import { describe, it, expect } from "bun:test";
import { db } from "../../src/db/connection";
import {
  competencies,
  questions,
  questionOptions,
  users,
  jenjangJabatan,
  standarKompetensiJabatan,
  competencyLevels,
  competencyIndicators,
} from "../../src/db/schema";
import { seedDatabase } from "../../src/db/seed";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

describe("Database Seeder (TDD Tahap 2 & Tahap 14.2)", () => {
  it("should seed exactly 9 competencies (8 Manajerial + 1 Sosio Kultural)", async () => {
    await seedDatabase();

    const allCompetencies = await db.select().from(competencies);
    expect(allCompetencies.length).toBe(9);

    const manajerial = allCompetencies.filter((c) => c.kategori === "MANAJERIAL");
    const sosio = allCompetencies.filter((c) => c.kategori === "SOSIO_KULTURAL");

    expect(manajerial.length).toBe(8);
    expect(sosio.length).toBe(1);

    const kodes = allCompetencies.map((c) => c.kode);
    for (let i = 1; i <= 9; i++) {
      expect(kodes).toContain(`KOMP-0${i}`);
    }
  });

  it("should seed exactly 14 jenjang jabatan from Kamus ASN PermenPANRB", async () => {
    const allJenjang = await db.select().from(jenjangJabatan);
    expect(allJenjang.length).toBe(14);

    const kodes = allJenjang.map((j) => j.kode);
    expect(kodes).toContain("ADMINISTRATOR");
    expect(kodes).toContain("PENGAWAS");
    expect(kodes).toContain("PELAKSANA");
    expect(kodes).toContain("JF_AHLI_UTAMA");
    expect(kodes).toContain("JF_TERAMPIL");
  });

  it("should seed 126 standar kompetensi jabatan with proper edge cases", async () => {
    const allStandards = await db.select().from(standarKompetensiJabatan);
    expect(allStandards.length).toBe(14 * 9); // 126

    // JF Ahli Utama: Integritas (KOMP-01) & Perekat Bangsa (KOMP-09) level 5, lainnya level 4
    const [jfAhliUtama] = await db
      .select()
      .from(jenjangJabatan)
      .where(eq(jenjangJabatan.kode, "JF_AHLI_UTAMA"));
    expect(jfAhliUtama).toBeDefined();

    const [komp01] = await db.select().from(competencies).where(eq(competencies.kode, "KOMP-01"));
    const [komp02] = await db.select().from(competencies).where(eq(competencies.kode, "KOMP-02"));
    const [komp09] = await db.select().from(competencies).where(eq(competencies.kode, "KOMP-09"));

    const stdM01 = allStandards.find(
      (s) => s.jenjang_jabatan_id === jfAhliUtama.id && s.competency_id === komp01.id
    );
    const stdM02 = allStandards.find(
      (s) => s.jenjang_jabatan_id === jfAhliUtama.id && s.competency_id === komp02.id
    );
    const stdSK01 = allStandards.find(
      (s) => s.jenjang_jabatan_id === jfAhliUtama.id && s.competency_id === komp09.id
    );

    expect(stdM01?.target_level).toBe(5);
    expect(stdM02?.target_level).toBe(4);
    expect(stdSK01?.target_level).toBe(5);
  });

  it("should seed 45 competency levels and 135 competency indicators", async () => {
    const allLevels = await db.select().from(competencyLevels);
    expect(allLevels.length).toBe(45);

    const allIndicators = await db.select().from(competencyIndicators);
    expect(allIndicators.length).toBe(135);
  });

  it("should seed at least 18 SJT questions (min 2 per competency)", async () => {
    const allQuestions = await db.select().from(questions);
    expect(allQuestions.length).toBeGreaterThanOrEqual(18);

    const allCompetencies = await db.select().from(competencies);
    for (const comp of allCompetencies) {
      const compQuestions = allQuestions.filter((q) => q.competency_id === comp.id);
      expect(compQuestions.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("each question should have exactly 4 options with distinct bobot 1-4", async () => {
    const allQuestions = await db.select().from(questions);
    const allOptions = await db.select().from(questionOptions);

    for (const q of allQuestions) {
      const options = allOptions.filter((o) => o.question_id === q.id);
      expect(options.length).toBe(4);

      const labels = options.map((o) => o.label).sort();
      expect(labels).toEqual(["A", "B", "C", "D"]);

      const bobots = options.map((o) => o.bobot_nilai).sort();
      expect(bobots).toEqual([1, 2, 3, 4]);
    }
  });

  it("should create demo users: 1 Admin + 3 Peserta ASN linked to jenjang_jabatan_id", async () => {
    const allUsers = await db.select().from(users);
    expect(allUsers.length).toBeGreaterThanOrEqual(4);

    const admin = allUsers.find((u) => u.role === "ADMIN");
    expect(admin).toBeDefined();
    expect(admin?.nip).toBe("198501012010011001");

    // Validasi password hash menggunakan bcrypt
    const isPasswordValid = await bcrypt.compare("password123", admin!.password_hash);
    expect(isPasswordValid).toBe(true);

    const participants = allUsers.filter((u) => u.role === "PESERTA");
    expect(participants.length).toBeGreaterThanOrEqual(3);

    const jenjangIds = participants.map((p) => p.jenjang_jabatan_id).filter(Boolean);
    expect(jenjangIds.length).toBe(3);
  });

  it("should be idempotent — running seedDatabase twice does not duplicate data", async () => {
    const usersBefore = (await db.select().from(users)).length;
    const compsBefore = (await db.select().from(competencies)).length;
    const questionsBefore = (await db.select().from(questions)).length;
    const optionsBefore = (await db.select().from(questionOptions)).length;
    const jenjangBefore = (await db.select().from(jenjangJabatan)).length;
    const standarBefore = (await db.select().from(standarKompetensiJabatan)).length;
    const levelsBefore = (await db.select().from(competencyLevels)).length;
    const indicatorsBefore = (await db.select().from(competencyIndicators)).length;

    // Jalankan seeder kedua kali
    await seedDatabase();

    const usersAfter = (await db.select().from(users)).length;
    const compsAfter = (await db.select().from(competencies)).length;
    const questionsAfter = (await db.select().from(questions)).length;
    const optionsAfter = (await db.select().from(questionOptions)).length;
    const jenjangAfter = (await db.select().from(jenjangJabatan)).length;
    const standarAfter = (await db.select().from(standarKompetensiJabatan)).length;
    const levelsAfter = (await db.select().from(competencyLevels)).length;
    const indicatorsAfter = (await db.select().from(competencyIndicators)).length;

    expect(usersAfter).toBe(usersBefore);
    expect(compsAfter).toBe(compsBefore);
    expect(questionsAfter).toBe(questionsBefore);
    expect(optionsAfter).toBe(optionsBefore);
    expect(jenjangAfter).toBe(jenjangBefore);
    expect(standarAfter).toBe(standarBefore);
    expect(levelsAfter).toBe(levelsBefore);
    expect(indicatorsAfter).toBe(indicatorsBefore);
  });
});
