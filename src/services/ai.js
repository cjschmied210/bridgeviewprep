/**
 * Service to handle AI-powered quiz generation.
 * This client communicates with the secure backend serverless endpoint at /api/generate-test.
 */
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
     * Generate a test from either a File (image) or raw text by hitting the secure backend endpoint.
     */
    generateTest: async (files = [], rawText = "") => {
        try {
            if (files && !Array.isArray(files)) {
                files = [files];
            }

            const fileParts = [];
            if (files && files.length > 0) {
                for (const f of files) {
                    const imagePart = await aiService.fileToGenerativePart(f);
                    fileParts.push(imagePart);
                }
            }

            const response = await fetch('/api/generate-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rawText,
                    fileParts
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server responded with status ${response.status}`);
            }

            const jsonResult = await response.ok ? await response.json() : null;
            return jsonResult;

        } catch (error) {
            console.error("Error generating test from serverless backend:", error);
            const errorMessage = error?.message || error?.toString() || "Unknown error";
            throw new Error(errorMessage);
        }
    }
};

