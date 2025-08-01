import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Extracting the necessary data from the request body
    const eventName = body.event_name;
    const fbpValue = body.user_data?.fbp;
    const gaCookieValue = body.user_data?.ga_cookie;
    
    // Log the received data
    console.log('Received event:', eventName);
    console.log('FBP:', fbpValue);
    console.log('GA Cookie:', gaCookieValue);

    // You can add your server-side logic here. For example, 
    // sending this data to another service or database.

    // Return a successful response with a 204 status code (No Content)
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Error processing request:', error);
    // Return an error response
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}