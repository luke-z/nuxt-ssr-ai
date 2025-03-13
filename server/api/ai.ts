import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";

// Define the schema for the AI response
const AIResponseSchema = z.object({
  template: z.string(),
  script: z.string().optional(),
});

const ScriptResponseSchema = z.object({
  script: z.string(),
});

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const prompt = query.prompt;
    
    // Input validation
    if (!prompt || typeof prompt !== 'string') {
      return createError({
        statusCode: 400,
        message: 'Missing or invalid prompt parameter'
      });
    }
    
    if (prompt.trim().length < 3) {
      return createError({
        statusCode: 400,
        message: 'Prompt is too short'
      });
    }

    const openai = new OpenAI();
    
    // Combine the two calls into one more comprehensive prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that generates beautiful, modern Vue 3 components. Return your response in a structured JSON format with 'template' and 'script' fields, do not include the <template> and <script> tags. The template should contain the Vue template section, and the script should contain the script setup section. Use tailwind css for styling. For scripting, use the script setup syntax. IMPORTANT: Make sure the script ends with a return statement that returns all variables and functions used in the template. Example: 'return { count, increment, items, ...etc }'. You are allowed to use ref and computed as they are auto imported, apart from that, do not use any other imports."
        },
        { role: "user", content: prompt as string },
      ],
      response_format: zodResponseFormat(AIResponseSchema, "ai_response"),
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("No content returned from AI");
    }

    try {
      const contentJson = JSON.parse(content);
      const validatedContent = AIResponseSchema.parse(contentJson);
      
      // Basic safety checks on the received content
      if (!validatedContent.template || validatedContent.template.trim().length < 10) {
        throw new Error("Invalid template returned from AI");
      }
      
      // Verify the script contains a return statement if provided
      if (validatedContent.script && !validatedContent.script.includes('return {')) {
        // Add a basic return statement if missing
        validatedContent.script += '\nreturn {};';
      }

      return validatedContent;
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw createError({
        statusCode: 500,
        message: "Failed to parse AI-generated component"
      });
    }
  } catch (error) {
    console.error("AI Generation error:", error);
    return createError({
      statusCode: 500,
      message: (error as Error).message || "Failed to generate component"
    });
  }
});
