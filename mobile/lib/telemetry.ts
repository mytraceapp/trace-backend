const API_URL = 'https://ca2fbbde-8b20-444e-a3cf-9a3451f8b1e2-00-n5dvsa77hetw.spock.replit.dev';

interface TelemetryEvent {
  event_name: string;
  props: Record<string, any>;
  ts?: string;
}

export async function logEvent(userId: string | null, event: TelemetryEvent): Promise<void> {
  if (!userId) return;
  
  try {
    await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        events: [{
          event_name: event.event_name,
          props: event.props,
          ts: event.ts || new Date().toISOString(),
        }]
      })
    });
  } catch (err) {
    console.log('[TELEMETRY] Failed to log event:', event.event_name);
  }
}

export async function logEvents(userId: string | null, events: TelemetryEvent[]): Promise<void> {
  if (!userId || events.length === 0) return;
  
  try {
    await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        events: events.map(e => ({
          event_name: e.event_name,
          props: e.props,
          ts: e.ts || new Date().toISOString(),
        }))
      })
    });
  } catch (err) {
    console.log('[TELEMETRY] Failed to log batch events');
  }
}

export function logSuggestionAccepted(
  userId: string | null,
  suggestionId: string,
  shownTs: number,
  activityName?: string
): void {
  const timeToAccept = Math.round((Date.now() - shownTs) / 1000);
  const window = timeToAccept <= 600 ? 'strict' : 'loose';
  
  logEvent(userId, {
    event_name: 'suggestion_accepted',
    props: {
      suggestion_id: suggestionId,
      activity_name: activityName,
      time_to_accept_seconds: timeToAccept,
      window,
    }
  });
}

export function logSuggestionCompleted(
  userId: string | null,
  suggestionId: string,
  activityName: string,
  acceptedTs: number
): void {
  const timeToComplete = Math.round((Date.now() - acceptedTs) / 1000);
  
  logEvent(userId, {
    event_name: 'suggestion_completed',
    props: {
      suggestion_id: suggestionId,
      activity_name: activityName,
      time_to_complete_seconds: timeToComplete,
    }
  });
}

export function logNegativeResponse(
  userId: string | null,
  context: string,
  phrase?: string
): void {
  logEvent(userId, {
    event_name: 'negative_response_detected',
    props: {
      context,
      phrase,
    }
  });
}
