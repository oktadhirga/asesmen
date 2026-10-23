import { Elysia, t } from "elysia";
import { UsersService } from "./users.service";
import { authPlugin, requireAdmin } from "../auth/auth.guard";

export const usersRoute = new Elysia()
  .use(authPlugin)
  .group("/users", (app) =>
    app
      .guard({
        beforeHandle: requireAdmin,
      })
      // 1. GET /api/users (List, Search & Filter)
      .get(
        "/",
        async ({ query }) => {
          const result = await UsersService.listUsers({
            page: query.page ? Number(query.page) : 1,
            limit: query.limit ? Number(query.limit) : 10,
            search: query.search,
            role: query.role as any,
            jenjang_jabatan: query.jenjang_jabatan as any,
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
            search: t.Optional(t.String()),
            role: t.Optional(
              t.Union([t.Literal("ADMIN"), t.Literal("PESERTA")])
            ),
            jenjang_jabatan: t.Optional(
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

      // 2. GET /api/users/:id (Detail Pengguna)
      .get(
        "/:id",
        async ({ params, set }) => {
          const user = await UsersService.getUserById(Number(params.id));
          if (!user) {
            set.status = 404;
            return {
              success: false,
              message: "Pengguna tidak ditemukan",
            };
          }

          return {
            success: true,
            data: user,
          };
        },
        {
          params: t.Object({
            id: t.String(),
          }),
        }
      )

      // 3. POST /api/users (Tambah ASN / Asesor Baru)
      .post(
        "/",
        async ({ body, set }) => {
          try {
            const newUser = await UsersService.createUser({
              nip: body.nip,
              nama: body.nama,
              email: body.email,
              password: body.password,
              role: body.role,
              jabatan: body.jabatan,
              instansi: body.instansi,
              unit_kerja: body.unit_kerja,
              jenjang_jabatan: body.jenjang_jabatan,
            });

            set.status = 201;
            return {
              success: true,
              message: "Pengguna berhasil ditambahkan",
              data: newUser,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal menambahkan pengguna",
            };
          }
        },
        {
          body: t.Object({
            nip: t.String({ minLength: 5, error: "NIP wajib diisi minimal 5 karakter" }),
            nama: t.String({ minLength: 1, error: "Nama wajib diisi" }),
            email: t.Optional(t.String()),
            password: t.Optional(t.String()),
            role: t.Optional(
              t.Union([t.Literal("ADMIN"), t.Literal("PESERTA")])
            ),
            jabatan: t.Optional(t.String()),
            instansi: t.Optional(t.String()),
            unit_kerja: t.Optional(t.String()),
            jenjang_jabatan: t.Optional(
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

      // 4. PUT /api/users/:id (Perbarui Data Pegawai)
      .put(
        "/:id",
        async ({ params, body, set }) => {
          try {
            const updated = await UsersService.updateUser(
              Number(params.id),
              body
            );

            if (!updated) {
              set.status = 404;
              return {
                success: false,
                message: "Pengguna tidak ditemukan",
              };
            }

            return {
              success: true,
              message: "Data pengguna berhasil diperbarui",
              data: updated,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              message: error.message || "Gagal memperbarui pengguna",
            };
          }
        },
        {
          params: t.Object({
            id: t.String(),
          }),
          body: t.Object({
            nip: t.Optional(t.String()),
            nama: t.Optional(t.String()),
            email: t.Optional(t.String()),
            password: t.Optional(t.String()),
            role: t.Optional(
              t.Union([t.Literal("ADMIN"), t.Literal("PESERTA")])
            ),
            jabatan: t.Optional(t.String()),
            instansi: t.Optional(t.String()),
            unit_kerja: t.Optional(t.String()),
            jenjang_jabatan: t.Optional(
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

      // 5. DELETE /api/users/:id (Hapus Pegawai)
      .delete(
        "/:id",
        async ({ params, user, set }) => {
          const targetId = Number(params.id);

          // Cegah admin menghapus dirinya sendiri
          if (user && user.id === targetId) {
            set.status = 400;
            return {
              success: false,
              message: "Tidak dapat menghapus akun Anda sendiri",
            };
          }

          const deleted = await UsersService.deleteUser(targetId);
          if (!deleted) {
            set.status = 404;
            return {
              success: false,
              message: "Pengguna tidak ditemukan",
            };
          }

          return {
            success: true,
            message: "Pengguna berhasil dihapus",
          };
        },
        {
          params: t.Object({
            id: t.String(),
          }),
        }
      )
  );
