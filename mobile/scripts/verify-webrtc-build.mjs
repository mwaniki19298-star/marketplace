import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const config = fs.readFileSync(new URL('../app.config.js', import.meta.url), 'utf8');
console.log(`react-native-webrtc: ${pkg.dependencies?.['react-native-webrtc'] ?? 'MISSING'}`);
console.log(`config plugin: ${pkg.dependencies?.['@config-plugins/react-native-webrtc'] ?? 'MISSING'}`);
console.log(`newArchEnabled=false: ${config.includes('newArchEnabled: false') ? 'YES' : 'NO'}`);
console.log('A fresh native Android build is required after changing native dependencies/config.');
