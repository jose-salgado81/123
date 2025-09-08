const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;

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
    console.log("Received outbound click:", body);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON in request body." }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { fbc, fbp, sourceUrl } = body;

  const facebookEventData = {
    data: [{
      event_name: 'OutboundClick',
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: sourceUrl,
      action_source: 'website',
      user_data: {
        fbc,
        fbp
      }
    }],
    test_event_code: null // Optional: add your test code here
  };

  const fbEndpoint = `https://graph.facebook.com/v20.0/${FACEBOOK_PIXEL_ID}/events?access_token=${FACEBOOK_ACCESS_TOKEN}`;

  try {
    const fbResponse = await fetch(fbEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(facebookEventData),
    });

    const fbResponseData = await fbResponse.json();

    if (fbResponse.ok) {
      console.log("OutboundClick event sent successfully:", fbResponseData);
    } else {
      console.error("Facebook CAPI error:", fbResponseData);
    }

    return new Response(JSON.stringify({
      message: 'OutboundClick event sent to Facebook',
      facebookResponse: fbResponseData
    }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        'Content-Type': 'application/json'
      },
    });

  } catch (error) {
    console.error("Error sending to Facebook CAPI:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        'Content-Type': 'application/json'
      },
    });
  }
}
