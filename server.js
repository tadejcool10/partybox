const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(express.json({ limit: "50kb" }));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ GEMINI_API_KEY environment variable is missing!");
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: API_KEY
});

const MODEL = "gemini-3.5-flash-lite";

//==================================================
// VALID OPTIONS
//==================================================

const PATTERNS = [
    "ROCK",
    "FLOW",
    "CROSS",
    "RIPPLE",
    "FLASH"
];

const PALETTES = [
    "RAINBOW",
    "RED",
    "ORANGE",
    "YELLOW",
    "GREEN",
    "CYAN",
    "BLUE",
    "PURPLE",
    "PINK",
    "CYBER",
    "SUNSET",
    "ICE",
    "FIRE"
];

const BOTTOM_MODES = [
    "GRADIENT",
    "CHASE",
    "SYNC",
    "OFF"
];

//==================================================
// AI SYSTEM PROMPT
//==================================================

const SYSTEM_PROMPT = `
You are the AI lighting director for a fictional Roblox
recreation of a JBL PartyBox 110.

Your job is ONLY to choose the lighting show.

The Roblox client handles the actual animation.

AVAILABLE PATTERNS:

ROCK
- Aggressive alternating lights.
- Best for strong beats and energetic music.

FLOW
- Smooth flowing gradient.
- Best for normal, calm, melodic music.

CROSS
- Lights move from the center outward and inward.
- Best for energetic music.

RIPPLE
- A wave expands from the center.
- Best for bass hits and musical transitions.

FLASH
- Large synchronized flashes.
- Use sparingly for major musical moments.

AVAILABLE PALETTES:

RAINBOW
RED
ORANGE
YELLOW
GREEN
CYAN
BLUE
PURPLE
PINK
CYBER
SUNSET
ICE
FIRE

AVAILABLE BOTTOM MODES:

GRADIENT
CHASE
SYNC
OFF

RULES:

1. Return ONLY valid JSON.
2. Never return markdown.
3. Never explain your answer.
4. pattern MUST be one of the available patterns.
5. palette MUST be one of the available palettes.
6. speed MUST be between 0.25 and 3.
7. intensity MUST be between 0 and 1.
8. strobe MUST be true or false.
9. bottomMode MUST be one of the available modes.
10. Don't randomly change patterns without a musical reason.
11. Strong bass should favor RIPPLE or ROCK.
12. Very strong musical moments can use FLASH.
13. Calm music should favor FLOW.
14. Fast energetic music should favor ROCK or CROSS.
15. Musical transitions should favor RIPPLE.
16. Strobe should be rare.
17. BPM should influence animation speed.
18. Beat strength should influence intensity.
19. Make the light show feel like a polished commercial party speaker.
20. Do not attempt to control individual Roblox instances.

Return EXACTLY this structure:

{
    "pattern": "FLOW",
    "palette": "CYBER",
    "speed": 1.0,
    "intensity": 0.9,
    "strobe": false,
    "bottomMode": "GRADIENT"
}
`;

//==================================================
// HELPERS
//==================================================

function number(value, min, max, fallback) {

    const n = Number(value);

    if (!Number.isFinite(n)) {
        return fallback;
    }

    return Math.max(
        min,
        Math.min(max, n)
    );
}

function cleanString(value, fallback) {

    if (typeof value !== "string") {
        return fallback;
    }

    return value.trim();
}

//==================================================
// VALIDATE AI RESPONSE
//==================================================

function validatePlan(plan) {

    if (!plan || typeof plan !== "object") {
        return {
            pattern: "FLOW",
            palette: "RAINBOW",
            speed: 1,
            intensity: 0.8,
            strobe: false,
            bottomMode: "GRADIENT"
        };
    }

    let pattern =
        cleanString(
            plan.pattern,
            "FLOW"
        ).toUpperCase();

    let palette =
        cleanString(
            plan.palette,
            "RAINBOW"
        ).toUpperCase();

    let bottomMode =
        cleanString(
            plan.bottomMode,
            "GRADIENT"
        ).toUpperCase();

    if (!PATTERNS.includes(pattern)) {
        pattern = "FLOW";
    }

    if (!PALETTES.includes(palette)) {
        palette = "RAINBOW";
    }

    if (!BOTTOM_MODES.includes(bottomMode)) {
        bottomMode = "GRADIENT";
    }

    return {

        pattern,

        palette,

        speed:
            number(
                plan.speed,
                0.25,
                3,
                1
            ),

        intensity:
            number(
                plan.intensity,
                0,
                1,
                0.9
            ),

        strobe:
            plan.strobe === true,

        bottomMode

    };
}

//==================================================
// FALLBACK
//==================================================

function fallbackPlan() {

    return {

        pattern: "FLOW",

        palette: "RAINBOW",

        speed: 1,

        intensity: 0.8,

        strobe: false,

        bottomMode: "GRADIENT"

    };

}

//==================================================
// PARTYBOX AI ENDPOINT
//==================================================

app.post("/partybox", async (req, res) => {

    try {

        const music = req.body || {};

        //==================================================
        // SANITIZE ROBLOX DATA
        //==================================================

        const loudness =
            number(
                music.loudness,
                0,
                3000,
                0
            );

        const bpm =
            number(
                music.bpm,
                40,
                220,
                0
            );

        const beatStrength =
            number(
                music.beatStrength,
                0,
                1,
                0
            );

        const bass =
            number(
                music.bass,
                0,
                1,
                0
            );

        const mid =
            number(
                music.mid,
                0,
                1,
                0
            );

        const treble =
            number(
                music.treble,
                0,
                1,
                0
            );

        const beat =
            music.beat === true;

        const energy =
            cleanString(
                music.energy,
                "NORMAL"
            );

        const currentPattern =
            cleanString(
                music.currentPattern,
                "FLOW"
            );

        //==================================================
        // SEND TO GEMINI
        //==================================================

        const prompt = `
CURRENT MUSIC DATA:

Loudness: ${loudness}

BPM: ${bpm}

Beat detected: ${beat}

Beat strength: ${beatStrength}

Bass energy: ${bass}

Mid energy: ${mid}

Treble energy: ${treble}

Overall energy: ${energy}

Current lighting pattern: ${currentPattern}

Choose the next lighting configuration.

Return ONLY JSON.
`;

        console.log(
            `🎵 Music | BPM: ${bpm} | Loudness: ${loudness} | Beat: ${beat} | Energy: ${energy}`
        );

        const response =
            await ai.models.generateContent({

                model: MODEL,

                contents: prompt,

                config: {

                    systemInstruction:
                        SYSTEM_PROMPT,

                    temperature: 0.65,

                    responseMimeType:
                        "application/json"

                }

            });

        let text =
            response.text;

        if (!text) {
            throw new Error(
                "Gemini returned an empty response."
            );
        }

        //==================================================
        // REMOVE ACCIDENTAL MARKDOWN
        //==================================================

        text =
            text
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();

        //==================================================
        // PARSE
        //==================================================

        let plan;

        try {

            plan =
                JSON.parse(text);

        } catch (parseError) {

            console.error(
                "❌ Gemini returned invalid JSON:",
                text
            );

            throw new Error(
                "Gemini response was not valid JSON."
            );
        }

        //==================================================
        // VALIDATE
        //==================================================

        plan =
            validatePlan(plan);

        console.log(
            `💡 AI → ${plan.pattern} | 🎨 ${plan.palette} | ⚡ ${plan.speed}x | 🔆 ${plan.intensity} | Strobe: ${plan.strobe}`
        );

        //==================================================
        // RETURN TO ROBLOX
        //==================================================

        res.json(plan);

    } catch (error) {

        console.error(
            "❌ PartyBox AI error:",
            error
        );

        // IMPORTANT:
        // Even if Gemini fails or quota is exceeded,
        // Roblox still receives a valid lighting plan.

        res.json(
            fallbackPlan()
        );

    }

});

//==================================================
// HEALTH CHECK
//==================================================

app.get("/", (req, res) => {

    res.json({

        status:
            "PartyBox AI online",

        model:
            MODEL,

        patterns:
            PATTERNS,

        palettes:
            PALETTES

    });

});

//==================================================
// START SERVER
//==================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `🔊 PartyBox AI running on port ${PORT}`
        );

    }
);
