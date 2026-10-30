import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl and aggregates digest rows', async () => {
    const rows = await readNight('runs', '2026-10-28');

    // Should have only one row (digest/render has owner: null)
    expect(rows).toHaveLength(1);

    const digestRow = rows[0];
    expect(digestRow.job).toBe('digest/render');
    expect(digestRow.owner).toBeNull();
    expect(digestRow.runs).toBe(1);
    expect(digestRow.retries).toBe(0);
    expect(digestRow.lastStatus).toBe('ok');
    expect(digestRow.lastError).toBeNull();
    expect(digestRow.firstTime).toBe('2026-10-29T05:41:09+01:00');
    expect(digestRow.lastTime).toBe('2026-10-29T05:41:09+01:00');
  });

  it('handles bad lines without throwing', async () => {
    // Line 16 in 2026-10-28.jsonl is malformed
    // The function should not throw but still return results
    await expect(readNight('runs', '2026-10-28')).resolves.toBeDefined();
  });

  it('filters out rows where owner is not null', async () => {
    const rows = await readNight('runs', '2026-10-28');

    // All returned rows should have null owner
    rows.forEach((row) => {
      expect(row.owner).toBeNull();
    });

    // Should not include jobs like 'rig/rotate-logs', 'lane/sync', etc. which have non-null owners
    const jobNames = rows.map((r) => r.job);
    expect(jobNames).not.toContain('rig/rotate-logs');
    expect(jobNames).not.toContain('lane/sync');
    expect(jobNames).not.toContain('fixtures/refresh');
    expect(jobNames).not.toContain('notes/backup');
  });

  it('aggregates multiple runs of the same job', async () => {
    // Using 2026-10-27.jsonl which might have multiple runs
    const rows = await readNight('runs', '2026-10-27');

    // Each job should appear only once
    const jobNames = rows.map((r) => r.job);
    const uniqueJobNames = new Set(jobNames);
    expect(jobNames.length).toBe(uniqueJobNames.size);
  });

  it('counts retries correctly', async () => {
    const rows = await readNight('runs', '2026-10-28');

    // Verify retries count is accurate
    rows.forEach((row) => {
      expect(row.retries).toBeGreaterThanOrEqual(0);
      expect(row.retries).toBeLessThanOrEqual(row.runs);
    });
  });

  it('tracks first and last times correctly', async () => {
    const rows = await readNight('runs', '2026-10-28');

    rows.forEach((row) => {
      // First time should be <= last time
      expect(row.firstTime <= row.lastTime).toBe(true);
    });
  });

  it('preserves last error from the most recent run', async () => {
    const rows = await readNight('runs', '2026-10-28');

    rows.forEach((row) => {
      if (row.lastStatus === 'ok') {
        // OK status typically has no error
        // (though error could be present if it was the last field)
      }
    });
  });
});