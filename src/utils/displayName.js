export function resolveDisplayName(address) {
  if (!address) return null;

  const exactKey = `profile_name_${address}`;
  const lowerKey = `profile_name_${address.toLowerCase()}`;

  let siteName = localStorage.getItem(lowerKey) || localStorage.getItem(exactKey);

  // Fallback for legacy keys saved with mixed-case (e.g. checksummed addresses)
  if (!siteName) {
    const keys = Object.keys(localStorage);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === lowerKey) {
        siteName = localStorage.getItem(keys[i]);
        break;
      }
    }
  }

  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
  return { name: siteName || truncated, source: siteName ? "site" : "address" };
}
