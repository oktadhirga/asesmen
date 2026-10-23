import { db } from "../../db/connection";
import {
  assessmentSessions,
  sessionParticipants,
  participantAnswers,
  questions,
  competencies,
  users,
} from "../../db/schema";
import { eq, sql, asc, desc } from "drizzle-orm";

export interface RadarDimensionItem {
  kode: string;
  nama: string;
  kategori: "MANAJERIAL" | "SOSIO_KULTURAL";
  skor: number;
  standar: number;
  gap: number;
  persentase_pemenuhan: number;
}

export class ReportsService {
  /**
   * Helper konversi kategori kelulusan ke label teks resmi PermenPANRB
   */
  static getKategoriLabel(kategori: "MS" | "MMS" | "KMS" | null): string {
    switch (kategori) {
      case "MS":
        return "Memenuhi Syarat";
      case "MMS":
        return "Masih Memenuhi Syarat";
      case "KMS":
        return "Kurang Memenuhi Syarat";
      default:
        return "Belum Dinilai";
    }
  }

  /**
   * Mengkalkulasi nilai 9 dimensi kompetensi, persentase JPM, dan kategori kelulusan
   */
  static async calculateParticipantReport(participantId: number) {
    // 1. Ambil data peserta, user, dan sesi
    const [participantRow] = await db
      .select({
        id: sessionParticipants.id,
        session_id: sessionParticipants.session_id,
        user_id: sessionParticipants.user_id,
        status: sessionParticipants.status,
        token_akses: sessionParticipants.token_akses,
        waktu_login: sessionParticipants.waktu_login,
        waktu_submit: sessionParticipants.waktu_submit,
        tab_switch_count: sessionParticipants.tab_switch_count,
        total_score: sessionParticipants.total_score,
        jpm_percentage: sessionParticipants.jpm_percentage,
        kategori_kelulusan: sessionParticipants.kategori_kelulusan,
        user: {
          id: users.id,
          nip: users.nip,
          nama: users.nama,
          email: users.email,
          jabatan: users.jabatan,
          instansi: users.instansi,
          unit_kerja: users.unit_kerja,
          jenjang_jabatan: users.jenjang_jabatan,
        },
      })
      .from(sessionParticipants)
      .leftJoin(users, eq(sessionParticipants.user_id, users.id))
      .where(eq(sessionParticipants.id, participantId))
      .limit(1);

    if (!participantRow) {
      throw new Error("Data peserta ujian tidak ditemukan.");
    }

    const [session] = await db
      .select()
      .from(assessmentSessions)
      .where(eq(assessmentSessions.id, participantRow.session_id!))
      .limit(1);

    // 2. Ambil 9 dimensi kompetensi referensi
    const allCompetencies = await db
      .select()
      .from(competencies)
      .orderBy(asc(competencies.kode));

    // 3. Ambil jawaban peserta beserta competency_id dari masing-masing soal
    const answers = await db
      .select({
        id: participantAnswers.id,
        question_id: participantAnswers.question_id,
        selected_option_id: participantAnswers.selected_option_id,
        bobot_diperoleh: participantAnswers.bobot_diperoleh,
        is_ragu: participantAnswers.is_ragu,
        competency_id: questions.competency_id,
      })
      .from(participantAnswers)
      .innerJoin(questions, eq(participantAnswers.question_id, questions.id))
      .where(eq(participantAnswers.session_participant_id, participantId));

    // 4. Kelompokkan skor berdasarkan dimensi kompetensi
    const compScoresMap = new Map<number, { totalScore: number; count: number }>();
    for (const ans of answers) {
      if (!ans.competency_id) continue;
      const current = compScoresMap.get(ans.competency_id) || {
        totalScore: 0,
        count: 0,
      };
      current.totalScore += ans.bobot_diperoleh;
      current.count += 1;
      compScoresMap.set(ans.competency_id, current);
    }

    // 5. Bangun data 9 dimensi untuk Radar Chart & kalkulasi rata-rata per dimensi
    const radarData: RadarDimensionItem[] = [];
    let sumSkorDimensi = 0;
    let sumStandarDimensi = 0;
    let rawTotalScore = 0;

    for (const comp of allCompetencies) {
      const stat = compScoresMap.get(comp.id);
      const skorRataRata =
        stat && stat.count > 0 ? Number((stat.totalScore / stat.count).toFixed(2)) : 0;
      const standar = Number(comp.bobot_standar || 3.0);
      const gap = Number((skorRataRata - standar).toFixed(2));
      const pemenuhan =
        standar > 0 ? Number(((skorRataRata / standar) * 100).toFixed(2)) : 0;

      radarData.push({
        kode: comp.kode,
        nama: comp.nama,
        kategori: comp.kategori,
        skor: skorRataRata,
        standar,
        gap,
        persentase_pemenuhan: pemenuhan,
      });

      sumSkorDimensi += skorRataRata;
      sumStandarDimensi += standar;
      if (stat) {
        rawTotalScore += stat.totalScore;
      }
    }

    // 6. Kalkulasi JPM (Jumlah Pemenuhan Standar)
    // Formula BKN / PermenPANRB 38/2017: Persentase rerata capaian dimensi terhadap standar
    const jpmPercentage =
      sumStandarDimensi > 0
        ? Number(((sumSkorDimensi / sumStandarDimensi) * 100).toFixed(2))
        : 0;

    // 7. Tentukan Kategori Kelulusan
    let kategoriKelulusan: "MS" | "MMS" | "KMS";
    if (jpmPercentage >= 80.0) {
      kategoriKelulusan = "MS";
    } else if (jpmPercentage >= 68.0) {
      kategoriKelulusan = "MMS";
    } else {
      kategoriKelulusan = "KMS";
    }

    // 8. Update database session_participants
    await db
      .update(sessionParticipants)
      .set({
        total_score: rawTotalScore.toFixed(2),
        jpm_percentage: jpmPercentage.toFixed(2),
        kategori_kelulusan: kategoriKelulusan,
      })
      .where(eq(sessionParticipants.id, participantId));

    const summaryData = {
      total_score: rawTotalScore,
      max_possible_score: allCompetencies.length * 4,
      jpm_percentage: jpmPercentage,
      kategori_kelulusan: kategoriKelulusan,
      kategori_label: this.getKategoriLabel(kategoriKelulusan),
      total_answered: answers.length,
    };

    return {
      participant: {
        id: participantRow.id,
        nip: participantRow.user?.nip,
        nama: participantRow.user?.nama,
        jabatan: participantRow.user?.jabatan,
        instansi: participantRow.user?.instansi,
        unit_kerja: participantRow.user?.unit_kerja,
        jenjang_jabatan: participantRow.user?.jenjang_jabatan,
        status: participantRow.status,
        waktu_login: participantRow.waktu_login,
        waktu_submit: participantRow.waktu_submit,
        tab_switch_count: participantRow.tab_switch_count,
      },
      session: {
        id: session?.id,
        judul: session?.judul,
        kode_sesi: session?.kode_sesi,
        durasi_menit: session?.durasi_menit,
        target_jenjang: session?.target_jenjang,
      },
      total_score: rawTotalScore,
      jpm_percentage: jpmPercentage,
      kategori_kelulusan: kategoriKelulusan,
      kategori_label: this.getKategoriLabel(kategoriKelulusan),
      summary: summaryData,
      radar: radarData,
      radar_chart: radarData,
    };
  }

  /**
   * Mengambil laporan individu dengan proteksi otorisasi
   */
  static async getParticipantReport(user: any, participantId: number) {
    const [part] = await db
      .select({
        id: sessionParticipants.id,
        user_id: sessionParticipants.user_id,
      })
      .from(sessionParticipants)
      .where(eq(sessionParticipants.id, participantId))
      .limit(1);

    if (!part) {
      throw new Error("Data peserta ujian tidak ditemukan.");
    }

    // Jika bukan admin dan bukan akun miliknya sendiri, tolak akses
    if (user.role !== "ADMIN" && part.user_id !== user.id) {
      throw new Error("Akses ditolak: Anda tidak memiliki akses ke laporan peserta ini.");
    }

    return await this.calculateParticipantReport(participantId);
  }

  /**
   * Mengambil rekapitulasi nilai sesi asesmen untuk Administrator
   */
  static async getSessionReport(sessionId: number) {
    const [session] = await db
      .select()
      .from(assessmentSessions)
      .where(eq(assessmentSessions.id, sessionId))
      .limit(1);

    if (!session) {
      throw new Error("Sesi asesmen tidak ditemukan.");
    }

    // Ambil semua peserta di sesi ini
    const participants = await db
      .select({
        id: sessionParticipants.id,
        user_id: sessionParticipants.user_id,
        status: sessionParticipants.status,
        total_score: sessionParticipants.total_score,
        jpm_percentage: sessionParticipants.jpm_percentage,
        kategori_kelulusan: sessionParticipants.kategori_kelulusan,
        tab_switch_count: sessionParticipants.tab_switch_count,
        waktu_submit: sessionParticipants.waktu_submit,
        user: {
          nip: users.nip,
          nama: users.nama,
          jabatan: users.jabatan,
          instansi: users.instansi,
          jenjang_jabatan: users.jenjang_jabatan,
        },
      })
      .from(sessionParticipants)
      .leftJoin(users, eq(sessionParticipants.user_id, users.id))
      .where(eq(sessionParticipants.session_id, sessionId))
      .orderBy(desc(sessionParticipants.jpm_percentage));

    // Pastikan nilai ter-kalkulasi untuk peserta yang telah menyelesaikan ujian
    for (const p of participants) {
      if (p.status === "SELESAI" && (!p.jpm_percentage || Number(p.jpm_percentage) === 0)) {
        await this.calculateParticipantReport(p.id);
      }
    }

    // Refresh daftar peserta setelah rekalkulasi jika ada
    const updatedParticipants = await db
      .select({
        id: sessionParticipants.id,
        user_id: sessionParticipants.user_id,
        status: sessionParticipants.status,
        total_score: sessionParticipants.total_score,
        jpm_percentage: sessionParticipants.jpm_percentage,
        kategori_kelulusan: sessionParticipants.kategori_kelulusan,
        tab_switch_count: sessionParticipants.tab_switch_count,
        waktu_submit: sessionParticipants.waktu_submit,
        user: {
          nip: users.nip,
          nama: users.nama,
          jabatan: users.jabatan,
          instansi: users.instansi,
          jenjang_jabatan: users.jenjang_jabatan,
        },
      })
      .from(sessionParticipants)
      .leftJoin(users, eq(sessionParticipants.user_id, users.id))
      .where(eq(sessionParticipants.session_id, sessionId))
      .orderBy(desc(sessionParticipants.jpm_percentage));

    const totalPeserta = updatedParticipants.length;
    const completedList = updatedParticipants.filter((p) => p.status === "SELESAI");
    const totalSelesai = completedList.length;

    let sumJpm = 0;
    const distribusi = { MS: 0, MMS: 0, KMS: 0 };

    for (const p of completedList) {
      const val = Number(p.jpm_percentage || 0);
      sumJpm += val;
      if (p.kategori_kelulusan === "MS") distribusi.MS++;
      else if (p.kategori_kelulusan === "MMS") distribusi.MMS++;
      else if (p.kategori_kelulusan === "KMS") distribusi.KMS++;
    }

    const rataRataJpm =
      totalSelesai > 0 ? Number((sumJpm / totalSelesai).toFixed(2)) : 0;

    const rankedParticipants = updatedParticipants.map((p, idx) => ({
      peringkat: idx + 1,
      id: p.id,
      nip: p.user?.nip,
      nama: p.user?.nama,
      jabatan: p.user?.jabatan,
      instansi: p.user?.instansi,
      jenjang_jabatan: p.user?.jenjang_jabatan,
      status: p.status,
      total_score: Number(p.total_score || 0),
      jpm_percentage: Number(p.jpm_percentage || 0),
      kategori_kelulusan: p.kategori_kelulusan,
      kategori_label: this.getKategoriLabel(p.kategori_kelulusan as any),
      tab_switch_count: p.tab_switch_count,
      waktu_submit: p.waktu_submit,
    }));

    return {
      session: {
        id: session.id,
        judul: session.judul,
        kode_sesi: session.kode_sesi,
        durasi_menit: session.durasi_menit,
        status: session.status,
      },
      summary: {
        total_peserta: totalPeserta,
        total_selesai: totalSelesai,
        rata_rata_jpm: rataRataJpm,
        distribusi_kelulusan: distribusi,
      },
      participants: rankedParticipants,
    };
  }
}
