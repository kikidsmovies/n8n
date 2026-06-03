const playwright = require('/opt/node22/lib/node_modules/playwright/index.js')
const path = require('path')

const SHOT_DIR = path.join(__dirname, 'screenshots')

async function main() {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: [
      '--no-sandbox', '--disable-dev-shm-usage',
      '--use-gl=swiftshader', '--enable-webgl',
      '--ignore-gpu-blocklist', '--disable-gpu-sandbox',
    ],
  })

  async function newPlayer(url, suffix) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const page = await ctx.newPage()
    await page.goto(url)
    await page.waitForTimeout(1800)

    try {
      const regTab = await page.$('button:has-text("Register")')
      if (regTab) await regTab.click()
      await page.waitForTimeout(300)
      await page.fill('input[placeholder="Username"]', `vis${suffix}${Date.now() % 10000}`)
      await page.fill('input[placeholder="Password"]', 'pass123')
      const submitBtn = await page.$('button:has-text("Create Account")')
      if (submitBtn) await submitBtn.click()
      else {
        const loginBtn = await page.$('button:has-text("Enter Game")')
        if (loginBtn) await loginBtn.click()
      }
    } catch(e) {}
    await page.waitForTimeout(2500)
    return { page, ctx }
  }

  const { page: p1 } = await newPlayer('http://localhost:3334', 'aa')
  const { page: p2 } = await newPlayer('http://localhost:3334', 'bb')

  await p1.screenshot({ path: path.join(SHOT_DIR, 'V1-lobby.png') })
  await p1.screenshot({ path: path.join(SHOT_DIR, 'V2-login.png') }).catch(() => {})
  console.log('✅ Lobby')

  await p1.click('button:has-text("FIND MATCH")')
  await p2.click('button:has-text("FIND MATCH")')

  console.log('Waiting for game...')
  await p1.waitForURL('**/game', { timeout: 20000 }).catch(() => {})
  await p2.waitForURL('**/game', { timeout: 5000 }).catch(() => {})
  await p1.waitForTimeout(4000)

  await p1.screenshot({ path: path.join(SHOT_DIR, 'V3-game-start.png') })
  await p2.screenshot({ path: path.join(SHOT_DIR, 'V4-game-start-p2.png') })
  console.log('✅ Game start')

  // Simulate movement
  await p1.keyboard.down('ArrowUp')
  await p2.keyboard.down('ArrowDown')
  await p1.waitForTimeout(2500)
  await p1.keyboard.up('ArrowUp')
  await p2.keyboard.up('ArrowDown')
  await p1.waitForTimeout(500)

  await p1.screenshot({ path: path.join(SHOT_DIR, 'V5-game-moved.png') })
  await p2.screenshot({ path: path.join(SHOT_DIR, 'V6-game-p2.png') })
  console.log('✅ After movement')

  // Move more toward exit (bottom-right)
  await p1.keyboard.down('ArrowRight')
  await p1.waitForTimeout(3000)
  await p1.keyboard.up('ArrowRight')
  await p1.keyboard.down('ArrowDown')
  await p1.waitForTimeout(3000)
  await p1.keyboard.up('ArrowDown')
  await p1.waitForTimeout(500)

  await p1.screenshot({ path: path.join(SHOT_DIR, 'V7-game-toward-exit.png') })
  console.log('✅ Toward exit')

  await browser.close()
  console.log('Done!')
}

main().catch(e => { console.error(e.message); process.exit(1) })
