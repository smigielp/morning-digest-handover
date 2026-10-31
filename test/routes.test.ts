import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { RigConfig } from '../src/config.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('digest routes', () => {
  const tempDir = join(process.cwd(), 'test-runs-temp');

  const testConfig: RigConfig = {
    adapter: 'test',
    installed: '2026-10-31T00:00:00Z',
    beatEverySeconds: 60,
    runsDir: tempDir,
  };

  const setupTempRuns = () => {
    rmSync(tempDir, { recursive: true, force: true });
    mkdirSync(tempDir, { recursive: true });
  };

  const cleanup = () => {
    rmSync(tempDir, { recursive: true, force: true });
  };

  describe('GET /digest/:night', () => {
    it('returns 200 for a night with data', async () => {
      setupTempRuns();
      writeFileSync(
        join(tempDir, '2026-10-28.jsonl'),
        '{"at":"2026-10-28T23:00:00Z","job":"test/job","status":"ok","owner":null}\n',
      );

      const app = createApp(testConfig);
      const res = await app.request('/digest/2026-10-28');

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('digest · 2026-10-28');
      expect(html).toContain('test/job');

      cleanup();
    });

    it('returns 404 for a night with no file', async () => {
      setupTempRuns();

      const app = createApp(testConfig);
      const res = await app.request('/digest/2026-10-99');

      expect(res.status).toBe(404);
      cleanup();
    });

    it('renders "nothing ran" for an empty night', async () => {
      setupTempRuns();
      writeFileSync(join(tempDir, '2026-10-29.jsonl'), '');

      const app = createApp(testConfig);
      const res = await app.request('/digest/2026-10-29');

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('nothing ran');

      cleanup();
    });

    it('handles a night with a bad line', async () => {
      setupTempRuns();
      writeFileSync(
        join(tempDir, '2026-10-30.jsonl'),
        '{"at":"2026-10-30T01:00:00Z","job":"good/job","status":"ok","owner":null}\n' +
        'this is not json\n' +
        '{"at":"2026-10-30T02:00:00Z","job":"another/job","status":"fail","owner":null,"error":"test error"}\n',
      );

      const app = createApp(testConfig);
      const res = await app.request('/digest/2026-10-30');

      expect(res.status).toBe(200);
      const html = await res.text();
      // Should show both good jobs, bad line is counted but not thrown
      expect(html).toContain('good/job');
      expect(html).toContain('another/job');

      cleanup();
    });
  });

  describe('GET /api/digest/:night', () => {
    it('returns 200 with JSON for a night with data', async () => {
      setupTempRuns();
      writeFileSync(
        join(tempDir, '2026-10-28.jsonl'),
        '{"at":"2026-10-28T23:00:00Z","job":"api/test","status":"ok","owner":null}\n',
      );

      const app = createApp(testConfig);
      const res = await app.request('/api/digest/2026-10-28');

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json).toHaveLength(1);
      expect(json[0].job).toBe('api/test');

      cleanup();
    });

    it('returns 404 for a night with no file', async () => {
      setupTempRuns();

      const app = createApp(testConfig);
      const res = await app.request('/api/digest/2026-10-99');

      expect(res.status).toBe(404);
      cleanup();
    });

    it('returns empty array for an empty night', async () => {
      setupTempRuns();
      writeFileSync(join(tempDir, '2026-10-29.jsonl'), '');

      const app = createApp(testConfig);
      const res = await app.request('/api/digest/2026-10-29');

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json).toHaveLength(0);

      cleanup();
    });

    it('handles a night with a bad line', async () => {
      setupTempRuns();
      writeFileSync(
        join(tempDir, '2026-10-30.jsonl'),
        '{"at":"2026-10-30T01:00:00Z","job":"api/good","status":"ok","owner":null}\n' +
        'bad json here\n' +
        '{"at":"2026-10-30T02:00:00Z","job":"api/another","status":"retry","owner":null}\n',
      );

      const app = createApp(testConfig);
      const res = await app.request('/api/digest/2026-10-30');

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveLength(2);
      expect(json[0].job).toBe('api/good');
      expect(json[1].job).toBe('api/another');

      cleanup();
    });
  });

  describe('page and JSON agreement (ADR 0001)', () => {
    it('returns the same jobs in the same order', async () => {
      setupTempRuns();
      writeFileSync(
        join(tempDir, '2026-10-31.jsonl'),
        '{"at":"2026-10-31T01:00:00Z","job":"alpha","status":"ok","owner":null}\n' +
        '{"at":"2026-10-31T02:00:00Z","job":"beta","status":"fail","owner":null,"error":"test"}\n' +
        '{"at":"2026-10-31T03:00:00Z","job":"gamma","status":"retry","owner":null}\n',
      );

      const app = createApp(testConfig);

      const htmlRes = await app.request('/digest/2026-10-31');
      const html = await htmlRes.text();

      const jsonRes = await app.request('/api/digest/2026-10-31');
      const json = await jsonRes.json();

      // Extract job names from HTML (they appear in td tags after the job th)
      const htmlJobs = Array.from(html.matchAll(/<td>([^<]+)<\/td>/g))
        .map(m => m[1])
        .filter(name => ['alpha', 'beta', 'gamma'].includes(name));

      // Extract job names from JSON
      const jsonJobs = json.map((row: any) => row.job);

      expect(htmlJobs).toEqual(jsonJobs);
      expect(htmlJobs).toEqual(['alpha', 'beta', 'gamma']);

      cleanup();
    });
  });
});