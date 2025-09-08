import crypto from 'crypto';

const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;

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
  let body;
  try {
    body = await request.json();
    console.log("Received click event:", body);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON in request body." }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    fbc,
    fbp,
    fbclid,
    clientUserAgent,
    sourceUrl,
    email,
    phone,
    name
  } = body;

  const facebookEventData = {
    data: [{
      event_name: 'Click',
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: sourceUrl,
      action_source: 'website',
      user_data: {
        em: hash(email),
        ph: hash(phone),
        fn: hash(name),
        fbc,
        fbp,
        client_user_agent: clientUserAgent,
        client_ip_address: request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || request.ip,
      },
    }],
    test_event_code: null // Optional: use for testing in Events Manager
  };

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
      console.log("Click event sent to Facebook successfully:", fbResponseData);
    } else {
      console.error("Failed to send Click event to Facebook:", fbResponseData);
    }

    return new Response(JSON.stringify({
      message: 'Click event sent to Facebook',
      facebookResponse: fbResponseData
    }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        'Content-Type': 'application/json'
      },
    });

  } catch (error) {
    console.error("Error sending click event:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        'Content-Type': 'application/json'
      },
    });
  }
}
