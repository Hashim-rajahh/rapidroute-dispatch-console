# RapidRoute Dispatch Console

Live dispatch console for RapidRoute Logistics, a regional delivery provider with a fleet of 400 trucks. This is **Task 1**: a virtualized vehicle list that stays smooth no matter how long the list is.

![Vehicle list showing 12 rows with a status column](docs/screenshot.png)

## What it does
- A Node script generates 400 vehicle records (id, plate, driver, status, last known location).
- The list only puts the rows you can see (plus a few spare rows above and below) into the page. Scrolling reuses the same row elements, so the page always holds about 17 to 21 rows instead of 400.
- Rows are laid out with CSS Grid and have alternating colors. The header stays in place while you scroll.
- Status is shown with a colored dot and the status in words, so it never relies on color alone.

## Run it
```bash
npm install
npm run generate     # writes src/data/vehicles.json (400 vehicles, same output every run)
npm run dev          # opens the console at http://localhost:5173
```
Other scripts: `npm run check:data` (validates the JSON), `npm run lint`, `npm run build`.

## Project layout
| Path | Purpose |
|---|---|
| `scripts/generateData.js` | Creates `src/data/vehicles.json` with 400 entries |
| `scripts/checkData.js` | Checks the JSON: 400 rows, unique ids and plates, valid statuses |
| `src/virtualList.js` | The virtualization code (fixed row height, row reuse) |
| `src/main.js` | Builds the rows and connects the data to the list |
| `src/style.css` | Layout and styling (CSS Grid for rows) |
| `.github/workflows/ci.yml` | Runs lint, data check and build on every push |

## How the virtualization works
1. A tall empty "spacer" gives the scrollbar the height of all 400 rows (400 x 44 px).
2. On scroll, the code works out which rows are in view: `first = floor(scrollTop / rowHeight)`.
3. It shows those rows plus 4 spare rows above and below, and moves the row container to the right place with `transform: translateY(...)`.
4. Row elements are reused: only their text changes. Work is done once per animation frame.

## How to check that only visible rows are rendered
1. Open the console in Chrome DevTools (F12). Each time the visible window changes, it logs something like
   `[virtual-list] vehicles 1 to 17 rendered (17 of 400 rows in the DOM)`.
2. The text above the list also shows `Rows in the page: 17 of 400`.
3. In the Elements tab, the `.rows` element holds about 17 to 21 children, never 400.

## Performance note
**How I measured:** I built the production version (`npm run build`, then `npm run preview`) and opened it in Chrome on Windows. In Chrome DevTools I recorded about 9.6 seconds of scrolling in the Performance tab, and I also watched the live "Frame Rendering Stats" meter while scrolling the list quickly.

**Results**
- Frame rate while scrolling: about 135 fps (about 7 ms per frame) on my high-refresh screen. This is well above the 55 fps target.
- Rows in the page while scrolling: 20 to 22 of 400 (from the console logs).
- My app's own JavaScript used about 47 ms of main-thread time over the whole recording.
- Scripting 423 ms, Rendering 1,304 ms and Painting 424 ms out of 9,590 ms. The main thread was idle about 75% of the time.
- Layout shift (CLS): 0.

**Conclusion:** Scrolling stays smooth because only about 20 rows exist in the page at any time, and the rows are reused instead of recreated.

## Accessibility
- The list is a keyboard-focusable region: use Tab to reach it, then arrow keys, Page Up and Page Down to scroll.
- Table roles and `aria-rowindex` / `aria-rowcount` tell screen readers there are 400 rows even though only some are on the page.
- Skip link, visible focus outlines and text colors with enough contrast.
