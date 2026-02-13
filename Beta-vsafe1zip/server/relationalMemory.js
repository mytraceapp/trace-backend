const RELATIONSHIP_MAP = {
  'mom': 'mom', 'mother': 'mom', 'mama': 'mom', 'ma': 'mom', 'mum': 'mom', 'mommy': 'mom',
  'dad': 'dad', 'father': 'dad', 'papa': 'dad', 'pa': 'dad', 'pops': 'dad', 'daddy': 'dad',
  'sister': 'sister', 'sis': 'sister',
  'brother': 'brother', 'bro': 'brother',
  'wife': 'wife',
  'husband': 'husband',
  'girlfriend': 'girlfriend', 'gf': 'girlfriend',
  'boyfriend': 'boyfriend', 'bf': 'boyfriend',
  'partner': 'partner',
  'son': 'son',
  'daughter': 'daughter',
  'grandma': 'grandma', 'grandmother': 'grandma', 'nana': 'grandma', 'granny': 'grandma',
  'grandpa': 'grandpa', 'grandfather': 'grandpa', 'gramps': 'grandpa',
  'aunt': 'aunt', 'auntie': 'aunt',
  'uncle': 'uncle',
  'cousin': 'cousin',
  'friend': 'friend', 'bestfriend': 'friend', 'best friend': 'friend', 'bff': 'friend',
  'therapist': 'therapist',
  'boss': 'boss',
  'coworker': 'coworker', 'colleague': 'coworker',
  'roommate': 'roommate',
  'ex': 'ex',
};

const ALL_SYNONYMS = Object.keys(RELATIONSHIP_MAP);

const SYNONYM_PATTERN = ALL_SYNONYMS
  .sort((a, b) => b.length - a.length)
  .map(s => s.replace(/\s+/g, '\\s+'))
  .join('|');

const MENTION_REGEX = new RegExp(
  `\\bmy\\s+(${SYNONYM_PATTERN})\\b`,
  'gi'
);

const EXPLICIT_REGEX = new RegExp(
  `\\bmy\\s+(${SYNONYM_PATTERN})\\s+([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\\- ]{0,30}[A-Za-z\u00C0-\u024F])\\b`,
  'gi'
);

function normalizeRelationship(raw) {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  return RELATIONSHIP_MAP[key] || null;
}

function extractRelationshipMentions(text) {
  if (!text) return new Set();
  const matches = new Set();
  let m;
  const regex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags);
  while ((m = regex.exec(text)) !== null) {
    const normalized = normalizeRelationship(m[1]);
    if (normalized) matches.add(normalized);
  }
  return matches;
}

function extractExplicitPersonMentions(text) {
  if (!text) return [];
  const results = [];
  let m;
  const regex = new RegExp(EXPLICIT_REGEX.source, EXPLICIT_REGEX.flags);
  while ((m = regex.exec(text)) !== null) {
    const relationship = normalizeRelationship(m[1]);
    let name = m[2].trim();
    const stopWords = ['is', 'was', 'has', 'had', 'just', 'always', 'never', 'said', 'told', 'and', 'but', 'who', 'that', 'the'];
    const nameParts = name.split(/\s+/);
    const filteredParts = [];
    for (const part of nameParts) {
      if (stopWords.includes(part.toLowerCase())) break;
      filteredParts.push(part);
    }
    name = filteredParts.join(' ');
    if (relationship && name && name.length >= 2) {
      results.push({ relationship, name });
    }
  }
  return results;
}

async function resolvePersonByRelationship(pool, userId, relationship) {
  if (!pool || !userId || !relationship) return null;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM people WHERE owner_user_id = $1 AND relationship = $2 ORDER BY salience DESC`,
      [userId, relationship]
    );
    if (!rows || rows.length === 0) return null;
    if (rows.length === 1) return rows[0];
    return { ambiguous: true, candidates: rows };
  } catch (err) {
    console.error('[RELATIONAL MEMORY] resolve error:', err.message);
    return null;
  }
}

async function resolvePersonByName(pool, userId, name) {
  if (!pool || !userId || !name) return null;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM people WHERE owner_user_id = $1 AND (LOWER(display_name) = LOWER($2) OR LOWER($2) = ANY(SELECT LOWER(unnest(aliases)))) ORDER BY salience DESC LIMIT 1`,
      [userId, name]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error('[RELATIONAL MEMORY] name resolve error:', err.message);
    return null;
  }
}

async function upsertPerson(pool, userId, relationship, displayName, extraAliases) {
  if (!pool || !userId || !relationship || !displayName) return null;
  const aliases = new Set([
    displayName.toLowerCase(),
    relationship,
    ...(extraAliases || []),
  ]);
  const synonyms = Object.entries(RELATIONSHIP_MAP)
    .filter(([, v]) => v === relationship)
    .map(([k]) => k);
  for (const syn of synonyms) {
    aliases.add(syn);
    aliases.add(`my ${syn}`);
  }

  try {
    const { rows: existing } = await pool.query(
      `SELECT * FROM people WHERE owner_user_id = $1 AND relationship = $2 AND display_name = $3 LIMIT 1`,
      [userId, relationship, displayName]
    );
    if (existing && existing.length > 0) {
      return existing[0];
    }
    const { rows } = await pool.query(
      `INSERT INTO people (owner_user_id, relationship, display_name, aliases) VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, relationship, displayName, [...aliases]]
    );
    if (!rows || rows.length === 0) return null;
    console.log(`[RELATIONAL MEMORY] Created: ${relationship} = ${displayName} for user ${userId.slice(0, 8)}`);
    return rows[0];
  } catch (err) {
    console.error('[RELATIONAL MEMORY] upsert exception:', err.message);
    return null;
  }
}

async function bumpSalience(pool, personId) {
  if (!pool || !personId) return;
  try {
    await pool.query(
      `UPDATE people SET salience = LEAST(salience + 0.1, 1.0), last_mentioned_at = now() WHERE id = $1`,
      [personId]
    );
  } catch (err) {
    console.error('[RELATIONAL MEMORY] bump error:', err.message);
  }
}

async function listPeople(pool, userId) {
  if (!pool || !userId) return [];
  try {
    const { rows } = await pool.query(
      `SELECT * FROM people WHERE owner_user_id = $1 ORDER BY salience DESC`,
      [userId]
    );
    return rows || [];
  } catch (err) {
    console.error('[RELATIONAL MEMORY] list error:', err.message);
    return [];
  }
}

async function getHighSaliencePeople(pool, userId, limit = 5) {
  if (!pool || !userId) return [];
  try {
    const { rows } = await pool.query(
      `SELECT * FROM people WHERE owner_user_id = $1 AND salience >= 0.5 ORDER BY salience DESC LIMIT $2`,
      [userId, limit]
    );
    return rows || [];
  } catch (err) {
    console.error('[RELATIONAL MEMORY] high salience error:', err.message);
    return [];
  }
}

async function updatePerson(pool, personId, userId, updates) {
  if (!pool || !personId || !userId) return null;
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  if (updates.display_name) {
    setClauses.push(`display_name = $${paramIndex++}`);
    values.push(updates.display_name);
  }
  if (updates.relationship) {
    setClauses.push(`relationship = $${paramIndex++}`);
    values.push(updates.relationship);
  }
  if (updates.notes !== undefined) {
    setClauses.push(`notes = $${paramIndex++}`);
    values.push(updates.notes);
  }
  if (updates.aliases) {
    setClauses.push(`aliases = $${paramIndex++}`);
    values.push(Array.isArray(updates.aliases) ? updates.aliases : [updates.aliases]);
  }

  if (setClauses.length === 0) return null;

  values.push(personId, userId);
  try {
    const { rows } = await pool.query(
      `UPDATE people SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND owner_user_id = $${paramIndex} RETURNING *`,
      values
    );
    return rows && rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error('[RELATIONAL MEMORY] update error:', err.message);
    return null;
  }
}

async function deletePerson(pool, personId, userId) {
  if (!pool || !personId || !userId) return false;
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM people WHERE id = $1 AND owner_user_id = $2`,
      [personId, userId]
    );
    return rowCount > 0;
  } catch (err) {
    console.error('[RELATIONAL MEMORY] delete error:', err.message);
    return false;
  }
}

function buildRelationalAnchors(resolvedPeople) {
  if (!resolvedPeople || resolvedPeople.length === 0) return null;
  const lines = resolvedPeople.map(p => {
    let line = `- ${p.relationship} = ${p.display_name}`;
    if (p.notes) line += `. Notes: ${p.notes}`;
    line += `. Use "${p.display_name}" when the user says "my ${p.relationship}" unless they specify a different person.`;
    return line;
  });
  return `Relational anchors (always true unless user corrects it):\n${lines.join('\n')}`;
}

function buildClarificationResponse(relationship, candidates, userMessage) {
  const names = candidates
    .slice(0, 3)
    .map(c => c.display_name);
  let prefix = '';
  if (userMessage && userMessage.length > 20) {
    prefix = 'I hear you. ';
  }
  if (names.length === 2) {
    return `${prefix}When you say your ${relationship}\u2014${names[0]} or ${names[1]}?`;
  }
  const last = names.pop();
  return `${prefix}When you say your ${relationship}\u2014${names.join(', ')}, or ${last}?`;
}

module.exports = {
  normalizeRelationship,
  extractRelationshipMentions,
  extractExplicitPersonMentions,
  resolvePersonByRelationship,
  resolvePersonByName,
  upsertPerson,
  bumpSalience,
  listPeople,
  getHighSaliencePeople,
  updatePerson,
  deletePerson,
  buildRelationalAnchors,
  buildClarificationResponse,
  RELATIONSHIP_MAP,
};
