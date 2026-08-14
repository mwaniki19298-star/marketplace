const base = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
if (!base) { console.error('EXPO_PUBLIC_API_BASE_URL is missing'); process.exit(1); }
if (!/^https:\/\//i.test(base)) { console.error(`Production API must use HTTPS: ${base}`); process.exit(1); }
console.log(`Marketplace production API: ${base}`);
