const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const path = require('path')
const fs = require('fs')

const screenshotsDir = path.join(__dirname, 'screenshots')
fs.mkdirSync(screenshotsDir, { recursive: true })

const BASE = 'http://localhost:3334'

async function loginUser(page, username, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("Login")').catch(async () => {
    // Already in register mode or different state
  })
  await page.fill('input[placeholder="Username"]', username)
  await page.fill('input[placeholder="Password"]', password)
  await page.click('button:has-text("Enter Game")')
  await page.waitForURL(`${BASE}/lobby`, { timeout: 5000 }).catch(() => {})
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl'] })
  
  const errors = []
  
  const [page1, page2] = await Promise.all([browser.newPage(), browser.newPage()])
  await page1.setViewportSize({ width: 1280, height: 720 })
  await page2.setViewportSize({ width: 1280, height: 720 })
  page1.on('pageerror', e => errors.push(e.message.slice(0, 200)))

  await Promise.all([loginUser(page1, 'vtest1', 'abc123'), loginUser(page2, 'vtest2', 'abc123')])

  if (!page1.url().includes('lobby')) await page1.goto(`${BASE}/lobby`)
  if (!page2.url().includes('lobby')) await page2.goto(`${BASE}/lobby`)

  // Screenshot lobby
  await page1.waitForTimeout(500)
  await page1.screenshot({ path: path.join(screenshotsDir, 'A-login.png') })
  await page1.screenshot({ path: path.join(screenshotsDir, 'B-lobby.png') })
  console.log('✅ Lobby screenshot')

  // Join queue
  await Promise.all([
    page1.click('button:has-text("FIND MATCH")'),
    page2.click('button:has-text("FIND MATCH")')
  ])

  // Wait for game
  for (let i = 0; i < 30; i++) {
    await page1.waitForTimeout(500)
    if (page1.url().includes('game')) break
  }

  // Wait for countdown to finish (3s)
  console.log('Waiting for countdown...')
  await page1.waitForTimeout(4000)
  
  // Click canvas to start (lock pointer would fail in headless)
  try { await page1.click('canvas') } catch(e) {}
  
  // Screenshot during GET READY
  await page1.screenshot({ path: path.join(screenshotsDir, 'C-game-starting.png') })

  // Simulate player movement - press keys
  await page1.keyboard.down('KeyD')
  await page2.keyboard.down('KeyD')
  await page1.waitForTimeout(1000)
  await page1.screenshot({ path: path.join(screenshotsDir, 'D-game-playing.png') })
  await page2.screenshot({ path: path.join(screenshotsDir, 'E-game-p2.png') })
  
  await page1.keyboard.down('KeyS')
  await page1.waitForTimeout(500)
  await page1.keyboard.up('KeyD')
  await page1.keyboard.up('KeyS')
  await page2.keyboard.up('KeyD')
  
  await page1.waitForTimeout(1500)
  await page1.screenshot({ path: path.join(screenshotsDir, 'F-game-moved.png') })
  
  console.log('P1 URL:', page1.url())
  console.log('Errors:', errors.slice(0, 5))
  
  // Check canvas render status
  const status = await page1.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return 'no canvas'
    const gl = c.getContext('webgl2')
    if (!gl) return 'no webgl2'
    const px = new Uint8Array(4)
    gl.readPixels(640, 360, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    return `rgba(${px[0]},${px[1]},${px[2]},${px[3]})`
  })
  console.log('Center pixel:', status)

  await browser.close()
  console.log('Done!')
}

main().catch(console.error)
