<template>
  <li class="sidepanel-tab">
    <a class="sidebar-tab-link" href="#" :data-tab-link="`tab-${tabNumber}`" role="tab">
      <span class="material-symbols-sharp">{{ symbol }}</span>
    </a>
  </li>
</template>

<script setup>
let props = defineProps(["tabNumber", "symbol"])
</script>

<style scoped>

</style>