// Import the Stripe library.
// The secret key should be set as an environment variable in Vercel.
import Stripe from 'stripe';

// Hoisted CORS headers to reuse in both OPTIONS and POST responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // IMPORTANT: In production, replace '*' with your domain(s)
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Define the POST method to handle the payment success page logic.
// This endpoint will receive the session_id in the request body.
export async function POST(request) {
  // Instantiate Stripe at runtime to avoid build-time env errors
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return new Response(JSON.stringify({ error: 'Stripe secret key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const stripe = new Stripe(stripeSecretKey);

  // Facebook CAPI config via env vars
  const fbAccessToken = process.env.FB_ACCESS_TOKEN;
  const fbPixelId = process.env.FB_PIXEL_ID;

  // Log to confirm the POST function is triggered after the CORS check.
  console.log("POST function triggered.");

  try {
    // Parse the JSON body from the incoming request.
    const body = await request.json();
    const { sessionId, fbp, product_name, price, currency } = body;

    // Check if a session ID was provided.
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "No session ID provided." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Retrieve the checkout session from Stripe using the session ID.
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    // Log the actual payment intent status returned by Stripe.
    console.log('Stripe payment status:', session.payment_intent?.status);

    // Check if the payment was successful.
    if (session.payment_intent?.status === 'succeeded') {
      // The payment was successful.
      console.log('Payment was successful for session ID:', sessionId);

      // Prepare Facebook CAPI Purchase event if configured
      let fbResponseData = null;
      if (fbAccessToken && fbPixelId) {
        const eventTimeSec = Math.floor(Date.now() / 1000);
        const purchaseCurrency = (session.currency || currency || 'usd').toUpperCase();
        const amountTotal = typeof session.amount_total === 'number' ? session.amount_total : undefined;
        const purchaseValue = amountTotal != null ? amountTotal / 100 : (typeof price === 'number' ? price : parseFloat(price));

        const fbcapiPayload = {
          data: [
            {
              event_name: 'Purchase',
              event_time: eventTimeSec,
              action_source: 'website',
              user_data: {
                ...(fbp ? { fbp } : {}),
              },
              custom_data: {
                currency: purchaseCurrency,
                value: isNaN(purchaseValue) ? 0 : purchaseValue,
                content_type: 'product',
                ...(product_name ? { content_name: product_name, content_ids: [product_name] } : {}),
              },
            },
          ],
        };

        const fbcapiEndpoint = `https://graph.facebook.com/v19.0/${fbPixelId}/events?access_token=${fbAccessToken}`;
        try {
          const fbRes = await fetch(fbcapiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fbcapiPayload),
          });
          fbResponseData = fbRes.status === 204 ? { status: 'no_content' } : await fbRes.json();
          if (!fbRes.ok) {
            console.error('Facebook CAPI error:', fbResponseData);
          } else {
            console.log('Facebook CAPI success:', fbResponseData);
          }
        } catch (fbErr) {
          console.error('Facebook CAPI network error:', fbErr);
        }
      } else {
        console.warn('Facebook CAPI not configured: missing FB_ACCESS_TOKEN or FB_PIXEL_ID');
      }

      // Respond with a success message.
      return new Response(
        JSON.stringify({ message: "Payment successful!", session, fbCapi: fbResponseData }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // The payment was not successful.
      console.log('Payment was not successful for session ID:', sessionId);

      // Respond with a failure message.
      return new Response(JSON.stringify({ message: "Payment was not successful." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    // Log any errors that occur during the process.
    console.error("Error retrieving Stripe session:", error);

    // Return an error response to the front-end.
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
