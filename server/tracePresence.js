const { createClient } = require('@supabase/supabase-js');

async function updateLastSeen(supabase, userId) {
  if (!supabase || !userId) return;
  
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('profiles')
    .update({ last_seen_at: now })
    .eq('user_id', userId);

  if (error) {
    console.error('[updateLastSeen error]', error.message);
  }
}

async function buildReturnWarmthLine(supabase, userId) {
  if (!supabase || !userId) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('last_seen_at')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('[buildReturnWarmthLine error]', error.message);
    return null;
  }

  if (!data?.last_seen_at) {
    return null;
  }

  const last = new Date(data.last_seen_at).getTime();
  const now = Date.now();
  const diffDays = (now - last) / (1000 * 60 * 60 * 24);

  if (diffDays < 2) {
    return null;
  }

  if (diffDays >= 2 && diffDays < 10) {
    return "It's been a little while. No rush—I'm just glad you're here.";
  }

  if (diffDays >= 10) {
    return "It's been some time since we last sat together. You don't owe me an explanation. I'm glad you came back.";
  }

  return null;
}

function buildMemoryCue(memorySummary) {
  if (!memorySummary) return null;

  const bits = [];

  if (memorySummary.coreThemes?.length) {
    bits.push(`themes: ${memorySummary.coreThemes.slice(0, 3).join(', ')}`);
  }

  if (memorySummary.triggers?.length) {
    bits.push(`sensitive topics: ${memorySummary.triggers.slice(0, 2).join(', ')}`);
  }

  if (memorySummary.relationships?.length) {
    bits.push(`people that matter: ${memorySummary.relationships.slice(0, 3).join(', ')}`);
  }

  if (!bits.length) return null;

  return `RECENTLY IMPORTANT THINGS TO THEM (use gently, not all at once): ${bits.join(' | ')}`;
}

module.exports = {
  updateLastSeen,
  buildReturnWarmthLine,
  buildMemoryCue,
};
