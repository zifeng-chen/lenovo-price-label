<script setup>
import { computed, onMounted, ref } from 'vue'
import CategoryTabs from '../components/CategoryTabs.vue'
import PrintPanel from '../components/PrintPanel.vue'
import ProductForm from '../components/ProductForm.vue'
import ProductList from '../components/ProductList.vue'

const MAX_PRINT_ITEMS = 27
const products = ref([])
const categories = ref([])
const activeCategory = ref('全部')
const searchTerm = ref('')
const selectedIds = ref(new Set())
const editingProduct = ref(null)
const formRef = ref(null)
const loading = ref(true)
const saving = ref(false)
const toast = ref({ visible: false, message: '', type: 'success' })
let toastTimer

const filteredProducts = computed(() => {
  const query = searchTerm.value.trim().toLocaleLowerCase('zh-CN')

  return products.value.filter((product) => {
    const matchesCategory = activeCategory.value === '全部'
      || product.category === activeCategory.value
    const searchable = `${product.name} ${product.category} ${product.price}`.toLocaleLowerCase('zh-CN')
    return matchesCategory && (!query || searchable.includes(query))
  })
})

const selectedProducts = computed(() => (
  products.value.filter(({ id }) => selectedIds.value.has(id)).slice(0, MAX_PRINT_ITEMS)
))

function notify(message, type = 'success') {
  clearTimeout(toastTimer)
  toast.value = { visible: true, message, type }
  toastTimer = setTimeout(() => {
    toast.value.visible = false
  }, 2600)
}

async function requestJson(url, options) {
  const response = await fetch(url, options)
  if (response.status === 204) return null

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || '请求失败，请稍后重试')
  return data
}

async function loadData() {
  loading.value = true
  try {
    const [productData, categoryData] = await Promise.all([
      requestJson('/api/products'),
      requestJson('/api/categories'),
    ])
    products.value = productData
    categories.value = categoryData
  } catch (error) {
    notify(error.message, 'error')
  } finally {
    loading.value = false
  }
}

async function saveProduct(payload) {
  saving.value = true
  try {
    if (editingProduct.value) {
      const updated = await requestJson(`/api/products/${editingProduct.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const index = products.value.findIndex(({ id }) => id === updated.id)
      if (index !== -1) products.value.splice(index, 1, updated)
      editingProduct.value = null
      formRef.value?.clearFields()
      notify('商品修改已保存')
    } else {
      const created = await requestJson('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      products.value.unshift(created)
      formRef.value?.clearFields()
      notify('商品已保存')
    }
  } catch (error) {
    notify(error.message, 'error')
  } finally {
    saving.value = false
  }
}

function editProduct(product) {
  editingProduct.value = product
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function deleteProduct(product) {
  if (!window.confirm(`确定删除“${product.name}”吗？此操作不可撤销。`)) return

  try {
    await requestJson(`/api/products/${product.id}`, { method: 'DELETE' })
    products.value = products.value.filter(({ id }) => id !== product.id)
    const nextSelected = new Set(selectedIds.value)
    nextSelected.delete(product.id)
    selectedIds.value = nextSelected
    if (editingProduct.value?.id === product.id) {
      editingProduct.value = null
      formRef.value?.clearFields()
    }
    notify('商品已删除')
  } catch (error) {
    notify(error.message, 'error')
  }
}

function toggleProduct(id, checked) {
  const nextSelected = new Set(selectedIds.value)
  if (checked) {
    if (nextSelected.size >= MAX_PRINT_ITEMS) {
      notify('一张 A4 最多打印 27 个标签', 'error')
      return
    }
    nextSelected.add(id)
  } else {
    nextSelected.delete(id)
  }
  selectedIds.value = nextSelected
}

function toggleAllFiltered(checked) {
  const nextSelected = new Set(selectedIds.value)

  if (!checked) {
    filteredProducts.value.forEach(({ id }) => nextSelected.delete(id))
    selectedIds.value = nextSelected
    return
  }

  const availableSlots = MAX_PRINT_ITEMS - nextSelected.size
  const unselected = filteredProducts.value.filter(({ id }) => !nextSelected.has(id))
  unselected.slice(0, availableSlots).forEach(({ id }) => nextSelected.add(id))
  selectedIds.value = nextSelected

  if (unselected.length > availableSlots) {
    notify('已选择当前结果中的前 27 个商品', 'error')
  }
}

function clearSelection() {
  selectedIds.value = new Set()
}

onMounted(loadData)
</script>

<template>
  <div class="app-shell">
    <div class="management-ui">
      <header class="app-header">
        <div class="header-inner">
          <img class="brand-mark" src="/lenovo-logo.svg" alt="Lenovo 联想" />
          <div>
            <p class="system-version">PRICE LABEL SYSTEM · V2.0</p>
            <h1>联想价格标签打印系统</h1>
            <p class="header-description">快速管理商品，并生成精确尺寸的 A4 价格标签</p>
          </div>
        </div>
      </header>

      <main class="page-content">
        <ProductForm
          ref="formRef"
          :categories="categories"
          :editing-product="editingProduct"
          :busy="saving"
          @submit="saveProduct"
          @cancel-edit="editingProduct = null"
        />

        <section class="filter-section" aria-label="商品筛选">
          <CategoryTabs v-model="activeCategory" :categories="categories" />
          <label class="search-box">
            <span class="search-icon" aria-hidden="true"></span>
            <span class="visually-hidden">搜索商品</span>
            <input v-model="searchTerm" type="search" placeholder="搜索商品名称 / 品类 / 价格" />
          </label>
        </section>

        <div v-if="loading" class="card loading-state">正在读取商品数据…</div>
        <ProductList
          v-else
          :products="filteredProducts"
          :selected-ids="selectedIds"
          :max-selection="MAX_PRINT_ITEMS"
          @toggle="toggleProduct"
          @toggle-all="toggleAllFiltered"
          @edit="editProduct"
          @delete="deleteProduct"
        />
      </main>
    </div>

    <PrintPanel :products="selectedProducts" @clear="clearSelection" />

    <Transition name="toast">
      <div v-if="toast.visible" class="toast" :class="`toast-${toast.type}`" role="status">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>
