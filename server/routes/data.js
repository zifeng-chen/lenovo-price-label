import { Router, json } from 'express'
import database from '../database.js'

const router = Router()
const SCHEMA_VERSION = 1
const MAX_CATEGORIES = 500
const MAX_PRODUCTS = 10000

const selectExportCategories = database.prepare(`
  SELECT id, name, sort_order
  FROM categories
  ORDER BY sort_order ASC, id ASC
`)

const selectExportProducts = database.prepare(`
  SELECT id, name, category, price, created_at, updated_at
  FROM products
  ORDER BY id ASC
`)

const insertCategory = database.prepare(`
  INSERT INTO categories (id, name, sort_order)
  VALUES (@id, @name, @sort_order)
`)

const insertProduct = database.prepare(`
  INSERT INTO products (id, name, category, price, created_at, updated_at)
  VALUES (@id, @name, @category, @price, @created_at, @updated_at)
`)

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0
}

function isValidTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false
  }

  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString() === value
}

function validateImportPayload(payload) {
  const errors = []
  const addError = (message) => {
    if (errors.length < 20) errors.push(message)
  }

  if (!isRecord(payload)) {
    return { errors: ['备份文件必须是 JSON 对象'] }
  }

  if (payload.schemaVersion !== SCHEMA_VERSION) {
    addError(`不支持的备份格式版本，应为 ${SCHEMA_VERSION}`)
  }
  if (!isValidTimestamp(payload.exportedAt)) addError('exportedAt 必须是有效时间')
  if (!Array.isArray(payload.categories)) addError('categories 必须是数组')
  if (!Array.isArray(payload.products)) addError('products 必须是数组')
  if (errors.length) return { errors }

  if (!payload.categories.length) addError('备份中至少需要一个品类')
  if (payload.categories.length > MAX_CATEGORIES) {
    addError(`品类数量不能超过 ${MAX_CATEGORIES}`)
  }
  if (payload.products.length > MAX_PRODUCTS) {
    addError(`商品数量不能超过 ${MAX_PRODUCTS}`)
  }

  const categoryIds = new Set()
  const categoryNames = new Set()
  const categories = payload.categories.map((category, index) => {
    const path = `categories[${index}]`
    if (!isRecord(category)) {
      addError(`${path} 必须是对象`)
      return null
    }

    const name = typeof category.name === 'string' ? category.name.trim() : ''
    if (!isPositiveSafeInteger(category.id)) addError(`${path}.id 必须是正整数`)
    if (categoryIds.has(category.id)) addError(`${path}.id 重复`)
    categoryIds.add(category.id)

    if (!name) addError(`${path}.name 不能为空`)
    if (typeof category.name === 'string' && category.name !== name) {
      addError(`${path}.name 不能包含首尾空格`)
    }
    if (name.length > 30) addError(`${path}.name 不能超过 30 个字符`)
    if (name === '全部') addError(`${path}.name 不能使用系统筛选项“全部”`)
    if (categoryNames.has(name)) addError(`${path}.name 重复`)
    categoryNames.add(name)

    if (!Number.isSafeInteger(category.sort_order) || category.sort_order < 0) {
      addError(`${path}.sort_order 必须是非负整数`)
    }

    return {
      id: category.id,
      name,
      sort_order: category.sort_order,
    }
  }).filter(Boolean)

  const productIds = new Set()
  const products = payload.products.map((product, index) => {
    const path = `products[${index}]`
    if (!isRecord(product)) {
      addError(`${path} 必须是对象`)
      return null
    }

    const name = typeof product.name === 'string' ? product.name.trim() : ''
    const category = typeof product.category === 'string' ? product.category.trim() : ''

    if (!isPositiveSafeInteger(product.id)) addError(`${path}.id 必须是正整数`)
    if (productIds.has(product.id)) addError(`${path}.id 重复`)
    productIds.add(product.id)

    if (!name) addError(`${path}.name 不能为空`)
    if (typeof product.name === 'string' && product.name !== name) {
      addError(`${path}.name 不能包含首尾空格`)
    }
    if (name.length > 100) addError(`${path}.name 不能超过 100 个字符`)

    if (!category || !categoryNames.has(category)) {
      addError(`${path}.category 不在导入品类中`)
    }
    if (typeof product.category === 'string' && product.category !== category) {
      addError(`${path}.category 不能包含首尾空格`)
    }

    if (!Number.isFinite(product.price) || product.price < 0) {
      addError(`${path}.price 必须是非负数字`)
    } else if (Math.abs(product.price * 100 - Math.round(product.price * 100)) > 1e-8) {
      addError(`${path}.price 最多保留两位小数`)
    }

    if (!isValidTimestamp(product.created_at)) addError(`${path}.created_at 必须是有效时间`)
    if (!isValidTimestamp(product.updated_at)) addError(`${path}.updated_at 必须是有效时间`)
    if (
      isValidTimestamp(product.created_at)
      && isValidTimestamp(product.updated_at)
      && Date.parse(product.created_at) > Date.parse(product.updated_at)
    ) {
      addError(`${path}.created_at 不能晚于 updated_at`)
    }

    return {
      id: product.id,
      name,
      category,
      price: Math.round(product.price * 100) / 100,
      created_at: product.created_at,
      updated_at: product.updated_at,
    }
  }).filter(Boolean)

  return {
    errors,
    value: {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: payload.exportedAt,
      categories,
      products,
    },
  }
}

const replaceAllData = database.transaction((payload) => {
  database.prepare('DELETE FROM products').run()
  database.prepare('DELETE FROM categories').run()
  database.prepare("DELETE FROM sqlite_sequence WHERE name IN ('categories', 'products')").run()

  payload.categories.forEach((category) => insertCategory.run(category))
  payload.products.forEach((product) => insertProduct.run(product))

  const violations = database.prepare('PRAGMA foreign_key_check').all()
  if (violations.length) throw new Error('导入数据未通过数据库外键完整性检查')
})

router.get('/export', (_request, response) => {
  const exportedAt = new Date().toISOString()
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    categories: selectExportCategories.all(),
    products: selectExportProducts.all(),
  }
  const timestamp = exportedAt.replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')

  response.set('Content-Disposition', `attachment; filename="lenovo-price-label-backup-${timestamp}.json"`)
  response.type('application/json').send(JSON.stringify(payload, null, 2))
})

router.post('/import', json({ limit: '5mb' }), (request, response, next) => {
  if (!isRecord(request.body) || typeof request.body.validateOnly !== 'boolean') {
    return response.status(400).json({ message: '请求必须包含 validateOnly 和 data' })
  }

  const validation = validateImportPayload(request.body.data)
  if (validation.errors.length) {
    return response.status(400).json({
      message: validation.errors[0],
      errors: validation.errors,
    })
  }

  const summary = {
    categories: validation.value.categories.length,
    products: validation.value.products.length,
  }

  if (request.body.validateOnly) {
    return response.json({ valid: true, summary })
  }

  try {
    replaceAllData(validation.value)
    return response.json({ imported: true, summary })
  } catch (error) {
    return next(error)
  }
})

export default router
