// Import the Stripe library.
import Stripe from 'stripe';

// ====================================================================
// IMPORTANT: Replace the placeholders below with your actual keys.
// DO NOT hardcode these values in a production environment.
// ====================================================================

// NOTE: We are using a test key because your session ID is a test session ID.
const YOUR_STRIPE_SECRET_KEY = "sk_test_51OEzb5ElxzHYjrwMgz86Y93903whol1RRR7FCianF7mj6F6OdEnODKiUabRbPtMsQaTJFj8f8AhAdQ9xcZwBytPO00heAMpAq4"; // Replace with your test secret key
const YOUR_SESSION_ID = "cs_test_a1pltyAAL3VQlNI0wx0anUpAYHW2Bp4QWWIMBcAWtzKzMRNxpdbkRSOaui";         // Replace with a valid session ID from a test checkout

// ====================================================================

// Create a new Stripe instance with your secret key.
const stripe = new Stripe(YOUR_STRIPE_SECRET_KEY);

// Define an async function to test the API call.
async function testStripeApi() {
  console.log("Starting Stripe API call test...");
  
  try {
    // Call the same method as in your Vercel function.
    const session = await stripe.checkout.sessions.retrieve(YOUR_SESSION_ID, {
      expand: ['payment_intent'],
    });

    // Check the payment intent status.
    const paymentStatus = session.payment_intent.status;
    console.log(`Successfully retrieved Stripe session. Payment status is: ${paymentStatus}`);
    
    // Log the full session object for more details.
    console.log("Full session details:", JSON.stringify(session, null, 2));

  } catch (error) {
    // If the API call fails, log the error.
    console.error("An error occurred during the Stripe API call.");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    
  } finally {
    console.log("Test finished.");
  }
}

// Run the test function.
testStripeApi();
