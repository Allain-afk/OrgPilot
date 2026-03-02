import { PrismaClient } from "@/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// Singleton pattern — prevents multiple instances during Next.js HMR in dev
const globalForPrisma = globalThis as unknown as {
  __prisma?: ReturnType<typeof createPrismaClient>;
};

function createPrismaClient() {
  const accelerateUrl = process.env.DATABASE_URL;
  if (!accelerateUrl) {
    throw new Error('DATABASE_URL environment variable is required for Prisma Accelerate');
  }
  return new PrismaClient({ accelerateUrl }).$extends(withAccelerate());
}

export const prisma = globalForPrisma.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}
