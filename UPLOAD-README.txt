BRANDON HALL — BEVERAGE MANAGEMENT
Upload all files to brandonme (overwrite). Paste firestore.rules into Firebase.

FILES:
  beverage.html   NEW — the iPad stock-room screen (PIN 0356)
  bev-data.js     NEW — 117 products from the 21 Sept stock take
  app.js          adds the Beverage Management dashboard tab (EventsPRO)
  data.js         registers the tab
  index.html      loads bev-data.js + styles
  firestore.rules adds the 'beverage' collection (paste in Firebase)

HOW IT WORKS:
  - iPad screen: brandon.hospro.co.uk/beverage.html
    PIN 0356 -> summary -> Remove/Sign out (types name) or Add delivery.
    Holds cases; can remove single bottles. Every move logged with name + time.
  - Portal: EventsPRO > Beverage Management
    Live stock value, low/out counts, used-this-week, stock by category,
    movement log, Weekly Usage Report (print) and Export stock (CSV).
  - Both share the Firebase 'beverage' collection, so iPad + portal sync.

TIP: On the iPad, open beverage.html and "Add to Home Screen" for a
full-screen app-like tile.
