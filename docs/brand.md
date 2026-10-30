# AECOM colour system

Source of truth: the AECOM brand palette supplied by the product owner (nine colour families,
each with 100 / 75 / 50 / 25 % tints). Tokens live in `src/app/globals.css`; every component
reads them. No other colour values may be introduced in the application. This applies to all
future updates.

## Palette

| Family         | 100 %   | 75 %    | 50 %    | 25 %    | Token prefix     |
| -------------- | ------- | ------- | ------- | ------- | ---------------- |
| Earth Green    | #008768 | #59a089 | #9bbeaf | #cfdfd7 | `earth-green`    |
| Lime Green     | #aecc53 | #c5d984 | #d9e6b1 | #ecf3da | `lime-green`     |
| Midnight Teal  | #00353e | #00606a | #5f909a | #adc6cb | `midnight-teal`  |
| Coral Orange   | #e52713 | #ec6642 | #f49f7d | #fbd1be | `coral-orange`   |
| Ocean Teal     | #009a9b | #00b2b4 | #88ccce | #cae7e8 | `ocean-teal`     |
| Sunrise Yellow | #ffce00 | #ffd954 | #ffe696 | #fff3ce | `sunrise-yellow` |
| Fuchsia Pink   | #c70c6f | #d45e90 | #e199b6 | #f0cfdd | `fuchsia-pink`   |
| Stone Gray     | #dad8cc | #e4e2d8 | #edece5 | #f6f5f1 | `stone-gray`     |
| Black          | #000000 | #646363 | #9d9d9c | #d0d0d0 | `black`          |

Black also has 15 % (#e3e3e3), 10 % (#ededed) and 5 % (#f6f6f6) tints: `black-15`, `black-10`,
`black-5`.

Tailwind classes follow the token names: `bg-earth-green`, `bg-earth-green-25`,
`text-midnight-teal`, `border-stone-gray`, `fill-lime-green`, and so on.

## How each colour is used

| Use                                         | Token / class                                 |
| ------------------------------------------- | --------------------------------------------- |
| Header bar, navigation, primary buttons     | `brand-primary` (Earth Green 100 %)           |
| Hover and active state on green surfaces    | `brand-primary-hover` (derived, see below)    |
| Positive status, "ok" badges and alerts     | Earth Green text on Earth Green 25 % fill     |
| Highlights, role label on green, series 2   | Lime Green                                    |
| Dark accent buttons, headings on panels     | Midnight Teal (hover Midnight Teal 75 %)      |
| Danger buttons, rejected, validation errors | Coral Orange (text uses the derived deep red) |
| Information badges and alerts               | Ocean Teal text on Ocean Teal 25 % fill       |
| Warnings, pending states, current week      | Sunrise Yellow (text uses derived deep amber) |
| Hyperlinks                                  | Fuchsia Pink (`text-brand-link`)              |
| Page background behind cards                | Stone Gray 25 %                               |
| Neutral badges                              | Stone Gray 50 % fill                          |
| Body text, borders, disabled fields         | Black and its tints (`gray-*` scale)          |
| Chart reference lines (available capacity)  | Black                                         |

Semantic aliases (`brand-green`, `brand-red`, `brand-teal`, `brand-yellow`, `brand-amber`,
`brand-magenta`, `brand-slate`, `brand-black`, `brand-white`) remain for existing components and
point at the palette families above.

## Derived shades

Three values are not in the palette: `brand-green-deep` #006b52, `brand-red-deep` #b51d0d and
`brand-amber-deep` #7a5300. They are darker steps of Earth Green, Coral Orange and Sunrise Yellow
used only where the palette colour would fail WCAG AA contrast: hover on green surfaces and
small coloured text on white. Do not use them for fills.

## Typeface and logo

Typeface: Arial (AECOM template body font), with Helvetica and system fallbacks.

`public/brand/aecom-logo.svg` is the AECOM wordmark. The header renders it inverted to white on
Earth Green. Do not recolour or stretch it; the `<Logo/>` component preserves its aspect ratio.

## Rules for future changes

- Pick colours from the table above, by token name, never by hex value in a component.
- Add a new semantic alias in `globals.css` when a new role is needed, pointing at a palette
  colour, so the role can be retuned in one place.
- Keep text contrast at WCAG AA: 100 % colours for fills and borders, derived deep shades or
  Midnight Teal for small text.
