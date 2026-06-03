import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import compression from 'compression'
import path from 'path'
import authRoutes from './http/auth.routes'
import shopRoutes from './http/shop.routes'
import playerRoutes from './http/player.routes'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(compression() as express.RequestHandler)
  app.use(express.json())

  app.use('/api/auth', authRoutes)
  app.use('/api/shop', shopRoutes)
  app.use('/api/player', playerRoutes)

  // Serve built client in production
  const clientDist = path.join(__dirname, '../../dist/client')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })

  const httpServer = createServer(app)
  return httpServer
}
