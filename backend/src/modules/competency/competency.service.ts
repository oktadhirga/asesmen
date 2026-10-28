import { db } from "../../db/connection";
import {
  competencies,
  competencyLevels,
  competencyIndicators,
} from "../../db/schema";
import { eq, asc } from "drizzle-orm";

export interface UpdateCompetencyData {
  nama?: string;
  deskripsi?: string | null;
  bobot_standar?: string;
}

export class CompetencyService {
  /**
   * Mengambil semua daftar dimensi kompetensi (opsional filter kategori)
   */
  static async listCompetencies(filter?: {
    kategori?: "MANAJERIAL" | "SOSIO_KULTURAL";
  }) {
    let query = db
      .select()
      .from(competencies)
      .orderBy(asc(competencies.kode));

    if (filter?.kategori) {
      return await query.where(eq(competencies.kategori, filter.kategori));
    }

    return await query;
  }

  /**
   * Mengambil detail satu kompetensi berdasarkan ID
   */
  static async getCompetencyById(id: number) {
    const found = await db
      .select()
      .from(competencies)
      .where(eq(competencies.id, id))
      .limit(1);

    if (found.length === 0) {
      return null;
    }

    return found[0]!;
  }

  /**
   * Memperbarui bobot standar atau deskripsi kompetensi
   */
  static async updateCompetency(id: number, data: UpdateCompetencyData) {
    const existing = await this.getCompetencyById(id);
    if (!existing) {
      return null;
    }

    const updatePayload: Record<string, any> = {};

    if (data.nama !== undefined) updatePayload.nama = data.nama.trim();
    if (data.deskripsi !== undefined) updatePayload.deskripsi = data.deskripsi;
    if (data.bobot_standar !== undefined)
      updatePayload.bobot_standar = data.bobot_standar;

    await db
      .update(competencies)
      .set(updatePayload)
      .where(eq(competencies.id, id));

    return await this.getCompetencyById(id);
  }

  /**
   * Mengambil seluruh indikator perilaku (15 butir per kompetensi) beserta deskripsi level 1-5
   */
  static async getIndicatorsByCompetencyId(competencyId: number) {
    const competency = await this.getCompetencyById(competencyId);
    if (!competency) {
      return null;
    }

    const rows = await db
      .select({
        id: competencyIndicators.id,
        competency_id: competencyLevels.competency_id,
        competency_level_id: competencyIndicators.competency_level_id,
        level: competencyLevels.level,
        nama_level: competencyLevels.nama_level,
        deskripsi_level: competencyLevels.deskripsi,
        nomor_indikator: competencyIndicators.nomor_indikator,
        deskripsi_indikator: competencyIndicators.deskripsi_indikator,
        nomor_urut: competencyIndicators.nomor_indikator,
        indikator: competencyIndicators.deskripsi_indikator,
      })
      .from(competencyIndicators)
      .innerJoin(
        competencyLevels,
        eq(competencyIndicators.competency_level_id, competencyLevels.id)
      )
      .where(eq(competencyLevels.competency_id, competencyId))
      .orderBy(competencyLevels.level, competencyIndicators.nomor_indikator);

    return {
      competency,
      indicators: rows,
    };
  }
}
