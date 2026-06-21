import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: ["./src/modules/**/*.model.ts", "./src/common/enums/shared.enums.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL,
  }
});