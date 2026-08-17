import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import categoriesRouter from './routes/categories.js'
import dataRouter from './routes/data.js'
import productsRouter from './routes/products.js'

const HOST = '0.0.0.0'
const PORT = 8890
const app = express()
const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const distDirectory = path.resolve(serverDirectory, '../dist')

app.disable('x-powered-by')
app.use('/api/data', dataRouter)
app.use(express.json({ limit: '50kb' }))
app.use('/api/categories', categoriesRouter)
app.use('/api/products', productsRouter)

if (fs.existsSync(distDirectory)) {
  app.use(express.static(distDirectory))
  app.get(/^(?!\/api).*/, (_request, response) => {
    response.sendFile(path.join(distDirectory, 'index.html'))
  })
}

app.use((error, _request, response, _next) => {
  if (error.type === 'entity.too.large') {
    return response.status(413).json({ message: '导入文件过大，最大支持 5MB' })
  }
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ message: 'JSON 格式无效' })
  }

  console.error(error)
  return response.status(500).json({ message: '服务器处理请求时发生错误' })
})

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((network) => (
      network
      && network.family === 'IPv4'
      && !network.internal
      && !network.address.startsWith('169.254.')
    ))
    .map((network) => network.address)
}

app.listen(PORT, HOST, () => {
  console.log(`本机访问：http://localhost:${PORT}`)

  const lanAddresses = getLanAddresses()
  if (lanAddresses.length) {
    lanAddresses.forEach((address) => {
      console.log(`局域网访问：http://${address}:${PORT}`)
    })
  } else {
    console.log(`服务已监听 ${HOST}:${PORT}，请使用本机局域网 IP 访问`)
  }
})
