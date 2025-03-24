<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">AI Generated Component</h1>
    <DarkModeToggle />
    <Button label="Click" />

    <div class="mb-4">
      <textarea
        v-model="prompt"
        class="w-full p-2 border rounded-lg mb-2"
        rows="4"
        placeholder="Enter your prompt here..."
      ></textarea>

      <button
        @click="generateComponent"
        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        :disabled="isGenerating"
      >
        {{ isGenerating ? "Generating..." : "Generate Component" }}
      </button>
    </div>

    <div v-if="error" class="text-red-500 mb-4">
      {{ error }}
    </div>

    <ClientOnly>
      <!-- <component :is="dynamicComponent" /> -->
      <!-- <component :is="dynamicComponent2" /> -->
      <!-- <component :is="dynamicComponent3" /> -->
      <component :is="dynamicComponent4" />
        <!-- <dynamic-component-4 /> -->
    </ClientOnly>
  </div>
</template>
<script setup>
import { onRenderTracked, onRenderTriggered } from "vue";
import Button from "primevue/button";
const prompt = ref("Generate a table");
const error = ref("");
const isGenerating = ref(false);
const componentData = ref(null);

// const dynamicComponent = defineAsyncComponent(async () => {
//   // Fetch the precompiled module text from your backend.
//   const moduleText = await $fetch("/api/test");

//   const blob = new Blob([moduleText], { type: "application/javascript" });
//   const blobUrl = URL.createObjectURL(blob);

//   // Dynamically import the module from the blob URL.
//   const module = await import(/* @vite-ignore */ blobUrl);

//   console.log(module);

//   // Return the component to be used by defineAsyncComponent.
//   return module;
// });
// const dynamicComponent2 = defineAsyncComponent(async () => {
//   // Fetch the precompiled module text from your backend.
//   const moduleText = await $fetch("/api/test2");

//   const blob = new Blob([moduleText], { type: "application/javascript" });
//   const blobUrl = URL.createObjectURL(blob);

//   // Dynamically import the module from the blob URL.
//   const module = await import(/* @vite-ignore */ blobUrl);

//   console.log(module);

//   // Return the component to be used by defineAsyncComponent.
//   return module;
// });
// const dynamicComponent3 = defineAsyncComponent(async () => {
//   // Fetch the precompiled module text from your backend.
//   const moduleText = await $fetch("/api/test3");

//   const blob = new Blob([moduleText], { type: "application/javascript" });
//   const blobUrl = URL.createObjectURL(blob);

//   // Dynamically import the module from the blob URL.
//   const vueInstance = await import("vue");
//   const module = await import(/* @vite-ignore */ blobUrl);

//   const initialize = module.default;

//   const component = initialize(vueInstance);

//   // Return the component to be used by defineAsyncComponent.
//   return component;
// });
const dynamicComponent4 = defineAsyncComponent(async () => {
  // Fetch the precompiled module text from your backend.
  const moduleText = await $fetch("/api/test4");

  const blob = new Blob([moduleText], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);

  console.log(useNuxtApp());

  // Dynamically import the module from the blob URL.
  const vueInstance = await import("vue");
  const module = await import(/* @vite-ignore */ blobUrl);

  // return module

  // Check if the module text contains Button component
  const hasButtonComponent = moduleText.includes('Button');
  
  // Import Button component if needed
  const Button = hasButtonComponent ? (await import('primevue/button')).default : null;
  
  // Prepare components array for initialization
  const components = {};
  if (hasButtonComponent) {
    components.Button = Button;
  }

  const initialize = module.default;

  const composables = {
    useCounter,
  }

  console.log('components', components)

  const component = initialize(vueInstance, composables, components);
  // const component = initialize(
  //   ref,
  //   reactive,
  //   computed,
  //   watch,
  //   onMounted,
  //   onUnmounted,
  //   useNuxtApp,
  //   onRenderTracked,
  //   onRenderTriggered
  // );

  // Return the component to be used by defineAsyncComponent.
  return component;
});

const generateComponent = async () => {
  if (!prompt.value.trim()) {
    error.value = "Please enter a prompt";
    return;
  }

  error.value = "";
  isGenerating.value = true;

  try {
    const data = await $fetch("/api/ai", {
      query: {
        prompt: prompt.value,
      },
    });

    // Store the component data to pass to the server component
    componentData.value = data;

    // Add any global styles
    useHead({
      style: [
        {
          id: "ai-generated-style",
          children: data.css,
        },
      ],
    });
  } catch (e) {
    console.error("API request failed:", e);
    error.value =
      "Failed to generate component: " + (e.message || "Unknown error");
  } finally {
    isGenerating.value = false;
  }
};
</script>
