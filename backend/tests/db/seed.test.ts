import { describe, it, expect } from "bun:test";
import { db } from "../../src/db/connection";
import { competencies, questions, questionOptions, users } from "../../src/db/schema";
import { seedDatabase } from "../../src/db/seed";
import bcrypt from "bcryptjs";

describe("Database Seeder (TDD Tahap 2)", () => {
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

  it("should create demo users: 1 Admin + 3 Peserta ASN with hashed passwords", async () => {
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

    const jenjangs = participants.map((p) => p.jenjang_jabatan);
    expect(jenjangs).toContain("PELAKSANA");
    expect(jenjangs).toContain("PENGAWAS");
    expect(jenjangs).toContain("ADMINISTRATOR");
  });

  it("should be idempotent — running seedDatabase twice does not duplicate data", async () => {
    const usersBefore = (await db.select().from(users)).length;
    const compsBefore = (await db.select().from(competencies)).length;
    const questionsBefore = (await db.select().from(questions)).length;
    const optionsBefore = (await db.select().from(questionOptions)).length;

    // Jalankan seeder kedua kali
    await seedDatabase();

    const usersAfter = (await db.select().from(users)).length;
    const compsAfter = (await db.select().from(competencies)).length;
    const questionsAfter = (await db.select().from(questions)).length;
    const optionsAfter = (await db.select().from(questionOptions)).length;

    expect(usersAfter).toBe(usersBefore);
    expect(compsAfter).toBe(compsBefore);
    expect(questionsAfter).toBe(questionsBefore);
    expect(optionsAfter).toBe(optionsBefore);
  });
});
