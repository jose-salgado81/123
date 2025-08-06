const accessToken = 'EAAUmJiUQKVgBPFywdSncYzj9FTdWIFbkQ4wYpmi0vN3y8jSdq3ZBplEF6qgGoW04psTm8FEg7lqQNLwBm2NLB4PbljJ7ZB0B6J6EwtQd9ow7b9bbShABZCCJZCysx8PZCBOzFHBURsQw9KBcPsrfZCe1omnYv5lvPCyQZCTXqaZA9LRjZCHhIJUIbOmBz69yD3nZCRCiCnMYg8QZCKkMp1s1G3ZCjreUci16DML3fwAf';
const pixelId = '1051240707176632';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { ga4, fbp, price, currency, event_name, product_name } = req.body;

    // --- Start of Validation and Type Casting ---
    // Check for required fields
    if (!fbp || !price || !currency || !event_name) {
        console.error('Validation Error: Missing required data in request body.', req.body);
        return res.status(400).json({ status: 'error', message: 'Missing required data: fbp, price, currency, or event_name' });
    }

    // Ensure price is a number
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) {
        console.error('Validation Error: Price is not a valid number.');
        return res.status(400).json({ status: 'error', message: 'Price is not a valid number' });
    }
    // --- End of Validation and Type Casting ---

    const fbcapiPayload = {
      data: [{
        event_name: event_name,
        event_time: Math.floor(Date.now() / 1000), 
        user_data: {
          fbp: fbp,
        },
        custom_data: {
          currency: currency,
          value: numericPrice, // Use the converted number
          content_type: 'product',
          content_name: product_name,
          content_ids: [product_name]
        }
      }]
    };

    console.log('FBCAPI Payload:', JSON.stringify(fbcapiPayload));

    const fbcapiEndpoint = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;

    try {
      const response = await fetch(fbcapiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fbcapiPayload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('FBCAPI API Error:', data);
        return res.status(response.status).json({ status: 'error', message: 'Failed to send event to Facebook CAPI', details: data });
      }

      console.log('FBCAPI Success:', data);
      res.status(200).json({ status: 'success', message: 'Event sent to Facebook CAPI' });

    } catch (error) {
      console.error('Network or Server-side Fetch Error:', error);
      res.status(500).json({ status: 'error', message: 'Server error during fetch' });
    }
  } else {
    res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }
}