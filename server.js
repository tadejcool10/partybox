// ==========================================================
// PARTYBOX AI SERVER
// Render / Node.js
// ==========================================================

const express = require("express");

const app = express();

app.use(express.json({ limit: "50kb" }));

// ==========================================================
// CONFIG
// ==========================================================

const PORT =
    process.env.PORT || 3000;

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;

const PARTYBOX_SECRET =
    process.env.PARTYBOX_SECRET;

const GEMINI_MODEL =
    process.env.GEMINI_MODEL ||
    "gemini-3.5-flash-lite";

// ==========================================================
// STATE
// ==========================================================

let lastPalette = null;
let paletteHistory = [];

let lastPattern = null;
let lastPlan = null;

let lastBpm = null;
let lastEnergy = null;

// ==========================================================
// PALETTES
// ==========================================================

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

// ==========================================================
// PALETTE GROUPS
// ==========================================================

const CALM_PALETTES = [
    "RAINBOW",
    "BLUE",
    "PURPLE",
    "CYAN",
    "PINK",
    "ICE",
    "GREEN"
];

const NORMAL_PALETTES = [
    "RAINBOW",
    "BLUE",
    "CYAN",
    "PURPLE",
    "PINK",
    "GREEN",
    "YELLOW",
    "ORANGE",
    "SUNSET"
];

const ENERGETIC_PALETTES = [
    "RAINBOW",
    "RED",
    "ORANGE",
    "PURPLE",
    "BLUE",
    "PINK",
    "CYAN",
    "YELLOW",
    "GREEN",
    "SUNSET",
    "FIRE",
    "CYBER"
];

const EXTREME_PALETTES = [
    "RAINBOW",
    "RED",
    "ORANGE",
    "FIRE",
    "PURPLE",
    "BLUE",
    "PINK",
    "SUNSET",
    "YELLOW",
    "CYAN",
    "CYBER"
];

// ==========================================================
// RANDOM
// ==========================================================

function randomFrom(array) {

    if (!array || array.length === 0) {
        return "BLUE";
    }

    return array[
        Math.floor(
            Math.random() * array.length
        )
    ];
}

// ==========================================================
// AVOID RECENT
// ==========================================================

function avoidRecent(array) {

    const filtered =
        array.filter(
            palette =>
                !paletteHistory
                    .slice(-3)
                    .includes(palette)
        );

    if (filtered.length > 0) {
        return filtered;
    }

    return array;
}

// ==========================================================
// PALETTE POOL
// ==========================================================

function getPalettePool(
    bpm,
    energy
) {

    if (
        bpm <= 10 ||
        energy === "CALM"
    ) {

        return CALM_PALETTES;

    }

    if (
        energy === "NORMAL"
    ) {

        return NORMAL_PALETTES;

    }

    if (
        energy === "ENERGETIC"
    ) {

        return ENERGETIC_PALETTES;

    }

    if (
        energy === "EXTREME"
    ) {

        return EXTREME_PALETTES;

    }

    return NORMAL_PALETTES;
}

// ==========================================================
// FALLBACK PALETTE
// ==========================================================

function getFallbackPalette(
    bpm,
    energy
) {

    let pool =
        getPalettePool(
            bpm,
            energy
        );

    // 0 BPM / CALM:
    // Rainbow is intentionally allowed.

    if (
        bpm <= 10 ||
        energy === "CALM"
    ) {

        pool = [
            "RAINBOW",
            "BLUE",
            "PURPLE",
            "CYAN",
            "PINK",
            "ICE",
            "GREEN"
        ];

    }

    let choices =
        avoidRecent(pool);

    // CYBER is never a calm/0 BPM fallback.

    if (
        bpm <= 10 ||
        energy === "CALM"
    ) {

        choices =
            choices.filter(
                palette =>
                    palette !== "CYBER"
            );

    }

    // Avoid immediately repeating the same palette.

    if (
        lastPalette &&
        choices.length > 1
    ) {

        const different =
            choices.filter(
                palette =>
                    palette !== lastPalette
            );

        if (
            different.length > 0
        ) {

            choices =
                different;

        }

    }

    return randomFrom(
        choices
    );
}

// ==========================================================
// MEANINGFUL MUSIC CHANGE
// ==========================================================

function musicChangedMeaningfully(
    bpm,
    energy
) {

    if (
        lastBpm === null ||
        lastEnergy === null
    ) {

        return true;

    }

    // Energy changes are meaningful.

    if (
        energy !== lastEnergy
    ) {

        return true;

    }

    // 20+ BPM difference is meaningful.

    if (
        Math.abs(
            bpm - lastBpm
        ) >= 20
    ) {

        return true;

    }

    return false;
}

// ==========================================================
// PATTERN POOL
// ==========================================================

function getPatternPool(
    bpm,
    energy
) {

    if (
        bpm <= 10 ||
        energy === "CALM"
    ) {

        return [
            "FLOW",
            "RIPPLE"
        ];

    }

    if (
        energy === "NORMAL"
    ) {

        if (
            bpm < 110
        ) {

            return [
                "FLOW",
                "CROSS",
                "RIPPLE"
            ];

        }

        return [
            "CROSS",
            "ROCK",
            "RIPPLE"
        ];

    }

    if (
        energy === "ENERGETIC"
    ) {

        return [
            "ROCK",
            "CROSS",
            "RIPPLE"
        ];

    }

    if (
        energy === "EXTREME"
    ) {

        return [
            "ROCK",
            "CROSS",
            "FLASH"
        ];

    }

    return [
        "FLOW",
        "CROSS",
        "RIPPLE"
    ];
}

// ==========================================================
// FALLBACK PATTERN
// ==========================================================

function getFallbackPattern(
    bpm,
    energy
) {

    let pool =
        getPatternPool(
            bpm,
            energy
        );

    if (
        lastPattern &&
        pool.length > 1
    ) {

        const alternatives =
            pool.filter(
                pattern =>
                    pattern !== lastPattern
            );

        if (
            alternatives.length > 0
        ) {

            pool =
                alternatives;

        }

    }

    return randomFrom(
        pool
    );
}

// ==========================================================
// FIX PALETTE
// ==========================================================

function fixPalette(
    aiPalette,
    bpm,
    energy,
    meaningfulChange
) {

    let palette =
        String(
            aiPalette || ""
        ).toUpperCase();

    // ------------------------------------------------------
    // UNKNOWN
    // ------------------------------------------------------

    if (
        !PALETTES.includes(
            palette
        )
    ) {

        palette =
            getFallbackPalette(
                bpm,
                energy
            );

    }

    // ------------------------------------------------------
    // NO MEANINGFUL CHANGE
    // ------------------------------------------------------

    // Don't keep changing the palette every request.

    if (
        !meaningfulChange &&
        lastPalette
    ) {

        return lastPalette;

    }

    // ------------------------------------------------------
    // CALM / 0 BPM
    // ------------------------------------------------------

    if (
        bpm <= 10 ||
        energy === "CALM"
    ) {

        const forbidden = [
            "CYBER",
            "FIRE",
            "RED",
            "ORANGE",
            "SUNSET"
        ];

        if (
            forbidden.includes(
                palette
            )
        ) {

            palette =
                getFallbackPalette(
                    bpm,
                    energy
                );

        }

    }

    // ------------------------------------------------------
    // CYBER RESTRICTION
    // ------------------------------------------------------

    if (
        palette === "CYBER"
    ) {

        if (
            bpm <= 80 ||
            energy === "CALM" ||
            lastPalette === "CYBER" ||
            paletteHistory
                .slice(-3)
                .includes("CYBER")
        ) {

            palette =
                getFallbackPalette(
                    bpm,
                    energy
                );

        }

    }

    // ------------------------------------------------------
    // RAINBOW
    // ------------------------------------------------------

    // Rainbow is NOT banned.
    //
    // It is only prevented from appearing
    // repeatedly without another color between it.

    if (
        palette === "RAINBOW"
    ) {

        if (
            lastPalette === "RAINBOW" ||
            paletteHistory
                .slice(-3)
                .includes("RAINBOW")
        ) {

            const alternatives =
                getPalettePool(
                    bpm,
                    energy
                ).filter(
                    p =>
                        p !== "RAINBOW" &&
                        p !== lastPalette
                );

            if (
                alternatives.length > 0
            ) {

                palette =
                    randomFrom(
                        alternatives
                    );

            }

        }

    }

    // ------------------------------------------------------
    // SAME PALETTE
    // ------------------------------------------------------

    if (
        palette === lastPalette
    ) {

        const alternatives =
            getPalettePool(
                bpm,
                energy
            ).filter(
                p =>
                    p !== lastPalette &&
                    !paletteHistory
                        .slice(-2)
                        .includes(p)
            );

        if (
            alternatives.length > 0
        ) {

            palette =
                randomFrom(
                    alternatives
                );

        }

    }

    return palette;
}

// ==========================================================
// REMEMBER PALETTE
// ==========================================================

function rememberPalette(
    palette
) {

    lastPalette =
        palette;

    paletteHistory.push(
        palette
    );

    while (
        paletteHistory.length > 5
    ) {

        paletteHistory.shift();

    }
}

// ==========================================================
// SYSTEM PROMPT
// ==========================================================

const SYSTEM_PROMPT = `

You are the professional lighting director
for a fictional Roblox recreation of a JBL PartyBox 110.

Your job is to create a musical lighting SHOW.

The Roblox client handles the actual animation.

==================================================
CORE BEHAVIOR
==================================================

Do NOT change the lighting configuration
just because a new request arrived.

The system asks for a new decision every few seconds,
but that does NOT mean the lighting must change
every few seconds.

Only make meaningful changes when the music changes.

If BPM and energy are basically unchanged,
KEEP the current pattern and palette.

==================================================
PATTERNS
==================================================

ROCK
Aggressive rhythmic movement.

FLOW
Smooth continuous movement.

CROSS
Movement toward and away from the center.

RIPPLE
Wave movement.

FLASH
Large synchronized flashes.
Use rarely.

==================================================
PALETTES
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
IMPORTANT PALETTE RULE
==================================================

Do NOT constantly choose:

BLUE
ICE
CYAN
CYBER

They are NOT defaults.

RAINBOW is a valid and beautiful palette.

RAINBOW is NOT banned.

RAINBOW can be used during calm,
normal, energetic, or extreme music.

Do not artificially avoid RAINBOW.

==================================================
0 BPM
==================================================

If BPM is 0:

The music is stopped or nearly silent.

Prefer calm lighting.

Allowed:

RAINBOW
BLUE
PURPLE
CYAN
PINK
ICE
GREEN

Forbidden:

CYBER
FIRE
RED
ORANGE
SUNSET

RAINBOW IS ALLOWED AT 0 BPM.

CYBER IS NOT.

==================================================
CALM
==================================================

Prefer:

RAINBOW
BLUE
PURPLE
CYAN
PINK
ICE
GREEN

==================================================
NORMAL
==================================================

Prefer a varied selection from:

RAINBOW
BLUE
CYAN
PURPLE
PINK
GREEN
YELLOW
ORANGE
SUNSET

==================================================
ENERGETIC
==================================================

Prefer a varied selection from:

RAINBOW
RED
ORANGE
PURPLE
BLUE
PINK
CYAN
YELLOW
GREEN
SUNSET
FIRE
CYBER

CYBER is only ONE possible choice.

Do NOT default to CYBER.

==================================================
EXTREME
==================================================

Prefer:

RAINBOW
RED
ORANGE
FIRE
PURPLE
BLUE
PINK
SUNSET
YELLOW
CYAN
CYBER

==================================================
RAINBOW
==================================================

RAINBOW should appear naturally in the show.

Do not use it every request.

Do not permanently avoid it.

RAINBOW is especially good for:

musical transitions
celebratory sections
dreamy sections
big moments
visual variety

==================================================
PATTERN RULES
==================================================

CALM:

FLOW
RIPPLE

NORMAL:

FLOW
CROSS
RIPPLE

ENERGETIC:

ROCK
CROSS
RIPPLE

EXTREME:

ROCK
FLASH
CROSS

==================================================
BPM
==================================================

Below 80:

FLOW or RIPPLE

80-110:

FLOW or CROSS

110-130:

CROSS or ROCK

130-150:

ROCK or CROSS

Above 150:

ROCK, CROSS, or FLASH

==================================================
SPEED
==================================================

CALM:

0.5 - 0.9

NORMAL:

0.8 - 1.3

ENERGETIC:

1.2 - 2.0

EXTREME:

1.6 - 3.0

==================================================
INTENSITY
==================================================

CALM:

0.5 - 0.75

NORMAL:

0.7 - 0.9

ENERGETIC:

0.85 - 1.0

EXTREME:

0.95 - 1.0

==================================================
STROBE
==================================================

Normally false.

Only use true during major musical moments.

High BPM alone does not justify strobe.

Never use strobe at 0 BPM.

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

==================================================
MUSICAL EVOLUTION
==================================================

If energy changes significantly:

Consider changing the pattern AND palette.

If BPM changes significantly:

Consider changing the pattern.

If nothing meaningfully changed:

KEEP the current pattern and palette.

Do not randomly reinvent the show.

==================================================
CURRENT SHOW
==================================================

You will receive:

CURRENT PATTERN
CURRENT PALETTE
RECENT PALETTES
CURRENT BPM
CURRENT ENERGY

Use these to CONTINUE the lighting show.

Do NOT blindly reset to:

FLOW + BLUE
FLOW + ICE
FLOW + CYBER
FLOW + RAINBOW

==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

Use exactly:

{
    "pattern": "FLOW",
    "palette": "RAINBOW",
    "speed": 1,
    "intensity": 0.8,
    "strobe": false,
    "bottomMode": "GRADIENT"
}
`;

// ==========================================================
// GEMINI REQUEST
// ==========================================================

async function askGemini(
    audio,
    meaningfulChange
) {

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `

CURRENT MUSIC:

BPM:
${audio.bpm}

LOUDNESS:
${audio.loudness}

ENERGY:
${audio.energy}

BEAT:
${audio.beat}

BEAT STRENGTH:
${audio.beatStrength}

==================================================
CURRENT SHOW
==================================================

CURRENT PATTERN:
${lastPattern || "NONE"}

CURRENT PALETTE:
${lastPalette || "NONE"}

RECENT PALETTES:
${paletteHistory.join(", ") || "NONE"}

PREVIOUS PLAN:
${
    lastPlan
        ? JSON.stringify(lastPlan)
        : "NONE"
}

==================================================
MUSIC CHANGE
==================================================

Meaningful music change:
${
    meaningfulChange
        ? "YES"
        : "NO"
}

Previous BPM:
${lastBpm ?? "NONE"}

Previous energy:
${lastEnergy ?? "NONE"}

==================================================
DECISION
==================================================

If meaningful music change is NO:

KEEP the current pattern and palette.

You may adjust speed or intensity slightly.

Do NOT randomly change the palette.

If meaningful music change is YES:

The lighting may evolve.

Choose a pattern and palette that fit
the new musical state.

==================================================
0 BPM
==================================================

If BPM is 0:

NEVER choose CYBER.
NEVER choose FIRE.
NEVER choose RED.
NEVER choose ORANGE.
NEVER choose SUNSET.

RAINBOW IS ALLOWED.

==================================================
VARIETY
==================================================

Do not constantly use:

BLUE
ICE
CYAN
CYBER

CYBER must be uncommon.

RAINBOW must remain available.

Do not repeat the same palette endlessly.

Return ONLY JSON.
`;

    const response =
        await fetch(
            url,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    systemInstruction: {
                        parts: [
                            {
                                text:
                                    SYSTEM_PROMPT
                            }
                        ]
                    },

                    contents: [
                        {
                            role: "user",

                            parts: [
                                {
                                    text:
                                        prompt
                                }
                            ]
                        }
                    ],

                    generationConfig: {

                        temperature:
                            0.95,

                        responseMimeType:
                            "application/json"

                    }

                })
            }
        );

    if (!response.ok) {

        const error =
            await response.text();

        throw new Error(
            `Gemini ${response.status}: ${error}`
        );

    }

    const data =
        await response.json();

    const text =
        data
            ?.candidates?.[0]
            ?.content?.parts?.[0]
            ?.text;

    if (!text) {

        throw new Error(
            "Gemini returned no text."
        );

    }

    return JSON.parse(
        text
    );
}

// ==========================================================
// VALIDATE PLAN
// ==========================================================

function validatePlan(
    plan,
    audio,
    meaningfulChange
) {

    if (
        typeof plan !== "object" ||
        !plan
    ) {

        plan = {};

    }

    const patterns = [
        "ROCK",
        "FLOW",
        "CROSS",
        "RIPPLE",
        "FLASH"
    ];

    const bottomModes = [
        "GRADIENT",
        "CHASE",
        "SYNC",
        "OFF"
    ];

    // ======================================================
    // PATTERN
    // ======================================================

    let pattern =
        String(
            plan.pattern ||
            lastPattern ||
            "FLOW"
        ).toUpperCase();

    if (
        !patterns.includes(
            pattern
        )
    ) {

        pattern =
            lastPattern ||
            getFallbackPattern(
                audio.bpm,
                audio.energy
            );

    }

    // Preserve pattern if music didn't change.

    if (
        !meaningfulChange &&
        lastPattern
    ) {

        pattern =
            lastPattern;

    }

    // ======================================================
    // SPEED
    // ======================================================

    let speed =
        Number(
            plan.speed
        );

    if (
        !Number.isFinite(speed)
    ) {

        speed = 1;

    }

    speed =
        Math.max(
            0.25,
            Math.min(
                3,
                speed
            )
        );

    // ======================================================
    // INTENSITY
    // ======================================================

    let intensity =
        Number(
            plan.intensity
        );

    if (
        !Number.isFinite(
            intensity
        )
    ) {

        intensity = 0.8;

    }

    intensity =
        Math.max(
            0,
            Math.min(
                1,
                intensity
            )
        );

    // ======================================================
    // STROBE
    // ======================================================

    let strobe =
        plan.strobe === true;

    if (
        audio.bpm <= 10 ||
        audio.energy === "CALM"
    ) {

        strobe = false;

    }

    // ======================================================
    // BOTTOM MODE
    // ======================================================

    let bottomMode =
        String(
            plan.bottomMode ||
            "GRADIENT"
        ).toUpperCase();

    if (
        !bottomModes.includes(
            bottomMode
        )
    ) {

        bottomMode =
            "GRADIENT";

    }

    if (
        !meaningfulChange &&
        lastPlan?.bottomMode
    ) {

        bottomMode =
            lastPlan.bottomMode;

    }

    // ======================================================
    // PALETTE
    // ======================================================

    const palette =
        fixPalette(
            plan.palette,
            audio.bpm,
            audio.energy,
            meaningfulChange
        );

    // ======================================================
    // CALM
    // ======================================================

    if (
        audio.energy === "CALM"
    ) {

        if (
            pattern === "FLASH"
        ) {

            pattern =
                "FLOW";

        }

        bottomMode =
            "GRADIENT";

    }

    // ======================================================
    // 0 BPM
    // ======================================================

    if (
        audio.bpm <= 10
    ) {

        strobe = false;

        if (
            pattern === "FLASH"
        ) {

            pattern =
                "FLOW";

        }

        bottomMode =
            "GRADIENT";

    }

    // ======================================================
    // RESULT
    // ======================================================

    return {

        pattern,

        palette,

        speed:
            Number(
                speed.toFixed(2)
            ),

        intensity:
            Number(
                intensity.toFixed(2)
            ),

        strobe,

        bottomMode

    };
}

// ==========================================================
// PARTYBOX ENDPOINT
// ==========================================================

app.post(
    "/partybox",
    async (req, res) => {

        try {

            // ==================================================
            // AUTH
            // ==================================================

            const providedSecret =
                req.headers[
                    "x-partybox-key"
                ];

            if (
                PARTYBOX_SECRET &&
                providedSecret !==
                    PARTYBOX_SECRET
            ) {

                return res
                    .status(401)
                    .json({
                        error:
                            "Unauthorized"
                    });

            }

            // ==================================================
            // AUDIO
            // ==================================================

            const audio =
                req.body?.audio || {};

            const bpm =
                Math.max(
                    0,
                    Math.min(
                        300,
                        Number(
                            audio.bpm
                        ) || 0
                    )
                );

            const loudness =
                Math.max(
                    0,
                    Math.min(
                        10000,
                        Number(
                            audio.loudness
                        ) || 0
                    )
                );

            const beatStrength =
                Math.max(
                    0,
                    Math.min(
                        1,
                        Number(
                            audio.beatStrength
                        ) || 0
                    )
                );

            const beat =
                audio.beat === true;

            let energy =
                String(
                    audio.energy ||
                    "NORMAL"
                ).toUpperCase();

            if (
                ![
                    "CALM",
                    "NORMAL",
                    "ENERGETIC",
                    "EXTREME"
                ].includes(
                    energy
                )
            ) {

                energy =
                    "NORMAL";

            }

            // ==================================================
            // MUSIC CHANGE
            // ==================================================

            const meaningfulChange =
                musicChangedMeaningfully(
                    bpm,
                    energy
                );

            // ==================================================
            // CLEAN AUDIO
            // ==================================================

            const cleanAudio = {

                bpm,

                loudness,

                beat,

                beatStrength,

                energy,

                currentPattern:
                    lastPattern ||
                    "FLOW"

            };

            console.log(
                "🎵 PartyBox music:",
                cleanAudio
            );

            console.log(
                "🎛️ Meaningful change:",
                meaningfulChange
            );

            // ==================================================
            // GEMINI
            // ==================================================

            let aiPlan;

            try {

                aiPlan =
                    await askGemini(
                        cleanAudio,
                        meaningfulChange
                    );

            } catch (error) {

                console.error(
                    "❌ Gemini error:",
                    error.message
                );

                // If Gemini fails and the music
                // hasn't changed, preserve the show.

                if (
                    !meaningfulChange &&
                    lastPlan
                ) {

                    aiPlan = {
                        ...lastPlan
                    };

                } else {

                    aiPlan = {

                        pattern:
                            getFallbackPattern(
                                bpm,
                                energy
                            ),

                        palette:
                            getFallbackPalette(
                                bpm,
                                energy
                            ),

                        speed:
                            energy === "EXTREME"
                                ? 2
                                : energy === "ENERGETIC"
                                    ? 1.5
                                    : energy === "NORMAL"
                                        ? 1
                                        : 0.8,

                        intensity:
                            energy === "CALM"
                                ? 0.65
                                : energy === "EXTREME"
                                    ? 1
                                    : energy === "ENERGETIC"
                                        ? 0.9
                                        : 0.8,

                        strobe:
                            false,

                        bottomMode:
                            energy === "ENERGETIC" ||
                            energy === "EXTREME"
                                ? "CHASE"
                                : "GRADIENT"

                    };

                }

            }

            // ==================================================
            // VALIDATE
            // ==================================================

            const plan =
                validatePlan(
                    aiPlan,
                    cleanAudio,
                    meaningfulChange
                );

            // ==================================================
            // REMEMBER
            // ==================================================

            rememberPalette(
                plan.palette
            );

            lastPattern =
                plan.pattern;

            lastPlan =
                plan;

            lastBpm =
                bpm;

            lastEnergy =
                energy;

            // ==================================================
            // LOG
            // ==================================================

            console.log(
                "💡 PartyBox AI:",
                plan
            );

            // ==================================================
            // RESPONSE
            // ==================================================

            return res.json(
                plan
            );

        } catch (error) {

            console.error(
                "❌ PartyBox server error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Internal server error"
                });

        }

    }
);

// ==========================================================
// HEALTH CHECK
// ==========================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            status:
                "PartyBox AI online",

            model:
                GEMINI_MODEL,

            lastPalette,

            lastPattern,

            lastBpm,

            lastEnergy,

            paletteHistory

        });

    }
);

// ==========================================================
// START SERVER
// ==========================================================

app.listen(
    PORT,
    () => {

        console.log(
            `🔊 PartyBox AI server running on port ${PORT}`
        );

        console.log(
            `🤖 Gemini model: ${GEMINI_MODEL}`
        );

    }
);
