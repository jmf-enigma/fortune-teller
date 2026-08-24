# Third-Party Notices

This file covers every production package resolved by `package-lock.json` for version 0.2.0. Versions are exact. No code, prompts, data tables, translations, or knowledge assets from the competitor repositories in `docs/COMPETITOR_AUDIT.md` are included.

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

## Linked source-registry records

Version 0.2.0 contains 10 machine-readable source **records**. These records store bibliographic or implementation metadata, a URL, a deliberately narrow supported scope, and limitations. They do not vendor the linked pages, copy their prose, or turn them into production dependencies.

| Registry ID | Linked work or implementation | Relationship to this project |
|---|---|---|
| `SRC-BZ-LUNAR-TS-1.8.6` | [`lunar-typescript` v1.8.6](https://github.com/6tail/lunar-typescript/tree/v1.8.6) | Pinned implementation provenance for calculated Four Pillars fields; the installed package is separately covered in the dependency inventory above |
| `SRC-BZ-SANMING-WIKISOURCE` | [《三命通會》Wikisource transcription](https://zh.wikisource.org/wiki/%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83) | Historical provenance for bounded traditional terminology; no passage is bundled |
| `SRC-ZW-IZTRO-2.6.0` | [`iztro` v2.6.0](https://github.com/SylarLong/iztro/tree/v2.6.0) | Pinned implementation provenance for chart fields; the installed package is separately covered above |
| `SRC-ZW-ZIWEI-QUANSHU` | [`iztro` historical-text guide for 《紫微斗數全書》](https://docs.iztro.com/learn/ancientBook) | Historical-reference metadata and an explicit caution about exaggerated or inconsistent material; no guide or source-text content is bundled |
| `SRC-ZW-IZTRO-HOROSCOPE-GUIDE` | [`iztro` Zi Wei horoscope guide](https://docs.iztro.com/learn/horoscope) | Method-order metadata for bounded natal–decadal–yearly phase synthesis; the local reading map is an original paraphrase and no guide prose is bundled |
| `SRC-WA-ASTRONOMY-2.1.19` | [Astronomy Engine 2.1.19 JavaScript source](https://github.com/cosinekitty/astronomy/tree/v2.1.19/source/js) | Pinned astronomy implementation provenance; the installed package is separately covered above |
| `SRC-WA-TETRABIBLOS-PG70850` | [Ptolemy's *Tetrabiblos*, Project Gutenberg ebook 70850](https://www.gutenberg.org/ebooks/70850) | Historical provenance for limited zodiacal and aspect terminology; no ebook or passage is bundled |
| `SRC-TR-WAITE-WIKISOURCE` | [A. E. Waite, *The Pictorial Key to the Tarot*, Wikisource](https://en.wikisource.org/wiki/The_Pictorial_Key_to_the_Tarot) | Historical provenance for card identity and orientation vocabulary; project prompts are independently authored, not quotations |
| `SRC-YJ-ZHOUYI-WIKISOURCE` | [《周易》Wikisource transcription](https://zh.wikisource.org/wiki/%E5%91%A8%E6%98%93) | Historical provenance for hexagram identities and bottom-to-top six-line structure; no translation or passage is bundled |
| `SRC-MH-MEIHUA-WIKISOURCE` | [《梅花易數》Wikisource transcription](https://zh.wikisource.org/wiki/%E6%A2%85%E8%8A%B1%E6%98%93%E6%95%B8) | Historical provenance for one narrow two-number convention; no source-text content is bundled |

The registry's `verified` label means only that the project checked the identity, URL, and declared narrow scope of a record. It does not verify a traditional prediction, certify a school as authoritative, or establish empirical predictive validity. Users who open a linked work are responsible for that host's current terms and any reuse beyond linking or factual metadata.

## Data and authored reference material

- The Tarot names and compact keywords in this project are independently authored labels and short prompts; no modern guidebook text is bundled.
- The King Wen line-pattern mapping is an implementation table used for calculation. No copyrighted translation of the hexagram or line texts is bundled.
- The 26 machine-readable rules and method references contain conservative, independently written workflow constraints; they do not reproduce linked source prose or competitor knowledge bases.
- The compact Zi Wei life-area, major-star, transformation, and phase prompts are project-authored bounded summaries. They are not quotations or a copied modern knowledge base.
- Linked historical sources document terminology or traditional provenance only. Pinned engine records document implementation provenance only. Neither establishes the predictive validity of any traditional system.
