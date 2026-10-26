import { createServer, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { loadLedger } from './ledger.ts';
import { incomeStatement } from './incomeStatement.ts';

const ledger = loadLedger(new URL('../ledger.json', import.meta.url));
const page = readFileSync(new URL('../public/index.html', import.meta.url));

// start and end are inclusive YYYY-MM-DD dates
const Query = z.object({ start: z.iso.date(), end: z.iso.date() });

// the whole server: the page at "/", the statement at "/income-statement", 404 for anything else.
// started by main.ts, and by the tests
export const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/') {
    return res.writeHead(200, { 'content-type': 'text/html' }).end(page);
  }
  if (url.pathname !== '/income-statement') {
    return sendJson(res, 404, { error: 'Not found' });
  }

  // read start and end from the url, e.g. /income-statement?start=2026-01-01&end=2026-03-31
  const query = Query.safeParse(Object.fromEntries(url.searchParams));
  if (!query.success) {
    return sendJson(res, 400, { error: 'start and end must be YYYY-MM-DD dates' });
  }
  sendJson(res, 200, incomeStatement(ledger, query.data.start, query.data.end));
});

// send res to client as json
function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
}
