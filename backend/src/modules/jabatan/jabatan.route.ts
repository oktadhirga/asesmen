import { Elysia, t } from "elysia";
import { JabatanService } from "./jabatan.service";

export const jabatanRoute = new Elysia()
  .group("/jabatan", (app) =>
    app
      // 1. GET /api/jabatan (Daftar 14 Jenjang Jabatan ASN)
      .get("/", async () => {
        const data = await JabatanService.listJabatan();
        return {
          success: true,
          total: data.length,
          data,
        };
      })

      // 2. GET /api/jabatan/:id/standards (Matriks 9 Standar Kompetensi Jabatan)
      .get(
        "/:id/standards",
        async ({ params, set }) => {
          const result = await JabatanService.getStandardsByJabatanId(
            Number(params.id)
          );

          if (!result) {
            set.status = 404;
            return {
              success: false,
              message: "Jenjang jabatan tidak ditemukan",
            };
          }

          return {
            success: true,
            data: result,
          };
        },
        {
          params: t.Object({
            id: t.String(),
          }),
        }
      )

      // 3. GET /api/jabatan/:id (Detail Jenjang Jabatan)
      .get(
        "/:id",
        async ({ params, set }) => {
          const data = await JabatanService.getJabatanById(Number(params.id));

          if (!data) {
            set.status = 404;
            return {
              success: false,
              message: "Jenjang jabatan tidak ditemukan",
            };
          }

          return {
            success: true,
            data,
          };
        },
        {
          params: t.Object({
            id: t.String(),
          }),
        }
      )
  );

