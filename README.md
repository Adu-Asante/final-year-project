# Voxa — AI Interpreter (Twi ↔ English)

> "I'm talking to an interpreter." — not "I'm using Google Translate."

Voxa is a mobile AI Interpreter that enables real-time spoken communication between Twi and English speakers using 100% free and open-source technology.

---

## Project Structure

```
voxa/
├── mobile/          React Native + Expo app
└── backend/         FastAPI AI backend (NLLB-200 translation)
```

---

## Features

| Feature | Description |
|---------|-------------|
| 🏠 **Home (AI Interpreter)** | Avatar + mic + live subtitles + translation |
| 💬 **Conversation Mode** | Two-way real-time interpreter |
| 📷 **Camera OCR** | Point at text → translate → avatar reads aloud |
| 📖 **Phrasebook** | Emoji categories → tap → avatar speaks |
| 🕓 **History** | Full log with favourites |
| ⚙️ **Settings** | TTS speed, haptics, privacy controls |

---

## AI Pipeline

```
Microphone
    ↓
react-native-voice (native STT — Android: tw-GH Twi support)
    ↓
Language Detection (heuristic, swappable via ISpeechRecognitionService)
    ↓
NLLB-200 distilled-600M via FastAPI
    ↓
Avatar (lip-sync) + expo-speech TTS
```

---

## Tech Stack

### Mobile
- React Native (Expo ~52, development build)
- TypeScript
- Clean Architecture + MVVM
- expo-sqlite + Drizzle ORM (offline-first)
- react-native-voice (native STT)
- expo-speech (TTS)
- expo-camera (OCR)
- React Navigation (bottom tabs)
- Zustand (state)

### Backend
- FastAPI + Uvicorn
- facebook/nllb-200-distilled-600M (translation)
- faster-whisper (optional STT fallback)
- gTTS (TTS synthesis)
- Python 3.11+

---

## Getting Started

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The NLLB-200 model (~1.2 GB) downloads automatically on first request.

### Mobile

```bash
cd mobile
npm install
npx expo run:android   # or run:ios
```

> **Note**: A development build is required (not Expo Go) because react-native-voice uses native code.

---

## Architecture

```
src/
├── core/           Domain (entities, repo interfaces, use cases)
├── data/           Data layer (SQLite repos, Drizzle schema)
├── infrastructure/ Platform services (STT, TTS, translation client)
├── features/       UI screens (MVVM — each screen has a ViewModel hook)
└── shared/         Components, hooks, theme, navigation
```

---

## Language Support

| Language | STT | Translation | TTS |
|----------|-----|-------------|-----|
| Twi (Akan) | ✅ Android (tw-GH) | ✅ NLLB-200 | ✅ expo-speech (ak-GH) |
| English | ✅ All platforms | ✅ NLLB-200 | ✅ expo-speech (en-US) |

---

## Roadmap

- [ ] V1: Core interpreter (this release)
- [ ] V2: Rive 2D avatar with proper lip-sync assets
- [ ] V2: ML Kit / Tesseract real OCR integration
- [ ] V2: Supabase optional cloud sync
- [ ] V3: Code-switching detection (mixed Twi/English)
- [ ] V3: Custom Twi TTS voice (Piper fine-tune)
