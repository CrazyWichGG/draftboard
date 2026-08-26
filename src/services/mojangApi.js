/**
 * Minecraft Avatar & UUID Resolution Service
 * Uses Mojang API, Server Proxy & Minotar 2D Helm Avatars.
 */

// Known Steve UUID as default fallback
const DEFAULT_STEVE_UUID = '8667da71-b8ad-4071-b04d-f4293260d732';

/**
 * Fetch UUID and Avatar URL for a Minecraft username
 * @param {string} username 
 * @returns {Promise<{uuid: string, avatarUrl: string, isReal: boolean}>}
 */
export async function getMinecraftUuid(username) {
  if (!username || !username.trim()) {
    return {
      uuid: DEFAULT_STEVE_UUID,
      avatarUrl: `https://minotar.net/helm/Steve/64.png`,
      isReal: false
    };
  }

  const cleanName = username.trim();

  try {
    // 1. Attempt backend proxy lookup (avoids browser CORS limits)
    const proxyUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? `http://localhost:3001/api/mojang/uuid/${encodeURIComponent(cleanName)}`
      : `/api/mojang/uuid/${encodeURIComponent(cleanName)}`;

    const response = await fetch(proxyUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.uuid) {
        return {
          uuid: data.uuid,
          avatarUrl: data.avatarUrl || getAvatarUrl(cleanName),
          isReal: true
        };
      }
    }
  } catch (err) {
    console.warn(`[Mojang API] Proxy lookup failed for '${cleanName}', using direct avatar renderer:`, err.message);
  }

  // 2. Direct avatar URL via Minotar
  const mockUuid = generateMockUuid(cleanName);
  return {
    uuid: mockUuid,
    avatarUrl: `https://minotar.net/helm/${encodeURIComponent(cleanName)}/64.png`,
    isReal: false
  };
}

/**
 * Get 2D player head avatar URL via Minotar
 * @param {string} uuidOrUsername 
 * @param {number} size 
 * @returns {string}
 */
export function getAvatarUrl(uuidOrUsername, size = 64) {
  const target = uuidOrUsername ? encodeURIComponent(uuidOrUsername) : 'Steve';
  return `https://minotar.net/helm/${target}/${size}.png`;
}

function isUuid(str) {
  if (!str) return false;
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(str);
}

function generateMockUuid(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex}-0000-4000-8000-${hex}${hex}`;
}
