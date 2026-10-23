<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
const { label } = defineProps<{ label: string }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    class="switch"
    :class="{ 'switch--on': model }"
    :aria-checked="model"
    :aria-label="label"
    @click="model = !model"
  >
    <span class="knob" />
  </button>
</template>

<style scoped>
.switch {
  width: 52px; height: 32px; flex: 0 0 auto; border: 0; border-radius: 99px; padding: 0;
  background: #56625C; position: relative; transition: background 0.15s;
}
.switch--on { background: #3FA37F; }
.knob {
  position: absolute; top: 4px; left: 4px; width: 24px; height: 24px; border-radius: 99px; background: #fff;
  transition: transform 0.15s;
}
.switch--on .knob { transform: translateX(20px); }
</style>
