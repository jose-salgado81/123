const accessToken = 'EAAUmJiUQKVgBPFywdSncYzj9FTdWIFbkQ4wYpmi0vN3y8jSdq3ZBplEF6qgGoW04psTm8FEg7lqQNLwBm2NLB4PbljJ7ZB0B6J6EwtQd9ow7b9bbShABZCCJZCysx8PZCBOzFHBURsQw9KBcPsrfZCe1omnYv5lvPCyQZCTXqaZA9LRjZCHhIJUIbOmBz69yD3nZCRCiCnMYg8QZCKkMp1s1G3ZCjreUci16DML3fwAf';
const pixelId = '1051240707176632';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { ga4, fbp, price, currency, event_name, product_name } = req.body;

    const fbcapiPayload = {
      data: [{
        event_name: event_name,
        event_time: Math.floor(Date.now() / 1000), 
        user_data: {
          fbp: fbp,
        },
        custom_data: {
          currency: currency,
          value: price, 
          content_type: 'product',
          content_name: product_name,
          content_ids: [product_name]
        }
      }]
    };
    
    console.log('Sending to Facebook CAPI:', JSON.stringify(fbcapiPayload));
    
    const fbcapiEndpoint = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;

    try {
      const response = await fetch(fbcapiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fbcapiPayload)
      });
      
      if (!response.ok) {
        // If the response is not ok, read the error message from Facebook
        const errorData = await response.json();
        console.error('FBCAPI API Error:', errorData);
        return res.status(response.status).json({ status: 'error', message: 'Failed to send event to Facebook CAPI', details: errorData });
      }

      // If the response is ok, log the success message
      const successData = await response.json();
      console.log('FBCAPI Success:', successData);
      res.status(200).json({ status: 'success', message: 'Event sent to Facebook CAPI' });

    } catch (error) {
      // This will catch any network or server-side errors
      console.error('Network or Server-side Fetch Error:', error);
      res.status(500).json({ status: 'error', message: 'Server error during fetch' });
    }
  } else {
    res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }
}