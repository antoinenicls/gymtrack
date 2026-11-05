import { webkit, devices } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5177';
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// On seme quelques seances pour que le widget ait de la matiere a montrer.
await page.goto(`${BASE}/#/profil`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(async () => {
  const req = indexedDB.open('gymtrack');
  const db = await new Promise((res) => { req.onsuccess = () => res(req.result); });
  const tx = db.transaction('workouts', 'readwrite');
  const now = Date.now();
  const DAY = 86400000;
  const offsets = [0, 2, 4, 8, 10, 15, 17, 19, 23, 30, 32];
  offsets.forEach((d, i) => {
    tx.objectStore('workouts').put({
      id: `seed-${i}`, name: 'Push A', routineId: null,
      startedAt: now - d * DAY, endedAt: now - d * DAY + 3600000,
      entries: [], notes: '', durationSec: 3600,
    });
  });
  await new Promise((res) => { tx.oncomplete = res; });
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.screenshot({ path: 'scripts/out/profile.png' });
console.log('capture ok');
await browser.close();
