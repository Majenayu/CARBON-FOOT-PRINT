# EcoTrack

A browser-based carbon-footprint calculator. It collects transport, energy, and
diet choices, estimates an annual total, stores the last ten calculations in
`localStorage`, and renders rule-based reduction suggestions.

## Calculation model

`calculator.js` is the source of truth. Transport and energy inputs are treated
as weekly quantities and multiplied by 52; diet factors are daily quantities
multiplied by 365. The bundled factors are illustrative kg CO2e averages:

| Category | Options |
|---|---|
| Transport | car, bus, train, flight, ev |
| Energy | electricity, gas, solar |
| Diet | meat, vegetarian, vegan, pescatarian |

The result is rounded to two decimal places. This is an educational estimate,
not a regulated emissions inventory.

## Browser workflow

1. `main.js` reads the form on submit and validates numeric values with
   `parseFloat`.
2. `calculateFootprint()` computes the annual estimate.
3. The result and a timestamp are prepended to history, capped at ten entries.
4. History is saved under `ecoTrackHistory` in `localStorage`.
5. `getPersonalizedInsights()` returns structured cards for transport, energy,
   and diet choices.
6. The optional distance button calls `getDistanceWithGoogleMaps('Home',
   'Office')`; users can enter a distance manually if that service fails.

## Run and test

```bash
npm install
npm run dev       # Vite development server
npm test          # Vitest in jsdom
npm run build     # production bundle
npm run preview   # serve the production bundle
```

The tests in `calculator.test.js` cover standard, zero, missing-data, and
insight cases. There is no backend or database.

## Repository map

```text
index.html          # application shell and form
main.js             # DOM events, history, rendering, localStorage
calculator.js       # emission factors and pure calculation functions
googleServices.js   # optional distance lookup integration
style.css           # presentation
calculator.test.js  # Vitest unit tests
vite.config.js      # Vite + jsdom test configuration
```

## Security and privacy

Inputs and history remain in the browser's local storage; the app has no user
accounts. The UI escapes dynamic insight text before inserting it into HTML.
Do not treat `localStorage` as confidential storage. If the Google service is
enabled, review its implementation and restrict any API key to the intended
origins before deployment.

## Limitations

Emission factors are fixed constants, distance estimation is optional, and the
application does not verify results against utility, travel, or dietary data.
No license is declared in `package.json`.
