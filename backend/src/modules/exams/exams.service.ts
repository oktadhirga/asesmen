import { db } from "../../db/connection";
import {
  assessmentSessions,
  sessionParticipants,
  participantAnswers,
  questions,
  questionOptions,
} from "../../db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { ReportsService } from "../reports/reports.service";

export interface SaveAnswerData {
  question_id: number;
  selected_option_id: number;
  is_ragu?: boolean;
}

export class ExamsService {
  /**
   * Helper untuk mengacak array secara deterministik menggunakan seed (angka integer)
   */
  static seededShuffle<T>(array: T[], seed: number): T[] {
    const result = [...array];
    let m = result.length;
    let s = seed;

    while (m) {
      s = (s * 9301 + 49297) % 233280;
      const rnd = s / 233280;
      const i = Math.floor(rnd * m--);
      const t = result[m]!;
      result[m] = result[i]!;
      result[i] = t;
    }

    return result;
  }

  /**
   * Helper untuk menghitung sisa waktu pengerjaan ujian dalam detik
   */
  static calculateRemainingSeconds(session: any, participant: any): number {
    const now = Date.now();
    const sessionEnd = new Date(session.waktu_selesai).getTime();

    // Batas waktu pengerjaan individu berdasarkan waktu_login + durasi_menit
    const loginTime = participant.waktu_login
      ? new Date(participant.waktu_login).getTime()
      : now;
    const individualEnd = loginTime + sessionEnd; // fallback

    const durasiMs = (session.durasi_menit || 60) * 60 * 1000;
    const personalDeadline = loginTime + durasiMs;

    // Deadline adalah yang paling awal antara personal deadline dan akhir sesi
    const effectiveDeadline = Math.min(personalDeadline, sessionEnd);
    const diff = Math.floor((effectiveDeadline - now) / 1000);

    return Math.max(0, diff);
  }

  /**
   * 1. Mulai ujian asesmen
   */
  static async startExam(
    userId: number,
    sessionId: number,
    tokenAkses: string
  ) {
    // Cari sesi
    const [session] = await db
      .select()
      .from(assessmentSessions)
      .where(eq(assessmentSessions.id, sessionId))
      .limit(1);

    if (!session) {
      throw new Error("Sesi asesmen tidak ditemukan.");
    }

    if (session.status !== "BERJALAN") {
      throw new Error(
        `Sesi asesmen belum dapat dimulai. Status saat ini: ${session.status}`
      );
    }

    // Cari peserta
    const [participant] = await db
      .select()
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.session_id, sessionId),
          eq(sessionParticipants.user_id, userId)
        )
      )
      .limit(1);

    if (!participant) {
      throw new Error(
        "Token akses tidak valid atau Anda tidak terdaftar dalam sesi ini."
      );
    }

    // Validasi token sesi kolektif
    const inputToken = tokenAkses.trim().toUpperCase();
    const expectedSessionToken = (session.token_sesi || "").trim().toUpperCase();

    if (!expectedSessionToken || inputToken !== expectedSessionToken) {
      throw new Error(
        "Token akses tidak valid atau Anda tidak terdaftar dalam sesi ini."
      );
    }

    if (participant.status === "SELESAI") {
      throw new Error("Ujian sudah diselesaikan dan tidak dapat diakses kembali.");
    }

    // Jika status masih TERDAFTAR, ubah ke SEDANG_MENGERJAKAN dan catat waktu_login
    let updatedPart = participant;
    if (participant.status === "TERDAFTAR") {
      const loginTime = new Date();
      await db
        .update(sessionParticipants)
        .set({
          status: "SEDANG_MENGERJAKAN",
          waktu_login: loginTime,
        })
        .where(eq(sessionParticipants.id, participant.id));

      const [p] = await db
        .select()
        .from(sessionParticipants)
        .where(eq(sessionParticipants.id, participant.id))
        .limit(1);
      updatedPart = p!;
    }

    const sisaWaktu = this.calculateRemainingSeconds(session, updatedPart);

    return {
      participant_id: updatedPart.id,
      session_participant_id: updatedPart.id,
      session_id: session.id,
      judul_sesi: session.judul,
      kode_sesi: session.kode_sesi,
      durasi_menit: session.durasi_menit,
      status: updatedPart.status,
      waktu_login: updatedPart.waktu_login,
      sisa_waktu_detik: sisaWaktu,
      tab_switch_count: updatedPart.tab_switch_count,
    };
  }

  /**
   * Helper untuk meresolusi data peserta (session_participants) secara aman dan toleran:
   * 1. Mencari berdasarkan ID peserta (session_participants.id) dan ID user yang sedang login.
   * 2. Fallback cerdas: Jika client mengirim sessionId alih-alih participantId, cari baris peserta milik user pada sesi tersebut.
   * 3. Jika user adalah ADMIN, izinkan akses berdasarkan ID peserta (untuk pengawasan / penutupan sesi oleh Asesor).
   */
  static async resolveParticipant(
    userId: number,
    participantOrSessionId: number,
    userRole?: string
  ) {
    if (!participantOrSessionId || isNaN(participantOrSessionId)) {
      throw new Error("Akses ditolak: Data peserta ujian tidak valid.");
    }

    // 1. Coba cari sessionParticipants dengan id = participantOrSessionId DAN user_id = userId
    let [participant] = await db
      .select()
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.id, participantOrSessionId),
          eq(sessionParticipants.user_id, userId)
        )
      )
      .limit(1);

    // 2. Fallback cerdas: jika participantOrSessionId ternyata adalah session_id di mana user ini terdaftar
    if (!participant) {
      const [bySession] = await db
        .select()
        .from(sessionParticipants)
        .where(
          and(
            eq(sessionParticipants.session_id, participantOrSessionId),
            eq(sessionParticipants.user_id, userId)
          )
        )
        .limit(1);
      if (bySession) {
        participant = bySession;
      }
    }

    // 3. Jika user adalah ADMIN, izinkan akses berdasarkan ID peserta
    if (!participant && userRole === "ADMIN") {
      const [byAdminId] = await db
        .select()
        .from(sessionParticipants)
        .where(eq(sessionParticipants.id, participantOrSessionId))
        .limit(1);
      if (byAdminId) {
        participant = byAdminId;
      }
    }

    if (!participant) {
      throw new Error("Akses ditolak: Data peserta ujian tidak valid.");
    }

    return participant;
  }

  /**
   * 2. Mengambil daftar butir soal ujian dengan proteksi kerahasiaan bobot opsi
   */
  static async getExamQuestions(userId: number, participantId: number, userRole?: string) {
    // Validasi kepemilikan participant secara aman
    const participant = await this.resolveParticipant(userId, participantId, userRole);
    const resolvedParticipantId = participant.id;

    // Ambil semua soal SJT aktif
    const allQuestions = await db
      .select({
        id: questions.id,
        competency_id: questions.competency_id,
        kode_soal: questions.kode_soal,
        skenario_kasus: questions.skenario_kasus,
        target_level: questions.target_level,
      })
      .from(questions)
      .orderBy(sql`${questions.id} ASC`);

    if (allQuestions.length === 0) {
      return [];
    }

    const questionIds = allQuestions.map((q) => q.id);

    // Ambil opsi TANPA menyertakan bobot_nilai ke respon
    const allOptions = await db
      .select({
        id: questionOptions.id,
        question_id: questionOptions.question_id,
        label: questionOptions.label,
        teks_opsi: questionOptions.teks_opsi,
      })
      .from(questionOptions)
      .where(inArray(questionOptions.question_id, questionIds));

    // Ambil jawaban yang telah tersimpan sebelumnya oleh peserta
    const existingAnswers = await db
      .select()
      .from(participantAnswers)
      .where(eq(participantAnswers.session_participant_id, resolvedParticipantId));

    const answerMap = new Map<number, typeof existingAnswers[0]>();
    for (const ans of existingAnswers) {
      if (ans.question_id) {
        answerMap.set(ans.question_id, ans);
      }
    }

    // Kelompokkan opsi per question
    const optionsMap = new Map<number, typeof allOptions>();
    for (const opt of allOptions) {
      if (!opt.question_id) continue;
      if (!optionsMap.has(opt.question_id)) {
        optionsMap.set(opt.question_id, []);
      }
      optionsMap.get(opt.question_id)!.push(opt);
    }

    // Acak soal secara konsisten per peserta (menggunakan participantId sebagai seed)
    const shuffledQuestions = this.seededShuffle(allQuestions, participantId);

    const questionsWithAnswer = shuffledQuestions.map((q, idx) => {
      const rawOpts = optionsMap.get(q.id) || [];
      // Acak urutan pilihan jawaban secara deterministik per peserta dan butir soal
      const optionSeed = participantId * 10007 + q.id;
      const shuffledOpts = this.seededShuffle(rawOpts, optionSeed);
      const displayLabels = ["A", "B", "C", "D"];
      const displayOpts = shuffledOpts.map((opt, optIdx) => ({
        id: opt.id,
        question_id: opt.question_id,
        label: displayLabels[optIdx] || opt.label,
        teks_opsi: opt.teks_opsi,
      }));
      const userAns = answerMap.get(q.id);

      return {
        nomor_urut: idx + 1,
        id: q.id,
        competency_id: q.competency_id,
        kode_soal: q.kode_soal,
        skenario_kasus: q.skenario_kasus,
        target_level: q.target_level,
        options: displayOpts,
        jawaban_peserta: userAns
          ? {
              selected_option_id: userAns.selected_option_id,
              is_ragu: userAns.is_ragu,
            }
          : null,
      };
    });

    return questionsWithAnswer;
  }

  /**
   * 3. Menyimpan jawaban per klik secara real-time (Autosave)
   */
  static async saveAnswer(
    userId: number,
    participantId: number,
    data: SaveAnswerData,
    userRole?: string
  ) {
    const participant = await this.resolveParticipant(userId, participantId, userRole);
    const resolvedParticipantId = participant.id;

    if (participant.status === "SELESAI") {
      throw new Error(
        "Ujian sudah diselesaikan dan tidak dapat menerima jawaban lagi."
      );
    }

    // Ambil bobot opsi dari database secara aman di server
    const [matchedOption] = await db
      .select()
      .from(questionOptions)
      .where(
        and(
          eq(questionOptions.id, data.selected_option_id),
          eq(questionOptions.question_id, data.question_id)
        )
      )
      .limit(1);

    if (!matchedOption) {
      throw new Error("Opsi jawaban tidak valid untuk butir soal ini.");
    }

    const bobotDiperoleh = matchedOption.bobot_nilai;
    const isRagu = Boolean(data.is_ragu);

    // Cek apakah jawaban sudah pernah disimpan sebelumnya
    const [existingAnswer] = await db
      .select()
      .from(participantAnswers)
      .where(
        and(
          eq(participantAnswers.session_participant_id, resolvedParticipantId),
          eq(participantAnswers.question_id, data.question_id)
        )
      )
      .limit(1);

    if (existingAnswer) {
      await db
        .update(participantAnswers)
        .set({
          selected_option_id: data.selected_option_id,
          bobot_diperoleh: bobotDiperoleh,
          is_ragu: isRagu,
          updated_at: new Date(),
        })
        .where(eq(participantAnswers.id, existingAnswer.id));
    } else {
      await db.insert(participantAnswers).values({
        session_participant_id: resolvedParticipantId,
        question_id: data.question_id,
        selected_option_id: data.selected_option_id,
        bobot_diperoleh: bobotDiperoleh,
        is_ragu: isRagu,
      });
    }

    return {
      question_id: data.question_id,
      selected_option_id: data.selected_option_id,
      is_ragu: isRagu,
    };
  }

  /**
   * 4. Mencatat pelanggaran perpindahan tab / aplikasi (Proctoring)
   */
  static async recordTabSwitch(
    userId: number,
    participantId: number,
    userRole?: string
  ) {
    const participant = await this.resolveParticipant(userId, participantId, userRole);
    const resolvedParticipantId = participant.id;

    if (participant.status === "SELESAI") {
      throw new Error("Ujian telah selesai.");
    }

    const newCount = participant.tab_switch_count + 1;

    await db
      .update(sessionParticipants)
      .set({ tab_switch_count: newCount })
      .where(eq(sessionParticipants.id, resolvedParticipantId));

    return {
      tab_switch_count: newCount,
      warning:
        "Peringatan: Perpindahan tab/aplikasi tercatat dalam log sistem pengawasan ujian.",
    };
  }

  /**
   * 5. Status pengerjaan & sinkronisasi timer server
   */
  static async getExamStatus(
    userId: number,
    participantId: number,
    userRole?: string
  ) {
    const participant = await this.resolveParticipant(userId, participantId, userRole);
    const resolvedParticipantId = participant.id;

    const [session] = await db
      .select()
      .from(assessmentSessions)
      .where(eq(assessmentSessions.id, participant.session_id!))
      .limit(1);

    // Hitung statistik jawaban
    const answers = await db
      .select()
      .from(participantAnswers)
      .where(eq(participantAnswers.session_participant_id, resolvedParticipantId));

    const totalAnswered = answers.length;
    const totalDoubt = answers.filter((a) => a.is_ragu).length;
    const sisaWaktu = session
      ? this.calculateRemainingSeconds(session, participant)
      : 0;

    return {
      session_participant_id: resolvedParticipantId,
      status: participant.status,
      total_answered: totalAnswered,
      total_doubt: totalDoubt,
      tab_switch_count: participant.tab_switch_count,
      sisa_waktu_detik: sisaWaktu,
      waktu_login: participant.waktu_login,
      waktu_submit: participant.waktu_submit,
    };
  }

  /**
   * 6. Submit final dan kunci lembar jawaban ujian
   */
  static async submitExam(
    userId: number,
    participantId: number,
    userRole?: string
  ) {
    const participant = await this.resolveParticipant(userId, participantId, userRole);
    const resolvedParticipantId = participant.id;

    if (participant.status === "SELESAI") {
      throw new Error("Ujian sudah diselesaikan sebelumnya.");
    }

    // Hitung total nilai perolehan sementara dari seluruh jawaban
    const answers = await db
      .select()
      .from(participantAnswers)
      .where(eq(participantAnswers.session_participant_id, resolvedParticipantId));

    const totalScore = answers.reduce((sum, a) => sum + (a.bobot_diperoleh || 0), 0);
    const submitTime = new Date();

    await db
      .update(sessionParticipants)
      .set({
        status: "SELESAI",
        waktu_submit: submitTime,
        total_score: totalScore.toFixed(2),
      })
      .where(eq(sessionParticipants.id, resolvedParticipantId));

    // Hitung dan simpan nilai JPM serta kategori kelulusan langsung ke database
    const reportData = await ReportsService.calculateParticipantReport(resolvedParticipantId);

    return {
      participant_id: resolvedParticipantId,
      session_participant_id: resolvedParticipantId,
      status: "SELESAI",
      waktu_submit: submitTime,
      total_answered: answers.length,
      total_score: reportData.total_score,
      jpm_percentage: reportData.jpm_percentage,
      kategori_kelulusan: reportData.kategori_kelulusan,
    };
  }
}
