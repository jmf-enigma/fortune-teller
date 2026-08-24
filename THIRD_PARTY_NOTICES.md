# Third-Party Notices

This file covers every production and test-only package resolved by `package-lock.json` for version 0.6.0, one explicitly identified MIT-licensed source adaptation, and one MIT-licensed test-only differential reference. Apart from the disclosed Mingyu Zi Wei adaptation and the independently checked `chinese-fortune` BaZi fixture candidates, no code, prompts, data tables, translations, or knowledge assets from the competitor repositories in `docs/COMPETITOR_AUDIT.md` are included.

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
| `ajv` | 8.20.0 | direct development dependency for release-schema tests | MIT | Copyright (c) 2015–2021 Evgeny Poberezkin | [Ajv](https://github.com/ajv-validator/ajv) |
| `ajv-formats` | 3.0.1 | direct development dependency for date/date-time schema formats | MIT | Copyright (c) 2020 Evgeny Poberezkin | [ajv-formats](https://github.com/ajv-validator/ajv-formats) |
| `fast-deep-equal` | 3.1.3 | transitive via Ajv | MIT | Copyright (c) 2017 Evgeny Poberezkin | [fast-deep-equal](https://github.com/epoberezkin/fast-deep-equal) |
| `fast-uri` | 3.1.6 | transitive via Ajv | BSD-3-Clause | Copyright (c) 2011–2021 Gary Court; 2021-present The Fastify team | [fast-uri](https://github.com/fastify/fast-uri) |
| `json-schema-traverse` | 1.0.0 | transitive via Ajv | MIT | Copyright (c) 2017 Evgeny Poberezkin | [json-schema-traverse](https://github.com/epoberezkin/json-schema-traverse) |
| `require-from-string` | 2.0.2 | transitive via Ajv | MIT | Copyright (c) Vsevolod Strukchinsky | [require-from-string](https://github.com/floatdrop/require-from-string) |
| Mingyu `packages/core` Zi Wei pattern detector | commit `bd6963b9b562cbef77c50227b625c0d3e7b36021` | vendored and adapted source | MIT | Copyright (c) 2025 mingyu | [fixed upstream file](https://github.com/Brhiza/mingyu/blob/bd6963b9b562cbef77c50227b625c0d3e7b36021/packages/core/src/ziwei/iztro/pattern-detection.ts) |
| `ShousenZHANG/chinese-fortune` BaZi tests | commit `4b960823e4e918d9dccc32090e5ad96833e4e427` | test-only differential reference; no runtime dependency or vendored source | MIT | Copyright (c) 2026 chinese-fortune contributors | [fixed upstream tests](https://github.com/ShousenZHANG/chinese-fortune/tree/4b960823e4e918d9dccc32090e5ad96833e4e427/tests) |

The installed npm packages retain their own complete license files. The applicable terms are reproduced or identified below. The adapted Mingyu module retains its fixed repository, commit, source path, copyright and MIT identification in both this notice and its file header; the complete generic MIT permission notice reproduced below applies to that inventory row. The `chinese-fortune` comparison contributed fixture ideas and candidate values only; this project's tests independently verify them against pinned `lunar-typescript` and explicitly preserve the true-solar-time and Zi-boundary convention differences. If this project later vendors other dependency source or bundles `node_modules`, the corresponding upstream license files must remain with the distribution.

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

## BSD-3-Clause — `fast-uri`

`fast-uri@3.1.6` is distributed under the BSD 3-Clause License. Source and binary redistributions must retain its copyright notice, license conditions, and disclaimer; neither the copyright holders' names nor contributor names may be used to endorse derived products without prior written permission. The complete authoritative text remains in `node_modules/fast-uri/LICENSE` after installation. No local modifications to `fast-uri` are included in this project.

## Linked source-registry records

Version 0.6.0 contains 16 machine-readable source **records**. These records store bibliographic or implementation metadata, a URL, a deliberately narrow supported scope, and limitations. Except for the separately disclosed fixed-commit MIT code adaptation, they do not vendor linked pages, copy their prose, or turn them into production dependencies.

| Registry ID | Linked work or implementation | Relationship to this project |
|---|---|---|
| `SRC-BZ-LUNAR-TS-1.8.6` | [`lunar-typescript` v1.8.6](https://github.com/6tail/lunar-typescript/tree/v1.8.6) | Pinned implementation provenance for calculated Four Pillars fields; the installed package is separately covered in the dependency inventory above |
| `SRC-BZ-SANMING-WIKISOURCE` | [《三命通會》Wikisource transcription](https://zh.wikisource.org/wiki/%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83) | Historical provenance for bounded traditional terminology; no passage is bundled |
| `SRC-BZ-ZIPING-ZHENQUAN-NLC` | [《子平真诠》National Library scan](https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf) | Chapter-level method provenance for bounded formation, damage, paired rescue, and whole-decade analysis; no passage is bundled |
| `SRC-BZ-DITIAN-SUI-WIKISOURCE` | [《滴天髓》Wikisource transcription](https://zh.wikisource.org/zh-hant/%E6%BB%B4%E5%A4%A9%E9%AB%93) | Historical method provenance for relational strength, body/use, month-command context, and natal/luck/year hierarchy; no passage is bundled |
| `SRC-BZ-QIONGTONG-WIKISOURCE` | [《穷通宝鉴》Wikisource transcription](https://zh.wikisource.org/zh-hans/%E7%A9%B7%E9%80%9A%E5%AE%9D%E9%89%B4) | Entry-level provenance for the independently transcribed 120-entry source-mention screening index; array position is not priority and no passage is bundled |
| `SRC-ZW-IZTRO-2.6.0` | [`iztro` v2.6.0](https://github.com/SylarLong/iztro/tree/v2.6.0) | Pinned implementation provenance for chart fields; the installed package is separately covered above |
| `SRC-ZW-MINGYU-PATTERNS-BD6963B` | [Mingyu fixed Zi Wei pattern detector](https://github.com/Brhiza/mingyu/blob/bd6963b9b562cbef77c50227b625c0d3e7b36021/packages/core/src/ziwei/iztro/pattern-detection.ts) | MIT-licensed source adaptation of 55 reproducible conditions and 32 refusal boundaries; traditional outcome prose and source quotations were removed, while rule mechanics and fixed source locators were retained |
| `SRC-ZW-ZIWEI-QUANSHU` | [`iztro` historical-text guide for 《紫微斗數全書》](https://docs.iztro.com/learn/ancientBook) | Historical-reference metadata and an explicit caution about exaggerated or inconsistent material; no guide or source-text content is bundled |
| `SRC-ZW-IZTRO-HOROSCOPE-GUIDE` | [`iztro` Zi Wei horoscope guide](https://docs.iztro.com/learn/horoscope) | Method-order metadata for bounded natal–decadal–yearly phase synthesis; the local reading map is an original paraphrase and no guide prose is bundled |
| `SRC-ZW-IZTRO-PALACE-GUIDE` | [`iztro` Zi Wei palace guide](https://docs.iztro.com/learn/palace) | Method provenance for keeping one selected palace together with its complete three-directions/four-alignments unit; no guide prose is bundled |
| `SRC-ZW-IZTRO-MUTAGEN-GUIDE` | [`iztro` Zi Wei transformations guide](https://docs.iztro.com/learn/mutagen) | Method provenance for keeping each transformation attached to its actual star and palace; no guide prose is bundled |
| `SRC-WA-ASTRONOMY-2.1.19` | [Astronomy Engine 2.1.19 JavaScript source](https://github.com/cosinekitty/astronomy/tree/v2.1.19/source/js) | Pinned astronomy implementation provenance; the installed package is separately covered above |
| `SRC-WA-TETRABIBLOS-PG70850` | [Ptolemy's *Tetrabiblos*, Project Gutenberg ebook 70850](https://www.gutenberg.org/ebooks/70850) | Historical provenance for limited zodiacal and aspect terminology; no ebook or passage is bundled |
| `SRC-TR-WAITE-WIKISOURCE` | [A. E. Waite, *The Pictorial Key to the Tarot*, Wikisource](https://en.wikisource.org/wiki/The_Pictorial_Key_to_the_Tarot) | Historical provenance for card identity and orientation vocabulary; project prompts are independently authored, not quotations |
| `SRC-YJ-ZHOUYI-WIKISOURCE` | [《周易》Wikisource transcription](https://zh.wikisource.org/wiki/%E5%91%A8%E6%98%93) | Historical provenance for hexagram identities and bottom-to-top six-line structure; no translation or passage is bundled |
| `SRC-MH-MEIHUA-WIKISOURCE` | [《梅花易數》Wikisource transcription](https://zh.wikisource.org/wiki/%E6%A2%85%E8%8A%B1%E6%98%93%E6%95%B8) | Historical method provenance for the bounded two-number, body/use, mutual-hexagram, and directional Five-Element route; no source-text content is bundled |

The registry's `verified` label means only that the project checked the identity, URL, and declared narrow scope of a record. It does not verify a traditional prediction, certify a school as authoritative, or establish empirical predictive validity. Users who open a linked work are responsible for that host's current terms and any reuse beyond linking or factual metadata.

## Data and authored reference material

- The Tarot names and compact keywords in this project are independently authored labels and short prompts; no modern guidebook text is bundled.
- The King Wen line-pattern mapping is an implementation table used for calculation. No copyrighted translation of the hexagram or line texts is bundled.
- The 38 machine-readable rules and method references contain conservative workflow constraints. `R-ZW-010` explicitly routes the disclosed MIT adaptation; the other records do not reproduce competitor knowledge bases.
- The compact Zi Wei life-area, major-star, transformation, and phase prompts are project-authored bounded summaries. They are not quotations or a copied modern knowledge base.
- The adapted Zi Wei named-pattern module retains 55 mechanical conditions and 32 refusal boundaries from the fixed Mingyu commit. Traditional outcome interpretations and source quotations are removed; ordinary results use neutral structural labels, and traditional names remain advanced provenance only.
- Linked historical sources document terminology or traditional provenance only. Pinned engine records document implementation provenance only. Neither establishes the predictive validity of any traditional system.
