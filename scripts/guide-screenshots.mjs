#!/usr/bin/env node
// 사용 가이드용 스크린샷을 실제 화면에서 다시 찍는다 (화면이 바뀌면 이것만 다시 실행)
//
// 사용법:
//   GUIDE_EMAIL=... GUIDE_PASSWORD=... node scripts/guide-screenshots.mjs
//   - 오늘 커리큘럼과 기록이 어느 정도 있는 데모 계정을 쓸 것 (실제 가족 계정 X)
//   - 결과: apps/mobile/assets/guide/*.png, apps/web/public/guide-images/*.png
//   - 이후: ./scripts/restart-mobile.sh, ./scripts/rebuild-web.sh && ./scripts/restart-fe.sh
//   - Chromium 경로가 다르면 PW_EXE 로 지정
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(join(root, 'node_modules/playwright/index.mjs'));

const email = process.env.GUIDE_EMAIL;
const password = process.env.GUIDE_PASSWORD;
if (!email || !password) {
  console.error('GUIDE_EMAIL, GUIDE_PASSWORD 를 지정하세요');
  process.exit(1);
}
const mobileUrl = process.env.MOBILE_URL ?? 'http://localhost:8081';
const webUrl = process.env.WEB_URL ?? 'http://localhost:4200';

function findChromium() {
  if (process.env.PW_EXE) return process.env.PW_EXE;
  const base = join(homedir(), '.cache/ms-playwright');
  if (!existsSync(base)) return undefined;
  const dir = readdirSync(base).find((d) => d.startsWith('chromium_headless_shell-'));
  return dir ? join(base, dir, 'chrome-headless-shell-linux64/chrome-headless-shell') : undefined;
}

const mobileOut = join(root, 'apps/mobile/assets/guide');
const webOut = join(root, 'apps/web/public/guide-images');
mkdirSync(mobileOut, { recursive: true });
mkdirSync(webOut, { recursive: true });

const browser = await chromium.launch({ executablePath: findChromium() });

// ── 모바일 ──
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.goto(mobileUrl);
  await page.getByPlaceholder('이메일').fill(email);
  await page.getByPlaceholder('비밀번호').fill(password);
  await page.getByText('로그인', { exact: true }).last().click();
  await page.getByText('오늘 집에서 할 활동').waitFor({ timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(mobileOut, 'today.png') });

  await page.locator('text=›').first().click();
  await page.getByText('어땠나요?').waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(mobileOut, 'activity.png') });
  await page.goBack();

  await page.getByText(/오늘 (하루 기록하기|기록 완료)/).click();
  await page.getByText('오늘 아이는 어땠나요?').waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(mobileOut, 'record.png') });
  await page.close();
}

// ── PC ──
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${webUrl}/login`);
  await page.getByPlaceholder('이메일 주소').fill(email);
  await page.getByPlaceholder('비밀번호').fill(password);
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/today/, { timeout: 30000 });
  await page.getByText('어땠나요?').waitFor({ timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(webOut, 'today.png') });

  await page.getByText(/오늘 (하루 기록하기|기록 완료)/).click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(webOut, 'record.png') });
  await page.close();
}

await browser.close();
console.log(`✅ 가이드 스크린샷 저장\n   ${mobileOut}\n   ${webOut}`);
