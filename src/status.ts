import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { lastBeat, type Beat } from './heartbeat.js';
import { readNight } from './digest/reader.js';

export type NightWithCounts = {
  night: string;
  ok: number;
  retry: number;
  fail: number;
};

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightWithCounts[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export async function readStatus(config: RigConfig): Promise<Status> {
  const nightsList = nightsOnDisk(config.runsDir);
  const nightsWithCounts: NightWithCounts[] = [];

  for (const night of nightsList) {
    try {
      const rows = await readNight(config.runsDir, night);
      const counts = { ok: 0, retry: 0, fail: 0 };
      for (const row of rows) {
        if (row.lastStatus === 'ok') counts.ok++;
        else if (row.lastStatus === 'retry') counts.retry++;
        else if (row.lastStatus === 'fail') counts.fail++;
      }
      nightsWithCounts.push({ night, ...counts });
    } catch {
      // If we can't read the night, skip it
    }
  }

  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsWithCounts,
  };
}
