const cookieName = "mobile_home_cards";

export function parseHomeCardPreferences(cookie, defaults) {
  const match = cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]*)`));
  if (!match) return [...defaults];
  try {
    const value = decodeURIComponent(match[1]);
    return value ? value.split(",").filter(Boolean) : [];
  } catch {
    return [...defaults];
  }
}

export function serializeHomeCardPreferences(values) {
  return `${cookieName}=${encodeURIComponent(values.join(","))};path=/;max-age=31536000;samesite=lax`;
}
