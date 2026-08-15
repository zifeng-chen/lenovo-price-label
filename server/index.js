import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import database from './database.js'
import productsRouter from './routes/products.js'

const PORT = 8890
const app = express()
const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const distDirectory = path.resolve(serverDirectory, '../dist')

app.disable('x-powered-by')
app.use(express.json({ limit: '50kb' }))

app.get('/api/categories', (_request, response) => {
  const categories = database.prepare(`
    SELECT id, name
    FROM categories
    ORDER BY sort_order ASC, id ASC
  `).all()

  response.json(categories)
})

app.use('/api/products', productsRouter)

if (fs.existsSync(distDirectory)) {
  app.use(express.static(distDirectory))
  app.get(/^(?!\/api).*/, (_request, response) => {
    response.sendFile(path.join(distDirectory, 'index.html'))
  })
}

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ message: '服务器处理请求时发生错误' })
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`联想价格标签打印系统已启动：http://localhost:${PORT}`)
})
