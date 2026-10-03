import { defineConfig } from "drizzle-kit";

// Şema değişikliğinden sonra yeni migration üretmek için: npm run db:generate
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
});
