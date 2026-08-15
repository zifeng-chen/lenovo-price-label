import { Router } from 'express'
import database from '../database.js'

const router = Router()

const selectProduct = database.prepare(`
  SELECT id, name, category, price, created_at, updated_at
  FROM products
  WHERE id = ?
`)

function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function validateProduct(body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const category = typeof body.category === 'string' ? body.category.trim() : ''
  const price = body.price === '' || body.price === null ? Number.NaN : Number(body.price)

  if (!name) return { error: '请输入商品名称' }
  if (name.length > 100) return { error: '商品名称不能超过 100 个字符' }
  if (!category) return { error: '请选择品类' }
  if (!Number.isFinite(price) || price < 0) return { error: '请输入有效的非负价格' }

  const categoryExists = database
    .prepare('SELECT 1 FROM categories WHERE name = ?')
    .get(category)

  if (!categoryExists) return { error: '所选品类不存在，请刷新页面后重试' }

  return {
    value: {
      name,
      category,
      price: Math.round(price * 100) / 100,
    },
  }
}

router.get('/', (_request, response) => {
  const products = database.prepare(`
    SELECT id, name, category, price, created_at, updated_at
    FROM products
    ORDER BY updated_at DESC, id DESC
  `).all()

  response.json(products)
})

router.post('/', (request, response) => {
  const validation = validateProduct(request.body)
  if (validation.error) return response.status(400).json({ message: validation.error })

  const { name, category, price } = validation.value
  const now = new Date().toISOString()
  const result = database.prepare(`
    INSERT INTO products (name, category, price, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, category, price, now, now)

  return response.status(201).json(selectProduct.get(result.lastInsertRowid))
})

router.put('/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!id) return response.status(400).json({ message: '无效的商品 ID' })
  if (!selectProduct.get(id)) return response.status(404).json({ message: '商品不存在' })

  const validation = validateProduct(request.body)
  if (validation.error) return response.status(400).json({ message: validation.error })

  const { name, category, price } = validation.value
  database.prepare(`
    UPDATE products
    SET name = ?, category = ?, price = ?, updated_at = ?
    WHERE id = ?
  `).run(name, category, price, new Date().toISOString(), id)

  return response.json(selectProduct.get(id))
})

router.delete('/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!id) return response.status(400).json({ message: '无效的商品 ID' })

  const result = database.prepare('DELETE FROM products WHERE id = ?').run(id)
  if (!result.changes) return response.status(404).json({ message: '商品不存在' })

  return response.status(204).end()
})

export default router
