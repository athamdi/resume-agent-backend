const supabase = require('./config/supabase');
const fs = require('fs');

async function runMigration() {
  console.log('🔧 Running database migration...');
  
  try {
    const sql = fs.readFileSync('./add-fit-details-column.sql', 'utf8');
    
    // Split by semicolon and run each statement
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (!statement.trim()) continue;
      
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        console.error('❌ Error:', error.message);
      } else {
        console.log('✅ Success');
      }
    }
    
    console.log('\n✅ Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
