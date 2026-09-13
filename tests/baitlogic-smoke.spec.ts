import { test, expect } from '@playwright/test';

const criticalPages = [
  '/',
  '/barometer.html',
  '/nature-check.html',
];

for (const path of criticalPages) {
  test(`${path} loads successfully`, async ({ page }) => {
    const response = await page.goto(path, {
      waitUntil: 'domcontentloaded',
    });

    expect(response, `${path} returned no HTTP response`).not.toBeNull();
    expect(response!.status(), `${path} returned HTTP ${response!.status()}`)
      .toBeLessThan(400);

    await expect(page.locator('body')).toBeVisible();
  });
}

test('homepage has no broken internal navigation links', async ({ page, request }) => {
  await page.goto('/', {
    waitUntil: 'domcontentloaded',
  });

  const hrefs = await page.locator('a[href]').evaluateAll((links) =>
    links
      .map((link) => link.getAttribute('href'))
      .filter((href): href is string => Boolean(href))
  );

  const internalLinks = [...new Set(hrefs)]
    .filter((href) => !href.startsWith('#'))
    .filter((href) => !href.startsWith('mailto:'))
    .filter((href) => !href.startsWith('tel:'))
    .filter((href) => !href.startsWith('javascript:'))
    .filter((href) => {
      try {
        const url = new URL(href, 'https://www.bait-logic.com');
        return url.hostname === 'www.bait-logic.com' ||
               url.hostname === 'bait-logic.com';
      } catch {
        return false;
      }
    });

  for (const href of internalLinks) {
    const url = new URL(href, 'https://www.bait-logic.com').toString();

    const response = await request.get(url, {
      failOnStatusCode: false,
    });

    expect(
      response.status(),
      `Broken internal link: ${url} returned ${response.status()}`
    ).toBeLessThan(400);
  }
});

test('homepage does not produce fatal browser errors', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  await page.goto('/', {
    waitUntil: 'networkidle',
  });

  expect(errors, `Browser errors:\n${errors.join('\n')}`).toEqual([]);
});

test('critical images render', async ({ page }) => {
  await page.goto('/', {
    waitUntil: 'networkidle',
  });

  const brokenImages = await page.locator('img').evaluateAll((images) =>
    images
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.getAttribute('src') || '(missing src)')
  );

  expect(
    brokenImages,
    `Broken images:\n${brokenImages.join('\n')}`
  ).toEqual([]);
});
