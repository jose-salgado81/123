// You will need to install the 'crypto' library to hash data
// npm install crypto

import crypto from 'crypto';

// Replace with your actual values
const FACEBOOK_ACCESS_TOKEN = 'EAAUmJiUQKVgBPFtnfTiI9OQZBIfGN8puRKR9j9WdCaIjahJDjGQh7KJDJQh8wgfAZBGCdIjBN1PMGYvDzlAjvwrbu8FCpZChDei6q1qZBLVESbYYxWRkG7COuhGgZBnMZCaR2WxfK8zZCZBVsMV8CiV8gUWeT0PYXt12EqpTlZBpLy7nvC0KXSz51aPRSLZAbkqIGS6iSpUcri3Cf25j8reIlmfvROjtOuRVYRc7Tk'; 
const FACEBOOK_PIXEL_ID = '105100000000076632';

// Function to hash the PII data
function hash(data) {
    if (!data) return null;
    return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

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

export async function POST(request) {
    const body = await request.json();
    console.log("Received data:", body);

    const { first_name, email, fbp } = body;

    // Build the data payload for Facebook CAPI
    const facebookEventData = {
        data: [{
            event_name: 'Lead', // or 'Purchase', 'CompleteRegistration', etc.
            event_time: Math.floor(Date.now() / 1000), // Current timestamp in seconds
            user_data: {
                fn: hash(first_name),
                em: hash(email),
                fbp: fbp,
                // Add other user data if available (e.g., phone number, last name, city)
            },
            custom_data: {
                // Add any custom properties (e.g., value, currency)
            },
            action_source: 'website',
        }],
    };

    // Send the data to Facebook CAPI
    const fbEndpoint = `https://graph.facebook.com/v20.0/${FACEBOOK_PIXEL_ID}/events?access_token=${FACEBOOK_ACCESS_TOKEN}`;

    try {
        const fbResponse = await fetch(fbEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(facebookEventData),
        });

        const fbResponseData = await fbResponse.json();

        if (fbResponse.ok) {
            console.log("Event sent to Facebook successfully:", fbResponseData);
        } else {
            console.error("Failed to send event to Facebook:", fbResponseData);
        }

    } catch (error) {
        console.error("Error sending event to Facebook:", error);
    }

    return new Response(JSON.stringify({ message: 'Data received and processed', data: body }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}