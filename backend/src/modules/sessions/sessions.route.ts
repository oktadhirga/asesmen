import { Elysia, t } from "elysia";
import { SessionsService } from "./sessions.service";
import { authPlugin, requireAdmin, requireAuth } from "../auth/auth.guard";

export const sessionsRoute = new Elysia()
  .use(authPlugin)
  .group("/sessions", (app) =>
    app
      // 1. POST /api/sessions/verify-token (Verifikasi token asesmen oleh Peserta)
      .post(
        "/verify-token",
        async ({ body, user, set }) => {
          if (!user) {
            set.status = 401;
            return {
              success: false,
              message: "Token autentikasi tidak ditemukan",
            };
          }

          try {
            const result = await SessionsService.verifyToken(
              user.id,
              body.kode_sesi,
              body.token_akses
            );

            return {
              success: true,
              message:
                "Verifikasi token berhasil, selamat mengerjakan asesmen.",
              data: result,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal memverifikasi token sesi",
            };
          }
        },
        {
          beforeHandle: requireAuth,
          body: t.Object({
            kode_sesi: t.String({ minLength: 1 }),
            token_akses: t.String({ minLength: 1 }),
          }),
        }
      )

      // 2. GET /api/sessions/my-sessions (Daftar sesi yang diikuti oleh pengguna login)
      .get(
        "/my-sessions",
        async ({ user, set }) => {
          if (!user) {
            set.status = 401;
            return {
              success: false,
              message: "Token autentikasi tidak ditemukan",
            };
          }

          const data = await SessionsService.getMySessions(user.id);
          return {
            success: true,
            total: data.length,
            data,
          };
        },
        {
          beforeHandle: requireAuth,
        }
      )

      // 3. GET /api/sessions (List Sesi Asesmen — Khusus Admin)
      .get(
        "/",
        async ({ query }) => {
          const result = await SessionsService.listSessions({
            page: query.page ? Number(query.page) : 1,
            limit: query.limit ? Number(query.limit) : 10,
            status: query.status as any,
            target_jenjang: query.target_jenjang as any,
            target_jenjang_id: query.target_jenjang_id ? Number(query.target_jenjang_id) : undefined,
            search: query.search,
          });

          return {
            success: true,
            data: result.data,
            pagination: result.pagination,
          };
        },
        {
          beforeHandle: requireAdmin,
          query: t.Object({
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            status: t.Optional(
              t.Union([
                t.Literal("DRAFT"),
                t.Literal("BERJALAN"),
                t.Literal("SELESAI"),
              ])
            ),
            target_jenjang: t.Optional(t.String()),
            target_jenjang_id: t.Optional(t.String()),
            search: t.Optional(t.String()),
          }),
        }
      )

      // 4. GET /api/sessions/:id (Detail Sesi — Khusus Admin)
      .get(
        "/:id",
        async ({ params, set }) => {
          const session = await SessionsService.getSessionById(
            Number(params.id)
          );

          if (!session) {
            set.status = 404;
            return {
              success: false,
              message: "Sesi asesmen tidak ditemukan",
            };
          }

          return {
            success: true,
            data: session,
          };
        },
        {
          beforeHandle: requireAdmin,
          params: t.Object({
            id: t.String(),
          }),
        }
      )

      // 5. POST /api/sessions (Buat Sesi Baru — Khusus Admin)
      .post(
        "/",
        async ({ body, set }) => {
          try {
            const session = await SessionsService.createSession({
              judul: body.judul,
              deskripsi: body.deskripsi,
              kode_sesi: body.kode_sesi,
              waktu_mulai: body.waktu_mulai,
              waktu_selesai: body.waktu_selesai,
              durasi_menit: body.durasi_menit ? Number(body.durasi_menit) : 60,
              target_jenjang: body.target_jenjang as any,
              target_jenjang_id:
                body.target_jenjang_id !== undefined
                  ? body.target_jenjang_id === null
                    ? null
                    : Number(body.target_jenjang_id)
                  : undefined,
            });

            set.status = 201;
            return {
              success: true,
              message: "Sesi asesmen berhasil dibuat",
              data: session,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal membuat sesi asesmen",
            };
          }
        },
        {
          beforeHandle: requireAdmin,
          body: t.Object({
            judul: t.String({ minLength: 3 }),
            deskripsi: t.Optional(t.Nullable(t.String())),
            kode_sesi: t.String({ minLength: 3 }),
            waktu_mulai: t.String(),
            waktu_selesai: t.String(),
            durasi_menit: t.Optional(t.Number({ minimum: 10 })),
            target_jenjang_id: t.Optional(t.Nullable(t.Number())),
            target_jenjang: t.Optional(t.Nullable(t.String())),
          }),
        }
      )

      // 6. PUT /api/sessions/:id (Perbarui Sesi & Status — Khusus Admin)
      .put(
        "/:id",
        async ({ params, body, set }) => {
          try {
            const updated = await SessionsService.updateSession(
              Number(params.id),
              {
                judul: body.judul,
                deskripsi: body.deskripsi,
                kode_sesi: body.kode_sesi,
                waktu_mulai: body.waktu_mulai,
                waktu_selesai: body.waktu_selesai,
                durasi_menit: body.durasi_menit
                  ? Number(body.durasi_menit)
                  : undefined,
                target_jenjang: body.target_jenjang as any,
                target_jenjang_id:
                  body.target_jenjang_id !== undefined
                    ? body.target_jenjang_id === null
                      ? null
                      : Number(body.target_jenjang_id)
                    : undefined,
                status: body.status as any,
              }
            );

            if (!updated) {
              set.status = 404;
              return {
                success: false,
                message: "Sesi asesmen tidak ditemukan",
              };
            }

            return {
              success: true,
              message: "Sesi asesmen berhasil diperbarui",
              data: updated,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal memperbarui sesi asesmen",
            };
          }
        },
        {
          beforeHandle: requireAdmin,
          params: t.Object({
            id: t.String(),
          }),
          body: t.Object({
            judul: t.Optional(t.String()),
            deskripsi: t.Optional(t.Nullable(t.String())),
            kode_sesi: t.Optional(t.String()),
            waktu_mulai: t.Optional(t.String()),
            waktu_selesai: t.Optional(t.String()),
            durasi_menit: t.Optional(t.Number()),
            target_jenjang_id: t.Optional(t.Nullable(t.Number())),
            target_jenjang: t.Optional(t.Nullable(t.String())),
            status: t.Optional(
              t.Union([
                t.Literal("DRAFT"),
                t.Literal("BERJALAN"),
                t.Literal("SELESAI"),
              ])
            ),
          }),
        }
      )

      // 7. DELETE /api/sessions/:id (Hapus Sesi — Khusus Admin)
      .delete(
        "/:id",
        async ({ params, set }) => {
          const deleted = await SessionsService.deleteSession(
            Number(params.id)
          );

          if (!deleted) {
            set.status = 404;
            return {
              success: false,
              message: "Sesi asesmen tidak ditemukan",
            };
          }

          return {
            success: true,
            message: "Sesi asesmen berhasil dihapus",
          };
        },
        {
          beforeHandle: requireAdmin,
          params: t.Object({
            id: t.String(),
          }),
        }
      )

      // 8. POST /api/sessions/:id/participants (Daftarkan Peserta — Khusus Admin)
      .post(
        "/:id/participants",
        async ({ params, body, set }) => {
          try {
            const results = await SessionsService.addParticipants(
              Number(params.id),
              body.user_ids
            );

            set.status = 201;
            return {
              success: true,
              message: "Peserta berhasil didaftarkan ke sesi asesmen",
              data: results,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal mendaftarkan peserta ke sesi",
            };
          }
        },
        {
          beforeHandle: requireAdmin,
          params: t.Object({
            id: t.String(),
          }),
          body: t.Object({
            user_ids: t.Array(t.Number(), { minItems: 1 }),
          }),
        }
      )

      // 9. GET /api/sessions/:id/participants (Daftar Peserta Sesi — Khusus Admin)
      .get(
        "/:id/participants",
        async ({ params }) => {
          const data = await SessionsService.getParticipantsBySessionId(
            Number(params.id)
          );

          return {
            success: true,
            total: data.length,
            data,
          };
        },
        {
          beforeHandle: requireAdmin,
          params: t.Object({
            id: t.String(),
          }),
        }
      )

      // 10. DELETE /api/sessions/:id/participants/:participantId (Hapus Peserta dari Sesi — Khusus Admin)
      .delete(
        "/:id/participants/:participantId",
        async ({ params, set }) => {
          const deleted = await SessionsService.removeParticipant(
            Number(params.id),
            Number(params.participantId)
          );

          if (!deleted) {
            set.status = 404;
            return {
              success: false,
              message: "Data peserta tidak ditemukan pada sesi ini",
            };
          }

          return {
            success: true,
            message: "Peserta berhasil dikeluarkan dari sesi",
          };
        },
        {
          beforeHandle: requireAdmin,
          params: t.Object({
            id: t.String(),
            participantId: t.String(),
          }),
        }
      )

      // 11. POST /api/sessions/:id/refresh-token (Generate Token Sesi Baru — Khusus Admin)
      .post(
        "/:id/refresh-token",
        async ({ params, set }) => {
          try {
            const newToken = await SessionsService.refreshSessionToken(Number(params.id));
            return {
              success: true,
              message: "Token sesi berhasil diperbarui.",
              data: {
                token_sesi: newToken,
              },
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal memperbarui token sesi",
            };
          }
        },
        {
          beforeHandle: requireAdmin,
          params: t.Object({
            id: t.String(),
          }),
        }
      )
  );

export type SessionsRoute = typeof sessionsRoute;
export default sessionsRoute;
