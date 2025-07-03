import dotenv from "dotenv-safe";
import { z } from "zod";

dotenv.config({ allowEmptyValues: true });

const envSchema = z.object({
  PHONE_NUMBER: z.string().min(1),
  API_ID: z.string().min(1).transform(Number),
  API_HASH: z.string().min(1),
  API_SESSION: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
