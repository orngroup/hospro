# HosF&B – upload notes (v4, 15 November 2026)

Food and beverage management for Brandon Hall Hotel and Spa. Opens at **brandon.hospro.co.uk/hosfb/**.

## Files (all inside the new folder `hosfb/` in the `orngroup/hospro` repo – nothing existing is changed)

| File | What it is |
|---|---|
| `index.html` | HosF&B: Overview, Menus and P&L, Dishes, Ingredients, Invoices and prices, Bookings, Events, Bar, Daily P&L, All tools |
| `hosfb-calc.js` | All the costing, P&L and booking sums |
| `hosfb-seed.js` | Starting data: the five Clarendon food menus (59 dishes) from the website, 14 November 2026 |
| `hosfb-stock.js` | Bar product list and starting stock: the stock take workbook of 7 November 2026 (114 products) |
| `hosfb-bookings.js` | Table bookings, phone bookings, chef's pre-order sheet, booking settings |
| `hosfb-events.js` | Event costing |
| `hosfb-bar.js` | Bar stock, stock take, supplier orders, stock-list import |
| `hosfb-pl.js` | Daily P&L, till sales upload, labour from the rota |
| `hosfb-invoices.js` | Invoice entry and the photo reader screen |
| `hosfb-xero.js` | Xero screen |
| `hosfb-auth.js` | The quiet staff sign-in that lets staff screens read guest bookings |
| `order.html` | Order pad for tablets and phones; add `?view=kitchen` for the kitchen screen |
| `book.html` | Guest booking page with optional pre-order (Brandon Hall branded) |
| `hosfb-brand.css`, `fonts/` | Brandon Hall brand colours and fonts |

The cloud functions (`hosfb-functions/`) and the full database rules (`firestore.rules`) are separate items in the zip, not part of this folder.

HosF&B also reads existing files in the repo and does not change them: `costs/vendor/xlsx.full.min.js` (spreadsheet reader), `bh-logo.svg` and `firebase-config.js`.

## Database rules and the service login

1. Firebase Console → Authentication → Users → Add user: `hosfb.service@brandonhall.portal` with the password in the logins sheet.
2. Publish the full rules in the Word document (the same text as `firestore.rules` in the zip). Compare with the live rules first.

Until both are done the tool still opens, but it saves on that device only and the Bookings tab shows a set-up message.

## Who uses what

- **HosF&B** (`/hosfb/`): name and HosPRO app PIN. David, Jomy, Ajay, Raj, Alia.
- **Order pad** (`/hosfb/order.html`): waiting staff pick their name from the rota (restaurant, bar, kitchen). No PIN, and it shows menu prices only – no costs.
- **Kitchen screen** (`/hosfb/order.html?view=kitchen`): leave open on a tablet in the kitchen and press Turn sound on once.
- **Guest booking page** (`/hosfb/book.html`): public. Link to it from the website dining page.

## How it fits together

1. Chef costs dishes (estimate or recipe) → menu and event P&L.
2. Invoices are entered or photographed → actual ingredient prices → actual P&L, with anything over estimate flagged.
3. Guests book online (or the team adds phone bookings) and can pre-order. The chef's sheet totals the pre-orders; seating a booking on the order pad carries its allergies, occasion, requests and pre-order onto the order.
4. Orders are taken on the order pad and closed, or a till export is uploaded for the day → sales by dish.
5. Daily P&L = sales net of VAT − food cost − rota hours × average hourly rate (set in Daily P&L → Labour settings).
6. Bar stock starts from the stock take of 7 November 2026 and is counted the same way: gallons for draught, bottles or units for everything else. HosF&B is now the master; the older bar app (`beverage.html`) keeps its own separate list in cases.

## Things to know

- The order pad takes no payments. Closing a table records how it was paid on the till or card machine.
- A till upload for a day replaces order-pad sales for that day, so sales are never counted twice.
- Labour uses one average rate per department, not individual pay.
- The order pad sends to the kitchen screen. A ticket can be printed from the screen through the tablet's own print menu; printing by itself needs a cloud printer.
- The booking page sends guests no email. They see a reference on screen; a copy can be emailed to the hotel if an address is set in Booking settings.
- Booking times and capacity start as placeholders (dinner 18:00–20:30 daily, Sunday lunch 12:00–15:00, 20 guests a slot). Set the real ones before sharing the link.
- Bar stock value in HosF&B is £9,313.64 at 7 November, against £6,505.31 in the workbook. The workbook's Stock Count sheet values spirits at the cost of one measure instead of one bottle; HosF&B uses the bottle cost from the Product List sheet.
- Photo reading of invoices and the Xero link need the cloud functions deployed with your API keys.
