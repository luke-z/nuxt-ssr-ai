<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">AI Generated Component</h1>

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

    <div v-if="dynamicComponent">
      <component :is="dynamicComponent" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent } from "vue";

const prompt = ref("Generate a table");
const error = ref("");
const isGenerating = ref(false);
const dynamicComponent = shallowRef();

const generateComponent = async () => {
  if (!prompt.value.trim()) {
    error.value = "Please enter a prompt";
    return;
  }

  error.value = "";
  isGenerating.value = true;

  try {
    const { data } = await useFetch("/api/ai", {
      query: {
        prompt: prompt.value,
      },
    });

    // Use defineAsyncComponent to handle errors more gracefully
    dynamicComponent.value = defineAsyncComponent({
      loader: async () => {
        // Create the component with proper error handling
        return defineComponent({
          template: data.value.template || "<div>No template generated</div>",
          setup() {
            try {
              // Use a safer approach with the Function constructor
              // The constructor is still needed for dynamic code execution
              const setupFn = new Function(
                "ref",
                "computed",
                `
                try {
                  ${data.value.script || ""}
                  // If no return statement was added by the AI
                  return {}; 
                } catch (err) {
                  console.error('Error in generated component setup:', err);
                  return {}; 
                }
              `
              );

              return setupFn(ref, computed);
            } catch (setupError) {
              console.error("Failed to create setup function:", setupError);
              error.value =
                "Component generation failed: " + setupError.message;
              return {};
            }
          },
        });
      },
      // Add error handling for the async component
      errorComponent: {
        template:
          '<div class="p-4 border border-red-500 rounded">Failed to load component</div>',
      },
      onError(error) {
        console.error("Failed to load component:", error);
      },
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
