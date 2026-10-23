import { db } from "../../db/connection";
import {
  assessmentSessions,
  sessionParticipants,
  participantAnswers,
  users,
} from "../../db/schema";
import { eq, and, or, like, sql, inArray, SQL } from "drizzle-orm";
import { sanitizeUser } from "../auth/auth.service";

export interface CreateSessionData {
  judul: string;
  deskripsi?: string | null;
  kode_sesi: string;
  waktu_mulai: string | Date;
  waktu_selesai: string | Date;
  durasi_menit?: number;
  target_jenjang?: "PELAKSANA" | "PENGAWAS" | "ADMINISTRATOR" | "JPT" | null;
}

export interface UpdateSessionData {
  judul?: string;
  deskripsi?: string | null;
  kode_sesi?: string;
  waktu_mulai?: string | Date;
  waktu_selesai?: string | Date;
  durasi_menit?: number;
  target_jenjang?: "PELAKSANA" | "PENGAWAS" | "ADMINISTRATOR" | "JPT" | null;
  status?: "DRAFT" | "BERJALAN" | "SELESAI";
}

export interface ListSessionsParams {
  page?: number;
  limit?: number;
  status?: "DRAFT" | "BERJALAN" | "SELESAI";
  target_jenjang?: "PELAKSANA" | "PENGAWAS" | "ADMINISTRATOR" | "JPT";
  search?: string;
}

export class SessionsService {
  /**
   * Helper untuk meng-generate token akses ujian peserta (format: ASN-XXXXXX)
   */
  static generateTokenAkses(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let token = "ASN-";
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Mengambil daftar sesi asesmen terpaginasi beserta jumlah peserta
   */
  static async listSessions(params: ListSessionsParams = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 10));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (params.status) {
      conditions.push(eq(assessmentSessions.status, params.status));
    }

    if (params.target_jenjang) {
      conditions.push(
        eq(assessmentSessions.target_jenjang, params.target_jenjang)
      );
    }

    if (params.search && params.search.trim() !== "") {
      const term = `%${params.search.trim()}%`;
      conditions.push(
        or(
          like(assessmentSessions.judul, term),
          like(assessmentSessions.kode_sesi, term)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 1. Hitung total
    const [totalRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assessmentSessions)
      .where(whereClause);
    const total = Number(totalRes?.count || 0);

    // 2. Ambil data sesi
    const sessionRows = await db
      .select()
      .from(assessmentSessions)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${assessmentSessions.id} DESC`);

    // 3. Hitung jumlah peserta per sesi
    const sessionIds = sessionRows.map((s) => s.id);
    const participantCountMap = new Map<number, number>();

    if (sessionIds.length > 0) {
      const counts = await db
        .select({
          session_id: sessionParticipants.session_id,
          total_peserta: sql<number>`count(*)`,
        })
        .from(sessionParticipants)
        .where(inArray(sessionParticipants.session_id, sessionIds))
        .groupBy(sessionParticipants.session_id);

      for (const c of counts) {
        if (c.session_id) {
          participantCountMap.set(c.session_id, Number(c.total_peserta));
        }
      }
    }

    const data = sessionRows.map((s) => ({
      ...s,
      total_peserta: participantCountMap.get(s.id) || 0,
    }));

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Mengambil detail satu sesi beserta ringkasan peserta
   */
  static async getSessionById(id: number) {
    const found = await db
      .select()
      .from(assessmentSessions)
      .where(eq(assessmentSessions.id, id))
      .limit(1);

    if (found.length === 0) {
      return null;
    }

    const session = found[0]!;
    const participants = await this.getParticipantsBySessionId(id);

    return {
      ...session,
      participants,
    };
  }

  /**
   * Membuat sesi asesmen baru
   */
  static async createSession(data: CreateSessionData) {
    // 1. Cek keunikan kode_sesi
    const existing = await db
      .select({ id: assessmentSessions.id })
      .from(assessmentSessions)
      .where(eq(assessmentSessions.kode_sesi, data.kode_sesi.trim()))
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`Kode sesi sudah terdaftar: ${data.kode_sesi}`);
    }

    // 2. Validasi waktu
    const startTime = new Date(data.waktu_mulai);
    const endTime = new Date(data.waktu_selesai);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new Error("Format waktu mulai atau waktu selesai tidak valid.");
    }

    if (endTime.getTime() <= startTime.getTime()) {
      throw new Error("Waktu selesai harus setelah waktu mulai.");
    }

    // 3. Insert ke database
    const [inserted] = await db.insert(assessmentSessions).values({
      judul: data.judul.trim(),
      deskripsi: data.deskripsi?.trim() || null,
      kode_sesi: data.kode_sesi.trim().toUpperCase(),
      waktu_mulai: startTime,
      waktu_selesai: endTime,
      durasi_menit: data.durasi_menit || 60,
      target_jenjang: data.target_jenjang || "PELAKSANA",
      status: "DRAFT",
    });

    const sessionId = Number(inserted.insertId);
    return await this.getSessionById(sessionId);
  }

  /**
   * Memperbarui informasi sesi asesmen dan siklus status
   */
  static async updateSession(id: number, data: UpdateSessionData) {
    const existing = await this.getSessionById(id);
    if (!existing) {
      return null;
    }

    // Cek duplikasi jika kode_sesi diubah
    if (data.kode_sesi && data.kode_sesi.trim().toUpperCase() !== existing.kode_sesi) {
      const duplicate = await db
        .select({ id: assessmentSessions.id })
        .from(assessmentSessions)
        .where(eq(assessmentSessions.kode_sesi, data.kode_sesi.trim().toUpperCase()))
        .limit(1);

      if (duplicate.length > 0) {
        throw new Error(`Kode sesi sudah terdaftar: ${data.kode_sesi}`);
      }
    }

    const updatePayload: Record<string, any> = {};

    if (data.judul !== undefined) updatePayload.judul = data.judul.trim();
    if (data.deskripsi !== undefined) updatePayload.deskripsi = data.deskripsi?.trim() || null;
    if (data.kode_sesi !== undefined) updatePayload.kode_sesi = data.kode_sesi.trim().toUpperCase();
    if (data.durasi_menit !== undefined) updatePayload.durasi_menit = Number(data.durasi_menit);
    if (data.target_jenjang !== undefined) updatePayload.target_jenjang = data.target_jenjang;
    if (data.status !== undefined) updatePayload.status = data.status;

    if (data.waktu_mulai !== undefined) {
      updatePayload.waktu_mulai = new Date(data.waktu_mulai);
    }

    if (data.waktu_selesai !== undefined) {
      updatePayload.waktu_selesai = new Date(data.waktu_selesai);
    }

    // Validasi rentang waktu jika keduanya atau salah satu diperbarui
    const finalStart = updatePayload.waktu_mulai || existing.waktu_mulai;
    const finalEnd = updatePayload.waktu_selesai || existing.waktu_selesai;

    if (new Date(finalEnd).getTime() <= new Date(finalStart).getTime()) {
      throw new Error("Waktu selesai harus setelah waktu mulai.");
    }

    await db
      .update(assessmentSessions)
      .set(updatePayload)
      .where(eq(assessmentSessions.id, id));

    return await this.getSessionById(id);
  }

  /**
   * Menghapus sesi asesmen beserta seluruh data peserta terkait
   */
  static async deleteSession(id: number): Promise<boolean> {
    const existing = await this.getSessionById(id);
    if (!existing) {
      return false;
    }

    // 1. Ambil seluruh participant id
    const parts = await db
      .select({ id: sessionParticipants.id })
      .from(sessionParticipants)
      .where(eq(sessionParticipants.session_id, id));

    const partIds = parts.map((p) => p.id);
    if (partIds.length > 0) {
      await db
        .delete(participantAnswers)
        .where(inArray(participantAnswers.session_participant_id, partIds));
      await db
        .delete(sessionParticipants)
        .where(eq(sessionParticipants.session_id, id));
    }

    await db.delete(assessmentSessions).where(eq(assessmentSessions.id, id));
    return true;
  }

  /**
   * Mendaftarkan peserta (ASN) ke dalam sesi asesmen dan membuat token akses unik
   */
  static async addParticipants(sessionId: number, userIds: number[]) {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error("Sesi asesmen tidak ditemukan.");
    }

    const registeredResults = [];

    for (const userId of userIds) {
      // Cek apakah sudah terdaftar
      const existingPart = await db
        .select({ id: sessionParticipants.id })
        .from(sessionParticipants)
        .where(
          and(
            eq(sessionParticipants.session_id, sessionId),
            eq(sessionParticipants.user_id, userId)
          )
        )
        .limit(1);

      if (existingPart.length > 0) {
        throw new Error(
          `Peserta dengan ID ${userId} sudah terdaftar dalam sesi ini.`
        );
      }

      const tokenAkses = this.generateTokenAkses();

      const [inserted] = await db.insert(sessionParticipants).values({
        session_id: sessionId,
        user_id: userId,
        token_akses: tokenAkses,
        status: "TERDAFTAR",
      });

      registeredResults.push({
        id: Number(inserted.insertId),
        session_id: sessionId,
        user_id: userId,
        token_akses: tokenAkses,
        status: "TERDAFTAR",
      });
    }

    return registeredResults;
  }

  /**
   * Mengambil daftar peserta yang terdaftar pada satu sesi
   */
  static async getParticipantsBySessionId(sessionId: number) {
    const rows = await db
      .select({
        id: sessionParticipants.id,
        session_id: sessionParticipants.session_id,
        user_id: sessionParticipants.user_id,
        token_akses: sessionParticipants.token_akses,
        status: sessionParticipants.status,
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
          role: users.role,
          jabatan: users.jabatan,
          instansi: users.instansi,
          unit_kerja: users.unit_kerja,
          jenjang_jabatan: users.jenjang_jabatan,
        },
      })
      .from(sessionParticipants)
      .leftJoin(users, eq(sessionParticipants.user_id, users.id))
      .where(eq(sessionParticipants.session_id, sessionId))
      .orderBy(sql`${sessionParticipants.id} ASC`);

    return rows;
  }

  /**
   * Menghapus satu peserta dari sesi asesmen
   */
  static async removeParticipant(sessionId: number, participantId: number) {
    const existing = await db
      .select({ id: sessionParticipants.id })
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.id, participantId),
          eq(sessionParticipants.session_id, sessionId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    await db
      .delete(participantAnswers)
      .where(eq(participantAnswers.session_participant_id, participantId));

    await db
      .delete(sessionParticipants)
      .where(eq(sessionParticipants.id, participantId));

    return true;
  }

  /**
   * Verifikasi token akses peserta untuk memulai asesmen
   */
  static async verifyToken(userId: number, kodeSesi: string, tokenAkses: string) {
    // 1. Cari sesi berdasarkan kode_sesi
    const sessionRows = await db
      .select()
      .from(assessmentSessions)
      .where(eq(assessmentSessions.kode_sesi, kodeSesi.trim().toUpperCase()))
      .limit(1);

    if (sessionRows.length === 0) {
      throw new Error("Kode sesi tidak ditemukan.");
    }

    const session = sessionRows[0]!;

    if (session.status !== "BERJALAN") {
      throw new Error(
        `Sesi belum dapat diakses. Status sesi saat ini: ${session.status}`
      );
    }

    // 2. Cari peserta yang cocok dengan session_id, user_id, dan token_akses
    const partRows = await db
      .select()
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.session_id, session.id),
          eq(sessionParticipants.user_id, userId),
          eq(sessionParticipants.token_akses, tokenAkses.trim().toUpperCase())
        )
      )
      .limit(1);

    if (partRows.length === 0) {
      throw new Error(
        "Token akses tidak valid atau Anda tidak terdaftar dalam sesi ini."
      );
    }

    const participant = partRows[0]!;

    return {
      session_participant_id: participant.id,
      participant_status: participant.status,
      session: {
        id: session.id,
        judul: session.judul,
        kode_sesi: session.kode_sesi,
        durasi_menit: session.durasi_menit,
        waktu_mulai: session.waktu_mulai,
        waktu_selesai: session.waktu_selesai,
        target_jenjang: session.target_jenjang,
      },
    };
  }

  /**
   * Mengambil daftar seluruh sesi yang diikuti oleh pengguna tertentu
   */
  static async getMySessions(userId: number) {
    const rows = await db
      .select({
        participant_id: sessionParticipants.id,
        token_akses: sessionParticipants.token_akses,
        status_peserta: sessionParticipants.status,
        waktu_login: sessionParticipants.waktu_login,
        waktu_submit: sessionParticipants.waktu_submit,
        total_score: sessionParticipants.total_score,
        jpm_percentage: sessionParticipants.jpm_percentage,
        kategori_kelulusan: sessionParticipants.kategori_kelulusan,
        session_id: assessmentSessions.id,
        judul: assessmentSessions.judul,
        deskripsi: assessmentSessions.deskripsi,
        kode_sesi: assessmentSessions.kode_sesi,
        waktu_mulai: assessmentSessions.waktu_mulai,
        waktu_selesai: assessmentSessions.waktu_selesai,
        durasi_menit: assessmentSessions.durasi_menit,
        target_jenjang: assessmentSessions.target_jenjang,
        status_sesi: assessmentSessions.status,
      })
      .from(sessionParticipants)
      .innerJoin(
        assessmentSessions,
        eq(sessionParticipants.session_id, assessmentSessions.id)
      )
      .where(eq(sessionParticipants.user_id, userId))
      .orderBy(sql`${assessmentSessions.waktu_mulai} DESC`);

    return rows;
  }
}
