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
  return (
    t.includes('who is the president of the united states') ||
    t.includes("who's the president of the united states") ||
    t.includes('who is the us president') ||
    t.includes("who's the us president") ||
    t.includes('who is president of the us') ||
    t.includes('who is the president of america') ||
    t === 'who is the president' ||
    t === "who's the president" ||
    t === 'who is president'
  );
}

module.exports = {
  getDynamicFact,
  isUSPresidentQuestion,
};
