import { addEntry } from './entries';

export async function logActivitySession(
  activityName: string,
  durationSeconds: number,
  optionalSummary?: string
): Promise<void> {
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  const preview = optionalSummary || formatDuration(durationSeconds);

  await addEntry({
    type: 'activity',
    group: 'daily',
    title: activityName,
    preview,
    meta: {
      activityName,
      durationSeconds,
    },
  });
}
