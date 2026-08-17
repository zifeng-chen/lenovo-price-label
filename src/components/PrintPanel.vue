<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  products: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['clear'])
const ITEMS_PER_PAGE = 28
const DEFAULT_NAME_SIZE_MM = 5
const MIN_NAME_SIZE_MM = 0.5
const nameFontSizes = ref({})
const nameMeasureElements = new Map()
let fitRequestId = 0

const printPages = computed(() => {
  const pages = []
  for (let index = 0; index < props.products.length; index += ITEMS_PER_PAGE) {
    pages.push(props.products.slice(index, index + ITEMS_PER_PAGE))
  }
  return pages
})

function formatPrice(price) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price)
}

function setNameMeasureElement(id, element) {
  if (element) {
    nameMeasureElements.set(id, element)
  } else {
    nameMeasureElements.delete(id)
  }
}

async function fitLabelNames() {
  const requestId = ++fitRequestId
  await nextTick()
  if (document.fonts?.ready) await document.fonts.ready
  if (requestId !== fitRequestId) return

  const nextSizes = {}

  props.products.forEach((product) => {
    const element = nameMeasureElements.get(product.id)
    if (!element) return

    element.style.fontSize = `${DEFAULT_NAME_SIZE_MM}mm`
    const measureContainer = element.parentElement
    const containerStyles = measureContainer ? getComputedStyle(measureContainer) : null
    const availableWidth = measureContainer && containerStyles
      ? measureContainer.clientWidth
        - Number.parseFloat(containerStyles.paddingLeft)
        - Number.parseFloat(containerStyles.paddingRight)
      : 0
    const requiredWidth = element.getBoundingClientRect().width
    let size = DEFAULT_NAME_SIZE_MM

    if (availableWidth > 0 && requiredWidth > availableWidth) {
      size = Math.max(
        MIN_NAME_SIZE_MM,
        Math.floor(DEFAULT_NAME_SIZE_MM * (availableWidth / requiredWidth) * 99.5) / 100,
      )
    }

    nextSizes[product.id] = `${size}mm`
  })

  nameFontSizes.value = nextSizes
}

watch(
  () => props.products.map(({ id, name }) => `${id}:${name}`).join('|'),
  fitLabelNames,
  { immediate: true },
)

async function printLabels() {
  if (!props.products.length) return
  await fitLabelNames()
  window.print()
}
</script>

<template>
  <aside class="print-actions" aria-label="打印队列">
    <div class="print-actions-inner">
      <div class="selection-summary">
        <span class="selection-count">{{ products.length }}</span>
        <span>已选择 {{ products.length }} 个商品，共 {{ printPages.length }} 页</span>
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

  <div class="print-name-measurer" aria-hidden="true">
    <div v-for="product in products" :key="product.id" class="print-name-measure-width">
      <span :ref="(element) => setNameMeasureElement(product.id, element)" class="label-name-measure">
        {{ product.name }}
      </span>
    </div>
  </div>

  <div class="print-root" aria-hidden="true">
    <section v-for="(page, pageIndex) in printPages" :key="pageIndex" class="print-page">
      <main class="print-sheet">
        <article v-for="product in page" :key="product.id" class="price-label">
          <div class="label-top-row">
            <img class="label-logo" src="/lenovo-logo.svg" alt="" />
            <span class="label-price">¥{{ formatPrice(product.price) }}</span>
          </div>
          <span class="label-name" :style="{ fontSize: nameFontSizes[product.id] || '5mm' }">
            {{ product.name }}
          </span>
        </article>
      </main>
    </section>
  </div>
</template>
