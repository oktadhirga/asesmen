/**
 * Development Server Runner
 * Menjalankan Backend Elysia (port 3000) dan Frontend SvelteKit (port 5173)
 * secara bersamaan dalam satu terminal.
 */

console.log("\n🚀 Menjalankan Sistem Asesmen ASN (Full-Stack Dev Server)...");
console.log("  → Backend (Elysia):  http://localhost:3000");
console.log("  → Frontend (Vite):   http://localhost:5173\n");

// Jalankan backend
const backend = Bun.spawn(["bun", "run", "dev"], {
  cwd: "./backend",
  stdout: "inherit",
  stderr: "inherit",
});

// Jalankan frontend
const frontend = Bun.spawn(["bun", "run", "dev"], {
  cwd: "./frontend",
  stdout: "inherit",
  stderr: "inherit",
});

// Bersihkan child process jika user menekan Ctrl+C
function cleanup() {
  console.log("\n🛑 Menghentikan server backend & frontend...");
  backend.kill();
  frontend.kill();
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
