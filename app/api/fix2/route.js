// Import necessary libraries.
// You will need to install 'crypto' and 'stripe' if they're not already installed.
// npm install crypto stripe

import Stripe from 'stripe';
import crypto from 'crypto';

// Replace with your actual values from Vercel's environment variables.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN; 
const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;

// Validate required environment variables early to fail fast
if (!STRIPE_SECRET_KEY || !FACEBOOK_ACCESS_TOKEN || !FACEBOOK_PIXEL_ID) {
	console.error('Missing required environment variables for Stripe/Facebook CAPI.', {
		STRIPE_SECRET_KEY_SET: Boolean(STRIPE_SECRET_KEY),
		FACEBOOK_ACCESS_TOKEN_SET: Boolean(FACEBOOK_ACCESS_TOKEN),
		FACEBOOK_PIXEL_ID_SET: Boolean(FACEBOOK_PIXEL_ID)
	});
}

// Defer Stripe client creation until request time to avoid build-time failures
function getStripeClient() {
	if (!STRIPE_SECRET_KEY) {
		throw new Error('Missing STRIPE_SECRET_KEY');
	}
	return new Stripe(STRIPE_SECRET_KEY);
}

// Function to hash the PII data.
// It's crucial to hash PII before sending it to Facebook.
function hash(data) {
    if (!data) return null;
    return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

// Remove null/undefined/empty-string values from an object
function omitNil(obj) {
	return Object.fromEntries(
		Object.entries(obj || {}).filter(([, v]) => v !== null && v !== undefined && v !== '')
	);
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
        sourceUrl,
        test_event_code: testEventCode,
        event_id: eventIdFromClient
    } = body;

    // Check for essential data from the front-end.
    if (!sessionId) {
        return new Response(JSON.stringify({ error: "No sessionId provided." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Fail fast if required env vars are missing
    if (!STRIPE_SECRET_KEY || !FACEBOOK_ACCESS_TOKEN || !FACEBOOK_PIXEL_ID) {
        return new Response(JSON.stringify({ error: "Server misconfiguration: missing required environment variables." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // --- STEP 1: RETRIEVE PURCHASE DATA FROM STRIPE ---
        // Retrieve the full Stripe session, including the payment details and line items.
        const stripe = getStripeClient();
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

        // Compute client IP from headers (if available)
        const xForwardedFor = request.headers?.get?.('x-forwarded-for') || null;
        const xRealIp = request.headers?.get?.('x-real-ip') || null;
        const clientIp = (xForwardedFor ? xForwardedFor.split(',')[0].trim() : null) || xRealIp || null;

        // Build user_data and ensure at least one identifier exists
        const userData = omitNil({
            em: hash(customerDetails?.email),
            fn: hash(customerDetails?.name),
            ph: hash(customerDetails?.phone),
            client_ip_address: clientIp,
            client_user_agent: clientUserAgent,
            fbc: fbc,
            fbp: fbp,
            fbclid: fbclid
        });
        const hasIdentifier = Boolean(userData.em || userData.ph || userData.fbp || userData.fbc);
        if (!hasIdentifier) {
            return new Response(JSON.stringify({ 
                error: 'Missing required user identifiers for Facebook CAPI (need at least one of email, phone, fbp, or fbc).'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Compute value fallback if needed
        const computedValue = Array.isArray(lineItems)
            ? lineItems.reduce((sum, item) => sum + ((item?.price?.unit_amount || 0) * (item?.quantity || 0)), 0) / 100
            : undefined;
        const valueToSend = purchaseAmount != null ? purchaseAmount / 100 : computedValue;

        // --- STEP 2: CONSTRUCT THE FACEBOOK CAPI PAYLOAD ---
        const facebookEventData = {
            data: [{
                event_name: 'Purchase',
                event_time: Math.floor(Date.now() / 1000),
                event_source_url: sourceUrl,
                action_source: 'website',
                event_id: eventIdFromClient || session.id,
                user_data: userData,
                custom_data: omitNil({
                    currency: purchaseCurrency?.toUpperCase(),
                    value: valueToSend,
                    contents: Array.isArray(lineItems) ? lineItems.map(item => omitNil({
                        id: item?.price?.product,
                        quantity: item?.quantity,
                        item_price: item?.price?.unit_amount != null ? item.price.unit_amount / 100 : undefined
                    })).filter(c => c.id) : [],
                    content_type: 'product',
                    content_ids: Array.isArray(lineItems) ? lineItems.map(item => item?.price?.product).filter(Boolean) : [],
                    num_items: Array.isArray(lineItems) ? lineItems.reduce((total, item) => total + (item?.quantity || 0), 0) : undefined,
                }),
            }],
            // Optional: Use test event code from Events Manager for testing
            test_event_code: testEventCode || null
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

        let fbResponseData = null;
        try {
            fbResponseData = await fbResponse.json();
        } catch (_) {
            // Some success responses may be empty
        }

        if (fbResponse.ok) {
            console.log("Purchase event sent to Facebook successfully:", fbResponseData);
        } else {
            console.error("Failed to send Purchase event to Facebook:", fbResponseData);
            return new Response(JSON.stringify({ 
                error: 'Failed to send event to Facebook CAPI',
                facebookResponse: fbResponseData
            }), {
                status: fbResponse.status || 502,
                headers: { 
                    "Access-Control-Allow-Origin": "*",
                    'Content-Type': 'application/json' 
                },
            });
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
