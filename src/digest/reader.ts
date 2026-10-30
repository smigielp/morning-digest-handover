import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DigestRow, RunLogLine } from './types.js';

export async function readNight(runsDir: string, night: string): Promise<DigestRow[]> {
  const filePath = join(runsDir, `${night}.jsonl`);
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim() !== '');

  const parsedLines: RunLogLine[] = [];
  let badLineCount = 0;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as RunLogLine;
      parsedLines.push(parsed);
    } catch {
      badLineCount += 1;
      // Count but don't throw - the night still renders
    }
  }

  // Keep only rows where owner is null
  const nullOwnerLines = parsedLines.filter((line) => line.owner === null);

  // Aggregate into DigestRow: one row per job
  const jobMap = new Map<string, DigestRow>();

  for (const line of nullOwnerLines) {
    const existing = jobMap.get(line.job);

    if (!existing) {
      jobMap.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error ?? null,
        firstTime: line.at,
        lastTime: line.at,
      });
    } else {
      existing.runs += 1;
      if (line.status === 'retry') {
        existing.retries += 1;
      }
      existing.lastStatus = line.status;
      existing.lastError = line.error ?? null;
      existing.lastTime = line.at;
    }
  }

  return Array.from(jobMap.values());
}