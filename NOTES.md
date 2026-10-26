# Notes

**Q1 2026 net income: -$44,480.14** (revenue 37,850.50, COGS 14,272.75, opex 68,100.07, other income 42.18).



decisions made

- Only `posted` entries count. ignore draft / void
- `subtype` picks the section, so Interest Income goes under Other income, even though its `type` is revenue.
- Returns and discounts (contra revenue) are a negative line inside Revenue. Expense credits reduce the expense.
- Inactive accounts still show past activity. They are hidden only when the period has none.
- Reported as recorded: the 3 months of rent all land on 2026-01-01.
- The ledger fails at startup if an entry doesn't balance or a subtype is unknown.
- Money is exact decimal (`big.js`), and amounts are sent as strings.

I used Claude Code for scaffolding and,some tests, boilerplate, and to summarize the decisions from notes app into notes md file. 



future optimizations

- Drill down from a line to its journal entries.
- Compare periods side by side.
- Move the ledger to a SQL database, files arent scalable of course.
