import { Entry } from '../models/entries';

interface ReflectionContext {
  activities: string[];
  journalMoods: string[];
  journalSnippets: string[];
  patterns: string[];
  hasInteractions: boolean;
}

function gatherContext(entries: Entry[]): ReflectionContext {
  const activities = entries
    .filter(e => e.type === 'session')
    .map(e => e.sourceScreen || e.title || 'mindfulness activity')
    .filter(Boolean) as string[];

  const emotionalNotes = entries.filter(e => e.type === 'emotional_note');
  const journalMoods = emotionalNotes
    .map(e => e.metadata?.mood as string)
    .filter(Boolean);
  const journalSnippets = emotionalNotes
    .map(e => e.body?.substring(0, 50))
    .filter(Boolean) as string[];

  const patterns = entries
    .filter(e => e.type === 'pattern')
    .map(e => e.title)
    .filter(Boolean) as string[];

  const hasInteractions = entries.some(e => e.type === 'ai_reflection' || e.type === 'check_in');

  return { activities, journalMoods, journalSnippets, patterns, hasInteractions };
}

function buildReflectionParagraph(ctx: ReflectionContext): string {
  const parts: string[] = [];

  if (ctx.activities.length > 0) {
    const activityNames = [...new Set(ctx.activities)];
    if (activityNames.length === 1) {
      parts.push(`You took time for ${activityNames[0].toLowerCase()} today`);
    } else if (activityNames.length === 2) {
      parts.push(`You moved through ${activityNames[0].toLowerCase()} and ${activityNames[1].toLowerCase()} today`);
    } else {
      parts.push(`You explored several grounding practices today`);
    }
  }

  if (ctx.journalMoods.length > 0) {
    const primaryMood = ctx.journalMoods[ctx.journalMoods.length - 1];
    const moodDescriptions: Record<string, string> = {
      calm: 'finding moments of calm',
      okay: 'holding steady',
      heavy: 'carrying something heavy',
      overwhelmed: 'navigating a lot right now',
    };
    const moodPhrase = moodDescriptions[primaryMood] || 'checking in with yourself';
    if (parts.length > 0) {
      parts.push(`and I notice you're ${moodPhrase}`);
    } else {
      parts.push(`I see you're ${moodPhrase}`);
    }
  }

  if (ctx.patterns.length > 0) {
    parts.push(`Your patterns show you're becoming more aware of your rhythms`);
  }

  let observation = parts.length > 0 
    ? parts.join(', ') + '.'
    : "It's been a quieter day, and that's okay too.";

  const encouragements = getEncouragement(ctx);
  
  return `${observation} ${encouragements}`;
}

function getEncouragement(ctx: ReflectionContext): string {
  const hasMoodData = ctx.journalMoods.length > 0;
  const lastMood = ctx.journalMoods[ctx.journalMoods.length - 1];
  const hasActivity = ctx.activities.length > 0;

  if (lastMood === 'overwhelmed' || lastMood === 'heavy') {
    const supportive = [
      "I'm here with you through this. You don't have to figure it all out today.",
      "Some days are harder than others. You're doing better than you think.",
      "It takes strength to keep showing up, even when things feel heavy. I see that in you.",
      "Whatever you're carrying, you don't have to carry it perfectly. Just gently.",
    ];
    return supportive[Math.floor(Math.random() * supportive.length)];
  }

  if (hasActivity && hasMoodData) {
    const proud = [
      "The way you're tending to yourself matters. Keep going, one breath at a time.",
      "You're building something steady here. I'm proud of you.",
      "Small acts of care add up. You're doing the quiet, important work.",
    ];
    return proud[Math.floor(Math.random() * proud.length)];
  }

  if (hasActivity) {
    const gentle = [
      "Every pause you take is a gift to yourself. Rest well tonight.",
      "You showed up for yourself today. That's no small thing.",
      "The practice is the progress. You're right where you need to be.",
    ];
    return gentle[Math.floor(Math.random() * gentle.length)];
  }

  if (hasMoodData) {
    const validating = [
      "Naming what you feel is its own kind of courage. Thank you for being honest.",
      "I'm glad you checked in. Knowing where you are is half the journey.",
      "Your feelings are welcome here, all of them.",
    ];
    return validating[Math.floor(Math.random() * validating.length)];
  }

  const quiet = [
    "Even on quiet days, you're still growing. Tomorrow is a fresh page.",
    "Rest is part of the rhythm. Take what you need.",
    "I'm here whenever you're ready. No rush, no pressure.",
  ];
  return quiet[Math.floor(Math.random() * quiet.length)];
}

export async function generateDailyAssessment(
  todayEntries: Entry[],
  recentChatMessages?: string[]
): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const context = gatherContext(todayEntries);
  return buildReflectionParagraph(context);
}
