import Stripe from "stripe";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const stripe = process.env.stripe_secret_key
    ? new Stripe(process.env.stripe_secret_key)
    : null;
  if (!stripe) return Response.json({ ok: false, error: "Stripe not configured" }, { status: 500 });

  try {
    const { name, age, interests, theme } = (await req.json()) as {
      name: string;
      age: string;
      interests: string[];
      theme: string;
    };
    if (!name || !theme)
      return Response.json({ ok: false, error: "Missing fields" }, { status: 400 });

    const origin = new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Hush — A Bedtime Story for ${name}`,
              description: `A personalised 6-page illustrated story · Theme: ${theme}`,
            },
            unit_amount: 299,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        name,
        age: age || "4–5",
        interests: (interests || []).join(","),
        theme,
      },
      success_url: `${origin}/app.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app.html?cancelled=1`,
    });

    return Response.json({ ok: true, url: session.url });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
