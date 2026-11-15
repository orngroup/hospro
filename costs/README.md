# Brandon Hall – departmental cost dashboard

Static site for `brandon.hospro.co.uk/costs`. Copy this `costs` folder into the root of the GitHub Pages repository.

- `index.html` – the dashboard
- `profit.js` – Profitability, Labour, KPIs, Purchased vs consumed and Alia's brief tabs. Reads the P&L dashboard's management accounts from `../pl/data/`, so it updates whenever the P&L dashboard is updated. These tabs use the same sign-in as the P&L dashboard.
- `costs-engine.js` – parsing and categorisation rules (edit here to change how a line is categorised)
- `data/costs-data.js` – the Xero lines; replace this file to update the dashboard
- `vendor/` – Chart.js and SheetJS, so the page needs no outside connection

## Updating
1. In Xero, run Account Transactions for Bar Costs (Drinks), Restaurant Costs and Room Costs (Linen and Materials), full period, export to Excel.
2. Open the dashboard, go to **Update data**, load the three files.
3. Click **Download costs-data.js** and commit it over `costs/data/costs-data.js`.

The market prices and written findings on the Savings tab are a review dated 14 November 2026; they do not change on upload.
