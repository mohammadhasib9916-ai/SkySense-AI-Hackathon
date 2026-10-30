# SkySense AI (اسکائی سینس اے آئی / स्काईसेंस एआई / స్కైసెన్స్ AI)
> **“Know the Weather. Protect Your Future.”**

SkySense AI is a full-stack, mobile-first weather, farming, and disaster-safety assistant engineered specifically for people in India. It unites real-time Open-Meteo meteorological data with NVIDIA Nemotron open-source language models running on Nebius Token Factory.

---

## 🌟 Key Features

### 1. 🌤️ Real Meteorological Data (Open-Meteo)
- **Town & Village Search:** Instant Open-Meteo geocoding across Indian districts, tehsils, and cities.
- **GPS Current Location:** Uses browser geolocation only upon explicit user grant.
- **Atmospheric Metrics:** Temperature, apparent ("feels-like") temperature, relative humidity, wind speed, wind direction compass, precipitation, rain probability, UV index, and sunrise/sunset.
- **24-Hour Hourly Forecast:** Hourly probability strips for field planning.
- **7-Day Outlook:** Minimum and maximum temperature trends.
- **Zero Fake Weather:** Strictly grounded in live API data. Initial screen clearly requests a location.

### 2. 🚜 Farmer Agricultural Weather Advisory
- **Field Activity Suitability Matrix:**
  - **Chemical Spraying:** Evaluated against wind speed (>14 km/h drift risk) and rain wash-off.
  - **Irrigation:** Evaluated against expected precipitation to prevent waterlogging and reduce electricity waste.
  - **Harvesting & Drying:** Evaluated against humidity thresholds and storm risks.
  - **Sowing:** Evaluated against thermal extremes and torrential rain.
- **Crop Selector:** Pre-configured for Indian staples (Rice/Paddy, Cotton, Chilli, Wheat, Mustard, Tomato) plus custom crop input.
- **Statutory Transparency:** Prominent notices distinguishing operational weather indicators from clinical Krishi Vigyan Kendra (KVK) agronomic advice.

### 3. 🛡️ Weather Safety & Disaster Preparedness
- **Objective Hazard Evaluations:** Automated cautions for severe heatwaves (>40°C / >44°C), heavy downpours (>25 mm / >65 mm), high winds (>35 km/h / >50 km/h), and active thunderstorms (WMO 95/96/99).
- **Official Government Portals:** Direct access to:
  - IMD (*mausam.imd.gov.in*)
  - NDMA (*ndma.gov.in*)
  - SACHET National Alert Portal (*sachet.ndma.gov.in*)
- **Clear Distinction:** Transparently identifies calculated forecast thresholds versus official district collector evacuation orders.

### 4. 🧠 NVIDIA Nemotron via Nebius Token Factory
- **Server-Side Security:** All AI requests route through an Express backend (`/api/ai/chat`); API keys are never bundled or leaked to the client.
- **Model:** `nvidia/Llama-3_1-Nemotron-70B-Instruct-HF` (or configured `NEBIUS_MODEL`).
- **Grounded Context:** Automatically attaches live temperature, humidity, wind, and rain outlook to user queries.
- **Honest Diagnostics:** If `NEBIUS_API_KEY` is not yet configured, the system provides clear setup instructions while keeping all weather and farming tools 100% operational.
- **Live Handshake Test:** One-click connection test button verifying inference before claiming live verification status.

### 5. 🌐 Quad-Language Multilingual Support
1. **Urdu (اردو):** Full Right-to-Left (RTL) layout with Noto Nastaliq Urdu typography.
2. **Hindi (हिंदी):** Full UI localization with Noto Sans Devanagari.
3. **Telugu (తెలుగు):** Complete translation with Noto Sans Telugu.
4. **English:** Clean typography using Plus Jakarta Sans.

### 6. 🎙️ Voice Input & Speech Output
- **Voice Input:** Web Speech API recognition matching selected dialect (`ur-IN`, `hi-IN`, `te-IN`, `en-IN`) with real-time transcript preview.
- **Text-to-Speech:** Browser speech synthesis to read assistant responses aloud in the active language.

---

## 🛠️ Architecture & Tech Stack

```
[Browser / Android Client]
       │
       ├─► Open-Meteo Geocoding & Forecast API (Direct Open CORS)
       │
       └─► Express Server (server.ts) ──► Nebius Token Factory
                                          (https://api.studio.nebius.ai/v1)
                                          [NVIDIA Nemotron 70B]
```

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Express 4 on Node.js (via `tsx server.ts`)
- **Hosting/Dev:** Vite 6 with server middleware integration
- **AI Engine:** NVIDIA Nemotron on Nebius Token Factory
- **Weather Provider:** Open-Meteo (No API key required)

---

## 🚀 Environment Variables

Copy `.env.example` to `.env`:

```bash
# NEBIUS_API_KEY: Required for NVIDIA Nemotron AI assistant
NEBIUS_API_KEY="your_nebius_api_key_here"

# NEBIUS_MODEL: NVIDIA model identifier
NEBIUS_MODEL="nvidia/Llama-3_1-Nemotron-70B-Instruct-HF"

# APP_URL: URL where the app is hosted
APP_URL="http://localhost:3000"
```

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start full-stack dev server (Vite + Express)
npm run dev

# Run TypeScript compilation checks
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

---

## 📜 License

Licensed under the [Apache License 2.0](LICENSE).
