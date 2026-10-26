import { test } from 'node:test';
import assert from 'node:assert/strict';
import Big from 'big.js';
import { loadLedger, validateLedger } from '../src/ledger.ts';
import { incomeStatement } from '../src/incomeStatement.ts';

const ledger = loadLedger(new URL('../ledger.json', import.meta.url));

// a section's lines as { account number: amount }, for short assertions
const amounts = (section: { lines: { account: string; amount: string }[] }) =>
  Object.fromEntries(section.lines.map((l) => [l.account, l.amount]));

test('Q1 2026 matches the hand-computed statement', () => {
  const s = incomeStatement(ledger, '2026-01-01', '2026-03-31');
  // 4000: JE-002 + JE-010 + JE-016 (JE-001 is December, JE-009 is void, JE-024 is April).
  // 4900: JE-012 return + JE-016 discount, both debits, so negative revenue.
  assert.deepEqual(amounts(s.revenue), { '4000': '35650.75', '4100': '3000.00', '4900': '-800.25' });
  assert.equal(s.revenue.total, '37850.50');
  assert.deepEqual(amounts(s.cost_of_goods_sold), { '5000': '14272.75' });
  assert.equal(s.gross_profit, '23577.75');
  // 6000 excludes the JE-019 draft bonus. 6200 is net of the JE-020 vendor credit. 6300 is inactive but has activity.
  assert.deepEqual(amounts(s.operating_expenses), { '6000': '55500.00', '6100': '9000.00', '6200': '1099.97', '6300': '2500.10' });
  assert.equal(s.operating_income, '-44522.32');
  // Interest has type "revenue" but subtype "other_income": it must not land in Revenue.
  assert.deepEqual(amounts(s.other_income), { '7000': '42.18' });
  assert.equal(s.net_income, '-44480.14');
});

test('date range is inclusive on both ends', () => {
  assert.equal(incomeStatement(ledger, '2026-03-31', '2026-03-31').net_income, '-17457.82'); // 1000 subscription - 18500 payroll + 42.18 interest
  assert.equal(incomeStatement(ledger, '2026-04-01', '2026-04-01').net_income, '9100.00');
});

test('draft and void entries are ignored', () => {
  assert.equal(incomeStatement(ledger, '2026-03-15', '2026-03-18').net_income, '0.00'); // JE-019 draft, JE-025 void
});

// Every entry balances, so net income must equal the net debit to balance sheet accounts over the same period.
// This checks every date range against a calculation that does not use the statement code.
test('net income equals the balance sheet change for every date range', () => {
  const bs = new Set(ledger.accounts.filter((a) => a.subtype === 'balance_sheet').map((a) => a.number));
  const dates = [...new Set(ledger.journal_entries.map((e) => e.date))].sort();
  for (const start of dates) {
    for (const end of dates.filter((d) => d >= start)) {
      let bsNetDebit = new Big(0);
      for (const e of ledger.journal_entries) {
        if (e.status !== 'posted' || e.date < start || e.date > end) {
          continue;
        }
        for (const l of e.lines) {
          if (bs.has(l.account)) {
            bsNetDebit = bsNetDebit.plus(l.debit).minus(l.credit);
          }
        }
      }
      assert.equal(incomeStatement(ledger, start, end).net_income, bsNetDebit.toFixed(2), `${start}..${end}`);
    }
  }
});

test('an unbalanced entry is rejected', () => {
  const lines = [{ account: '1000', debit: '10.00', credit: '0.00' }, { account: '4000', debit: '0.00', credit: '9.99' }];
  const bad = { ...ledger, journal_entries: [{ id: 'X', date: '2026-01-01', status: 'posted', memo: '', lines }] };
  assert.throws(() => validateLedger(bad), /debits dont equal credits/);
});
