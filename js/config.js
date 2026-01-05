export async function GET() {
  const url =
    'https://docs.google.com/spreadsheets/d/18P13Qjm8Dz3GxNKHwoUlxBmqNkkfO7D1XmQP8oTedL4/export?format=csv&gid=276403000';

  const res = await fetch(url, { cache: 'no-store' });
  return new Response(await res.text(), {
    headers: { 'Content-Type': 'text/csv' }
  });
}
