export interface ApiEnv {
  databaseUrl: string;
  port: number;
}

export function readEnv(): ApiEnv {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  return { databaseUrl, port: Number(process.env.PORT ?? 3001) };
}
