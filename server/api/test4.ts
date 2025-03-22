import path from "path";
import fs from "fs";
import { build } from 'vite';
import vue from '@vitejs/plugin-vue';

const completeTemplate = `
<template>
  <div class="container mx-auto p-6 max-w-lg bg-white rounded-lg shadow-md">
    <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">{{ title }}</h1>
    <div class="flex mb-4">
      <input
        v-model="newItem"
        placeholder="Enter new item"
        @keyup.enter="addItem"
        class="flex-grow px-4 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button @click="addItem" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r transition-colors">Add Item</button>
    </div>

    <transition-group name="list" tag="ul" class="space-y-2">
      <li
        v-for="(item, index) in filteredItems"
        :key="item.id"
        :class="{ 'bg-green-100': item.completed }"
        class="flex justify-between items-center p-3 border rounded-md transition-all"
      >
        <span @click="toggleItem(item)" class="cursor-pointer flex-grow">
          {{ item.text }}
        </span>
        <button @click="removeItem(index)" class="ml-2 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm transition-colors">Remove</button>
      </li>
    </transition-group>

    <div class="mt-6 text-gray-600 flex justify-between">
      <p>Total Items: <span class="font-semibold">{{ items.length }}</span></p>
      <p>Completed Items: <span class="font-semibold">{{ completedCount }}</span></p>
    </div>
  </div>
</template>

<script setup>

// Basic reactive state
const title = ref("Vue SFC Demonstration");

// Define a reactive list of items
const items = reactive([
  { id: 1, text: "Learn Vue", completed: false },
  { id: 2, text: "Build a complex SFC", completed: false },
]);

const newItem = ref("");

// Computed property for counting completed items
const completedCount = computed(() =>
  items.filter((item) => item.completed).length
);

// Computed property for filtering items (example purpose)
const filteredItems = computed(() => items);

// Function to add a new item
function addItem() {
  console.log("Adding item:", newItem.value);
  if (newItem.value.trim() === "") return;
  console.log("Adding item:", newItem.value);
  items.push({
    id: Date.now(),
    text: newItem.value,
    completed: false,
  });
  newItem.value = "";
}

// Function to toggle an item's completion state
function toggleItem(item) {
  item.completed = !item.completed;
}

// Function to remove an item by its index
function removeItem(index) {
  items.splice(index, 1);
}

// Watcher to log changes in items (deep watch)
watch(
  items,
  (newVal, oldVal) => {
    console.log("Items changed:", newVal);
  },
  { deep: true }
);

// Lifecycle hooks
onMounted(() => {
  console.log("Component mounted");
});

onUnmounted(() => {
  console.log("Component unmounted");
});
</script>
`;

const COMP_IDENTIFIER = `__sfc__`;

// https://github.com/vuejs/repl/blob/5e092b6111118f5bb5fc419f0f8f3f84cd539366/src/transform.ts

export default defineEventHandler(async (event) => {
  // Write the component to a temporary file
  const tempDir = path.join(process.cwd(), 'temp-build');
  const tempFile = path.join(tempDir, 'temp-component.vue');
  
  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Write SFC to temp file
  fs.writeFileSync(tempFile, completeTemplate);
  
  try {
    // Build with Vite
    const buildResult = await build({
      plugins: [vue()],
      esbuild: {
        platform: 'browser',
      },
      build: {
        write: false,
        lib: {
          entry: tempFile,
          formats: ['es'],
          fileName: 'component',
        },
       
      },
      logLevel: 'silent'
    });

    
    
    // Get the bundled code
    // The build result structure depends on the configuration
    const output = Array.isArray(buildResult) ? buildResult[0] : buildResult;
    const files = output.output || output;
    const jsFile = files.find(file => file.fileName.endsWith('.js'));
    const cssFile = files.find(file => file.fileName.endsWith('.css'));
    
    const bundledCode = jsFile.source || jsFile.code;

    // Replace all process.env.NODE_ENV with 'production' in the bundled code
    const productionCode = bundledCode.replace(/process\.env\.NODE_ENV/g, "'production'");
    
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });

    
    return productionCode;
  } catch (error) {
    console.error('Build error:', error);
    // Clean up on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    return `Error bundling component: ${error.message}`;
  }
});