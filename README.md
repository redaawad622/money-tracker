# Money Tracker

Track your spending day by day, month by month, with fixed subscriptions (monthly and every 3 months) tracked on their own.

Built with **Vue 3 + TypeScript + Vite + Pinia**, packaged as a mobile app with **Capacitor**. Data is stored on the device with `@capacitor/preferences` (localStorage in the browser).

## Screens

- **Overview**: month total against your budget, what's left, per-day allowance, daily bar chart, recent days
- **Day**: one day's expenses, category split, under/over the daily budget
- **Add / edit expense**: keypad, daily categories (breakfast, lunch, gas, car, wife, children, home needs…) and monthly bills (mobile, internet, electricity, water, rent…)
- **Calendar**: month heatmap with average, last 7 days, highest day and over-budget days
- **Fixed**: monthly and every-3-months subscriptions, mark as paid, next due dates, the next 3 months, and a switch to count them in the budget
- **Settings**: monthly budget and currency

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (dates, subscription schedule)
npm run build    # type-check + production build into dist/
```

## Run on a phone (Capacitor)

```bash
npm i @capacitor/ios @capacitor/android
npx cap add ios          # needs Xcode + CocoaPods
npx cap add android      # needs Android Studio
npm run cap:sync         # build web app and copy it into the native projects
npx cap open ios         # or: npx cap open android
```
