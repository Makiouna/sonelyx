const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

console.log('Connecting to Neon HTTP database...');
const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

(async () => {
  try {
    console.log('Selecting from equipment...');
    const result = await db.execute('SELECT * FROM equipment');
    console.log('Equipment count:', result.rows.length);
    process.exit(0);
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
})();
