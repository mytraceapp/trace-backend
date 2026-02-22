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

const NOT_NAMES = new Set([
  'wants', 'goes', 'loves', 'likes', 'hates', 'needs', 'does', 'makes',
  'takes', 'says', 'said', 'told', 'came', 'went', 'got', 'gets',
  'lives', 'works', 'plays', 'calls', 'called', 'used', 'keeps',
  'started', 'stopped', 'always', 'never', 'just', 'really', 'still',
  'also', 'even', 'recently', 'usually', 'sometimes', 'today', 'yesterday',
  'tonight', 'tomorrow', 'too', 'very', 'so', 'about', 'would', 'could',
  'should', 'will', 'can', 'might', 'may', 'has', 'had', 'have',
  'was', 'were', 'been', 'being', 'are', 'the', 'this', 'that',
  'who', 'whom', 'which', 'what', 'when', 'where', 'how', 'why',
  'not', 'but', 'and', 'or', 'if', 'then', 'because', 'since',
  'with', 'from', 'into', 'over', 'after', 'before', 'during',
  'thinks', 'thought', 'knows', 'knew', 'feels', 'felt',
  'passed', 'died', 'moved', 'left', 'came', 'born',
]);

function isLikelyName(str) {
  if (!str || str.length < 2 || str.length > 25) return false;
  const first = str.split(/\s+/)[0].toLowerCase();
  if (NOT_NAMES.has(first)) return false;
  if (/^[a-z]/.test(str.split(/\s+/)[0])) return false;
  if (/^\d/.test(str)) return false;
  return true;
}

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
  const seen = new Set();

  function addResult(relationship, name) {
    if (!relationship || !name) return;
    name = name.trim().replace(/[.,!?;:]+$/, '').trim();
    const stopWords = ['is', 'was', 'has', 'had', 'just', 'always', 'never', 'said', 'told', 'and', 'but', 'who', 'that', 'the', 'to', 'for', 'in', 'on', 'at', 'with'];
    const nameParts = name.split(/\s+/);
    const filteredParts = [];
    for (const part of nameParts) {
      if (stopWords.includes(part.toLowerCase())) break;
      filteredParts.push(part);
    }
    name = filteredParts.join(' ').trim();
    if (!isLikelyName(name)) return;
    const key = `${relationship}:${name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ relationship, name });
  }

  let m;

  // Pattern 1: "my daughter Sarah" (direct juxtaposition)
  const regex1 = new RegExp(EXPLICIT_REGEX.source, EXPLICIT_REGEX.flags);
  while ((m = regex1.exec(text)) !== null) {
    addResult(normalizeRelationship(m[1]), m[2]);
  }

  // Pattern 2: "my daughter's name is Sarah" / "my daughter is named Sarah"
  const nameIsRegex = new RegExp(
    `\\bmy\\s+(${SYNONYM_PATTERN})(?:'s)?\\s+(?:name\\s+is|is\\s+named|is\\s+called|goes\\s+by)\\s+([A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\\- ]{0,25})`,
    'gi'
  );
  while ((m = nameIsRegex.exec(text)) !== null) {
    addResult(normalizeRelationship(m[1]), m[2]);
  }

  // Pattern 3: "my daughter is Sarah" / "my daughter, Sarah,"
  const isNameRegex = new RegExp(
    `\\bmy\\s+(${SYNONYM_PATTERN})(?:\\s+is|,)\\s+([A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\\- ]{0,25})`,
    'gi'
  );
  while ((m = isNameRegex.exec(text)) !== null) {
    addResult(normalizeRelationship(m[1]), m[2]);
  }

  // Pattern 4: "Sarah is my daughter" / "Sarah, my daughter"
  const reversedRegex = new RegExp(
    `\\b([A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\\- ]{0,25})\\s+(?:is|,)\\s+my\\s+(${SYNONYM_PATTERN})\\b`,
    'gi'
  );
  while ((m = reversedRegex.exec(text)) !== null) {
    addResult(normalizeRelationship(m[2]), m[1]);
  }

  // Pattern 5: "I call my daughter Sarah" / "I named my daughter Sarah" / "we named our daughter Sarah"
  const namedRegex = new RegExp(
    `(?:(?:I|we)\\s+(?:call|named|name)\\s+(?:my|our|her|his)\\s+(${SYNONYM_PATTERN})\\s+)([A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\\- ]{0,25})`,
    'gi'
  );
  while ((m = namedRegex.exec(text)) !== null) {
    addResult(normalizeRelationship(m[1]), m[2]);
  }

  // Pattern 6: "her name is Sarah" with pronoun context (daughter/sister/etc from recent mention)
  // This is handled separately via pronoun resolution — skip here

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

// ============================================================
// PHASE 2: Pending confirmation flow
// ============================================================
const pendingPersons = new Map();

function setPendingPerson(userId, person) {
  pendingPersons.set(userId, { ...person, createdAt: Date.now() });
}

function getPendingPerson(userId) {
  const pending = pendingPersons.get(userId);
  if (!pending) return null;
  if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
    pendingPersons.delete(userId);
    return null;
  }
  return pending;
}

function clearPendingPerson(userId) {
  pendingPersons.delete(userId);
}

function buildConfirmationLine(displayName, relationship) {
  return `Just checking\u2014${displayName} is your ${relationship}, right?`;
}

const CONFIRM_YES = /^(yes|yeah|yep|yup|correct|that's right|right|mhm|uh huh|exactly)\.?!?$/i;
const CONFIRM_NO = /^(no|nope|nah|not really|wrong|that's wrong|incorrect)\.?!?$/i;

function isConfirmationYes(text) {
  if (!text) return false;
  return CONFIRM_YES.test(text.trim());
}

function isConfirmationNo(text) {
  if (!text) return false;
  return CONFIRM_NO.test(text.trim());
}

// ============================================================
// PHASE 2: Correction detection
// ============================================================
const CORRECTION_REGEX = new RegExp(
  `([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'\\- ]{0,30})\\s+is\\s+my\\s+(${SYNONYM_PATTERN})\\s*[,.]?\\s*not\\s+(?:my\\s+)?(${SYNONYM_PATTERN})`,
  'i'
);

const CORRECTION_REGEX_ALT = new RegExp(
  `(?:(?:she|he|they)'?s?|(?:she|he|they)\\s+(?:is|are))\\s+(?:not\\s+)?my\\s+(${SYNONYM_PATTERN})\\s*[,.]?\\s*(?:(?:she|he|they)'?s?|(?:she|he|they)\\s+(?:is|are))\\s+my\\s+(${SYNONYM_PATTERN})`,
  'i'
);

function detectCorrection(text) {
  if (!text) return null;

  let m = CORRECTION_REGEX.exec(text);
  if (m) {
    const name = m[1].trim();
    const correctRelationship = normalizeRelationship(m[2]);
    const wrongRelationship = normalizeRelationship(m[3]);
    if (correctRelationship && wrongRelationship && correctRelationship !== wrongRelationship) {
      return { name, correctRelationship, wrongRelationship };
    }
  }

  m = CORRECTION_REGEX_ALT.exec(text);
  if (m) {
    const wrongRelationship = normalizeRelationship(m[1]);
    const correctRelationship = normalizeRelationship(m[2]);
    if (correctRelationship && wrongRelationship && correctRelationship !== wrongRelationship) {
      return { name: null, correctRelationship, wrongRelationship };
    }
  }

  return null;
}

async function applyCorrection(pool, userId, correction) {
  if (!pool || !userId || !correction) return null;
  const { name, correctRelationship, wrongRelationship } = correction;

  try {
    let query, params;
    if (name) {
      query = `UPDATE people SET relationship = $1 WHERE owner_user_id = $2 AND LOWER(display_name) = LOWER($3) AND relationship = $4 RETURNING *`;
      params = [correctRelationship, userId, name, wrongRelationship];
    } else {
      query = `UPDATE people SET relationship = $1 WHERE id = (SELECT id FROM people WHERE owner_user_id = $2 AND relationship = $3 ORDER BY last_mentioned_at DESC NULLS LAST LIMIT 1) RETURNING *`;
      params = [correctRelationship, userId, wrongRelationship];
    }
    const { rows } = await pool.query(query, params);
    if (rows && rows.length > 0) {
      console.log(`[RELATIONAL MEMORY] Correction applied: ${wrongRelationship} -> ${correctRelationship} for ${rows[0].display_name}`);
      return rows[0];
    }
    return null;
  } catch (err) {
    console.error('[RELATIONAL MEMORY] correction error:', err.message);
    return null;
  }
}

// ============================================================
// PHASE 2: Pronoun resolution (session-scoped, in-memory)
// ============================================================
const pronounTracker = new Map();

const PRONOUN_REGEX = /\b(she|he|they|her|him|them)\b/i;

function updatePronounTracker(userId, person, messageIndex) {
  pronounTracker.set(userId, {
    relationship: person.relationship,
    display_name: person.display_name,
    messageIndex,
    updatedAt: Date.now(),
  });
}

function getPronounHint(userId, currentMessageIndex) {
  const tracked = pronounTracker.get(userId);
  if (!tracked) return null;
  const distance = currentMessageIndex - tracked.messageIndex;
  if (distance > 5 || Date.now() - tracked.updatedAt > 15 * 60 * 1000) {
    pronounTracker.delete(userId);
    return null;
  }
  return tracked;
}

function clearPronounTracker(userId) {
  pronounTracker.delete(userId);
}

function hasPronounReference(text) {
  if (!text) return false;
  return PRONOUN_REGEX.test(text);
}

function buildPronounHintPrompt(trackedPerson) {
  if (!trackedPerson) return null;
  return `Recent reference: ${trackedPerson.display_name} (${trackedPerson.relationship}). If pronouns refer to someone else, ask briefly.`;
}

// ============================================================
// PHASE 2: Post-processing guardrail
// ============================================================
function applyNameSubstitution(responseText, injectedAnchors) {
  if (!responseText || !injectedAnchors || injectedAnchors.length === 0) return responseText;

  let result = responseText;
  for (const person of injectedAnchors) {
    const rel = person.relationship;
    const name = person.display_name;
    if (!rel || !name) continue;

    if (result.includes(name)) continue;

    const patterns = [
      { find: `your ${rel}'s`, replace: `${name}'s` },
      { find: `Your ${rel}'s`, replace: `${name}'s` },
      { find: `your ${rel}`, replace: name },
      { find: `Your ${rel}`, replace: name },
    ];

    for (const p of patterns) {
      if (result.includes(p.find)) {
        result = result.split(p.find).join(p.replace);
        console.log(`[RELATIONAL MEMORY] Post-process: "${p.find}" -> "${p.replace}"`);
      }
    }
  }
  return result;
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
  setPendingPerson,
  getPendingPerson,
  clearPendingPerson,
  buildConfirmationLine,
  isConfirmationYes,
  isConfirmationNo,
  detectCorrection,
  applyCorrection,
  updatePronounTracker,
  getPronounHint,
  clearPronounTracker,
  hasPronounReference,
  buildPronounHintPrompt,
  applyNameSubstitution,
};
