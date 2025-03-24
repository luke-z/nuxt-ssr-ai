import { build } from "vite";
import { RollupOutput, OutputChunk, OutputBundle, OutputOptions } from "rollup";
import vue from "@vitejs/plugin-vue";
import { Volume, createFsFromVolume } from "memfs";

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
      <p>{{ count }}</p>
      <button @click="addItem" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r transition-colors">Add Item</button>
      <button @click="increment" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r transition-colors">Increment</button>
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

const app = useNuxtApp();
console.log(app);

// Define a reactive list of items
const items = reactive([
  { id: 1, text: "Learn Vue", completed: false },
  { id: 2, text: "Build a complex SFC", completed: false },
]);

const newItem = ref("");
console.log(ref)

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

const { count, increment } = useCounter();

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

const vol = new Volume();
const memfs = createFsFromVolume(vol);

const memfsPlugin = () => {
  return {
    name: "vite-plugin-memfs",
    // The resolveId hook intercepts module resolution
    resolveId(source: string, importer: string | undefined) {
      try {
        if (memfs.existsSync(source)) {
          return source;
        }
      } catch (e) {
        // Ignore errors; fallback to normal resolution
      }
      return null;
    },
    // The load hook provides the module contents
    load(id: string) {
      try {
        console.log(id);
        if (memfs.existsSync(id)) {
          const content = memfs.readFileSync(id, "utf-8");
          return content as string;
        }
      } catch (e) {
        // Fallback if file not found in memfs
      }
      return null;
    },
  };
};

// Custom plugin to transform exports
const transformExportsPlugin = () => {
  return {
    name: "transform-exports",
    generateBundle(_options: OutputOptions, bundle: OutputBundle) {
      for (const fileName in bundle) {
        const chunk = bundle[fileName];
        if (chunk.type === "chunk") {
          // Remove Vue import statements
          chunk.code = chunk.code.replace(
            /import\s*{[^}]*}\s*from\s*["']vue["']\s*;?/g,
            ""
          );

          // Replace default exports with named exports
          // This transforms "export { component as default }" to "const component"
          chunk.code = chunk.code.replace(
            /export\s*{\s*([A-Za-z0-9_$]+)\s+as\s+default\s*};?/g,
            "const _componentExport = $1;"
          );
        }
      }
    },
  };
};

export default defineEventHandler(async (event) => {
  const componentName = "ai-component-" + Date.now();

  const tempFile = `/${componentName}.vue`;
  memfs.writeFileSync(tempFile, completeTemplate);

  try {
    // Build with Vite
    const buildResult = await build({
      plugins: [vue(), memfsPlugin(), transformExportsPlugin()],
      build: {
        write: false,
        minify: false,
        lib: {
          entry: tempFile,
          formats: ["es"],
          fileName: componentName,
        },
        rollupOptions: {
          // Make sure Vue is treated as external
          external: ["vue"],
          output: {
            // Use named exports instead of default exports
            exports: "named",
          },
        },
      },
      logLevel: "silent",
    });

    // Get the bundled code
    const files = (buildResult as RollupOutput[])[0].output;
    const jsFile = files.find((file: any) =>
      file.fileName.endsWith(".js")
    ) as OutputChunk;
    const bundledCode = jsFile.code;

    // Get the Vue imports used in the component render function
    const vueBindings = jsFile.importedBindings?.vue;

    // Wrap the code in an initialize function that returns the component to inject Vue, composables and other dependencies
    const wrappedCode = `    
      function initialize(Vue, composables) {
        const {
          ref,
          isRef,
          reactive,
          computed,
          watch,
          onMounted,
          onUnmounted,
          nextTick,
          unref,
          ${vueBindings.join(", ")}
        } = Vue;
        const { useCounter } = composables;
        ${bundledCode}
        return _componentExport;    
      }    
      export default initialize;
    `;
    return wrappedCode;
  } catch (error) {
    console.error("Build error:", error);
    return `Error bundling component: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
});
