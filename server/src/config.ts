// All settings come from environment variables: a local .env file in
// development, Fly.io secrets in production. Failing fast here beats a
// confusing crash later when something tries to use a missing value.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  isProduction: process.env.NODE_ENV === "production",
};
