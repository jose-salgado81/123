// This Vercel function handles the 'OutboundClick' event for the Facebook Conversions API.
// It is a simplified version of the 'Purchase' function, as it does not need to
// interact with a third-party service like Stripe.

import crypto from 'crypto';

// Replace with your actual values from Vercel's environment variables.
// NOTE: For security, these should be set in your Vercel project settings.
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN; 
const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;

// Function to hash the PII data.
// Although 'OutboundClick' may not contain PII, this function is kept for consistency
// and in case a 'clickId' or similar identifier needs to be hashed.
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

// Main POST function to handle the outbound click event.
export async function POST(request) {
    let body;
    try {
        body = await request.json();
        console.log("Received data for OutboundClick from front-end:", body);
    } catch (error) {
        return new Response(JSON.stringify({ error: "Invalid JSON in request body." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const { 
        clickId,
        fbclid,
        fbc,
        fbp,
        clientUserAgent,
        sourceUrl
    } = body;

    // The check for 'clickId' has been removed. The function will now proceed
    // whether or not this ID is provided by the front-end.

    try {
        // --- STEP 1: CONSTRUCT THE FACEBOOK CAPI PAYLOAD ---
        // This payload is simpler than the 'Purchase' event as it doesn't
        // contain financial or product information.
        const facebookEventData = {
            data: [{
                event_name: 'OutboundClick',
                event_time: Math.floor(Date.now() / 1000),
                event_source_url: sourceUrl,
                action_source: 'website',
                user_data: {
                    // Use client data for better attribution and deduplication
                    client_ip_address: request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || request.ip,
                    client_user_agent: clientUserAgent,
                    // Use cookies for deduplication
                    fbc: fbc,
                    fbp: fbp,
                    // Include the Facebook click ID for even better attribution
                    fbclid: fbclid,
                },
                custom_data: {
                    // Use the unique click ID for event tracking and debugging
                    click_id: clickId,
                },
            }],
            // Use this optional parameter to ensure your events are deduplicated correctly
            test_event_code: null // Use 'TESTxxxx' from your Events Manager for testing
        };

        // --- STEP 2: SEND DATA TO FACEBOOK CAPI ---
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
            console.log("OutboundClick event sent to Facebook successfully:", fbResponseData);
        } else {
            console.error("Failed to send OutboundClick event to Facebook:", fbResponseData);
        }

        // --- STEP 3: RESPOND TO FRONT-END ---
        return new Response(JSON.stringify({ 
            message: 'OutboundClick event processed and sent to Facebook', 
            facebookResponse: fbResponseData
        }), {
            status: 200,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                'Content-Type': 'application/json' 
            },
        });

    } catch (error) {
        console.error("Error in CAPI OutboundClick function:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                'Content-Type': 'application/json' 
            },
        });
    }
}
