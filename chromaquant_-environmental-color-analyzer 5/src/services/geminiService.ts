import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Region } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

if (!apiKey) {
  console.warn(
    "VITE_GEMINI_API_KEY is not set. The analysis feature will not work until this is configured."
  );
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export const analyzeColor = async (
  base64Image: string,
  regions: Region[],
  valueA: number,
  valueB: number
): Promise<AnalysisResult> => {
  const model = "gemini-3-flash-preview";

  const regionDescriptions = regions
    .map(
      (r) =>
        `${r.label}: Average Sampled HEX: ${r.color ?? "N/A"}. Location: x=${r.x.toFixed(1)}%, y=${r.y.toFixed(1)}%`
    )
    .join("\n");

  const prompt = `
You are a quantitative color analysis system for environmental testing. PRIORITIZE the ground-truth HEX values provided; do not rely on visual estimation.

INPUT DATA:
- Image provided for context.
- Regions with MATHEMATICALLY SAMPLED average HEX (from canvas pixel averaging):
${regionDescriptions}
- User-provided numeric values:
  - Reference Color A (refA) = ${valueA}
  - Reference Color B (refB) = ${valueB}

OBJECTIVES:
1. PRIORITIZE HEX VALUES: The provided HEX values are ground-truth pixel averages for each region. Use these as your primary data. The image is for validation only.
2. WHITE BALANCE / NORMALIZATION: Use the 'Control' region's HEX to detect ambient light tint. Apply a white-balance shift to RefA, RefB, and Test HEX values to remove lighting bias before calculation.
3. CIELAB DELTA-E INTERPOLATION: Convert RefA, RefB, and Test HEX values into CIELAB color space. Calculate the Delta-E (perceptual distance) of Test between RefA and RefB. Use these distances to determine percentage position: pct_to_A and pct_to_B (summing to 100).
4. LUMINOSITY ANALYSIS: Derive ambient luminosity from the Control patch HEX intensity and overall image exposure. Provide a numeric value (0–1000 lux estimate or relative percentage).
5. NUMERIC INTERPOLATION: Compute estimated_value = (pct_to_A / 100) * ${valueA} + (pct_to_B / 100) * ${valueB}.

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
