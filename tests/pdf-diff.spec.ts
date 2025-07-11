import { test, expect, Page } from '@playwright/test';
import fs   from 'fs';
import path from 'path';
import { PNG }    from 'pngjs';
import pixelmatch from 'pixelmatch';

/* ------------------------------------------------------------------ */
/*  project-specific paths                                             */
/* ------------------------------------------------------------------ */
const dataDir = path.resolve(__dirname, '../data');
const outDir  = path.resolve(__dirname, '../test-artifacts');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const EXPECTED_PDF = path.join(dataDir, 'expected.pdf');
const ACTUAL_PDF   = path.join(dataDir, 'actual.pdf');
const PAGES_TO_CHECK = 2;

/* ------------------------------------------------------------------ */
/*  helper: render 1 page with pdf.js in the browser and screenshot it */
/* ------------------------------------------------------------------ */
async function renderWithPdfjs(
  page: Page,
  pdfBytes: Buffer,
  pageNum: number,
  scale = 1.5                     // tweak for DPI / speed
): Promise<Buffer> {
  // build a minimal HTML shell with a canvas
  await page.setContent(`
    <html>
      <head>
        <script src="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js"></script>
        <style>html,body{margin:0;padding:0}</style>
      </head>
      <body><canvas id="c"></canvas></body>
    </html>
  `);

  // send the PDF & page number into the browser context and draw
  await page.evaluate(
    async ({ base64, num, scale }) => {
      // @ts-ignore
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      // @ts-ignore
      const pdf   = await pdfjsLib.getDocument({ data: bytes }).promise;
      const page  = await pdf.getPage(num);

      const vp    = page.getViewport({ scale });
      const cvs   = document.getElementById('c') as HTMLCanvasElement;
      cvs.width   = vp.width;
      cvs.height  = vp.height;

      await page.render({
        canvasContext: cvs.getContext('2d') as CanvasRenderingContext2D,
        viewport: vp
      }).promise;
    },
    {
      base64: pdfBytes.toString('base64'),
      num: pageNum,
      scale
    }
  );

  return page.locator('#c').screenshot();
}

/* ------------------------------------------------------------------ */
/*  helper: pixel-diff two PNG buffers                                 */
/* ------------------------------------------------------------------ */
function diffPNGs(a: Buffer, b: Buffer) {
  const A = PNG.sync.read(a);
  const B = PNG.sync.read(b);
  const { width, height } = A;
  const diff = new PNG({ width, height });

  const pixels = pixelmatch(
    A.data, B.data, diff.data, width, height, { threshold: 0.1 }
  );

  return { pixels, png: PNG.sync.write(diff) };
}

/* ------------------------------------------------------------------ */
/*  TESTS                                                              */
/* ------------------------------------------------------------------ */
test.describe('PDF comparison (pdf.js renderer)', () => {

  test('visual diff', async ({ page }) => {
    const expBuf = fs.readFileSync(EXPECTED_PDF);
    const actBuf = fs.readFileSync(ACTUAL_PDF);

    for (let p = 1; p <= PAGES_TO_CHECK; p++) {
      const pngExp = await renderWithPdfjs(page, expBuf, p);
      const pngAct = await renderWithPdfjs(page, actBuf, p);

      const { pixels, png: pngDiff } = diffPNGs(pngExp, pngAct);

      // save to test-artifacts/ for CI
      const expPath  = path.join(outDir, `expected-p${p}.png`);
      const actPath  = path.join(outDir, `actual-p${p}.png`);
      const diffPath = path.join(outDir, `diff-p${p}.png`);
      fs.writeFileSync(expPath,  pngExp);
      fs.writeFileSync(actPath,  pngAct);
      fs.writeFileSync(diffPath, pngDiff);

      // and attach to the Playwright HTML report on failure
      if (pixels) {
        const info = test.info();
        await info.attach(`expected-p${p}`, { body: pngExp,  contentType: 'image/png' });
        await info.attach(`actual-p${p}`,   { body: pngAct,  contentType: 'image/png' });
        await info.attach(`diff-p${p}`,     { body: pngDiff, contentType: 'image/png' });
      }

      expect(pixels, `Pixels differ on page ${p}`).toBe(0);
    }
  });

});
