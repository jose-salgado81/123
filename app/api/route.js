// app/api/extractvars/route.js
export async function POST(request) {
  const body = await request.json();
  console.log("Received data:", body);

  return new Response(JSON.stringify({ message: 'Data received', data: body }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
