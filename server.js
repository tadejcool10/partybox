import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(express.json({ limit: "50kb" }));

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PARTYBOX_SECRET = process.env.PARTYBOX_SECRET;

if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is missing!");
    process.exit(1);
}

if (!PARTYBOX_SECRET) {
    console.error("❌ PARTYBOX_SECRET is missing!");
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY
});

const MODEL = "gemini-3.5-flash-lite";

/*
============================================================
AVAILABLE LIGHTS
============================================================

This is intentionally duplicated here as a SECURITY
validation layer.

Roblox also sends its capability list.

Gemini can only choose from these.
*/

const SERVER_CAPABILITIES = {

    "1": [
        "enabled",
        "color"
    ],

    "2": [
        "enabled",
        "color"
    ],

    "3": [
        "enabled",
        "color"
    ],

    "Speaker_Lights": [
        "color"
    ],

    "Grid_Border": [
        "color"
    ],

    "Bottom 1": [
        "enabled",
        "color"
    ],

    "Bottom 2": [
        "enabled",
        "color"
    ],

    "Bottom 3": [
        "enabled",
        "color"
    ],

    "Bottom 4": [
        "enabled",
        "color"
    ],

    "Bottom 5": [
        "enabled",
        "color"
    ],

    "Bottom 6": [
        "enabled",
        "color"
    ]

};

/*
============================================================
AUTHENTICATION
============================================================
*/

function authenticate(req, res, next) {

    const suppliedKey =
        req.headers["x-partybox-key"];

    if (
        !suppliedKey ||
        suppliedKey !== PARTYBOX_SECRET
    ) {

        return res.status(401).json({
            error: "Unauthorized"
        });

    }

    next();
}

/*
============================================================
VALIDATE RGB
============================================================
*/

function validRGB(color) {

    if (!Array.isArray(color)) {
        return false;
    }

    if (color.length !== 3) {
        return false;
    }

    return color.every(value =>
        Number.isInteger(value) &&
        value >= 0 &&
        value <= 255
    );

}

/*
============================================================
VALIDATE GEMINI ACTION
============================================================
*/

function validateAction(action) {

    if (!action || typeof action !== "object") {
        return null;
    }

    const light =
        action.light;

    const change =
        action.change;

    if (
        typeof light !== "string" ||
        !change ||
        typeof change !== "object"
    ) {
        return null;
    }

    /*
    --------------------------------------------
    Check whether the light exists
    --------------------------------------------
    */

    const allowedChanges =
        SERVER_CAPABILITIES[light];

    if (!allowedChanges) {

        console.warn(
            "Rejected unknown light:",
            light
        );

        return null;
    }

    const cleanedChange = {};

    /*
    --------------------------------------------
    ENABLED
    --------------------------------------------
    */

    if (change.enabled !== undefined) {

        if (
            !allowedChanges.includes(
                "enabled"
            )
        ) {

            console.warn(
                "Rejected enabled change:",
                light
            );

        } else {

            if (
                typeof change.enabled ===
                "boolean"
            ) {

                cleanedChange.enabled =
                    change.enabled;

            }

        }

    }

    /*
    --------------------------------------------
    COLOR
    --------------------------------------------
    */

    if (change.color !== undefined) {

        if (
            !allowedChanges.includes(
                "color"
            )
        ) {

            console.warn(
                "Rejected color change:",
                light
            );

        } else {

            if (
                validRGB(change.color)
            ) {

                cleanedChange.color =
                    change.color;

            }

        }

    }

    /*
    --------------------------------------------
    Don't send empty actions
    --------------------------------------------
    */

    if (
        Object.keys(cleanedChange)
            .length === 0
    ) {

        return null;

    }

    return {
        light,
        change: cleanedChange
    };

}

/*
============================================================
VALIDATE WHOLE RESPONSE
============================================================
*/

function validateAIResponse(data) {

    if (
        !data ||
        typeof data !== "object"
    ) {

        return {
            actions: []
        };

    }

    if (
        !Array.isArray(data.actions)
    ) {

        return {
            actions: []
        };

    }

    /*
    Limit how many lights Gemini can change
    in one request.

    This prevents crazy responses like
    hundreds of actions.
    */

    const actions =
        data.actions
            .slice(0, 12)
            .map(validateAction)
            .filter(Boolean);

    return {
        actions
    };

}

/*
============================================================
HEALTH CHECK
============================================================
*/

app.get("/", (req, res) => {

    res.json({
        status: "online",
        service: "PartyBox AI",
        model: MODEL
    });

});

/*
============================================================
PARTYBOX AI
============================================================
*/

app.post(
    "/partybox",
    authenticate,
    async (req, res) => {

        try {

            const audio =
                req.body?.audio;

            if (!audio) {

                return res.status(400).json({
                    error: "Missing audio data"
                });

            }

            /*
            ============================================
            BUILD CAPABILITY DESCRIPTION
            ============================================
            */

            const capabilityText =
                Object.entries(
                    SERVER_CAPABILITIES
                )
                .map(
                    ([name, changes]) =>
                        `- ${name}: ${changes.join(", ")}`
                )
                .join("\n");

            /*
            ============================================
            GEMINI PROMPT
            ============================================
            */

            const prompt = `
You are the AI lighting director for a
JBL PartyBox-style speaker recreated in Roblox.

Your job is to make creative music-reactive
lighting decisions.

You DO NOT control Roblox directly.

You ONLY return JSON commands.

==================================================
AVAILABLE LIGHTS
==================================================

${capabilityText}

==================================================
STRICT RULES
==================================================

1. NEVER invent a light.

2. NEVER use a property that isn't listed
   for that light.

3. NEVER output anything except JSON.

4. "enabled" must be true or false.

5. "color" must be exactly:

   [R, G, B]

   where every value is between 0 and 255.

6. Do not change every light on every request.

7. Use the music information to decide
   when strong lighting changes make sense.

8. Higher beat strength should generally
   result in stronger lighting changes.

9. Faster BPM can use faster-looking
   color/light changes.

10. Slower BPM can use calmer combinations.

11. Sometimes turn lights off.

12. Sometimes use only one light.

13. Sometimes synchronize multiple lights.

14. Make the result feel like a polished
   commercial PartyBox light show.

==================================================
AUDIO INFORMATION
==================================================

${JSON.stringify(audio, null, 2)}

==================================================
OUTPUT FORMAT
==================================================

Return exactly:

{
    "actions": [
        {
            "light": "Bottom 3",
            "change": {
                "color": [255, 0, 180]
            }
        }
    ]
}

No markdown.
No explanation.
JSON only.
`;

            /*
            ============================================
            ASK GEMINI
            ============================================
            */

            const response =
                await ai.models.generateContent({

                    model: MODEL,

                    contents: prompt,

                    config: {

                        responseMimeType:
                            "application/json",

                        responseSchema: {

                            type: "object",

                            properties: {

                                actions: {

                                    type: "array",

                                    items: {

                                        type: "object",

                                        properties: {

                                            light: {
                                                type: "string"
                                            },

                                            change: {

                                                type: "object",

                                                properties: {

                                                    enabled: {
                                                        type: "boolean"
                                                    },

                                                    color: {

                                                        type: "array",

                                                        items: {
                                                            type: "integer"
                                                        }

                                                    }

                                                }

                                            }

                                        },

                                        required: [
                                            "light",
                                            "change"
                                        ]

                                    }

                                }

                            },

                            required: [
                                "actions"
                            ]

                        }

                    }

                });

            /*
            ============================================
            PARSE GEMINI
            ============================================
            */

            let parsed;

            try {

                parsed =
                    JSON.parse(
                        response.text
                    );

            } catch (error) {

                console.error(
                    "❌ Gemini returned invalid JSON:",
                    response.text
                );

                return res.status(500).json({
                    error:
                        "Gemini returned invalid JSON"
                });

            }

            /*
            ============================================
            SECURITY VALIDATION
            ============================================
            */

            const safeResponse =
                validateAIResponse(
                    parsed
                );

            /*
            ============================================
            SEND TO ROBLOX
            ============================================
            */

            res.json(
                safeResponse
            );

        } catch (error) {

            console.error(
                "❌ PartyBox AI error:",
                error
            );

            res.status(500).json({
                error:
                    "AI request failed"
            });

        }

    }
);

/*
============================================================
START SERVER
============================================================
*/

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `🔊 PartyBox AI running on port ${PORT}`
        );

        console.log(
            `🤖 Gemini model: ${MODEL}`
        );

    }
);
