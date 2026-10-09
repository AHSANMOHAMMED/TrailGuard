const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

async function captureScreenshots() {
  const screenshotsDir = path.join(__dirname, '../docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Launching Chromium for real app screenshots...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 / standard mobile viewport
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  // 1. Onboarding & Login Screen
  console.log('Navigating to /onboarding...');
  await page.goto('http://127.0.0.1:8080/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const onboardingPath = path.join(screenshotsDir, 'ui_onboarding_login_1791546776357.jpg');
  await page.screenshot({ path: onboardingPath, quality: 90 });
  console.log('Captured Onboarding screenshot:', onboardingPath);

  // 2. Home / Role Selection
  console.log('Navigating to / (Home)...');
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 3. UC01 Patrol Screen
  console.log('Navigating to /patrol...');
  await page.goto('http://127.0.0.1:8080/patrol', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const patrolPath = path.join(screenshotsDir, 'ui_patrol_screen_1791546825205.jpg');
  await page.screenshot({ path: patrolPath, quality: 90 });
  console.log('Captured Patrol screenshot:', patrolPath);

  // 4. UC02 Incident Screen
  console.log('Navigating to /incidents...');
  await page.goto('http://127.0.0.1:8080/incidents', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const incidentPath = path.join(screenshotsDir, 'ui_incident_screen_1791546852785.jpg');
  await page.screenshot({ path: incidentPath, quality: 90 });
  console.log('Captured Incident screenshot:', incidentPath);

  // 5. UC03 Risk Alert Screen
  console.log('Navigating to /alerts...');
  await page.goto('http://127.0.0.1:8080/alerts', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const alertPath = path.join(screenshotsDir, 'ui_alert_screen_1791546883936.jpg');
  await page.screenshot({ path: alertPath, quality: 90 });
  console.log('Captured Alert screenshot:', alertPath);

  // 6. UC04 Human-Wildlife Conflict Screen
  console.log('Navigating to /conflict...');
  await page.goto('http://127.0.0.1:8080/conflict', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const conflictPath = path.join(screenshotsDir, 'ui_conflict_screen_1791546913914.jpg');
  await page.screenshot({ path: conflictPath, quality: 90 });
  console.log('Captured Conflict screenshot:', conflictPath);

  // 7. Offline Vector Canvas Map Engine (from /patrol or /alerts with map zoomed)
  console.log('Capturing Offline Map from /patrol...');
  await page.goto('http://127.0.0.1:8080/patrol', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const mapPath = path.join(screenshotsDir, 'ui_offline_map_1791546943032.jpg');
  await page.screenshot({ path: mapPath, quality: 90 });
  console.log('Captured Offline Map screenshot:', mapPath);

  await browser.close();
  console.log('All real app screenshots captured successfully!');
}

captureScreenshots().catch(err => {
  console.error('Failed to capture screenshots:', err);
  process.exit(1);
});
