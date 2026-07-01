const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

console.log('Connecting to Neon HTTP database...');
const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

(async () => {
  try {
    console.log('Running test query...');
    const result = await db.execute('SELECT 1');
    console.log('Success! Output:', result);
    process.exit(0);
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
})();
