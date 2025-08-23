export async function GET() {
	return new Response('ok');
}

export async function POST() {
	return new Response(JSON.stringify({status: 'ok'}), { headers: { 'Content-Type': 'application/json' } });
}