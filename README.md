# Income statement

this repo implements the p&l for Northwind Coffee Roasters over any date range, built from the json provided.

I opted for node and typescript with two small libraries: `big.js` for exact decimal money and `zod` for validating the ledger and query params. No framework, no build step (Node 22.18+ runs TypeScript directly). no point in over complicating things. should be enough to solve this

Built with Node 22.22.0 and npm 10.9.4 on macOS.

```sh
npm install
npm start          # backend + frontend on http://localhost:3000
npm test           # node:test, all tests
npm run typecheck  # tsc --noEmit
```

The same server serves the backend and the frontend. Open http://localhost:3000, pick dates, and press Show.

```sh
curl 'http://localhost:3000/income-statement?start=2026-01-01&end=2026-03-31'
```

## Layout

| File | What it does |
| --- | --- |
| `src/ledger.ts` | Types, loading, and validation of `ledger.json` (runs at startup). |
| `src/incomeStatement.ts` | The pure calculation: `(ledger, start, end) -> statement`. |
| `src/server.ts` | `node:http` server: `GET /income-statement` and the page. |
| `src/main.ts` | Starts the server (`npm start`). |
| `public/index.html` | The page. Plain HTML and JS. |
| `test/` | Q1, boundaries, invariant, validation, and HTTP tests. |

## Response shape

```jsonc
{
  "company": "Northwind Coffee Roasters", "currency": "USD", "start": "2026-01-01", "end": "2026-03-31",
  "revenue": { "lines": [{ "account": "4000", "name": "Product Revenue", "amount": "35650.75" }, ...], "total": "37850.50" },
  "cost_of_goods_sold": { "lines": [...], "total": "14272.75" },
  "gross_profit": "23577.75",
  "operating_expenses": { "lines": [...], "total": "68100.07" },
  "operating_income": "-44522.32",
  "other_income": { "lines": [...], "total": "42.18" },
  "net_income": "-44480.14"
}
```

all of the amounts are decimal strings in the direction that the accountant would read them: positive revenue is income and positive expense is cost. ANy errors return a `400` with the shape`{ "error": "..." }`
