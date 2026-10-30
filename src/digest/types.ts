export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: 'ok' | 'retry' | 'fail';
  lastError: string | null;
  firstTime: string;
  lastTime: string;
};

export type RunLogLine = {
  at: string;
  job: string;
  status: 'ok' | 'retry' | 'fail';
  owner: string | null;
  error?: string;
};