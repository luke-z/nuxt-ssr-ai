import { parse, compileScript } from "vue/compiler-sfc";

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
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';

const title = ref("Vue SFC Demonstration");

const items = reactive([
  { id: 1, text: "Learn Vue", completed: false },
  { id: 2, text: "Build a complex SFC", completed: false },
]);

const newItem = ref("");

const completedCount = computed(() =>
  items.filter((item) => item.completed).length
);

const filteredItems = computed(() => items);

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

function toggleItem(item) {
  item.completed = !item.completed;
}

function removeItem(index) {
  items.splice(index, 1);
}

watch(
  items,
  (newVal, oldVal) => {
    console.log("Items changed:", newVal);
  },
  { deep: true }
);

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

  console.log(script.bindings);

  let clientCode = script.content;

  if (script.bindings) {
    clientCode =
      `/* Analyzed bindings: ${JSON.stringify(script.bindings, null, 2)} */\n` +
      clientCode;
  }

  clientCode += `\n${COMP_IDENTIFIER}.__file = ${JSON.stringify(filename)}`;
  clientCode += `\nexport default ${COMP_IDENTIFIER}`;

  return clientCode;
});
