import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const host = process.env.DATABASE_HOST || "localhost";
const port = Number(process.env.DATABASE_PORT) || 3306;
const user = process.env.DATABASE_USER || "root";
const password = process.env.DATABASE_PASSWORD || "root";
const database = process.env.DATABASE_NAME || "ases_men";

export const poolConnection = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const db = drizzle(poolConnection, { schema, mode: "default" });
