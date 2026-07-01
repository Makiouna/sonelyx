const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

console.log('Connecting to Neon HTTP database...');
const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

(async () => {
  try {
    console.log('Selecting from category...');
    const result = await db.execute('SELECT * FROM category');
    console.log('Categories count:', result.rows.length);
    console.log('Categories:', result.rows);
    process.exit(0);
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
})();
