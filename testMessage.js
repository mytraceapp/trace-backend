import { supabase } from './supabaseClient.js';

// Run this once to test
async function saveTestMessage() {
  // Get the current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('❌ Not logged in or auth error:', authError);
    return;
  }

  const userId = user.id;

  // Insert a message
  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        user_id: userId,
        role: 'user',
        content: 'TRACE connection test!'
      }
    ]);

  if (error) {
    console.error('❌ DB insert error:', error);
  } else {
    console.log('✅ Message saved:', data);
  }
}

saveTestMessage();