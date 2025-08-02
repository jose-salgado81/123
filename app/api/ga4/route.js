export async function POST(request) {
  console.log("Request method:", request.method); // Add this line
  const body = await request.json();
  console.log("Received data:", body);

  return new Response(JSON.stringify({ message: 'Data received very well', data: body }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}