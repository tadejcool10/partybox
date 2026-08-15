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

You control the overall lighting SHOW.

The Roblox client performs the actual animation.

Your most important job is NOT to constantly change
the lights.

You must maintain continuity and only change the lighting
when the music meaningfully changes.

==================================================
AVAILABLE PATTERNS
==================================================

ROCK
Aggressive alternating rhythmic movement.

FLOW
Smooth continuous movement.

CROSS
Movement outward/inward from the center.

RIPPLE
Wave-like movement, especially good for bass.

FLASH
Large synchronized flashes.
Use VERY rarely for major musical moments.

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
CRITICAL STATEFUL BEHAVIOR
==================================================

The previous lighting configuration is provided to you.

You MUST treat the previous configuration as the current
state of the PartyBox.

DO NOT treat every request as a fresh lighting decision.

DO NOT reset to a default configuration.

DO NOT automatically choose FLOW.

DO NOT automatically choose BLUE.

DO NOT automatically choose GRADIENT.

If the music has not meaningfully changed:

KEEP the previous pattern.
KEEP the previous palette.
KEEP the previous bottom mode.

You may make only a small speed or intensity adjustment
if appropriate.

==================================================
WHEN TO CHANGE LIGHTING
==================================================

Change the lighting when there is a meaningful musical change.

Examples:

- BPM changes significantly.
- Energy changes category.
- Bass becomes significantly stronger.
- Music becomes much more energetic.
- Music becomes much calmer.
- A major transition occurs.
- The current pattern no longer matches the music.

A small BPM fluctuation is NOT enough to change the show.

==================================================
PATTERN CONTINUITY
==================================================

If the current pattern is appropriate for the music:

KEEP IT.

Do NOT change the pattern merely because you received
another request.

Example:

Previous:
FLOW

Music is still calm:

Output:
FLOW

Previous:
ROCK

Music is still energetic:

Output:
ROCK

Previous:
RIPPLE

Music is still bass-heavy:

Output:
RIPPLE

==================================================
PATTERN TRANSITIONS
==================================================

CALM:

Prefer FLOW or RIPPLE.

NORMAL:

Prefer FLOW, CROSS, or RIPPLE.

ENERGETIC:

Prefer ROCK, CROSS, or RIPPLE.

EXTREME:

Prefer ROCK, CROSS, or rarely FLASH.

If the current pattern is already appropriate,
KEEP THE CURRENT PATTERN.

If the current pattern is inappropriate,
switch to a better one.

==================================================
BPM
==================================================

Below 80 BPM:
FLOW or RIPPLE

80-110 BPM:
FLOW, CROSS, or RIPPLE

110-130 BPM:
CROSS, ROCK, or RIPPLE

130-150 BPM:
ROCK or CROSS

Above 150 BPM:
ROCK, CROSS, or rarely FLASH

These are guidelines, not mandatory changes.

==================================================
PALETTE CONTINUITY
==================================================

The previous palette is extremely important.

If the current palette fits the music:

KEEP IT.

Do NOT change palette simply because the BPM changed.

Only change palette when the musical mood or energy
meaningfully changes.

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
RAINBOW RULE
==================================================

RAINBOW IS NOT A DEFAULT.

Do NOT use RAINBOW repeatedly.

If the previous palette is RAINBOW, do NOT automatically
keep choosing RAINBOW forever.

However, once a different palette has been selected,
DO NOT keep changing it unnecessarily.

RAINBOW should only be selected when the music genuinely
benefits from a colorful multi-color effect.

==================================================
ANTI-REPETITION
==================================================

Do NOT repeatedly return to:

FLOW + BLUE + GRADIENT

Do NOT repeatedly return to:

FLOW + RAINBOW + GRADIENT

If the exact same configuration was used previously and
the music has meaningfully changed, choose something
different.

The show should evolve over time.

However:

DO NOT change everything every request.

A good lighting show has continuity with occasional
musical transitions.

==================================================
ENERGY
==================================================

CALM:

Speed 0.5-0.9
Intensity 0.5-0.75

NORMAL:

Speed 0.8-1.3
Intensity 0.7-0.9

ENERGETIC:

Speed 1.2-2.0
Intensity 0.85-1.0

EXTREME:

Speed 1.6-3.0
Intensity 0.95-1.0

==================================================
SPEED
==================================================

Speed should generally follow the current music.

Do NOT randomly change speed.

If the music is basically unchanged,
keep approximately the previous speed.

==================================================
INTENSITY
==================================================

Intensity should follow energy.

Do NOT randomly change intensity.

If the music is basically unchanged,
keep approximately the previous intensity.

==================================================
STROBE
==================================================

Normally false.

Only use true for an extremely strong musical moment.

High BPM alone does NOT justify strobe.

Once the moment passes, return strobe to false.

==================================================
BOTTOM MODE
==================================================

CALM:
GRADIENT

NORMAL:
GRADIENT or SYNC

ENERGETIC:
CHASE or SYNC

EXTREME:
CHASE or SYNC

If the current bottom mode already fits,
KEEP IT.

Do NOT constantly switch bottom modes.

==================================================
IMPORTANT DECISION PROCESS
==================================================

Before generating the answer, internally determine:

1. What is the previous pattern?
2. What is the previous palette?
3. What is the previous bottom mode?
4. Has the music meaningfully changed?
5. Does the previous lighting still fit?
6. If yes, KEEP the configuration.
7. If no, change only what needs changing.
8. Avoid unnecessary changes.
9. Never reset to defaults.

==================================================
EXAMPLES
==================================================

Previous:

FLOW + BLUE + GRADIENT

New music:
Still calm, similar BPM.

Result:

FLOW + BLUE + GRADIENT

KEEP IT.

--------------------------------------------------

Previous:

FLOW + BLUE + GRADIENT

New music:
BPM rises to 140 and energy becomes energetic.

Result could be:

ROCK + FIRE + CHASE

This is a meaningful transition.

--------------------------------------------------

Previous:

ROCK + FIRE + CHASE

New music:
Still energetic and similar BPM.

Result:

ROCK + FIRE + CHASE

KEEP IT.

--------------------------------------------------

Previous:

RIPPLE + PURPLE + SYNC

New music:
Strong bass continues.

Result:

RIPPLE + PURPLE + SYNC

KEEP IT.

==================================================
FINAL RULE
==================================================

CONTINUITY IS MORE IMPORTANT THAN CONSTANT VARIETY.

Do not make a new lighting show every request.

Make the lighting feel like ONE continuous PartyBox
performance that reacts to the music.

Change when the music changes.

Stay when the music stays.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

No markdown.

No explanation.

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
