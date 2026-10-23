import { Elysia, t } from "elysia";
import { CompetencyService } from "./competency.service";
import { authPlugin, requireAdmin, requireAuth } from "../auth/auth.guard";

export const competencyRoute = new Elysia()
  .use(authPlugin)
  .group("/competencies", (app) =>
    app
      // 1. GET /api/competencies (Daftar 9 Dimensi + filter kategori)
      .get(
        "/",
        async ({ query }) => {
          const data = await CompetencyService.listCompetencies({
            kategori: query.kategori as any,
          });

          return {
            success: true,
            total: data.length,
            data,
          };
        },
        {
          beforeHandle: requireAuth,
          query: t.Object({
            kategori: t.Optional(
              t.Union([t.Literal("MANAJERIAL"), t.Literal("SOSIO_KULTURAL")])
            ),
          }),
        }
      )

      // 2. GET /api/competencies/:id (Detail Kompetensi)
      .get(
        "/:id",
        async ({ params, set }) => {
          const comp = await CompetencyService.getCompetencyById(
            Number(params.id)
          );

          if (!comp) {
            set.status = 404;
            return {
              success: false,
              message: "Dimensi kompetensi tidak ditemukan",
            };
          }

          return {
            success: true,
            data: comp,
          };
        },
        {
          beforeHandle: requireAuth,
          params: t.Object({
            id: t.String(),
          }),
        }
      )

      // 3. PUT /api/competencies/:id (Update Bobot Standar / Deskripsi — Khusus Admin)
      .put(
        "/:id",
        async ({ params, body, set }) => {
          try {
            const updated = await CompetencyService.updateCompetency(
              Number(params.id),
              body
            );

            if (!updated) {
              set.status = 404;
              return {
                success: false,
                message: "Dimensi kompetensi tidak ditemukan",
              };
            }

            return {
              success: true,
              message: "Dimensi kompetensi berhasil diperbarui",
              data: updated,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal memperbarui dimensi kompetensi",
            };
          }
        },
        {
          beforeHandle: requireAdmin,
          params: t.Object({
            id: t.String(),
          }),
          body: t.Object({
            nama: t.Optional(t.String()),
            deskripsi: t.Optional(t.String()),
            bobot_standar: t.Optional(t.String()),
          }),
        }
      )
  );
