const { Pool } = require('pg');

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Creating missing tables...\n');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_id TEXT,
        activity_type TEXT NOT NULL,
        duration_seconds INTEGER,
        completed_at TIMESTAMPTZ DEFAULT NOW(),
        dreamscape_track_id TEXT,
        selection_mode TEXT,
        selection_source TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ activity_logs table ready');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx 
      ON activity_logs(user_id);
    `);
    console.log('✓ activity_logs index ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS people (
        id SERIAL PRIMARY KEY,
        owner_user_id TEXT NOT NULL,
        relationship TEXT NOT NULL,
        display_name TEXT NOT NULL,
        aliases TEXT[] DEFAULT '{}',
        salience INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ people table ready');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS people_owner_user_id_idx 
      ON people(owner_user_id);
    `);
    console.log('✓ people index ready');

    console.log('\nDone. All tables verified.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
