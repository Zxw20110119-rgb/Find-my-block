export function GET() {
  return new Response('Google sign-in has been removed. Open Find My Block to use your locally saved timetable.', {status:410,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
}
