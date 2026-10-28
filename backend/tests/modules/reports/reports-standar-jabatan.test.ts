import { describe, it, expect, mock } from "bun:test";
import { ReportsService } from "../../../src/modules/reports/reports.service";

describe("TDD Tahap 14.3: Kalkulasi Laporan Berbasis Standar Jenjang Sesi", () => {
  it("harus mengambil nilai standar dinamis sesuai jenjang sesi asesmen", async () => {
    const mockDb = {
      query: {
        sessionParticipants: {
          findFirst: mock(async () => ({
            id: 10,
            session_id: 1,
            user_id: 5,
            session: { id: 1, target_jenjang_id: 4 },
          })),
        },
        standarKompetensiJabatan: {
          findMany: mock(async () => [
            { competency_id: 1, target_level: 3 },
            { competency_id: 2, target_level: 3 },
          ]),
        },
      },
    };

    const reportsService = new ReportsService(mockDb as any);
    const report = await reportsService.calculateParticipantReport(10);
    expect(report.radar_chart.every((r) => r.standar === 3.0)).toBeTrue();
  });

  it("Edge Case: fallback aman ke level 3 jika sesi tidak memiliki target_jenjang_id", async () => {
    const mockDb = {
      query: {
        sessionParticipants: {
          findFirst: mock(async () => ({
            id: 12,
            session_id: 3,
            user_id: 7,
            session: { id: 3, target_jenjang_id: null },
          })),
        },
      },
    };

    const reportsService = new ReportsService(mockDb as any);
    const report = await reportsService.calculateParticipantReport(12);
    expect(report.radar_chart.every((r) => r.standar === 3.0)).toBeTrue();
  });

  it("harus menghitung gap dan standar dinamis yang berbeda per kompetensi (misal: JF Ahli Utama level 5 & 4)", async () => {
    const mockDb = {
      query: {
        sessionParticipants: {
          findFirst: mock(async () => ({
            id: 20,
            session_id: 2,
            user_id: 8,
            session: { id: 2, target_jenjang_id: 7 },
          })),
        },
        standarKompetensiJabatan: {
          findMany: mock(async () => [
            { competency_id: 1, target_level: 5 }, // M.01 Integritas = 5
            { competency_id: 2, target_level: 4 }, // M.02 Kerjasama = 4
          ]),
        },
      },
    };

    const reportsService = new ReportsService(mockDb as any);
    const report = await reportsService.calculateParticipantReport(20);
    const intComp = report.radar_chart.find((r) => r.kode === "KOMP-01");
    const ksComp = report.radar_chart.find((r) => r.kode === "KOMP-02");

    expect(intComp?.standar).toBe(5.0);
    expect(ksComp?.standar).toBe(4.0);
  });
});
