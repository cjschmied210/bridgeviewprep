import { GoogleGenAI, Type } from "@google/genai";

// Initialize the new Gemini API client
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
    console.error("VITE_GEMINI_API_KEY is not defined in the environment variables!");
}
const aiDialog = new GoogleGenAI({ apiKey: API_KEY });

// Define the required output schema for the model to ensure strict JSON adherence
const generationSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "A short, descriptive title for the reading check or quiz."
        },
        passage: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "ONLY populated if there is ONE single shared reading passage for ALL questions in the document. If each question has its own self-contained passage, leave this as an empty array []. Preserve margin line numbers (e.g., [5], [10]) inline."
        },
        questions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.NUMBER },
                    passage: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "If this specific question has its OWN self-contained passage (not shared with other questions), put that passage here as an array of paragraphs. Leave this as an empty array [] if all questions share the top-level passage."
                    },
                    text: { type: Type.STRING, description: "The actual question text." },
                    options: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                label: { type: Type.STRING, description: "A, B, C, D, or E" },
                                text: { type: Type.STRING, description: "The text of this answer choice" }
                            },
                            required: ["label", "text"]
                        }
                    },
                    correctAnswer: { type: Type.STRING, description: "The uppercase letter of the correct option (e.g. A, B, C, D, or E)" },
                    explanation: { type: Type.STRING, description: "A pedagogical explanation of why this answer is correct, citing the passage." }
                },
                required: ["id", "passage", "text", "options", "correctAnswer", "explanation"]
            }
        }
    },
    required: ["title", "passage", "questions"]
};

// Common prompt instructions
const PROMPT_INSTRUCTIONS = `
You are an expert educational curriculum designer. 
Analyze the provided material (image or raw text) and generate a rigorous reading comprehension quiz.

Follow these strict requirements:

**PASSAGE HANDLING — READ CAREFULLY:**
- SCENARIO A (Shared passage): If the document has ONE single reading passage followed by multiple questions, put the entire passage in the top-level "passage" array and set every question's "passage" field to an empty array [].
- SCENARIO B (Per-question passages): If each question has its OWN self-contained paragraph or excerpt (common in SAT/ACT-style "Words in Context" sections where each numbered item has its own mini-paragraph), set the top-level "passage" to an empty array [] and put each question's dedicated passage text in that question's own "passage" field.
- Do NOT mix both. Choose one scenario that matches the document structure.

For EITHER scenario:
- Retain the original paragraph structure exactly. Do NOT break paragraphs into individual sentences.
- CRITICAL FOR MARGIN LINE NUMBERS: If line numbers appear in the margin (e.g., 5, 10, 15), YOU MUST embed them inline in brackets (e.g., "[5]") at the exact location they appear in the original text.

1. EXTRACT the explicit multiple-choice questions provided within the reading material itself. DO NOT create your own questions. You must use the exact questions and answer choices that are already written in the uploaded document. If and only if there are absolutely NO questions provided in the document, then you may create 3 to 5 multiple-choice questions based on the material.
2. Provide all the options for each question as they appear in the source text (typically 4 or 5 choices labeled A, B, C, D, and sometimes E).
CRITICAL FOR OPTIONS: You must transcribe the options VERBATIM. Do NOT summarize or truncate them. If multiple options start with the same repeated phrase (common in grammar/editing questions), you MUST include the full repeated phrase in every option just as it is written on the page.
3. Provide a clear, pedagogical "explanation" for the correct answer. If the question refers to specific lines (e.g. "lines 23-28"), your explanation MUST cite those lines and explain how the text supports the answer.
4. You MUST return ONLY valid JSON matching the provided schema. Do not write markdown, do not write explanations outside the JSON.
`;

export const aiService = {
    /**
     * Helper to convert a File object into the inlineData format expected by Gemini.
     */
    fileToGenerativePart: async (file) => {
        const base64EncodedDataPromise = new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
        });

        return {
            inlineData: {
                data: await base64EncodedDataPromise,
                mimeType: file.type
            },
        };
    },

    /**
     * Generate a test from either a File (image) or raw text.
     */
    generateTest: async (files = [], rawText = "") => {
        try {
            const parts = [PROMPT_INSTRUCTIONS];

            if (files && !Array.isArray(files)) {
                files = [files];
            }

            if (files && files.length > 0) {
                for (const f of files) {
                    const imagePart = await aiService.fileToGenerativePart(f);
                    parts.push(imagePart);
                }
            }

            if (rawText.trim()) {
                parts.push(`Here is the raw text to analyze: \n\n${rawText}`);
            }

            // Use the new SDK calling pattern
            const response = await aiDialog.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: parts,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: generationSchema,
                    temperature: 0.2, // Low temperature for factual consistency
                }
            });

            const textContent = response.text;

            if (!textContent) {
                console.error("Gemini API returned an empty or undefined response text. Full response object:", response);
                throw new Error("The AI returned an empty response. This may be due to Google's safety filters flagging the reading passage, or a temporary API hiccup. Please try a different text.");
            }

            // The model is constrained by responseSchema, so textContent should be a clean JSON string
            const jsonResult = JSON.parse(textContent);
            return jsonResult;

        } catch (error) {
            console.error("Error generating test from Gemini:", error);
            // Surface the actual error message from the API block
            const errorMessage = error?.message || error?.toString() || "Unknown API error";
            throw new Error(errorMessage);
        }
    }
};
