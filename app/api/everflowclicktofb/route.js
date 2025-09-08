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

  // Validate required environment variables
  if (!FACEBOOK_ACCESS_TOKEN || !FACEBOOK_PIXEL_ID) {
    return new Response(
      JSON.stringify({
        error: "Facebook credentials not configured",
        details: {
          FACEBOOK_PIXEL_ID: !!FACEBOOK_PIXEL_ID,
          FACEBOOK_ACCESS_TOKEN: !!FACEBOOK_ACCESS_TOKEN,
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const { fbc, fbp, sourceUrl, testEventCode } = body;

  // Basic input validation
  if (!sourceUrl) {
    return new Response(JSON.stringify({ error: "Missing required field: sourceUrl" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!fbc && !fbp) {
    return new Response(
      JSON.stringify({ error: "At least one of fbc or fbp is required" }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Helpful additional user data for Facebook attribution
  const userAgent = request.headers.get('user-agent') || undefined;
  const xff = request.headers.get('x-forwarded-for');
  const clientIpAddress = (xff && xff.split(',')[0].trim()) || undefined;

  const event = {
    event_name: 'OutboundClick',
    event_time: Math.floor(Date.now() / 1000),
    event_source_url: sourceUrl,
    action_source: 'website',
    user_data: {
      fbc,
      fbp,
      client_user_agent: userAgent,
      client_ip_address: clientIpAddress,
    },
  };

  const facebookEventData = { data: [event] };

  // Allow passing a test event code from body or env; omit if not set
  const resolvedTestCode = testEventCode || process.env.FB_TEST_EVENT_CODE;
  if (resolvedTestCode) {
    facebookEventData.test_event_code = resolvedTestCode;
  }

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
      console.error("Facebook CAPI error:", {
        status: fbResponse.status,
        statusText: fbResponse.statusText,
        response: fbResponseData,
      });
    }

    return new Response(
      JSON.stringify({
        success: fbResponse.ok,
        message: fbResponse.ok
          ? 'OutboundClick event sent to Facebook'
          : 'Facebook CAPI returned an error',
        facebookResponse: fbResponseData,
        status: fbResponse.status,
      }),
      {
        status: fbResponse.ok ? 200 : fbResponse.status || 502,
        headers: {
          "Access-Control-Allow-Origin": "*",
          'Content-Type': 'application/json',
        },
      }
    );

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
