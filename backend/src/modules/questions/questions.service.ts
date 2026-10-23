import { db } from "../../db/connection";
import { questions, questionOptions, competencies } from "../../db/schema";
import { eq, or, like, sql, and, SQL, inArray } from "drizzle-orm";

export interface QuestionOptionInput {
  label: string;
  teks_opsi: string;
  bobot_nilai: number;
}

export interface CreateQuestionData {
  competency_id: number;
  kode_soal?: string | null;
  skenario_kasus: string;
  target_level?: number;
  options: QuestionOptionInput[];
}

export interface UpdateQuestionData {
  competency_id?: number;
  kode_soal?: string | null;
  skenario_kasus?: string;
  target_level?: number;
  options?: QuestionOptionInput[];
}

export interface ListQuestionsParams {
  page?: number;
  limit?: number;
  competency_id?: number;
  target_level?: number;
  search?: string;
}

export class QuestionsService {
  /**
   * Validasi aturan standar SJT PermenPANRB:
   * Setiap soal harus memiliki tepat 4 opsi berbobot unik 1, 2, 3, dan 4.
   */
  static validateOptions(options: QuestionOptionInput[]) {
    if (!options || options.length !== 4) {
      throw new Error("Setiap soal SJT harus memiliki tepat 4 opsi pilihan jawaban.");
    }

    const weights = options
      .map((o) => Number(o.bobot_nilai))
      .sort((a, b) => a - b);

    if (
      weights[0] !== 1 ||
      weights[1] !== 2 ||
      weights[2] !== 3 ||
      weights[3] !== 4
    ) {
      throw new Error(
        "Setiap soal SJT harus memiliki tepat 4 opsi dengan bobot nilai unik 1, 2, 3, dan 4"
      );
    }
  }

  /**
   * Mengambil daftar soal dengan filter, pencarian, dan paginasi
   */
  static async listQuestions(params: ListQuestionsParams = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 10));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (params.competency_id) {
      conditions.push(eq(questions.competency_id, Number(params.competency_id)));
    }

    if (params.target_level) {
      conditions.push(eq(questions.target_level, Number(params.target_level)));
    }

    if (params.search && params.search.trim() !== "") {
      const term = `%${params.search.trim()}%`;
      conditions.push(
        or(like(questions.skenario_kasus, term), like(questions.kode_soal, term))!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 1. Hitung total records
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(questions)
      .where(whereClause);

    const total = Number(totalResult?.count || 0);

    // 2. Ambil soal
    const questionRows = await db
      .select({
        id: questions.id,
        competency_id: questions.competency_id,
        kode_soal: questions.kode_soal,
        skenario_kasus: questions.skenario_kasus,
        target_level: questions.target_level,
        created_at: questions.created_at,
        competency: {
          id: competencies.id,
          kode: competencies.kode,
          nama: competencies.nama,
          kategori: competencies.kategori,
        },
      })
      .from(questions)
      .leftJoin(competencies, eq(questions.competency_id, competencies.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${questions.id} DESC`);

    // 3. Ambil opsi untuk soal yang ditemukan
    if (questionRows.length === 0) {
      return {
        data: [],
        pagination: { total, page, limit, totalPages: 1 },
      };
    }

    const questionIds = questionRows.map((q) => q.id);
    const allOptions = await db
      .select()
      .from(questionOptions)
      .where(inArray(questionOptions.question_id, questionIds))
      .orderBy(sql`${questionOptions.label} ASC`);

    const optionsMap = new Map<number, typeof allOptions>();
    for (const opt of allOptions) {
      if (!opt.question_id) continue;
      if (!optionsMap.has(opt.question_id)) {
        optionsMap.set(opt.question_id, []);
      }
      optionsMap.get(opt.question_id)!.push(opt);
    }

    const dataWithOption = questionRows.map((q) => ({
      ...q,
      options: optionsMap.get(q.id) || [],
    }));

    return {
      data: dataWithOption,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Mengambil detail satu soal beserta opsi jawabannya
   */
  static async getQuestionById(id: number) {
    const questionRows = await db
      .select({
        id: questions.id,
        competency_id: questions.competency_id,
        kode_soal: questions.kode_soal,
        skenario_kasus: questions.skenario_kasus,
        target_level: questions.target_level,
        created_at: questions.created_at,
        competency: {
          id: competencies.id,
          kode: competencies.kode,
          nama: competencies.nama,
          kategori: competencies.kategori,
        },
      })
      .from(questions)
      .leftJoin(competencies, eq(questions.competency_id, competencies.id))
      .where(eq(questions.id, id))
      .limit(1);

    if (questionRows.length === 0) {
      return null;
    }

    const question = questionRows[0]!;

    const options = await db
      .select()
      .from(questionOptions)
      .where(eq(questionOptions.question_id, id))
      .orderBy(sql`${questionOptions.label} ASC`);

    return {
      ...question,
      options,
    };
  }

  /**
   * Membuat soal baru beserta 4 opsi jawaban
   */
  static async createQuestion(data: CreateQuestionData) {
    this.validateOptions(data.options);

    const [insertResult] = await db.insert(questions).values({
      competency_id: data.competency_id,
      kode_soal: data.kode_soal || null,
      skenario_kasus: data.skenario_kasus.trim(),
      target_level: data.target_level || 1,
    });

    const questionId = Number(insertResult.insertId);

    // Insert 4 opsi jawaban
    for (const opt of data.options) {
      await db.insert(questionOptions).values({
        question_id: questionId,
        label: opt.label.trim().toUpperCase(),
        teks_opsi: opt.teks_opsi.trim(),
        bobot_nilai: Number(opt.bobot_nilai),
      });
    }

    return await this.getQuestionById(questionId);
  }

  /**
   * Memperbarui soal dan/atau opsi jawaban
   */
  static async updateQuestion(id: number, data: UpdateQuestionData) {
    const existing = await this.getQuestionById(id);
    if (!existing) {
      return null;
    }

    const updatePayload: Record<string, any> = {};
    if (data.competency_id !== undefined)
      updatePayload.competency_id = data.competency_id;
    if (data.kode_soal !== undefined) updatePayload.kode_soal = data.kode_soal;
    if (data.skenario_kasus !== undefined)
      updatePayload.skenario_kasus = data.skenario_kasus.trim();
    if (data.target_level !== undefined)
      updatePayload.target_level = data.target_level;

    if (Object.keys(updatePayload).length > 0) {
      await db.update(questions).set(updatePayload).where(eq(questions.id, id));
    }

    // Jika ada pembaruan opsi
    if (data.options) {
      this.validateOptions(data.options);

      // Hapus opsi lama dan masukkan opsi baru
      await db
        .delete(questionOptions)
        .where(eq(questionOptions.question_id, id));

      for (const opt of data.options) {
        await db.insert(questionOptions).values({
          question_id: id,
          label: opt.label.trim().toUpperCase(),
          teks_opsi: opt.teks_opsi.trim(),
          bobot_nilai: Number(opt.bobot_nilai),
        });
      }
    }

    return await this.getQuestionById(id);
  }

  /**
   * Menghapus soal beserta semua opsi jawabannya
   */
  static async deleteQuestion(id: number): Promise<boolean> {
    const existing = await this.getQuestionById(id);
    if (!existing) {
      return false;
    }

    await db
      .delete(questionOptions)
      .where(eq(questionOptions.question_id, id));
    await db.delete(questions).where(eq(questions.id, id));

    return true;
  }
}
