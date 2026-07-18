export function parseDevice(ua: string): string {
  if (!ua) return 'Inconnu';
  let device = 'Autre';
  if (/iPhone/i.test(ua)) device = 'iPhone';
  else if (/iPad/i.test(ua)) device = 'iPad';
  else if (/Android/i.test(ua) && /Mobile/i.test(ua)) device = 'Android Mobile';
  else if (/Android/i.test(ua)) device = 'Android Tablette';
  else if (/Windows/i.test(ua)) device = 'Windows';
  else if (/Macintosh/i.test(ua)) device = 'Mac';
  else if (/Linux/i.test(ua)) device = 'Linux';

  let browser = 'Navigateur inconnu';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  return `${device} / ${browser}`;
}

export function extractClientIp(reqHeaders: Headers): string {
  return (reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? reqHeaders.get('x-real-ip')
    ?? '').replace(/^::ffff:/, '') || 'Inconnu';
}

export async function getGeoLocation(ip: string, reqHeaders: Headers): Promise<string> {
  // Vercel native geo headers (production)
  const city = reqHeaders.get('x-vercel-ip-city');
  const region = reqHeaders.get('x-vercel-ip-country-region');
  const country = reqHeaders.get('x-vercel-ip-country');
  if (city || country) {
    return [decodeURIComponent(city ?? ''), region ?? '', country ?? ''].filter(Boolean).join(', ');
  }

  // Fallback: ipapi.co (free, no key needed, works for non-Vercel/local)
  const isPrivate = !ip || ip === 'Inconnu' || ip.startsWith('127.') || ip.startsWith('::1') || ip.startsWith('192.168.') || ip.startsWith('10.');
  if (!isPrivate) {
    try {
      const res = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: AbortSignal.timeout(3000),
        headers: { 'User-Agent': 'sonelyx-app/1.0' },
      });
      if (res.ok) {
        const data = await res.json() as { city?: string; region?: string; country_name?: string };
        return [data.city, data.region, data.country_name].filter(Boolean).join(', ') || 'Non disponible';
      }
    } catch {
      // geo lookup is best-effort — never block the caller
    }
  }

  return ip.startsWith('127.') || ip === '::1' ? 'Réseau local (dev)' : 'Non disponible';
}
