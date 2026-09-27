export async function handler(request: Request) {
  const destination = new URL(request.url).searchParams.get("destination");
  if (!destination) return new Response("missing", { status: 400 });
  return fetch(destination);
}
