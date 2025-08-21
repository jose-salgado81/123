// Import the Stripe library.
// The secret key should be set as an environment variable in Vercel.
import Stripe from 'stripe';

// Create a new Stripe instance with your secret key.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Define the OPTIONS method for CORS preflight requests.
// This is necessary to allow the front-end to make POST requests.
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Define the POST method to handle payment creation.
export async function POST(request) {
  try {
    // Parse the JSON body from the incoming request.
    const body = await request.json();
    const { amount, currency } = body;

    // Log the received data for debugging purposes.
    console.log("Received data:", body);

    // Create a new PaymentIntent with Stripe.
    // The amount should be in cents (or the smallest currency unit).
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Return the client secret to the front-end.
    // The client secret is used by the front-end to confirm the payment.
    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log any errors that occur during the process.
    console.error("Error creating Payment Intent:", error);

    // Return an error response to the front-end.
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

