import { db } from "../../db/connection";
import {
  assessmentSessions,
  sessionParticipants,
  participantAnswers,
  users,
  jenjangJabatan,
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
  target_jenjang?: string | null;
  target_jenjang_id?: number | null;
}

export interface UpdateSessionData {
  judul?: string;
  deskripsi?: string | null;
  kode_sesi?: string;
  waktu_mulai?: string | Date;
  waktu_selesai?: string | Date;
  durasi_menit?: number;
  target_jenjang?: string | null;
  target_jenjang_id?: number | null;
  status?: "DRAFT" | "BERJALAN" | "SELESAI";
}

export interface ListSessionsParams {
  page?: number;
  limit?: number;
  status?: "DRAFT" | "BERJALAN" | "SELESAI";
  target_jenjang?: string;
  target_jenjang_id?: number;
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
   * Helper untuk meng-generate token sesi kolektif (format: 6 karakter alfanumerik kapital, e.g. TRG83K)
   */
  static generateTokenSesi(): string {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let token = "";
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Helper resolusi jenjang_jabatan_id dari string kode, level 1-5, atau integer
   */
  static async resolveJenjangId(val: string | number | null | undefined): Promise<number | null> {
    if (!val && val !== 0) return null;
    if (typeof val === "number") return val;

    const str = String(val).trim().toUpperCase();

    // 1. Cek pola level 1-5 (e.g. "1".."5", "LEVEL_1".."LEVEL_5", "LEVEL 1".."LEVEL 5")
    const levelMatch = str.match(/^(?:LEVEL[_\s-]?)?([1-5])$/);
    if (levelMatch) {
      const lvl = parseInt(levelMatch[1]!, 10);
      const levelMap: Record<number, string> = {
        1: "PELAKSANA",
        2: "PENGAWAS",
        3: "ADMINISTRATOR",
        4: "JPT_PRATAMA",
        5: "JPT_UTAMA",
      };
      const kode = levelMap[lvl];
      if (kode) {
        const found = await db
          .select({ id: jenjangJabatan.id })
          .from(jenjangJabatan)
          .where(eq(jenjangJabatan.kode, kode))
          .limit(1);
        if (found[0]?.id) return found[0].id;
      }
    }

    // 2. Jika angka murni di atas 5 (ID spesifik tabel jenjang_jabatan)
    if (/^\d+$/.test(str)) return parseInt(str, 10);

    // 3. Cek kode legacy JPT -> JPT_PRATAMA
    if (str === "JPT") {
      const found = await db
        .select({ id: jenjangJabatan.id })
        .from(jenjangJabatan)
        .where(eq(jenjangJabatan.kode, "JPT_PRATAMA"))
        .limit(1);
      return found[0]?.id || null;
    }

    // 4. Cek kode jenjang_jabatan di DB
    const found = await db
      .select({ id: jenjangJabatan.id })
      .from(jenjangJabatan)
      .where(eq(jenjangJabatan.kode, str))
      .limit(1);
    return found[0]?.id || null;
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

    if (params.target_jenjang_id) {
      conditions.push(eq(assessmentSessions.target_jenjang_id, Number(params.target_jenjang_id)));
    } else if (params.target_jenjang) {
      const resolvedId = await this.resolveJenjangId(params.target_jenjang);
      if (resolvedId) {
        conditions.push(eq(assessmentSessions.target_jenjang_id, resolvedId));
      }
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
      .select({
        id: assessmentSessions.id,
        judul: assessmentSessions.judul,
        deskripsi: assessmentSessions.deskripsi,
        kode_sesi: assessmentSessions.kode_sesi,
        token_sesi: assessmentSessions.token_sesi,
        waktu_mulai: assessmentSessions.waktu_mulai,
        waktu_selesai: assessmentSessions.waktu_selesai,
        durasi_menit: assessmentSessions.durasi_menit,
        status: assessmentSessions.status,
        target_jenjang_id: assessmentSessions.target_jenjang_id,
        target_jenjang: jenjangJabatan.kode,
        target_jenjang_nama: jenjangJabatan.nama,
        target_level: jenjangJabatan.level_standar_umum,
      })
      .from(assessmentSessions)
      .leftJoin(jenjangJabatan, eq(assessmentSessions.target_jenjang_id, jenjangJabatan.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${assessmentSessions.id} desc`);

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
      .select({
        id: assessmentSessions.id,
        judul: assessmentSessions.judul,
        deskripsi: assessmentSessions.deskripsi,
        kode_sesi: assessmentSessions.kode_sesi,
        token_sesi: assessmentSessions.token_sesi,
        waktu_mulai: assessmentSessions.waktu_mulai,
        waktu_selesai: assessmentSessions.waktu_selesai,
        durasi_menit: assessmentSessions.durasi_menit,
        status: assessmentSessions.status,
        target_jenjang_id: assessmentSessions.target_jenjang_id,
        target_jenjang: jenjangJabatan.kode,
        target_jenjang_nama: jenjangJabatan.nama,
        target_level: jenjangJabatan.level_standar_umum,
      })
      .from(assessmentSessions)
      .leftJoin(jenjangJabatan, eq(assessmentSessions.target_jenjang_id, jenjangJabatan.id))
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
   * Membuat sesi asesmen baru (default status: DRAFT)
   */
  static async createSession(data: CreateSessionData) {
    // 1. Cek keunikan kode_sesi
    const existingCode = await db
      .select({ id: assessmentSessions.id })
      .from(assessmentSessions)
      .where(eq(assessmentSessions.kode_sesi, data.kode_sesi.trim().toUpperCase()))
      .limit(1);

    if (existingCode.length > 0) {
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

    const jenjangId = await this.resolveJenjangId(
      data.target_jenjang_id ?? data.target_jenjang ?? "PELAKSANA"
    );

    const tokenSesi = this.generateTokenSesi();

    // 3. Insert ke database
    const [inserted] = await db.insert(assessmentSessions).values({
      judul: data.judul.trim(),
      deskripsi: data.deskripsi?.trim() || null,
      kode_sesi: data.kode_sesi.trim().toUpperCase(),
      token_sesi: tokenSesi,
      waktu_mulai: startTime,
      waktu_selesai: endTime,
      durasi_menit: data.durasi_menit || 60,
      target_jenjang_id: jenjangId,
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

    if (data.waktu_mulai !== undefined) {
      const start = new Date(data.waktu_mulai);
      if (isNaN(start.getTime())) throw new Error("Format waktu mulai tidak valid.");
      updatePayload.waktu_mulai = start;
    }

    if (data.waktu_selesai !== undefined) {
      const end = new Date(data.waktu_selesai);
      if (isNaN(end.getTime())) throw new Error("Format waktu selesai tidak valid.");
      updatePayload.waktu_selesai = end;
    }

    // Validasi rentang waktu jika keduanya diperbarui atau ada yang baru
    const finalStart = updatePayload.waktu_mulai || existing.waktu_mulai;
    const finalEnd = updatePayload.waktu_selesai || existing.waktu_selesai;
    if (new Date(finalEnd).getTime() <= new Date(finalStart).getTime()) {
      throw new Error("Waktu selesai harus setelah waktu mulai.");
    }

    if (data.durasi_menit !== undefined) {
      if (data.durasi_menit <= 0) throw new Error("Durasi sesi minimal 1 menit.");
      updatePayload.durasi_menit = data.durasi_menit;
    }

    if (data.target_jenjang_id !== undefined || data.target_jenjang !== undefined) {
      updatePayload.target_jenjang_id = await this.resolveJenjangId(
        data.target_jenjang_id ?? data.target_jenjang
      );
    }

    if (data.status !== undefined) {
      updatePayload.status = data.status;
      if (data.status === "BERJALAN" && !existing.token_sesi) {
        updatePayload.token_sesi = this.generateTokenSesi();
      }
    }

    await db
      .update(assessmentSessions)
      .set(updatePayload)
      .where(eq(assessmentSessions.id, id));

    return await this.getSessionById(id);
  }

  /**
   * Me-refresh token sesi kolektif baru oleh Asesor (khususnya saat ujian berlangsung)
   */
  static async refreshSessionToken(sessionId: number): Promise<string> {
    const existing = await this.getSessionById(sessionId);
    if (!existing) {
      throw new Error("Sesi asesmen tidak ditemukan.");
    }
    const newToken = this.generateTokenSesi();
    await db
      .update(assessmentSessions)
      .set({ token_sesi: newToken })
      .where(eq(assessmentSessions.id, sessionId));
    return newToken;
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
      const existing = await db
        .select()
        .from(sessionParticipants)
        .where(
          and(
            eq(sessionParticipants.session_id, sessionId),
            eq(sessionParticipants.user_id, userId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error(`Peserta dengan user_id ${userId} sudah terdaftar pada sesi ini.`);
      }

      // Pastikan token unik
      let token = this.generateTokenAkses();
      let isTokenDuplicate = true;
      while (isTokenDuplicate) {
        const check = await db
          .select({ id: sessionParticipants.id })
          .from(sessionParticipants)
          .where(eq(sessionParticipants.token_akses, token))
          .limit(1);
        if (check.length === 0) {
          isTokenDuplicate = false;
        } else {
          token = this.generateTokenAkses();
        }
      }

      const [res] = await db.insert(sessionParticipants).values({
        session_id: sessionId,
        user_id: userId,
        token_akses: token,
        status: "TERDAFTAR",
      });

      registeredResults.push({
        id: Number(res.insertId),
        session_id: sessionId,
        user_id: userId,
        token_akses: token,
        status: "TERDAFTAR",
      });
    }

    return registeredResults;
  }

  /**
   * Mengambil daftar peserta yang terdaftar pada suatu sesi
   */
  static async getParticipantsBySessionId(sessionId: number) {
    return await db
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
          jabatan: users.jabatan,
          instansi: users.instansi,
          unit_kerja: users.unit_kerja,
          jenjang_jabatan_id: users.jenjang_jabatan_id,
          jenjang_jabatan: jenjangJabatan.nama,
        },
      })
      .from(sessionParticipants)
      .innerJoin(users, eq(sessionParticipants.user_id, users.id))
      .leftJoin(jenjangJabatan, eq(users.jenjang_jabatan_id, jenjangJabatan.id))
      .where(eq(sessionParticipants.session_id, sessionId));
  }

  /**
   * Menghapus peserta tertentu dari suatu sesi asesmen
   */
  static async removeParticipant(sessionId: number, participantId: number): Promise<boolean> {
    const existing = await db
      .select()
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
   * Verifikasi token akses peserta saat hendak memulai ujian
   */
  static async verifyToken(userId: number, kodeSesi: string, tokenAkses: string) {
    // 1. Cari sesi berdasarkan kode
    const [session] = await db
      .select()
      .from(assessmentSessions)
      .where(eq(assessmentSessions.kode_sesi, kodeSesi.trim().toUpperCase()))
      .limit(1);

    if (!session) {
      throw new Error("Kode sesi tidak ditemukan.");
    }

    if (session.status !== "BERJALAN") {
      throw new Error(`Sesi ujian tidak sedang aktif (Status: ${session.status}).`);
    }

    // 2. Cek apakah peserta terdaftar dalam sesi ini
    const [participant] = await db
      .select()
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.session_id, session.id),
          eq(sessionParticipants.user_id, userId)
        )
      )
      .limit(1);

    if (!participant) {
      throw new Error("Token akses tidak valid atau Anda tidak terdaftar pada sesi ini.");
    }

    // 3. Validasi token (token sesi kolektif atau fallback token individual)
    const inputToken = tokenAkses.trim().toUpperCase();
    const expectedSessionToken = (session.token_sesi || "").trim().toUpperCase();
    const expectedParticipantToken = (participant.token_akses || "").trim().toUpperCase();

    const isMatch =
      (expectedSessionToken && inputToken === expectedSessionToken) ||
      (expectedParticipantToken && inputToken === expectedParticipantToken);

    if (!isMatch) {
      throw new Error("Token akses tidak valid atau Anda tidak terdaftar pada sesi ini.");
    }

    if (participant.status === "SELESAI") {
      throw new Error("Anda telah menyelesaikan ujian pada sesi ini.");
    }

    return {
      session_participant_id: participant.id,
      session: {
        id: session.id,
        judul: session.judul,
        kode_sesi: session.kode_sesi,
        token_sesi: session.token_sesi,
        durasi_menit: session.durasi_menit,
      },
      participant: {
        id: participant.id,
        status: participant.status,
        token_akses: participant.token_akses,
      },
    };
  }

  /**
   * Mengambil daftar seluruh sesi yang diikuti oleh pengguna (ASN) yang sedang login
   */
  static async getMySessions(userId: number) {
    const rows = await db
      .select({
        session_id: assessmentSessions.id,
        judul: assessmentSessions.judul,
        deskripsi: assessmentSessions.deskripsi,
        kode_sesi: assessmentSessions.kode_sesi,
        token_sesi: assessmentSessions.token_sesi,
        waktu_mulai: assessmentSessions.waktu_mulai,
        waktu_selesai: assessmentSessions.waktu_selesai,
        durasi_menit: assessmentSessions.durasi_menit,
        session_status: assessmentSessions.status,
        target_jenjang_id: assessmentSessions.target_jenjang_id,
        target_jenjang: jenjangJabatan.kode,
        target_jenjang_nama: jenjangJabatan.nama,
        target_level: jenjangJabatan.level_standar_umum,
        participant_id: sessionParticipants.id,
        token_akses: sessionParticipants.token_akses,
        participant_status: sessionParticipants.status,
        waktu_login: sessionParticipants.waktu_login,
        waktu_submit: sessionParticipants.waktu_submit,
        total_score: sessionParticipants.total_score,
        jpm_percentage: sessionParticipants.jpm_percentage,
        kategori_kelulusan: sessionParticipants.kategori_kelulusan,
      })
      .from(sessionParticipants)
      .innerJoin(
        assessmentSessions,
        eq(sessionParticipants.session_id, assessmentSessions.id)
      )
      .leftJoin(
        jenjangJabatan,
        eq(assessmentSessions.target_jenjang_id, jenjangJabatan.id)
      )
      .where(eq(sessionParticipants.user_id, userId))
      .orderBy(sql`${assessmentSessions.waktu_mulai} desc`);

    return rows.map((r) => ({
      participant_id: r.participant_id,
      session_id: r.session_id,
      judul: r.judul,
      deskripsi: r.deskripsi,
      kode_sesi: r.kode_sesi,
      waktu_mulai: r.waktu_mulai,
      waktu_selesai: r.waktu_selesai,
      durasi_menit: r.durasi_menit,
      status: r.session_status,
      status_sesi: r.session_status,
      target_jenjang: r.target_jenjang,
      target_jenjang_id: r.target_jenjang_id,
      target_jenjang_nama: r.target_jenjang_nama,
      target_level: r.target_level,
      participant_status: r.participant_status,
      status_peserta: r.participant_status,
      token_sesi: r.token_sesi,
      token_akses: r.token_akses,
      waktu_login: r.waktu_login,
      waktu_submit: r.waktu_submit,
      total_score: Number(r.total_score || 0),
      jpm_percentage: Number(r.jpm_percentage || 0),
      kategori_kelulusan: r.kategori_kelulusan,
    }));
  }
}
