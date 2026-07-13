import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function sql(query: string, params?: any[]) {
  const start = Date.now();
  const result = await pool.query(query, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.log(`[db] Slow query (${duration}ms): ${query.substring(0, 100)}`);
  }
  return result;
}

export async function sqlNoReturn(query: string, params?: any[]) {
  const start = Date.now();
  await pool.query(query, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.log(`[db] Slow query (${duration}ms): ${query.substring(0, 100)}`);
  }
}
