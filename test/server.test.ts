import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../src/server.ts';

const base = 'http://localhost:3999';
await new Promise<void>((resolve) => server.listen(3999, resolve));
after(() => server.close());

test('GET /income-statement returns the statement', async () => {
  const res = await fetch(`${base}/income-statement?start=2026-01-01&end=2026-03-31`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).net_income, '-44480.14');
});

test('a bad date returns 400', async () => {
  const res = await fetch(`${base}/income-statement?start=2026-02-30&end=2026-03-31`);
  assert.equal(res.status, 400);
});
