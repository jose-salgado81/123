// Import the Stripe library.
// The secret key should be set as an environment variable in Vercel.
import Stripe from 'stripe';

// Create a new Stripe instance with your secret key.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Define the POST method to handle the payment success page logic.
// This endpoint will receive the session_id in the request body.
export async function POST(request) {
  try {
    // Parse the JSON body from the incoming request.
    const body = await request.json();
    const { sessionId } = body;

    // Check if a session ID was provided.
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "No session ID provided." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Retrieve the checkout session from Stripe using the session ID.
    // We expand the 'payment_intent' object to get details about the payment.
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    // Check if the payment was successful.
    if (session.payment_intent.status === 'succeeded') {
      // The payment was successful.
      // You can now fulfill your order, e.g., send a confirmation email,
      // update your database, etc.
      console.log('Payment was successful for session ID:', sessionId);
      console.log('Payment Intent details:', session.payment_intent);

      // Respond with a success message.
      return new Response(JSON.stringify({ message: "Payment successful!", session }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // The payment was not successful.
      console.log('Payment was not successful for session ID:', sessionId);

      // Respond with a failure message.
      return new Response(JSON.stringify({ message: "Payment was not successful." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    // Log any errors that occur during the process.
    console.error("Error retrieving Stripe session:", error);

    // Return an error response to the front-end.
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
