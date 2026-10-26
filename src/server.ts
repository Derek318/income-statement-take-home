import { createServer, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { loadLedger } from './ledger.ts';
import { incomeStatement } from './incomeStatement.ts';

const ledger = loadLedger(new URL('../ledger.json', import.meta.url));
const page = readFileSync(new URL('../public/index.html', import.meta.url));

// use zod to verify that the params are right and not garbage.
// start and end are inclusive YYYY-MM-DD dates
const Query = z.object({
  start: z.iso.date('start must be a date in YYYY-MM-DD format'),
  end: z.iso.date('end must be a date in YYYY-MM-DD format'),
}).refine((q) => q.start <= q.end, 'start must be on or before end');

// make the local server
export const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/') {
    return res.writeHead(200, { 'content-type': 'text/html' }).end(page);
  }
  
  // error handling. 
  if (url.pathname !== '/income-statement') {
    return sendJson(res, 404, { error: 'Not found' });
  }

  // get all the dates from the url params, this is what allows us to fetch the income statement for a d ate range
  const query = Query.safeParse(Object.fromEntries(url.searchParams));
  if (!query.success) {
    return sendJson(res, 400, { error: query.error.issues[0].message });
  }
  sendJson(res, 200, incomeStatement(ledger, query.data.start, query.data.end));
});

// send res to client as json
function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`http://localhost:${port}`));
}
