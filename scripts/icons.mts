import { readFileSync, writeFileSync } from 'node:fs';

import { Resvg } from '@resvg/resvg-js';

/** Square sizes of the PNG icons rendered from `public/icon.svg`. */
const SIZES = [192, 512];

const svg = readFileSync('public/icon.svg', 'utf8');

for (const size of SIZES) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
    .render()
    .asPng();
  writeFileSync(`public/logo${String(size)}.png`, png);
}
