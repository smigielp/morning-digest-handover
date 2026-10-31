import type { DigestRow } from '../digest/types.js';

export function DigestPage({ night, rows }: { night: string; rows: DigestRow[] }) {
  if (rows.length === 0) {
    return (
      <>
        <h1>digest · {night}</h1>
        <p class="mute">nothing ran</p>
      </>
    );
  }

  return (
    <>
      <h1>digest · {night}</h1>
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>status</th>
            <th>error</th>
            <th>first</th>
            <th>last</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr>
              <td>{row.job}</td>
              <td>{row.owner ?? '—'}</td>
              <td>{row.runs}</td>
              <td class={row.retries >= 3 ? 'warn' : ''}>{row.retries}</td>
              <td class={row.lastStatus === 'fail' ? 'warn' : ''}>{row.lastStatus}</td>
              <td class="mute">{row.lastError ?? ''}</td>
              <td class="mute">{row.firstTime}</td>
              <td class="mute">{row.lastTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
