const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(express.json({ limit: "50kb" }));

//==================================================
// CONFIG
//==================================================

const PORT = process.env.PORT || 3000;

const API_KEY = process.env.GEMINI_API_KEY;

const MODEL = "gemini-3.5-flash-lite";

if (!API_KEY) {
    console.error(
        "❌ GEMINI_API_KEY environment variable is missing!"
    );

    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: API_KEY
});

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
You are the lighting director for a fictional Roblox
recreation of a JBL PartyBox 110.

Your job is to choose an exciting lighting configuration
based on the current music.

You control the overall lighting SHOW.

The Roblox client handles the actual animation.

==================================================
AVAILABLE PATTERNS
==================================================

ROCK
- Aggressive alternating lighting.
- Strong rhythmic movement.
- Best for energetic music.

FLOW
- Smooth flowing lighting.
- Best for calm or melodic sections.

CROSS
- Lights move outward/inward from the center.
- Best for energetic music.

RIPPLE
- Wave-like effect spreading through the speaker.
- Best for bass-heavy sections and transitions.

FLASH
- Large synchronized flashes.
- Use for major musical moments only.


==================================================
AVAILABLE PALETTES
==================================================

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


==================================================
AVAILABLE BOTTOM MODES
==================================================

GRADIENT
CHASE
SYNC
OFF


==================================================
IMPORTANT: RAINBOW IS NOT THE DEFAULT
==================================================

Do NOT constantly choose RAINBOW.

RAINBOW should be used only when it genuinely fits
the music.

If the music is energetic, prefer focused palettes such as:

FIRE
CYBER
RED
PURPLE
BLUE
SUNSET

If the music is calm, prefer:

ICE
BLUE
CYAN
PURPLE

If the music is aggressive, prefer:

FIRE
RED
ORANGE
CYBER

If the music is dreamy or emotional, prefer:

PURPLE
CYAN
BLUE
PINK

Avoid repeatedly returning:

FLOW + RAINBOW + GRADIENT

unless there is a genuine musical reason.


==================================================
PATTERN RULES
==================================================

CALM:

Prefer:
FLOW
RIPPLE

NORMAL:

Prefer:
FLOW
CROSS
RIPPLE

ENERGETIC:

Prefer:
ROCK
CROSS
RIPPLE

EXTREME:

Prefer:
ROCK
FLASH
CROSS


==================================================
BPM RULES
==================================================

Below 80 BPM:

FLOW or RIPPLE

80-110 BPM:

FLOW or CROSS

110-130 BPM:

CROSS or ROCK

130-150 BPM:

ROCK or CROSS

Above 150 BPM:

ROCK, CROSS, or FLASH


==================================================
BASS RULES
==================================================

Strong bass:

Prefer RIPPLE.

Extremely strong bass:

RIPPLE or FLASH.

Do not use FLASH constantly.


==================================================
ENERGY RULES
==================================================

CALM:

Use lower intensity and slower speed.

NORMAL:

Use moderate movement.

ENERGETIC:

Use faster movement and stronger lighting.

EXTREME:

Use very fast movement and maximum intensity.


==================================================
MUSICAL CHANGES
==================================================

If BPM changes significantly, consider changing the pattern.

If energy changes significantly, consider changing the pattern
AND palette.

If the current pattern is FLOW and the music becomes energetic,
prefer switching away from FLOW.

If the current palette is RAINBOW and the music becomes
energetic, strongly consider switching to another palette.

Do not keep returning the exact same configuration.

However, do not change the lighting randomly when the music
has not meaningfully changed.


==================================================
PALETTE GUIDANCE
==================================================

CALM:

ICE
BLUE
CYAN
PURPLE

DREAMY:

PURPLE
CYAN
BLUE
PINK

EMOTIONAL:

BLUE
PURPLE
CYAN

ENERGETIC:

CYBER
FIRE
RED
PURPLE
BLUE

AGGRESSIVE:

FIRE
RED
ORANGE

BRIGHT / HAPPY:

YELLOW
ORANGE
GREEN
PINK

MYSTERIOUS:

PURPLE
BLUE
CYBER


==================================================
SPEED
==================================================

Slow:

0.5 - 0.9

Normal:

0.8 - 1.3

Energetic:

1.2 - 2.0

Very fast:

1.6 - 3.0


==================================================
INTENSITY
==================================================

Calm:

0.5 - 0.75

Normal:

0.7 - 0.9

Energetic:

0.85 - 1.0

Extreme:

0.95 - 1.0


==================================================
STROBE
==================================================

Normally:

false

Only use true for extremely strong musical moments.

High BPM alone does NOT justify strobe.


==================================================
BOTTOM MODE
==================================================

Calm:

GRADIENT

Normal:

GRADIENT or SYNC

Energetic:

CHASE or SYNC

Extreme:

CHASE or SYNC


==================================================
IMPORTANT
==================================================

DO NOT ALWAYS CHOOSE FLOW.

DO NOT ALWAYS CHOOSE RAINBOW.

DO NOT ALWAYS CHOOSE GRADIENT.

The lighting should visibly change as the music changes.

Think like a professional party speaker lighting designer.

The result should feel dynamic, musical, polished,
and exciting.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

Do NOT use markdown.

Do NOT explain your answer.

Use EXACTLY this structure:

{
    "pattern": "ROCK",
    "palette": "FIRE",
    "speed": 1.7,
    "intensity": 1,
    "strobe": false,
    "bottomMode": "CHASE"
}
`;

//==================================================
// HELPERS
//==================================================

function number(
    value,
    min,
    max,
    fallback
) {

    const n = Number(value);

    if (!Number.isFinite(n)) {
        return fallback;
    }

    return Math.max(
        min,
        Math.min(max, n)
    );
}

function cleanString(
    value,
    fallback
) {

    if (typeof value !== "string") {
        return fallback;
    }

    return value
        .trim()
        .toUpperCase();

}

//==================================================
// FALLBACK PLAN
//==================================================

function fallbackPlan() {

    return {

        pattern: "FLOW",

        palette: "BLUE",

        speed: 0.8,

        intensity: 0.75,

        strobe: false,

        bottomMode: "GRADIENT"

    };

}

//==================================================
// VALIDATE PLAN
//==================================================

function validatePlan(
    plan,
    music
) {

    if (
        !plan ||
        typeof plan !== "object"
    ) {

        return fallbackPlan();

    }

    //==================================================
    // PATTERN
    //==================================================

    let pattern =
        cleanString(
            plan.pattern,
            "FLOW"
        );

    if (!PATTERNS.includes(pattern)) {

        pattern = "FLOW";

    }

    //==================================================
    // PALETTE
    //==================================================

    let palette =
        cleanString(
            plan.palette,
            "BLUE"
        );

    if (!PALETTES.includes(palette)) {

        palette = "BLUE";

    }

    //==================================================
    // SPEED
    //==================================================

    let speed =
        number(
            plan.speed,
            0.25,
            3,
            1
        );

    //==================================================
    // INTENSITY
    //==================================================

    let intensity =
        number(
            plan.intensity,
            0,
            1,
            0.9
        );

    //==================================================
    // STROBE
    //==================================================

    let strobe =
        plan.strobe === true;

    //==================================================
    // BOTTOM MODE
    //==================================================

    let bottomMode =
        cleanString(
            plan.bottomMode,
            "GRADIENT"
        );

    if (
        !BOTTOM_MODES.includes(
            bottomMode
        )
    ) {

        bottomMode = "GRADIENT";

    }

    //==================================================
    // SERVER-SIDE MUSICAL SAFETY RULES
    //
    // This prevents Gemini from getting lazy.
    //==================================================

    const bpm =
        music.bpm;

    const energy =
        music.energy;

    const bass =
        music.bass;

    //==================================================
    // HIGH BPM
    //==================================================

    if (
        bpm >= 150 &&
        (
            energy === "ENERGETIC" ||
            energy === "EXTREME"
        )
    ) {

        if (
            pattern === "FLOW"
        ) {

            pattern = "ROCK";

        }

        if (
            palette === "RAINBOW"
        ) {

            palette = "FIRE";

        }

        if (
            bottomMode === "GRADIENT"
        ) {

            bottomMode = "CHASE";

        }

        speed =
            Math.max(
                speed,
                1.5
            );

        intensity =
            Math.max(
                intensity,
                0.9
            );

    }

    //==================================================
    // MEDIUM-HIGH BPM
    //==================================================

    else if (
        bpm >= 120 &&
        energy === "ENERGETIC"
    ) {

        if (
            pattern === "FLOW"
        ) {

            pattern = "CROSS";

        }

        if (
            palette === "RAINBOW"
        ) {

            palette = "CYBER";

        }

        if (
            bottomMode === "GRADIENT"
        ) {

            bottomMode = "SYNC";

        }

        speed =
            Math.max(
                speed,
                1.2
            );

    }

    //==================================================
    // STRONG BASS
    //==================================================

    if (
        bass >= 0.85
    ) {

        if (
            pattern === "FLOW"
        ) {

            pattern = "RIPPLE";

        }

        if (
            palette === "RAINBOW"
        ) {

            palette = "PURPLE";

        }

    }

    //==================================================
    // EXTREME ENERGY
    //==================================================

    if (
        energy === "EXTREME"
    ) {

        intensity =
            Math.max(
                intensity,
                0.95
            );

        if (
            pattern === "FLOW"
        ) {

            pattern = "ROCK";

        }

        if (
            palette === "RAINBOW"
        ) {

            palette = "FIRE";

        }

    }

    //==================================================
    // CALM MUSIC
    //==================================================

    if (
        energy === "CALM" &&
        bpm > 0 &&
        bpm < 90
    ) {

        if (
            pattern === "ROCK" ||
            pattern === "FLASH"
        ) {

            pattern = "FLOW";

        }

        if (
            palette === "RAINBOW"
        ) {

            palette = "ICE";

        }

        if (
            bottomMode === "CHASE"
        ) {

            bottomMode = "GRADIENT";

        }

        speed =
            Math.min(
                speed,
                1
            );

    }

    //==================================================
    // STROBE SAFETY
    //==================================================

    if (
        bpm < 140 ||
        energy !== "EXTREME"
    ) {

        strobe = false;

    }

    return {

        pattern,

        palette,

        speed,

        intensity,

        strobe,

        bottomMode

    };

}

//==================================================
// PARTYBOX ENDPOINT
//==================================================

app.post(
    "/partybox",
    async (req, res) => {

        try {

            const music =
                req.body || {};

            //==================================================
            // READ MUSIC DATA
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
                    0,
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

            const currentPalette =
                cleanString(
                    music.currentPalette,
                    "RAINBOW"
                );

            //==================================================
            // LOG
            //==================================================

            console.log(
                "🎵 PartyBox music:",
                {
                    bpm,
                    loudness,
                    beat,
                    beatStrength,
                    bass,
                    mid,
                    treble,
                    energy,
                    currentPattern,
                    currentPalette
                }
            );

            //==================================================
            // AI PROMPT
            //==================================================

            const prompt = `
CURRENT MUSIC INFORMATION

Loudness:
${loudness}

BPM:
${bpm}

Beat detected:
${beat}

Beat strength:
${beatStrength}

Bass:
${bass}

Mid:
${mid}

Treble:
${treble}

Energy:
${energy}


CURRENT LIGHTING

Pattern:
${currentPattern}

Palette:
${currentPalette}


Choose the next lighting configuration.

IMPORTANT:

Do not automatically choose RAINBOW.

If the music is energetic, consider FIRE, CYBER,
RED, PURPLE, BLUE, or SUNSET.

If BPM is above 130, strongly consider ROCK or CROSS.

If BPM is above 150, strongly consider ROCK,
CROSS, or FLASH.

If bass is very strong, consider RIPPLE.

If the current configuration is already appropriate,
you may keep it.

Return ONLY JSON.
`;

            //==================================================
            // GEMINI
            //==================================================

            const response =
                await ai.models.generateContent({

                    model: MODEL,

                    contents: prompt,

                    config: {

                        systemInstruction:
                            SYSTEM_PROMPT,

                        temperature: 1.0,

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
            // CLEAN RESPONSE
            //==================================================

            text =
                text
                    .replace(
                        /^```json\s*/i,
                        ""
                    )
                    .replace(
                        /^```\s*/i,
                        ""
                    )
                    .replace(
                        /\s*```$/i,
                        ""
                    )
                    .trim();

            //==================================================
            // PARSE JSON
            //==================================================

            let plan;

            try {

                plan =
                    JSON.parse(text);

            } catch (error) {

                console.error(
                    "❌ Invalid Gemini JSON:"
                );

                console.error(
                    text
                );

                throw new Error(
                    "Gemini returned invalid JSON."
                );

            }

            //==================================================
            // VALIDATE + CORRECT
            //==================================================

            plan =
                validatePlan(
                    plan,
                    {
                        bpm,
                        bass,
                        energy
                    }
                );

            //==================================================
            // LOG RESULT
            //==================================================

            console.log(
                "💡 PartyBox AI:",
                plan
            );

            //==================================================
            // SEND TO ROBLOX
            //==================================================

            res.json(
                plan
            );

        } catch (error) {

            console.error(
                "❌ PartyBox AI error:",
                error.message ||
                error
            );

            //==================================================
            // ALWAYS RETURN SOMETHING
            //==================================================

            res.json(
                fallbackPlan()
            );

        }

    }
);

//==================================================
// HEALTH CHECK
//==================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            status:
                "PartyBox AI online",

            model:
                MODEL,

            patterns:
                PATTERNS,

            palettes:
                PALETTES,

            bottomModes:
                BOTTOM_MODES

        });

    }
);

//==================================================
// START
//==================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "=========================================="
        );

        console.log(
            "🔊 PARTYBOX AI SERVER ONLINE"
        );

        console.log(
            `🌐 Port: ${PORT}`
        );

        console.log(
            `🤖 Model: ${MODEL}`
        );

        console.log(
            "=========================================="
        );

    }
);
