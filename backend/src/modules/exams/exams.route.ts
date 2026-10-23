import { Elysia, t } from "elysia";
import { ExamsService } from "./exams.service";
import { authPlugin, requireAuth } from "../auth/auth.guard";

export const examsRoute = new Elysia()
  .use(authPlugin)
  .group("/exams", (app) =>
    app
      .guard({
        beforeHandle: requireAuth,
      })

      // 1. POST /api/exams/start (Mulai Pengerjaan Ujian)
      .post(
        "/start",
        async ({ body, user, set }) => {
          if (!user) {
            set.status = 401;
            return { success: false, message: "Token autentikasi tidak ditemukan" };
          }

          try {
            const data = await ExamsService.startExam(
              user.id,
              Number(body.session_id),
              body.token_akses
            );

            return {
              success: true,
              message: "Ujian berhasil dimulai. Selamat mengerjakan.",
              data,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal memulai ujian",
            };
          }
        },
        {
          body: t.Object({
            session_id: t.Number({ error: "session_id wajib diisi" }),
            token_akses: t.String({ minLength: 1, error: "token_akses wajib diisi" }),
          }),
        }
      )

      // 2. GET /api/exams/:participantId/questions (Bank Soal Ujian)
      .get(
        "/:participantId/questions",
        async ({ params, user, set }) => {
          if (!user) {
            set.status = 401;
            return { success: false, message: "Token autentikasi tidak ditemukan" };
          }

          try {
            const data = await ExamsService.getExamQuestions(
              user.id,
              Number(params.participantId)
            );

            return {
              success: true,
              total_soal: data.length,
              data,
            };
          } catch (error: any) {
            set.status = 403;
            return {
              success: false,
              message: error.message || "Akses ke lembar soal ditolak",
            };
          }
        },
        {
          params: t.Object({
            participantId: t.String(),
          }),
        }
      )

      // 3. POST /api/exams/:participantId/answers (Autosave Jawaban Real-Time)
      .post(
        "/:participantId/answers",
        async ({ params, body, user, set }) => {
          if (!user) {
            set.status = 401;
            return { success: false, message: "Token autentikasi tidak ditemukan" };
          }

          try {
            const data = await ExamsService.saveAnswer(
              user.id,
              Number(params.participantId),
              {
                question_id: Number(body.question_id),
                selected_option_id: Number(body.selected_option_id),
                is_ragu: body.is_ragu,
              }
            );

            return {
              success: true,
              message: "Jawaban berhasil disimpan",
              data,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal menyimpan jawaban",
            };
          }
        },
        {
          params: t.Object({
            participantId: t.String(),
          }),
          body: t.Object({
            question_id: t.Number(),
            selected_option_id: t.Number(),
            is_ragu: t.Optional(t.Boolean()),
          }),
        }
      )

      // 4. POST /api/exams/:participantId/tab-switch (Proctoring Tab Switch)
      .post(
        "/:participantId/tab-switch",
        async ({ params, user, set }) => {
          if (!user) {
            set.status = 401;
            return { success: false, message: "Token autentikasi tidak ditemukan" };
          }

          try {
            const result = await ExamsService.recordTabSwitch(
              user.id,
              Number(params.participantId)
            );

            return {
              success: true,
              tab_switch_count: result.tab_switch_count,
              warning: result.warning,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal mencatat log proctoring",
            };
          }
        },
        {
          params: t.Object({
            participantId: t.String(),
          }),
        }
      )

      // 5. GET /api/exams/:participantId/status (Status Timer & Sinkronisasi)
      .get(
        "/:participantId/status",
        async ({ params, user, set }) => {
          if (!user) {
            set.status = 401;
            return { success: false, message: "Token autentikasi tidak ditemukan" };
          }

          try {
            const data = await ExamsService.getExamStatus(
              user.id,
              Number(params.participantId)
            );

            return {
              success: true,
              data,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal mengambil status ujian",
            };
          }
        },
        {
          params: t.Object({
            participantId: t.String(),
          }),
        }
      )

      // 6. POST /api/exams/:participantId/submit (Kunci & Selesaikan Ujian)
      .post(
        "/:participantId/submit",
        async ({ params, user, set }) => {
          if (!user) {
            set.status = 401;
            return { success: false, message: "Token autentikasi tidak ditemukan" };
          }

          try {
            const data = await ExamsService.submitExam(
              user.id,
              Number(params.participantId)
            );

            return {
              success: true,
              message: "Ujian telah selesai dan lembar jawaban berhasil dikunci.",
              data,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal mengumpulkan ujian",
            };
          }
        },
        {
          params: t.Object({
            participantId: t.String(),
          }),
        }
      )
  );

export type ExamsRoute = typeof examsRoute;
export default examsRoute;
