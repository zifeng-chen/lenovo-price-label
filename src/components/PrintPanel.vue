<script setup>
const props = defineProps({
  products: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['clear'])

function formatPrice(price) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price)
}

function nameSizeClass(name) {
  if (name.length <= 10) return 'name-short'
  if (name.length <= 18) return 'name-medium'
  return 'name-long'
}

function printLabels() {
  if (!props.products.length) return
  window.print()
}
</script>

<template>
  <aside class="print-actions" aria-label="打印队列">
    <div class="print-actions-inner">
      <div class="selection-summary">
        <span class="selection-count">{{ products.length }}</span>
        <span>已选择 {{ products.length }} 个商品（最多 24 个）</span>
      </div>
      <div class="print-buttons">
        <button type="button" class="secondary-button" :disabled="!products.length" @click="emit('clear')">
          清空打印队列
        </button>
        <button type="button" class="primary-button print-button" :disabled="!products.length" @click="printLabels">
          打印价格标签（{{ products.length }}）
        </button>
      </div>
    </div>
  </aside>

  <div class="print-root" aria-hidden="true">
    <main class="print-sheet">
      <article v-for="product in products" :key="product.id" class="price-label">
        <div class="label-top-row">
          <img class="label-logo" src="/lenovo-logo.svg" alt="" />
          <span class="label-price">¥{{ formatPrice(product.price) }}</span>
        </div>
        <span class="label-name" :class="nameSizeClass(product.name)">{{ product.name }}</span>
      </article>
    </main>
  </div>
</template>
