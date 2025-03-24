import { parse, compileScript } from "vue/compiler-sfc";
import path from "path";
import fs from "fs";
import esbuild from "esbuild";

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
// import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';

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
  setTimeout(() => {
    newItem.value = "hello";
    addItem();
  }, 1000);
});

onUnmounted(() => {
  console.log("Component unmounted");
});
</script>
`;

const COMP_IDENTIFIER = `__sfc__`;

// https://github.com/vuejs/repl/blob/5e092b6111118f5bb5fc419f0f8f3f84cd539366/src/transform.ts

export default defineEventHandler(async (event) => {
  const { errors, descriptor } = parse(completeTemplate, {
    filename: "App.vue",
    sourceMap: true,
  });

  if (errors.length > 0) {
    console.error(errors);
    return "Error parsing template";
  }

  const id = "AIComponent";
  const filename = "AIComponent.vue";

  // Compile script with inlineTemplate true to include template compilation
  const script = compileScript(descriptor, {
    inlineTemplate: true,
    id,
    genDefaultAs: COMP_IDENTIFIER,
  });

  // Get the raw script content
  let clientCode = script.content;

  if (script.bindings) {
    clientCode =
      `/* Analyzed bindings: ${JSON.stringify(script.bindings, null, 2)} */\n` +
      clientCode;
  }

  clientCode += `\n${COMP_IDENTIFIER}.__file = ${JSON.stringify(filename)}`;
  clientCode += `\nexport default ${COMP_IDENTIFIER}`;

  // Create a temporary file for esbuild to process
  const tempFile = path.join(process.cwd(), "temp-component.js");
  fs.writeFileSync(tempFile, clientCode);

  try {
    // Use esbuild to bundle at runtime
    const result = await esbuild.build({
      entryPoints: [tempFile],
      bundle: true,
      write: false,
      format: "esm",
      platform: "browser",
      // external: ['vue'], // Keep Vue as external dependency
      metafile: true,
    });

    // Get the bundled code
    const bundledCode = result.outputFiles[0].text;

    const exportRegex = /export\s*{\s*([A-Za-z0-9_$]+)\s+as\s+default\s*}/;
    const exportMatch = bundledCode.match(exportRegex);

    const modifiedCode = bundledCode.replace(
      exportRegex,
      'const componentToReturn = ' + exportMatch[1]
    );

    const wrappedCode = `    
    function initialize(vueInstance) {
      const { ref, reactive, computed, watch, onMounted, onUnmounted, useNuxtApp } = vueInstance;
      ${modifiedCode}
      return componentToReturn;
    }
    
    export default initialize;
    `;

    // Optional: Log the dependency graph
    if (result.metafile) {
      const meta = await esbuild.analyzeMetafile(result.metafile);
      console.log("Bundle analysis:", meta);
    }

    // Clean up the temporary file
    fs.unlinkSync(tempFile);

    return wrappedCode;
  } catch (error) {
    console.error("Bundle error:", error);
    // Clean up on error
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    return `Error bundling component: ${error.message}`;
  }
});
