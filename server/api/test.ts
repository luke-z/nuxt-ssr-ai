import { parse, compileScript, compileTemplate } from "vue/compiler-sfc";

const completeTemplate = `
<script setup>
import { ref } from 'vue'

const msg = ref('Hello World!')
</script>

<template>
  <h1>{{ msg }}</h1>
  <h2>test</h2>
  <input v-model="msg" />
</template>
`;

const COMP_IDENTIFIER = `__sfc__`;

export default defineEventHandler(async (event) => {
  const { errors, descriptor } = parse(completeTemplate);

  if (errors.length > 0) {
    console.error(errors);
    return "Error parsing template";
  }

  const id = "AIComponent";

  // Compile script
  const script = compileScript(descriptor, {
    inlineTemplate: false,
    id,
    genDefaultAs: COMP_IDENTIFIER,
  });

  // console.log(script);

  // Compile template
  const template = compileTemplate({
    id,
    filename: "src/App.vue",
    source: descriptor.template?.content || "",
    scoped: descriptor.styles.some((s) => s.scoped),
    slotted: descriptor.slotted,
    compilerOptions: {
      bindingMetadata: script.bindings,
    },
  });

  // Combine the compiled code
  let code = "";

  // Add imports from script
  code += script.content.replace(
    /export default [^]+?(\s*setup[^]*?)(\n})/s,
    (_, setup) => {
      return `import { ref } from 'vue'\n\n\nconst ${COMP_IDENTIFIER} = {
  __name: 'App',${setup}}\n`;
    }
  );

  // Add template render code
  code += "\n";
  code += template.code.replace(/export (function render)/, "$1");

  // Add component properties
  code += `\n${COMP_IDENTIFIER}.render = render`;
  code += `\n${COMP_IDENTIFIER}.__file = "src/App.vue"`;
  code += `\nexport default ${COMP_IDENTIFIER}`;

  return code;
});
