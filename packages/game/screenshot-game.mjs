import { createRequire } from 'module'
const { chromium } = require('/opt/node22/lib/node_modules/playwright/index.js')

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const screenshotsDir = join(__dirname, 'screenshots')
mkdirSync(screenshotsDir, { recursive: true })

const BASE = 'http://localhost:3334'

async function registerAndLogin(page, username, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  // Switch to Register tab
  await page.click('button:has-text("Register")')
  await page.waitForTimeout(200)
  await page.fill('input[placeholder="Username"]', username)
  await page.fill('input[placeholder="Password"]', password)
  await page.click('button:has-text("Create Account")')
  await page.waitForTimeout(2000)

  if (page.url().includes('login')) {
    // already registered — switch to Login
    await page.click('button.active, button:has-text("Login")')
    await page.fill('input[placeholder="Username"]', username)
    await page.fill('input[placeholder="Password"]', password)
    await page.click('button:has-text("Enter Game")')
    await page.waitForTimeout(2000)
  }

  console.log(`${username} => ${page.url()}`)
}

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu'] })

// --- Player 1 ---
const page1 = await browser.newPage()
await page1.setViewportSize({ width: 1280, height: 720 })
await page1.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page1.waitForTimeout(800)
await page1.screenshot({ path: join(screenshotsDir, '1-login.png') })
console.log('✅ Screenshot 1: Login')

await registerAndLogin(page1, 'vtest1', 'abc123')
await page1.screenshot({ path: join(screenshotsDir, '2-after-auth.png') })

if (!page1.url().includes('lobby')) {
  await page1.goto(`${BASE}/lobby`, { waitUntil: 'networkidle' })
}
await page1.waitForTimeout(800)
await page1.screenshot({ path: join(screenshotsDir, '3-lobby.png') })
console.log('✅ Screenshot 3: Lobby')

// --- Player 2 ---
const page2 = await browser.newPage()
await page2.setViewportSize({ width: 1280, height: 720 })
await registerAndLogin(page2, 'vtest2', 'abc123')
if (!page2.url().includes('lobby')) {
  await page2.goto(`${BASE}/lobby`, { waitUntil: 'networkidle' })
}
await page2.waitForTimeout(500)
await page2.screenshot({ path: join(screenshotsDir, '4-lobby-p2.png') })

// --- Join Queue ---
for (const [pg, name] of [[page1,'P1'],[page2,'P2']]) {
  const btns = await pg.$$('button')
  for (const b of btns) {
    const t = await b.innerText()
    console.log(`${name} button: "${t}"`)
  }
}

// Click first button on each lobby page
try {
  await page1.locator('button').first().click()
  console.log('P1 clicked first button')
} catch(e) { console.log('P1 button error:', e.message) }

try {
  await page2.locator('button').first().click()
  console.log('P2 clicked first button')
} catch(e) { console.log('P2 button error:', e.message) }

// Wait for game
console.log('Waiting for game...')
await page1.waitForTimeout(7000)
console.log('P1 URL now:', page1.url())
console.log('P2 URL now:', page2.url())

await page1.screenshot({ path: join(screenshotsDir, '5-game.png') })
await page2.screenshot({ path: join(screenshotsDir, '6-game-p2.png') })
console.log('✅ Game screenshots')

await page1.waitForTimeout(3000)
await page1.screenshot({ path: join(screenshotsDir, '7-game-3d.png') })

await browser.close()
console.log('Done! Screenshots:', screenshotsDir)
