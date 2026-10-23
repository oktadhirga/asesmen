import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authPlugin } from "./modules/auth/auth.guard";
import { authRoute } from "./modules/auth/auth.route";
import { usersRoute } from "./modules/users/users.route";
import { competencyRoute } from "./modules/competency/competency.route";
import { questionsRoute } from "./modules/questions/questions.route";
import { sessionsRoute } from "./modules/sessions/sessions.route.ts";

const port = Number(process.env.PORT) || 3000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

export const app = new Elysia()
  .use(
    cors({
      origin: [frontendUrl, "http://localhost:5173"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    })
  )
  .use(authPlugin)
  .get("/api/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Asesmen ASN Backend (SJT PermenPANRB)",
  }))
  .group("/api", (api) =>
    api
      .use(authRoute)
      .use(usersRoute)
      .use(competencyRoute)
      .use(questionsRoute)
      .use(sessionsRoute)
  )
  .listen(port);

console.log(
  `🚀 Server Asesmen ASN berjalan di http://${app.server?.hostname}:${app.server?.port}`
);
