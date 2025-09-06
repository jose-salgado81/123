// Import necessary libraries.
// You will need to install 'crypto' and 'stripe' if they're not already installed.
// npm install crypto stripe

import Stripe from 'stripe';
import crypto from 'crypto';

// Replace with your actual values from Vercel's environment variables.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN; 
const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;

// Create a new Stripe instance.
const stripe = new Stripe(STRIPE_SECRET_KEY);

// Function to hash the PII data.
// It's crucial to hash PII before sending it to Facebook.
function hash(data) {
    if (!data) return null;
    return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

// Define the OPTIONS method for CORS preflight requests.
// This is necessary to allow the front-end to make POST requests from a different domain.
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

// Main POST function to handle the purchase event.
export async function POST(request) {
    let body;
    try {
        body = await request.json();
        console.log("Received data from front-end:", body);
    } catch (error) {
        return new Response(JSON.stringify({ error: "Invalid JSON in request body." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const { 
        sessionId,
        fbclid,
        fbc,
        fbp,
        clientUserAgent,
        sourceUrl
    } = body;

    // Check for essential data from the front-end.
    if (!sessionId) {
        return new Response(JSON.stringify({ error: "No sessionId provided." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // --- STEP 1: RETRIEVE PURCHASE DATA FROM STRIPE ---
        // Retrieve the full Stripe session, including the payment details and line items.
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent', 'line_items'],
        });

        // Ensure the payment was successful.
        if (session.payment_intent.status !== 'succeeded') {
            return new Response(JSON.stringify({ error: 'Payment not succeeded' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log("Stripe session retrieved successfully.");

        // Extract and process customer and purchase data.
        const customerDetails = session.customer_details;
        const purchaseAmount = session.amount_total;
        const purchaseCurrency = session.currency;
        const lineItems = session.line_items.data;

        // --- STEP 2: CONSTRUCT THE FACEBOOK CAPI PAYLOAD ---
        const facebookEventData = {
            data: [{
                event_name: 'Purchase',
                event_time: Math.floor(Date.now() / 1000),
                event_source_url: sourceUrl,
                action_source: 'website',
                user_data: {
                    // Hash PII for privacy and compliance
                    em: hash(customerDetails?.email),
                    fn: hash(customerDetails?.name),
                    ph: hash(customerDetails?.phone),
                    // Use client data for better attribution and deduplication
                    client_ip_address: request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || request.ip,
                    client_user_agent: clientUserAgent,
                    // Use cookies for deduplication
                    fbc: fbc,
                    fbp: fbp,
                },
                custom_data: {
                    currency: purchaseCurrency.toUpperCase(),
                    value: (purchaseAmount / 100).toFixed(2), // Convert from cents to dollars
                    // Process line items into a format Facebook can use
                    contents: lineItems.map(item => ({
                        id: item.price.product, // Assuming the product ID is what you need
                        quantity: item.quantity,
                        item_price: (item.price.unit_amount / 100).toFixed(2)
                    })),
                    content_type: 'product',
                    content_ids: lineItems.map(item => item.price.product),
                    num_items: lineItems.reduce((total, item) => total + item.quantity, 0),
                },
            }],
            // Use this optional parameter to ensure your events are deduplicated correctly
            test_event_code: null // Use 'TESTxxxx' from your Events Manager for testing
        };

        // --- STEP 3: SEND DATA TO FACEBOOK CAPI ---
        const fbEndpoint = `https://graph.facebook.com/v20.0/${FACEBOOK_PIXEL_ID}/events?access_token=${FACEBOOK_ACCESS_TOKEN}`;

        const fbResponse = await fetch(fbEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(facebookEventData),
        });

        const fbResponseData = await fbResponse.json();

        if (fbResponse.ok) {
            console.log("Purchase event sent to Facebook successfully:", fbResponseData);
        } else {
            console.error("Failed to send Purchase event to Facebook:", fbResponseData);
        }
            // --- STEP 3b: SEND SAME DATA TO BEECEPTOR ---
        const beeceptorEndpoint = 'https://controlcopy.free.beeceptor.com';
        let beeceptorResponseData = null;
        try {
            const beeceptorResponse = await fetch(beeceptorEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(facebookEventData),
            });
            beeceptorResponseData = await beeceptorResponse.json();
            console.log("Payload sent to Beeceptor:", beeceptorResponseData);
        } catch (beeceptorError) {
            console.error("Failed to send payload to Beeceptor:", beeceptorError);
        }

        // --- STEP 4: RESPOND TO FRONT-END ---
        return new Response(JSON.stringify({ 
            message: 'Purchase event processed and sent to Facebook', 
            stripeSession: session,
            facebookResponse: fbResponseData
        }), {
            status: 200,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                'Content-Type': 'application/json' 
            },
        });

    } catch (error) {
        console.error("Error in CAPI function:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                'Content-Type': 'application/json' 
            },
        });
    }
}
