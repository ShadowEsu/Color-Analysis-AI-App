## Color-Analysis-AI-App (ChromaQuant)

AI‑assisted environmental color analyzer built for reading test kits from photos.  
You define two reference colors and a test region; the app uses Google Gemini Vision to normalize lighting, compare colors, and interpolate a numeric value for the sample.

---

### Features

- **Camera & image upload**
  - Capture a photo directly from your device camera (with an environment‑facing preference).
  - Upload any existing image of a test kit or color strip.

- **Interactive region selection**
  - Draw boxes on the image for:
    - **Reference A** (refA)
    - **Reference B** (refB)
    - **Test Color**
    - **Control (White)** patch for light normalization
  - Regions are stored as percentages of the image, so they scale correctly on different screens.

- **Calibration input**
  - Enter numeric calibration values for **Reference A** and **Reference B** (e.g. 0 and 100, or two concentrations from your real kit).
  - The test color will be mapped between these endpoints.

- **AI‑powered color analysis**
  - Sends the image plus region metadata to **Gemini 3 Flash Vision** via `@google/genai`.
  - Gemini:
    - Refines patch boundaries visually.
    - Uses the white control region to infer ambient lighting and normalize colors.
    - Compares the test patch to Reference A and B in a color space like LAB/HSV.

- **Quantitative interpolation**
  - Computes:
    - **`pct_to_A`** and **`pct_to_B`** (which sum to 100%) – how close the test is to each reference.
    - **`estimated_value`** using linear interpolation between your two reference values.
  - Shows a visual bar split between A and B plus a breakdown of the calculation.

- **Lighting & luminosity insight**
  - Descriptive notes about:
    - Detected color temperature (approximate K).
    - Exposure quality and lighting artifacts (shadows, glare, etc.).
  - A luminosity estimate (value + unit + plain‑language description).

- **History and restoration**
  - Every run is saved in the browser’s `localStorage` with:
    - Title, image, regions, A/B values, and the full result.
  - View all previous runs in a side drawer, restore any dataset, or delete items.

- **Modern UI / UX**
  - Built with Tailwind CSS 4 and motion‑based micro‑animations.
  - Responsive layout with a clean, lab‑instrument style interface.

---

### Tech stack & languages

- **Frontend framework**: React 19 (`react`, `react-dom`)
- **Language**: TypeScript
- **Bundler / Dev server**: Vite 6
- **Styling**: Tailwind CSS 4
- **Animation**: `motion` (Framer Motion–style API)
- **Icons**: `lucide-react`
- **AI SDK**: `@google/genai` (Gemini 3 Flash Vision)
- **Runtime environment**: Browser (no backend server in this repo)

Key dependencies are declared in `package.json` under the `chromaquant_-environmental-color-analyzer 5` folder.

---

### How the code is structured

- **`src/main.tsx`**
  - Vite/React entry point.
  - Renders `App` inside React `StrictMode` and imports global styles from `index.css`.

- **`src/App.tsx`**
  - Main UI and state container.
  - Manages:
    - Image source (camera or upload).
    - Region definitions (`Region[]`) for refA, refB, test, and control.
    - Calibration values `valueA` and `valueB`.
    - Analysis result (`AnalysisResult | null`), error state, and loading flag.
    - Local history (load, save, restore, delete).
  - Orchestrates:
    - Camera access and snapshot capture.
    - Passing the image and regions into `RegionSelector`.
    - Calling `analyzeColor(...)` from `geminiService` when the user clicks **Execute Quantitative Analysis**.
    - Rendering the full results panel: interpolation bar, breakdown, normalization notes, luminosity, and explanation.

- **`src/components/RegionSelector.tsx`**
  - Handles interactive drawing of rectangular regions on top of the image.
  - Converts mouse coordinates into percentages of the container’s width/height and updates the active `Region`.
  - Renders colored outlines and labels (Reference A/B, Test Color, Control).

- **`src/services/geminiService.ts`**
  - Wraps the Gemini Vision call via `@google/genai`.
  - Accepts:
    - Base64 image data URL.
    - Region metadata (`Region[]` with x, y, width, height in %).
    - Numeric calibration values `valueA` and `valueB`.
  - Builds a detailed prompt describing:
    - How to refine region boundaries visually.
    - How to normalize using the white control patch.
    - How to compute pct_to_A, pct_to_B, luminosity, and estimated_value.
  - Configures **structured JSON output** using `responseSchema`, so Gemini returns:
    - `reference_A`, `reference_B` (with numeric `value`s)
    - `lighting_normalization` (`method`, `notes`)
    - `pct_to_A`, `pct_to_B`, `estimated_value`
    - `luminosity` (`value`, `unit`, `description`)
    - `explanation`
  - Parses and returns the result as an `AnalysisResult` object.

- **`src/types.ts`**
  - TypeScript interfaces shared across the app:
    - `Region` – region id, label, position/size (percentages), optional `color`.
    - `AnalysisResult` – the typed structure of the Gemini JSON response.
    - `HistoryItem` – shape of past analysis records stored in `localStorage`.

---

### How the analysis works (high‑level flow)

1. **Capture or upload image**
   - You either take a photo via camera or upload an existing image.
   - The image is stored as a base64 data URL in React state.

2. **Define regions**
   - Choose which patch you want to define (Reference A, Reference B, Test, Control).
   - Click‑and‑drag on the image to draw a rectangular region.
   - `RegionSelector` converts the mouse coordinates to `%` of the image box and updates the `regions` array.

3. **Set calibration values**
   - Enter numeric values for `Reference A` and `Reference B`.
   - These correspond to real‑world values on your kit (e.g., 0 and 100 ppm).

4. **Send data to Gemini**
   - When all regions are defined, clicking **Execute Quantitative Analysis**:
     - Validates that each region has a non‑zero width.
     - Calls:
       ```ts
       analyzeColor(image, regions, valueA, valueB);
       ```
     - `geminiService` sends:
       - The text prompt (instructions + calibration values + region coordinates).
       - The image bytes from the base64 string.

5. **Gemini computes color distances & interpolation**
   - Gemini:
     - Inspects the image at each region.
     - Normalizes colors using the white control patch and inferred lighting.
     - Moves into a color space such as LAB/HSV.
     - Computes how close the test patch is to Reference A and B:
       \[
       pct\_to\_A + pct\_to\_B = 100
       \]
     - Computes the interpolated numeric result:
       \[
       estimated\_value = (pct\_to\_A / 100) \cdot valueA + (pct\_to\_B / 100) \cdot valueB
       \]

6. **Display results**
   - The app shows:
     - The interpolated `estimated_value`.
     - Percent contributions toward A and B.
     - A bar graph split between A and B.
     - Calculation breakdown lines for transparency.
     - Normalization notes, luminosity metrics, and a natural‑language explanation.

---

### Getting started (run locally)

#### Prerequisites

- **Node.js** (LTS recommended – e.g., 20.x)

#### Install & run

```bash
git clone <this-repo-url>
cd Color-Analysis-AI-App-1/chromaquant_-environmental-color-analyzer\ 5
npm install
```

1. **Configure your Gemini API key**
   - Create a `.env.local` file in the app directory:
     ```bash
     touch .env.local
     ```
   - Add your key (from Google AI Studio):
     ```bash
     VITE_GEMINI_API_KEY=your-api-key-here
     ```

2. **Start the dev server**
   ```bash
   npm run dev
   ```
   - Open the URL printed in the terminal (typically `http://localhost:5173`).

3. **Build for production (optional)**
   ```bash
   npm run build
   npm run preview   # to locally preview the production build
   ```

---

### AI Studio app link

If this project was generated from Google AI Studio, you can also open or edit the original app configuration there:

- **AI Studio App**: [`Color-Analysis-AI-App`](https://ai.studio/apps/138f0f42-3a5b-4e24-8ae5-6c91ee56aaf9)

---

### Limitations & notes

- **Approximate results**: The system is designed for interpolated, estimated values, not certified lab measurements.
- **Client‑side API key**: The current setup calls Gemini directly from the browser. For production use, you should proxy calls through a secure backend so your API key is not exposed.
- **Environment variability**: Strong reflections, shadows, or poor focus will reduce accuracy. Always try to capture images with even lighting and clearly visible patches.

