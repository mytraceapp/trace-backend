async function getDynamicFact(supabase, key) {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('dynamic_facts')
      .select('value')
      .eq('key', key)
      .single();

    if (error || !data) {
      console.error('[getDynamicFact error]', error?.message || 'No data');
      return null;
    }
    return data.value;
  } catch (err) {
    console.error('[getDynamicFact error]', err.message);
    return null;
  }
}

function isUSPresidentQuestion(text) {
  if (!text) return false;
  const t = text.toLowerCase().trim();
  
  // Check for president-related questions
  const presidentPatterns = [
    'who is the president',
    "who's the president",
    'who is president',
    'current president',
    'president of the united states',
    'president of the us',
    'president of america',
    'us president',
    'american president',
  ];
  
  return presidentPatterns.some(pattern => t.includes(pattern));
}

module.exports = {
  getDynamicFact,
  isUSPresidentQuestion,
};
