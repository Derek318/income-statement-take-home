import Big from 'big.js';
import type { Ledger, Subtype } from './ledger.ts';

// Income statement for posted entries dated start..end (both inclusive).
// All math is exact decimal (Big). Every amount is returned as a string like "-800.25".
export function incomeStatement(ledger: Ledger, start: string, end: string) {
  // Step 1: for each account, add up credit minus debit over posted entries in the date range.
  // this is the core of the app, it's what actually calculates the income statement.
  // it's a map of account numbers to the net credit (credit minus debit) of the account.
  const netCredit = new Map<string, Big>();
  for (const entry of ledger.journal_entries) {
    // skip if the entry is not posted or is not in the date range
    if (entry.status !== 'posted' || entry.date < start || entry.date > end) {
      continue;
    }
    // add up the net credit for each account
    for (const line of entry.lines) {
      // get the net credit for the account, or 0 if it's not in the map
      const soFar = netCredit.get(line.account) ?? new Big(0);
      // set the net credit for the account to the sum of the current net credit and the credit minus debit
      netCredit.set(line.account, soFar.plus(line.credit).minus(line.debit));
    }
  } // now we have a map of account numbers to the net credit of the account

  // Step 2: one section of the statement, a line per account plus a total.
  // Income sections (sign 1) show credit minus debit. Cost sections (sign -1) show debit minus credit.
  // this is a function that takes in an array of subtypes and a sign, and returns an object with the lines and total
  function section(subtypes: Subtype[], sign: 1 | -1) {
    const lines: { account: string; name: string; amount: string }[] = [];
    let total = new Big(0);
    for (const account of ledger.accounts) {
      // skip if the account is not in the subtypes
      if (!subtypes.includes(account.subtype)) {
        continue;
      }
      // inactive accounts only show up if they had activity in the period
      if (!account.is_active && !netCredit.has(account.number)) {
        continue;
      }
      const amount = (netCredit.get(account.number) ?? new Big(0)).times(sign);
      total = total.plus(amount);
      lines.push({ account: account.number, name: account.name, amount: amount.toFixed(2) });
    }
    return { lines, total: total.toFixed(2) };
  }

  // Step 3: the sections and subtotals.
  // toFixed(2) never rounds here: every input has 2 decimals and we only add and subtract.
  const revenue = section(['operating_revenue', 'contra_revenue'], 1);
  const cost_of_goods_sold = section(['cogs'], -1);
  const operating_expenses = section(['operating_expense'], -1);
  const other_income = section(['other_income'], 1);
  const gross_profit = new Big(revenue.total).minus(cost_of_goods_sold.total);
  const operating_income = gross_profit.minus(operating_expenses.total);
  const net_income = operating_income.plus(other_income.total);

  return {
    company: ledger.company,
    currency: ledger.currency,
    start,
    end,
    revenue,
    cost_of_goods_sold,
    gross_profit: gross_profit.toFixed(2),
    operating_expenses,
    operating_income: operating_income.toFixed(2),
    other_income,
    net_income: net_income.toFixed(2),
  };
}
