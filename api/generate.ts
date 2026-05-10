import Stripe from "stripe";

export const config = { maxDuration: 60 };

const SETTINGS: Record<string, { place: string; smell: string; fn: string; fd: string }> = {
  Dinosaurs: { place: "the Valley of Ancient Echoes",         smell: "warm fern and sun-baked stone",       fn: "Pip",    fd: "a gentle young triceratops with three stubby horns and soft brown eyes" },
  Space:     { place: "the Star Garden beyond the last cloud", smell: "cold silver and distant starlight",   fn: "Zim",    fd: "a tiny astronaut no taller than a boot, with a helmet that glowed soft blue" },
  Magic:     { place: "the Enchanted Wood",                    smell: "pine needles and sweet smoke",        fn: "Pip",    fd: "a tiny wizard no bigger than a thumb, with a hat that tilted left" },
  Animals:   { place: "Whispering Meadow",                     smell: "clover and early rain",               fn: "Clover", fd: "a russet fox with a white-tipped tail and clever green eyes" },
  Ocean:     { place: "the Deep Blue Cove",                    smell: "salt and something sweet",            fn: "Coral",  fd: "a sapphire seahorse who moved like a slow, gentle song" },
  Castles:   { place: "Brightstone Castle on the hill",        smell: "old stone and candle wax",           fn: "Ember",  fd: "a small green dragon with wings like autumn leaves" },
  Nature:    { place: "the Mossy Creek Forest",                smell: "earth and green and wet leaves",      fn: "Sage",   fd: "a tawny owl with spectacles made from acorn caps" },
  Music:     { place: "the Song Mountains",                    smell: "cedar and wind",                      fn: "Melody", fd: "a bluebird with a golden beak who could make stones hum" },
  Robots:    { place: "Geartown",                              smell: "warm oil and fresh bread",            fn: "Bolt",   fd: "a small silver robot with one antenna bent sideways and a wobbly walk" },
  Sports:    { place: "the Grand Playing Field",               smell: "cut grass and afternoon sun",         fn: "Dash",   fd: "a quick brown rabbit in tiny striped shorts" },
  Food:      { place: "the Candy Kitchen",                     smell: "cinnamon and brown sugar",            fn: "Biscuit",fd: "a round baker with floury hands and a hat shaped like a puffed cloud" },
  Colours:   { place: "Rainbow Ridge",                         smell: "rain and something like fresh paint", fn: "Prism",  fd: "a colour-changing lizard who left rainbow footprints wherever they walked" },
};

const STYLE_PREFIX =
  "Children's picture book illustration. Vibrant digital watercolor style. " +
  "Warm glowing light. Saturated joyful colors. Soft rounded shapes. " +
  "Friendly expressive characters with big eyes. Magical enchanting atmosphere. " +
  "Studio Ghibli inspired warmth. No text, no words, no letters in the image. ";

async function generateIllustration(scene: string, apiKey: string): Promise<string | null> {
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: STYLE_PREFIX + scene }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      },
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      candidates: { content: { parts: { inlineData?: { mimeType: string; data: string } }[] } }[];
    };
    const part = data.candidates?.[0]?.content?.parts?.find(
      (p) => p.inlineData?.mimeType?.startsWith("image/"),
    );
    if (!part?.inlineData) return null;
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  } catch {
    return null;
  }
}

async function generateStoryWithScenes(
  name: string,
  age: string,
  interests: string[],
  theme: string,
  s: { place: string; smell: string; fn: string; fd: string },
  apiKey: string,
): Promise<{ title: string; cover_scene: string; pages: { text: string; scene: string }[] }> {
  const ageGuide =
    age === "2–3" ? "very simple words, short sentences, occasional rhyme" :
    age === "4–5" ? "simple warm language, some descriptive words" :
    age === "6–7" ? "richer vocabulary, slightly longer sentences" :
                    "full flowing sentences, deeper emotional resonance";

  const prompt =
`Write a 6-page children's bedtime story for ${name}, age ${age}, who loves ${interests.join(", ")}. Theme: "${theme}".
Setting: "${s.place}". Companion: ${s.fn} — ${s.fd}.

Return ONLY valid JSON, no extra text:
{
  "title": "A memorable story title",
  "cover_scene": "Vivid cover illustration description: ${name} and ${s.fn} in ${s.place}, magical nighttime atmosphere, what they look like, composition, mood",
  "pages": [
    {
      "text": "Page 1 (~120 words): ${name} discovers ${s.place} at night. The smell of ${s.smell} fills the air. Warm, magical opening.",
      "scene": "Illustration: ${name} stepping into ${s.place} for the first time, eyes wide with wonder, moonlight, magical atmosphere, specific visual details"
    },
    {
      "text": "Page 2 (~120 words): ${name} meets ${s.fn}. Something seems not quite right.",
      "scene": "Illustration: ${name} and ${s.fn} meeting for the first time, ${s.fn}'s expression, the environment around them"
    },
    {
      "text": "Page 3 (~120 words): The challenge becomes clear. ${name} recognises a familiar feeling.",
      "scene": "Illustration: the challenge moment, both characters' expressions showing concern or determination, dramatic but gentle"
    },
    {
      "text": "Page 4 (~120 words): ${name} acts bravely. They face it together.",
      "scene": "Illustration: ${name} and ${s.fn} working together, action moment, hopeful and energetic"
    },
    {
      "text": "Page 5 (~120 words): Resolution. The gentle lesson about: ${theme}.",
      "scene": "Illustration: warm triumphant moment, both characters happy and connected, glowing warm light"
    },
    {
      "text": "Page 6 (~100 words): ${name} is home, tucked in bed, drifting off peacefully.",
      "scene": "Illustration: cozy bedroom at night, ${name} snuggled in bed with a smile, moonlight through window, stuffed animals, utterly peaceful"
    }
  ]
}

Writing rules: bedtime tone, ${ageGuide}, "${theme}" emerges naturally (never preachy), rich sensory details, page 6 ends with ${name} falling asleep.`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 5000, temperature: 0.85 },
      }),
    },
  );

  if (!resp.ok) throw new Error(`Gemini text error ${resp.status}`);
  const data = (await resp.json()) as {
    candidates: { content: { parts: { text: string }[] } }[];
  };
  const raw = data.candidates[0].content.parts[0].text.trim();
  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(cleaned);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const GEMINI_KEY = process.env.gemini_api_key;
  const stripe = process.env.stripe_secret_key
    ? new Stripe(process.env.stripe_secret_key, { httpClient: Stripe.createFetchHttpClient() })
    : null;

  try {
    const body = (await req.json()) as {
      session_id?: string;
      name?: string;
      age?: string;
      interests?: string[];
      theme?: string;
    };

    let name: string, age: string, interests: string[], theme: string;

    if (body.session_id) {
      if (!stripe) return Response.json({ ok: false, error: "Stripe not configured" }, { status: 500 });
      const session = await stripe.checkout.sessions.retrieve(body.session_id);
      if (session.payment_status !== "paid") {
        return Response.json({ ok: false, error: "Payment not completed" }, { status: 402 });
      }
      name = session.metadata?.name || "";
      age = session.metadata?.age || "4–5";
      interests = (session.metadata?.interests || "Animals").split(",").filter(Boolean);
      theme = session.metadata?.theme || "";
    } else {
      name = body.name || "";
      age = body.age || "4–5";
      interests = body.interests || ["Animals"];
      theme = body.theme || "";
    }

    if (!name || !theme) return Response.json({ ok: false, error: "Missing fields" }, { status: 400 });
    if (!GEMINI_KEY) return Response.json({ ok: false, error: "No Gemini API key" }, { status: 500 });

    const interest = interests?.[0] || "Animals";
    const s = SETTINGS[interest] ?? SETTINGS["Animals"];

    const storyData = await generateStoryWithScenes(name, age, interests, theme, s, GEMINI_KEY);

    const charCtx = `The child hero is ${name}, a young child with wonder-filled eyes. The companion is ${s.fn} (${s.fd}). Setting: ${s.place}.`;
    const allScenes = [storyData.cover_scene, ...storyData.pages.map((p) => p.scene)];

    const imageResults = await Promise.allSettled(
      allScenes.map((scene) => generateIllustration(`${charCtx} ${scene}`, GEMINI_KEY)),
    );
    const images = imageResults.map((r) => (r.status === "fulfilled" ? r.value : null));

    const story = {
      name, age, interests, theme,
      title: storyData.title,
      coverImage: images[0],
      pages: storyData.pages.map((p, i) => ({ text: p.text, image: images[i + 1] ?? null })),
    };

    return Response.json({ ok: true, story });
  } catch (err) {
    console.error("[/api/generate]", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
