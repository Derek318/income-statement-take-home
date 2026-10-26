import { readFileSync } from 'node:fs';
import Big from 'big.js';
import { z } from 'zod';

// zod is fantastic for this kind of thing, it's a lot better than writing your own validation functions.

// ledger shape. z.iso.date() is strict YYYY-MM-DD and a real calendar day, so dates compare correctly as strings.
const LedgerSchema = z.object({
  company: z.string(),
  currency: z.string(),
  accounts: z.array(z.object({
    number: z.string(),
    name: z.string(),
    type: z.string(),
    // the possible subtypes of accounts, i.e. where an account goes on the statement
    subtype: z.enum(['operating_revenue', 'contra_revenue', 'cogs', 'operating_expense', 'other_income', 'balance_sheet']),
    is_active: z.boolean(),
  })),
  journal_entries: z.array(z.object({
    id: z.string(),
    date: z.iso.date(),
    status: z.enum(['posted', 'draft', 'void']),
    memo: z.string(),
    lines: z.array(z.object({ account: z.string(), debit: z.string(), credit: z.string() })),
  })),
});

export type Ledger = z.infer<typeof LedgerSchema>;
export type Subtype = Ledger['accounts'][number]['subtype'];

// load the ledger from the json file
// TODO: if you wanted to make this a robust product,
// you would want to read this from a SQL database.
// avoid NoSQL databases like MongoDB, they are not a good fit for
// this kind of data, which are literally just numbers and strings.
// also would use prisma for this as well
export function loadLedger(path: string | URL): Ledger {
  return validateLedger(JSON.parse(readFileSync(path, 'utf8')));
}

// zod checks the shape, then every entry must balance: debits minus credits is zero.
export function validateLedger(raw: unknown): Ledger {
  const ledger = LedgerSchema.parse(raw);
  for (const entry of ledger.journal_entries) {
    const balance = entry.lines.reduce((sum, line) => sum.plus(line.debit).minus(line.credit), new Big(0));
    if (!balance.eq(0)) {
      throw new Error(`${entry.id}: debits dont equal credits`);
    }
  }
  return ledger;
}
