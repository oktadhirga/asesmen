import { Elysia, t } from "elysia";
import { QuestionsService } from "./questions.service";
import { authPlugin, requireAdmin } from "../auth/auth.guard";

export const questionsRoute = new Elysia()
  .use(authPlugin)
  .group("/questions", (app) =>
    app
      .guard({
        beforeHandle: requireAdmin,
      })
      // 1. GET /api/questions (List, Filter, Search & Pagination)
      .get(
        "/",
        async ({ query }) => {
          const result = await QuestionsService.listQuestions({
            page: query.page ? Number(query.page) : 1,
            limit: query.limit ? Number(query.limit) : 10,
            competency_id: query.competency_id
              ? Number(query.competency_id)
              : undefined,
            target_level: query.target_level
              ? Number(query.target_level)
              : undefined,
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
            competency_id: t.Optional(t.String()),
            target_level: t.Optional(t.String()),
            search: t.Optional(t.String()),
          }),
        }
      )

      // 2. GET /api/questions/:id (Detail Soal & Opsi)
      .get(
        "/:id",
        async ({ params, set }) => {
          const question = await QuestionsService.getQuestionById(
            Number(params.id)
          );

          if (!question) {
            set.status = 404;
            return {
              success: false,
              message: "Soal tidak ditemukan",
            };
          }

          return {
            success: true,
            data: question,
          };
        },
        {
          params: t.Object({
            id: t.String(),
          }),
        }
      )

      // 3. POST /api/questions (Tambah Soal SJT Baru)
      .post(
        "/",
        async ({ body, set }) => {
          try {
            const newQuestion = await QuestionsService.createQuestion({
              competency_id: Number(body.competency_id),
              kode_soal: body.kode_soal,
              skenario_kasus: body.skenario_kasus,
              target_level: body.target_level ? Number(body.target_level) : 1,
              options: body.options,
            });

            set.status = 201;
            return {
              success: true,
              message: "Soal SJT berhasil ditambahkan",
              data: newQuestion,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal menambahkan soal",
            };
          }
        },
        {
          body: t.Object({
            competency_id: t.Number({ error: "competency_id wajib diisi" }),
            kode_soal: t.Optional(t.String()),
            skenario_kasus: t.String({
              minLength: 10,
              error: "Skenario kasus wajib diisi minimal 10 karakter",
            }),
            target_level: t.Optional(t.Number()),
            options: t.Array(
              t.Object({
                label: t.String({ minLength: 1, maxLength: 5 }),
                teks_opsi: t.String({ minLength: 1 }),
                bobot_nilai: t.Number({ minimum: 1, maximum: 4 }),
              }),
              { minItems: 4, maxItems: 4 }
            ),
          }),
        }
      )

      // 4. PUT /api/questions/:id (Perbarui Soal & Opsi)
      .put(
        "/:id",
        async ({ params, body, set }) => {
          try {
            const updated = await QuestionsService.updateQuestion(
              Number(params.id),
              {
                competency_id: body.competency_id
                  ? Number(body.competency_id)
                  : undefined,
                kode_soal: body.kode_soal,
                skenario_kasus: body.skenario_kasus,
                target_level: body.target_level
                  ? Number(body.target_level)
                  : undefined,
                options: body.options,
              }
            );

            if (!updated) {
              set.status = 404;
              return {
                success: false,
                message: "Soal tidak ditemukan",
              };
            }

            return {
              success: true,
              message: "Soal berhasil diperbarui",
              data: updated,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal memperbarui soal",
            };
          }
        },
        {
          params: t.Object({
            id: t.String(),
          }),
          body: t.Object({
            competency_id: t.Optional(t.Number()),
            kode_soal: t.Optional(t.String()),
            skenario_kasus: t.Optional(t.String()),
            target_level: t.Optional(t.Number()),
            options: t.Optional(
              t.Array(
                t.Object({
                  label: t.String({ minLength: 1, maxLength: 5 }),
                  teks_opsi: t.String({ minLength: 1 }),
                  bobot_nilai: t.Number({ minimum: 1, maximum: 4 }),
                }),
                { minItems: 4, maxItems: 4 }
              )
            ),
          }),
        }
      )

      // 5. DELETE /api/questions/:id (Hapus Soal)
      .delete(
        "/:id",
        async ({ params, set }) => {
          const deleted = await QuestionsService.deleteQuestion(
            Number(params.id)
          );

          if (!deleted) {
            set.status = 404;
            return {
              success: false,
              message: "Soal tidak ditemukan",
            };
          }

          return {
            success: true,
            message: "Soal dan seluruh opsi berhasil dihapus",
          };
        },
        {
          params: t.Object({
            id: t.String(),
          }),
        }
      )
  );

export type QuestionsRoute = typeof questionsRoute;
export default questionsRoute;
