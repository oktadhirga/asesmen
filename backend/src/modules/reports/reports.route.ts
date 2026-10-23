import { Elysia, t } from "elysia";
import { ReportsService } from "./reports.service";
import { authPlugin, requireAdmin, requireAuth } from "../auth/auth.guard";

export const reportsRoute = new Elysia()
  .use(authPlugin)
  .group("/reports", (app) =>
    app
      // 1. GET /api/reports/participant/:participantId (Laporan Individu & Radar Chart)
      .get(
        "/participant/:participantId",
        async ({ params, user, set }) => {
          if (!user) {
            set.status = 401;
            return { success: false, message: "Token autentikasi tidak ditemukan" };
          }

          try {
            const data = await ReportsService.getParticipantReport(
              user,
              Number(params.participantId)
            );

            return {
              success: true,
              data,
            };
          } catch (error: any) {
            const msg = error.message || "Gagal mengambil laporan peserta";
            set.status = msg.includes("Akses ditolak") ? 403 : 400;
            return {
              success: false,
              message: msg,
            };
          }
        },
        {
          beforeHandle: requireAuth,
          params: t.Object({
            participantId: t.String(),
          }),
        }
      )

      // 2. GET /api/reports/session/:sessionId (Rekapitulasi Nilai Sesi — Khusus Admin)
      .get(
        "/session/:sessionId",
        async ({ params, set }) => {
          try {
            const data = await ReportsService.getSessionReport(
              Number(params.sessionId)
            );

            return {
              success: true,
              data,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal mengambil rekapitulasi sesi",
            };
          }
        },
        {
          beforeHandle: requireAdmin,
          params: t.Object({
            sessionId: t.String(),
          }),
        }
      )

      // 3. POST /api/reports/participant/:participantId/recalculate (Hitung Ulang JPM — Khusus Admin)
      .post(
        "/participant/:participantId/recalculate",
        async ({ params, set }) => {
          try {
            const data = await ReportsService.calculateParticipantReport(
              Number(params.participantId)
            );

            return {
              success: true,
              message: "Kalkulasi ulang nilai JPM berhasil diperbarui.",
              data,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal menghitung ulang nilai",
            };
          }
        },
        {
          beforeHandle: requireAdmin,
          params: t.Object({
            participantId: t.String(),
          }),
        }
      )
  );
