import { Router } from 'express'
import database from '../database.js'

const router = Router()
const MAX_CATEGORY_NAME_LENGTH = 30

const selectCategories = database.prepare(`
  SELECT id, name
  FROM categories
  ORDER BY sort_order ASC, id ASC
`)

const selectCategoryByName = database.prepare(`
  SELECT id, name
  FROM categories
  WHERE name = ?
`)

const insertCategory = database.prepare(`
  INSERT INTO categories (name, sort_order)
  SELECT ?, COALESCE(MAX(sort_order), 0) + 1
  FROM categories
`)

const createCategory = database.transaction((name) => {
  insertCategory.run(name)
  return selectCategoryByName.get(name)
})

function validateCategory(body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  if (!name) return { error: '请输入品类名称' }
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    return { error: `品类名称不能超过 ${MAX_CATEGORY_NAME_LENGTH} 个字符` }
  }
  if (name === '全部') return { error: '“全部”是系统筛选项，不能作为品类名称' }

  return { value: name }
}

router.get('/', (_request, response) => {
  response.json(selectCategories.all())
})

router.post('/', (request, response, next) => {
  const validation = validateCategory(request.body)
  if (validation.error) return response.status(400).json({ message: validation.error })

  const name = validation.value
  if (selectCategoryByName.get(name)) {
    return response.status(409).json({ message: '该品类已存在' })
  }

  try {
    return response.status(201).json(createCategory(name))
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return response.status(409).json({ message: '该品类已存在' })
    }
    return next(error)
  }
})

export default router
