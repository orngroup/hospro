# Brandon Hall – departmental cost dashboard

Static site for `brandon.hospro.co.uk/costs`. Copy this `costs` folder into the root of the GitHub Pages repository.

- `index.html` – the dashboard
- `profit.js` – Profitability, Labour, KPIs, Purchased vs consumed and Alia's brief tabs. Reads the P&L dashboard's management accounts from `../pl/data/`, so it updates whenever the P&L dashboard is updated. These tabs use the same sign-in as the P&L dashboard.
- `trading.js`, `trading-engine.js` – Trading tab: reads Rezlynx (Guestline) Actual & Forecast CSV and Period End Excel exports
- `data/trading-data.js` – the Rezlynx data; load new files on the Trading tab, download this file and replace it to update
- `costs-engine.js` – parsing and categorisation rules (edit here to change how a line is categorised)
- `data/costs-data.js` – the Xero lines; replace this file to update the dashboard
- `vendor/` – Chart.js and SheetJS, so the page needs no outside connection

## Updating
1. In Xero, run Account Transactions for Bar Costs (Drinks), Restaurant Costs and Room Costs (Linen and Materials), full period, export to Excel.
2. Open the dashboard, go to **Update data**, load the three files.
3. Click **Download costs-data.js** and commit it over `costs/data/costs-data.js`.

The market prices and written findings on the Savings tab are a review dated 14 November 2026; they do not change on upload.

## Channels & rates tab (16 Nov 2026)
Reads Rezlynx Company, Forecast Revenue By Market Segment, Daily Rate Analysis, Cancellations, No Shows, Rate Override, Block Forecast and Room Usage exports. Each is reduced to totals on load (`TradingEngine.readReport`); guest and staff names are never written to `data/trading-data.js`. Load files on the Trading tab, download `trading-data.js`, replace `costs/data/trading-data.js`.

## HosProfit home, Accounts (Xero) and trend charts (16 Nov 2026)
- `home.js` — welcome screen (trading today, actions, section cards with icons) and the Accounts (Xero) page.
- `data/accounts-data.js` — built from the Xero Management Report with `build-accounts.py` (kept outside the repo); loans are grouped, not itemised.
- Trading tab: daily rate, occupancy and RevPAR lines for the chosen month and by-month charts for the whole feed.
