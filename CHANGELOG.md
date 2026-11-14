# [0.7.0](https://github.com/MaksimZadar/road-trip/compare/v0.6.0...v0.7.0) (2026-11-14)


### Bug Fixes

* card needs y padding ([db72139](https://github.com/MaksimZadar/road-trip/commit/db721391c42b7791fe88c62afeda67206966ed1a))
* **db:** cascade delete checklist items with trip — FK blocked trip deletion ([e57f190](https://github.com/MaksimZadar/road-trip/commit/e57f19075bc4d86896d9868d001429913528bcd0))
* **docker:** pin pnpm to v10 and copy pnpm-workspace.yaml into both stages ([310e249](https://github.com/MaksimZadar/road-trip/commit/310e249883604ad2c8c283d6fc4734d07431b442))
* **layout:** full-width sticky header, safe-area padded bottom tab bar ([a52c48c](https://github.com/MaksimZadar/road-trip/commit/a52c48cd288fc4ca8ae01878f814e04483498915))
* **map:** dark tile filter crushed tile contrast — full-invert recipe ([afce8e5](https://github.com/MaksimZadar/road-trip/commit/afce8e56099058e9528876449eedb9f4607cf332))
* **map:** invalidateSize on tab activation — map initialized at 0x0 while hidden ([49cd3ab](https://github.com/MaksimZadar/road-trip/commit/49cd3abded11b202dcffd00adf48b121d865bcd4))
* **map:** per-tile filter — leaflet tiles inherit pane filter, was applied twice ([57d1cc3](https://github.com/MaksimZadar/road-trip/commit/57d1cc3413b312fde2c447a33f68a067ed56ca79))
* **map:** use keyless OSM tiles, CARTO enforces api keys ([949df9d](https://github.com/MaksimZadar/road-trip/commit/949df9db4bfff8970249dd8cdebba18493f5e7c0))
* **nav:** change padding x to 2 ([4711ca3](https://github.com/MaksimZadar/road-trip/commit/4711ca3a4c9c5c124eab3240a1d6c906606bfd77))
* **nav:** equal-width tab triggers via 4-column grid ([adebcb9](https://github.com/MaksimZadar/road-trip/commit/adebcb907541e074ff5ad1a837ea225c2430d6b2))
* **nav:** minimum bottom padding for desktop, viewport-fit=cover for iOS insets ([7d699fa](https://github.com/MaksimZadar/road-trip/commit/7d699fab62f4d0fe245d65a7fc8ce08c20a71996))
* **packing:** make rows better ([0803dc6](https://github.com/MaksimZadar/road-trip/commit/0803dc6dde3e432d175a7a95551fa55695332039))
* scope stop duration and checklist actions to trip ([3b7b010](https://github.com/MaksimZadar/road-trip/commit/3b7b01010d85f950e2fb281971378aa4a03a1764))
* show create-trip form errors ([0ddba6a](https://github.com/MaksimZadar/road-trip/commit/0ddba6aa57d32f7a0841986e4ee4875b76f405da))


### Features

* edit trip and stops ([9f70ac5](https://github.com/MaksimZadar/road-trip/commit/9f70ac5ddd96e7a6febbccffefe5a71403074d5f))
* **itinerary:** tabbed mobile layout with retro header, hero and timeline ([1ade43b](https://github.com/MaksimZadar/road-trip/commit/1ade43ba27f9986a5dca84c3084dedfbe7ecc621))
* **map:** full-bleed retro map with status pins, route split and next-stop sheet ([2a345f8](https://github.com/MaksimZadar/road-trip/commit/2a345f89e8a0d97fe461fd480d0ef99d9154ce61))
* **packing:** retro polish - kicker header, tracked labels, mobile rows, a11y ([57e23b7](https://github.com/MaksimZadar/road-trip/commit/57e23b7cec3330ddad67f085d78b7aec112b55b9))
* **theme:** retro night-poster dark mode with dark map tiles ([2b11403](https://github.com/MaksimZadar/road-trip/commit/2b11403558f982aa3ec8711ae19fcb5606db4f28))
* **theme:** retro travel-journal tokens, palette, and fonts ([ddbc87c](https://github.com/MaksimZadar/road-trip/commit/ddbc87c917a4629d1353d7fb1145afd9dd5b8936))
* **trip:** manual 'We're here' check-in with visited_at column and undo ([8b71da9](https://github.com/MaksimZadar/road-trip/commit/8b71da9a972ab2d5a5ea6a5e8a6dc6e7993f8247))
* **trip:** NextStopHero, TimelineStop, StopStamp, StatBlock components ([efcf1d1](https://github.com/MaksimZadar/road-trip/commit/efcf1d12820aeee6593aab627d4b72788c086d5f))
* **ui:** retro-styled shadcn primitives; add badge, tabs, sheet ([d2c9527](https://github.com/MaksimZadar/road-trip/commit/d2c9527f51815aca13291d3d7ea55685bc2ac0aa))

# [0.6.0](https://github.com/MaksimZadar/road-trip/compare/v0.5.0...v0.6.0) (2026-02-02)

### Features

- **stop-duration:** add ability for users to define stop arrival and departure ([cd8ec3f](https://github.com/MaksimZadar/road-trip/commit/cd8ec3f1b3ac877f5cf777caff294359895896fd))

# [0.5.0](https://github.com/MaksimZadar/road-trip/compare/v0.4.0...v0.5.0) (2026-02-02)

### Features

- **map:** use sveaflet ([f2fa3dd](https://github.com/MaksimZadar/road-trip/commit/f2fa3dd6c1e29a95e52f4839131073ec9f29a3a8))

# [0.4.0](https://github.com/MaksimZadar/road-trip/compare/v0.3.0...v0.4.0) (2026-02-01)

### Bug Fixes

- **map:** remove duplicate route timeline ([63bee60](https://github.com/MaksimZadar/road-trip/commit/63bee60c3135ae0837238964b896797518c3533a))

### Features

- **map:** add interactive route map with Leaflet ([0d97050](https://github.com/MaksimZadar/road-trip/commit/0d97050d55eac5762c811a416904bf723a5cb30f))

# [0.3.0](https://github.com/MaksimZadar/road-trip/compare/v0.2.0...v0.3.0) (2026-01-31)

### Features

- **trip:** add trip stats summary showing total distance, duration, and stops ([b27ebe7](https://github.com/MaksimZadar/road-trip/commit/b27ebe7eb6b2e95a2ee921e065d9c3b096a9006b))
- **weather:** add refresh weather button for trips within forecast window ([bacd216](https://github.com/MaksimZadar/road-trip/commit/bacd2169249468a4d2fdb42f98802dc26d339a9f))
- **weather:** add weather forecast integration with Open-Meteo API ([fab9e2b](https://github.com/MaksimZadar/road-trip/commit/fab9e2b501a6023d0a64f6849935503666645ce6))

# [0.2.0](https://github.com/MaksimZadar/road-trip/compare/v0.1.0...v0.2.0) (2026-01-30)

### Features

- Add categories to checklist items ([3d7478a](https://github.com/MaksimZadar/road-trip/commit/3d7478a102943db45a2624c277cef2b828d11ccf))

# [0.1.0](https://github.com/MaksimZadar/road-trip/compare/v0.0.1...v0.1.0) (2026-01-30)

### Features

- update readme file ([4b83260](https://github.com/MaksimZadar/road-trip/commit/4b832606cb3b660cb0e52c861119d3fce9a9a5d9))
