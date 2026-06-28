import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("GEMINI_API_KEY is not defined in the backend environment!");
}

const aiDialog = new GoogleGenAI({ apiKey: API_KEY || "" });

// Define the required output schema for the model to ensure strict JSON adherence
const generationSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "A short, descriptive title for the reading check or quiz."
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
                        description: "The reading passage for THIS question, as an array of paragraphs. If all questions share one long article, copy the full article passage into every question's passage field. If each question has its own self-contained mini-paragraph (SAT/ACT style), put only that question's paragraph(s) here. This field is ALWAYS required and NEVER empty."
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
    required: ["title", "questions"]
};

// Common prompt instructions
const PROMPT_INSTRUCTIONS = `
You are an expert educational curriculum designer.
Analyze the provided material (image or raw text) and generate a rigorous reading comprehension quiz.

Follow these strict requirements:

**PASSAGE RULE (CRITICAL):**
Every question object MUST include its own "passage" array. Never leave it empty.
- If the document has ONE shared reading article that all questions refer to: copy the full article into EVERY question's "passage" field.
- If each question has its OWN self-contained paragraph or excerpt (common in SAT/ACT "Words in Context" sections where each numbered box has its own text): put only that question's specific paragraph(s) into its "passage" field.
Do NOT put passage text at the top level. All passages go inside each question object.

For all passages:
- Retain the original paragraph structure exactly. Do NOT split paragraphs into individual sentences.
- CRITICAL FOR MARGIN LINE NUMBERS: If line numbers appear in the margin (e.g., 5, 10, 15), YOU MUST embed them inline in brackets (e.g., "[5]") at the exact location they appear in the original text.

1. EXTRACT the explicit multiple-choice questions provided within the reading material itself. DO NOT create your own questions. If there are absolutely NO questions in the document, you may create 3 to 5 multiple-choice questions.
2. Provide all answer choices VERBATIM as they appear in the source text. Do NOT summarize or truncate. If multiple options share the same opening phrase, include the full phrase in every option.
3. Provide a clear, pedagogical "explanation" for the correct answer, citing specific lines if applicable.
4. Return ONLY valid JSON matching the provided schema. No markdown, no explanations outside the JSON.
`;

export default async function handler(req, res) {
    // Add simple CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!API_KEY) {
        return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    try {
        const { rawText, fileParts } = req.body;

        const parts = [PROMPT_INSTRUCTIONS];

        if (fileParts && Array.isArray(fileParts)) {
            for (const part of fileParts) {
                parts.push(part);
            }
        }

        if (rawText && rawText.trim()) {
            parts.push(`Here is the raw text to analyze: \n\n${rawText}`);
        }

        const response = await aiDialog.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: parts,
            config: {
                responseMimeType: "application/json",
                responseSchema: generationSchema,
                temperature: 0.2,
            }
        });

        const textContent = response.text;

        if (!textContent) {
            console.error("Gemini API returned empty response text:", response);
            return res.status(500).json({ error: "The AI returned an empty response. This may be due to safety filters or a temporary hiccup." });
        }

        const jsonResult = JSON.parse(textContent);
        return res.status(200).json(jsonResult);

    } catch (error) {
        console.error("Error generating test from Gemini:", error);
        return res.status(500).json({ error: error?.message || error?.toString() || "Unknown API error" });
    }
}
