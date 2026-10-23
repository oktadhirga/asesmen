import { Elysia, t } from "elysia";
import { SessionsService } from "./sessions.service.ts";
import { authPlugin, requireAdmin, requireAuth } from "../auth/auth.guard.ts";

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
            return { success: false, message: "Token autentikasi tidak ditemukan" };
          }

          try {
            const result = await SessionsService.verifyToken(
              user.id,
              body.kode_sesi,
              body.token_akses
            );

            return {
              success: true,
              message: "Verifikasi token berhasil, selamat mengerjakan asesmen.",
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
            return { success: false, message: "Token autentikasi tidak ditemukan" };
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

      // 3. ADMIN ONLY SUB-GROUP
      .group("", (adminApp) =>
        adminApp
          .guard({
            beforeHandle: requireAdmin,
          })

          // GET /api/sessions (List Sesi Asesmen)
          .get(
            "/",
            async ({ query }) => {
              const result = await SessionsService.listSessions({
                page: query.page ? Number(query.page) : 1,
                limit: query.limit ? Number(query.limit) : 10,
                status: query.status as any,
                target_jenjang: query.target_jenjang as any,
                search: query.search,
              });

              return {
                success: true,
                data: result.data,
                pagination: result.pagination,
              };
            },
            {
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
                target_jenjang: t.Optional(
                  t.Union([
                    t.Literal("PELAKSANA"),
                    t.Literal("PENGAWAS"),
                    t.Literal("ADMINISTRATOR"),
                    t.Literal("JPT"),
                  ])
                ),
                search: t.Optional(t.String()),
              }),
            }
          )

          // GET /api/sessions/:id (Detail Sesi)
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
              params: t.Object({
                id: t.String(),
              }),
            }
          )

          // POST /api/sessions (Buat Sesi Baru)
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
                  durasi_menit: body.durasi_menit
                    ? Number(body.durasi_menit)
                    : 60,
                  target_jenjang: body.target_jenjang as any,
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
              body: t.Object({
                judul: t.String({ minLength: 3 }),
                deskripsi: t.Optional(t.String()),
                kode_sesi: t.String({ minLength: 3 }),
                waktu_mulai: t.String(),
                waktu_selesai: t.String(),
                durasi_menit: t.Optional(t.Number({ minimum: 10 })),
                target_jenjang: t.Optional(
                  t.Union([
                    t.Literal("PELAKSANA"),
                    t.Literal("PENGAWAS"),
                    t.Literal("ADMINISTRATOR"),
                    t.Literal("JPT"),
                  ])
                ),
              }),
            }
          )

          // PUT /api/sessions/:id (Perbarui Sesi & Status)
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
              params: t.Object({
                id: t.String(),
              }),
              body: t.Object({
                judul: t.Optional(t.String()),
                deskripsi: t.Optional(t.String()),
                kode_sesi: t.Optional(t.String()),
                waktu_mulai: t.Optional(t.String()),
                waktu_selesai: t.Optional(t.String()),
                durasi_menit: t.Optional(t.Number()),
                target_jenjang: t.Optional(
                  t.Union([
                    t.Literal("PELAKSANA"),
                    t.Literal("PENGAWAS"),
                    t.Literal("ADMINISTRATOR"),
                    t.Literal("JPT"),
                  ])
                ),
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

          // DELETE /api/sessions/:id (Hapus Sesi)
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
              params: t.Object({
                id: t.String(),
              }),
            }
          )

          // POST /api/sessions/:id/participants (Daftarkan Peserta)
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
                  message:
                    error.message || "Gagal mendaftarkan peserta ke sesi",
                };
              }
            },
            {
              params: t.Object({
                id: t.String(),
              }),
              body: t.Object({
                user_ids: t.Array(t.Number(), { minItems: 1 }),
              }),
            }
          )

          // GET /api/sessions/:id/participants (Daftar Peserta Sesi)
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
              params: t.Object({
                id: t.String(),
              }),
            }
          )

          // DELETE /api/sessions/:id/participants/:participantId (Hapus Peserta dari Sesi)
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
              params: t.Object({
                id: t.String(),
                participantId: t.String(),
              }),
            }
          )
      )
  );

export type SessionsRoute = typeof sessionsRoute;
export default sessionsRoute;
