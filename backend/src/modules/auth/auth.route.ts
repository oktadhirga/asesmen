import { Elysia, t } from "elysia";
import { AuthService } from "./auth.service";
import { authPlugin, requireAuth } from "./auth.guard";

export const authRoute = new Elysia()
  .use(authPlugin)
  .group("/auth", (app) =>
    app
      .post(
        "/login",
        async ({ body, jwt, set }) => {
          try {
            const user = await AuthService.validateCredentials(
              body.nip,
              body.password
            );

            const token = await jwt.sign({
              id: user.id,
              nip: user.nip,
              role: user.role,
              nama: user.nama,
            });

            return {
              success: true,
              message: "Login berhasil",
              token,
              user,
            };
          } catch (error: any) {
            set.status = 401;
            return {
              success: false,
              message: error.message || "Autentikasi gagal",
            };
          }
        },
        {
          body: t.Object({
            nip: t.String({ minLength: 1, error: "NIP wajib diisi" }),
            password: t.String({ minLength: 1, error: "Password wajib diisi" }),
          }),
        }
      )
      .get(
        "/me",
        async ({ user, set }) => {
          if (!user) {
            set.status = 401;
            return {
              success: false,
              message: "Token autentikasi tidak ditemukan atau sudah kedaluwarsa",
            };
          }

          const profile = await AuthService.getUserById(user.id);
          if (!profile) {
            set.status = 404;
            return {
              success: false,
              message: "Pengguna tidak ditemukan",
            };
          }

          return {
            success: true,
            user: profile,
          };
        },
        {
          beforeHandle: requireAuth,
        }
      )
      .post(
        "/logout",
        () => ({
          success: true,
          message: "Logout berhasil",
        }),
        {
          beforeHandle: requireAuth,
        }
      )
  );
