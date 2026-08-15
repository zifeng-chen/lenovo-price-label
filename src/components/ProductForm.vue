<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  categories: {
    type: Array,
    required: true,
  },
  editingProduct: {
    type: Object,
    default: null,
  },
  busy: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['submit', 'cancel-edit'])
const LAST_CATEGORY_KEY = 'lenovo-price-label:last-category'

const form = reactive({
  name: '',
  category: '',
  price: '',
})

const isEditing = computed(() => Boolean(props.editingProduct))

watch(
  () => props.categories,
  (categories) => {
    if (!categories.length || form.category) return
    const savedCategory = localStorage.getItem(LAST_CATEGORY_KEY)
    form.category = categories.some(({ name }) => name === savedCategory)
      ? savedCategory
      : categories[0].name
  },
  { immediate: true },
)

watch(
  () => props.editingProduct,
  (product) => {
    if (!product) return
    form.name = product.name
    form.category = product.category
    form.price = product.price
  },
)

function submitForm() {
  emit('submit', {
    name: form.name.trim(),
    category: form.category,
    price: Number(form.price),
  })
}

function clearFields({ keepCategory = true } = {}) {
  const category = keepCategory ? form.category : ''
  form.name = ''
  form.price = ''
  form.category = category

  if (form.category) localStorage.setItem(LAST_CATEGORY_KEY, form.category)
}

function cancelEdit() {
  const savedCategory = localStorage.getItem(LAST_CATEGORY_KEY)
  clearFields({ keepCategory: false })
  form.category = props.categories.some(({ name }) => name === savedCategory)
    ? savedCategory
    : (props.categories[0]?.name ?? '')
  emit('cancel-edit')
}

defineExpose({ clearFields })
</script>

<template>
  <section class="card product-form-card" aria-labelledby="form-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">商品录入</p>
        <h2 id="form-title">{{ isEditing ? '编辑商品' : '添加新商品' }}</h2>
      </div>
      <button v-if="isEditing" type="button" class="text-button" @click="cancelEdit">
        取消编辑
      </button>
    </div>

    <form class="product-form" @submit.prevent="submitForm">
      <label class="field field-name">
        <span>商品名称</span>
        <input
          v-model="form.name"
          type="text"
          maxlength="100"
          placeholder="例如：联想无线键鼠套装"
          autocomplete="off"
          required
        />
      </label>

      <label class="field">
        <span>品类</span>
        <select v-model="form.category" required>
          <option value="" disabled>请选择品类</option>
          <option v-for="category in categories" :key="category.id" :value="category.name">
            {{ category.name }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>价格（元）</span>
        <input
          v-model="form.price"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          placeholder="0.00"
          required
        />
      </label>

      <button class="primary-button submit-button" type="submit" :disabled="busy || !categories.length">
        {{ busy ? '保存中…' : (isEditing ? '保存修改' : '添加商品') }}
      </button>
    </form>
  </section>
</template>
