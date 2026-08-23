# Third-Party Notices

This file covers every production package resolved by `package-lock.json` for version 0.1.0. Versions are exact. No code, prompts, data tables, translations, or knowledge assets from the competitor repositories in `docs/COMPETITOR_AUDIT.md` are included.

## Dependency inventory

| Package | Version | Relationship | License | Copyright / attribution | Upstream |
|---|---:|---|---|---|---|
| `@js-temporal/polyfill` | 0.5.1 | direct | ISC | Copyright 2017–2020 ECMA International | [temporal-polyfill](https://github.com/js-temporal/temporal-polyfill) |
| `jsbi` | 4.3.2 | transitive via Temporal | Apache-2.0 | GoogleChromeLabs contributors | [JSBI](https://github.com/GoogleChromeLabs/jsbi) |
| `lunar-typescript` | 1.8.6 | direct and deduplicated transitive | MIT | Copyright (c) 2020 6tail | [lunar-typescript](https://github.com/6tail/lunar-typescript) |
| `iztro` | 2.6.0 | direct | MIT | Copyright (c) 2023 All Contributors | [iztro](https://github.com/SylarLong/iztro) |
| `astronomy-engine` | 2.1.19 | direct | MIT | Copyright (c) 2019–2023 Don Cross | [Astronomy Engine](https://github.com/cosinekitty/astronomy) |
| `dayjs` | 1.11.23 | transitive via iztro | MIT | Copyright (c) 2018-present, iamkun | [Day.js](https://github.com/iamkun/dayjs) |
| `i18next` | 23.16.8 | transitive via iztro | MIT | Copyright (c) 2024 i18next | [i18next](https://github.com/i18next/i18next) |
| `@babel/runtime` | 7.29.7 | transitive via i18next | MIT | Copyright (c) 2014-present Sebastian McKenzie and other contributors | [Babel](https://github.com/babel/babel) |
| `lunar-lite` | 0.2.8 | transitive via iztro | MIT | Copyright (c) 2023 Sylar | [lunar-lite](https://github.com/SylarLong/lunar-lite) |

The installed npm packages retain their own complete license files. The applicable terms are reproduced or identified below. If this project later vendors dependency source or bundles `node_modules`, the corresponding upstream license files must remain with the distribution.

## ISC license — `@js-temporal/polyfill`

Copyright 2017, 2018, 2019, 2020 ECMA International

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

## MIT license — listed MIT packages

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The applicable copyright notice shown in the inventory and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Apache License 2.0 — `jsbi`

`jsbi@4.3.2` is distributed under the Apache License, Version 2.0. The authoritative license identifier is `Apache-2.0`; the complete text is available in the installed package at `node_modules/jsbi/LICENSE` and from the [Apache Software Foundation](https://www.apache.org/licenses/LICENSE-2.0).

When redistributing JSBI source or object form, preserve the package's license and any notices required by Sections 4 and 6 of Apache-2.0. No local modifications to JSBI are included in this project.

## Data and authored reference material

- The Tarot names and compact keywords in this project are independently authored labels and short prompts; no modern guidebook text is bundled.
- The King Wen line-pattern mapping is an implementation table used for calculation. No copyrighted translation of the hexagram or line texts is bundled.
- Method references contain conservative, independently written workflow rules and do not reproduce competitor knowledge bases.
- Upstream engine maturity documents implementation provenance only; it does not establish the predictive validity of any traditional system.
