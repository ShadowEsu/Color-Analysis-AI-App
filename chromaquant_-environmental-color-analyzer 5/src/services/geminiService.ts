import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Region } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const analyzeColor = async (
  base64Image: string,
  regions: Region[],
  valueA: number,
  valueB: number
): Promise<AnalysisResult> => {
  const model = "gemini-3-flash-preview";

  const regionDescriptions = regions.map(r => 
    `${r.label}: x=${r.x.toFixed(2)}%, y=${r.y.toFixed(2)}%, width=${r.width.toFixed(2)}%, height=${r.height.toFixed(2)}%`
  ).join('\n');

  const prompt = `
You are a quantitative color analysis system for environmental testing.

INPUT DATA:
- Image provided.
- Regions defined (as percentages of image width/height):
${regionDescriptions}
- User-provided numeric values:
  - Reference Color A (refA) = ${valueA}
  - Reference Color B (refB) = ${valueB}

OBJECTIVES:
1. REGION BOUNDARY REFINEMENT: The provided coordinates are user-defined approximations. You MUST visually inspect the image at these locations and identify the actual physical boundaries of the Reference A, Reference B, Test Color, and Control patches. Ensure your color sampling is taken from the center-most, most representative pixels of each patch, avoiding edges, shadows, or specular highlights that may occur at the boundaries.
2. ADVANCED LIGHT NORMALIZATION:
   - Use the 'Control (White)' patch as the absolute spectral baseline.
   - Analyze the RGB/CMYK distribution of the white patch to estimate the ambient color temperature (e.g., "Warm 3000K", "Daylight 5500K", "Cool 7500K").
   - Evaluate the exposure level and dynamic range. Detect if the control patch is overexposed (clipped) or underexposed.
   - Identify local lighting artifacts such as shadows, gradients, or glares across the patches.
   - Apply a normalization transform to the refA, refB, and test colors to remove these environmental biases.
3. LUMINOSITY ANALYSIS: Estimate the ambient luminosity (brightness) of the environment based on the CONTROL patch's pixel intensity and the overall image exposure. Provide this as a numeric value (0-1000 lux estimate or relative percentage).
4. COLOR COMPARISON: Perform high-precision colorimetric comparison between the normalized TEST color and the two reference endpoints (A and B). Analyze hue, saturation, and value (HSV) or LAB color space distances.
5. PERCENTAGE POSITION: Compute pct_to_A and pct_to_B (summing to 100) representing positional proximity along the gradient between A and B.
6. NUMERIC INTERPOLATION: Compute estimated_value = (pct_to_A / 100) * ${valueA} + (pct_to_B / 100) * ${valueB}.

OUTPUT REQUIREMENTS:
- Return JSON only.
- In the 'lighting_normalization.notes', provide a detailed technical summary including:
  - Detected Color Temperature (K).
  - Exposure quality (e.g., "Optimal", "Slightly underexposed").
  - Presence of shadows or uneven lighting.
  - Specific adjustments made to compensate for these factors.
- Use terms like: estimated, approximate, interpolated, between.
- Avoid words like: exact, definite, confirmed.
`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1],
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reference_A: {
            type: Type.OBJECT,
            properties: { value: { type: Type.NUMBER } },
            required: ["value"]
          },
          reference_B: {
            type: Type.OBJECT,
            properties: { value: { type: Type.NUMBER } },
            required: ["value"]
          },
          lighting_normalization: {
            type: Type.OBJECT,
            properties: {
              method: { type: Type.STRING },
              notes: { type: Type.STRING }
            },
            required: ["method", "notes"]
          },
          pct_to_A: { type: Type.NUMBER },
          pct_to_B: { type: Type.NUMBER },
          estimated_value: { type: Type.NUMBER },
          luminosity: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["value", "unit", "description"]
          },
          explanation: { type: Type.STRING }
        },
        required: ["reference_A", "reference_B", "lighting_normalization", "pct_to_A", "pct_to_B", "estimated_value", "luminosity", "explanation"]
      }
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Invalid response from analysis engine");
  }
};
