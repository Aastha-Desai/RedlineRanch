# 🫀 RedlineRanch

> A heart-healthy community platform that turns your workouts and ECG data into real-time cardiovascular insights — powered by computer vision, a custom-trained CNN, and AI.

---

## What is RedlineRanch?

RedlineRanch helps people understand their heart health in an approachable, active way. You create themed workouts, perform them on camera while the app tracks your reps and monitors your live heart rate and oxygen saturation, then receive an AI-generated workout synopsis when you're done. On the ECG side, you can send readings directly from an Apple Watch Series 4+ to the dashboard — a CNN we trained classifies your sinus rhythm, and a chatbot explains what it all means in plain language.

---

## Features

### 🏋️ Workout dashboard
- Create themed workouts tailored to your fitness goals
- Start a workout and let the camera analyze your movements in real time
- Live rep counting via computer vision
- Live heart BPM and oxygen saturation monitoring during your session
- Hit **End Workout** and receive an AI-generated synopsis covering your movements, reps, and heart data

### 📈 ECG dashboard
- Send ECG readings directly from an **Apple Watch Series 4+** to the dashboard
- A custom-trained **CNN** classifies your sinus rhythm
- View your ECG trace and rhythm classification on the dashboard

### 🤖 Heart health chatbot
- Send any workout summary or ECG result to the chatbot
- Get a plain-language educational explanation of what your heart data means
- Ask follow-up questions about your cardiovascular health

---

## Tech stack

| Layer              | Technology                                      |
|--------------------|-------------------------------------------------|
| Frontend           | TypeScript, CSS                                 |
| Backend            | Python                                          |
| Computer vision    | Movement tracking & rep counting (camera input) |
| ECG classification | Custom-trained CNN                              |
| Wearable           | Apple Watch Series 4+ (ECG export)              |
| AI synopsis        | LLM-powered workout & ECG summary               |

---

## Project structure

```
RedlineRanch/
├── backend/              # Python API — CV, CNN inference, AI synopsis, chatbot
│   ├── main.py
│   ├── ecg/              # CNN model + ECG classification logic
│   ├── vision/           # Rep counting + movement analysis
│   └── ...
└── web/                  # TypeScript frontend
    ├── src/
    │   ├── dashboard/    # Workout creation & live session view
    │   ├── ecg/          # ECG dashboard + Apple Watch integration
    │   └── chatbot/      # Heart health chatbot UI
    ├── package.json
    └── ...
```

---

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn
- Apple Watch Series 4 or later (for ECG features)
- A webcam (for workout tracking)

### 1. Clone the repo

```bash
git clone https://github.com/Aastha-Desai/RedlineRanch.git
cd RedlineRanch
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend runs on `http://localhost:8000`.

### 3. Set up the frontend

```bash
cd web
npm install
npm run dev
```

Web app runs on `http://localhost:3000`.

---

## Environment variables

**backend/.env**
```
SECRET_KEY=...
MODEL_PATH=./ecg/model.pt       # path to trained CNN weights
OPENAI_API_KEY=...              # or whichever LLM you're using for synopsis + chatbot
```

**web/.env**
```
VITE_API_URL=http://localhost:8000
```

---

## How it works

### Workout flow

```
Create workout → Start session → Camera tracks movements
                                        ↓
                           Rep counter + heart BPM + SpO2
                                        ↓
                               End workout → AI synopsis
```

### ECG flow

```
Apple Watch (Series 4+) → Export ECG → Upload to dashboard
                                               ↓
                                     CNN classifies sinus rhythm
                                               ↓
                                   Send to chatbot → plain-language explanation
```

---

## ECG classification model

The sinus rhythm classifier is a CNN trained on labelled ECG data. It takes raw ECG waveform input exported from Apple Watch and outputs a rhythm classification along with a confidence score. Results are displayed on the ECG dashboard and can be forwarded to the chatbot for an educational breakdown of what your heart is doing.

---

## Contributing

1. Fork the repo
2. Create a feature branch — `git checkout -b feature/your-feature`
3. Commit your changes — `git commit -m 'add your feature'`
4. Push to the branch — `git push origin feature/your-feature`
5. Open a pull request

---

## License

MIT © [Aastha Desai](https://github.com/Aastha-Desai)[Varsha Danduri](https://github.com/VarshaDanduri)
