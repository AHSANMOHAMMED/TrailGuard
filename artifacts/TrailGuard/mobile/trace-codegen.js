const { generateViewConfig } = require('./node_modules/@react-native/babel-plugin-codegen/index.js');
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, 'node_modules/react-native-screens/src/fabric/ScreenStackHeaderConfigNativeComponent.ts');
console.log('Parsing:', file);
const content = fs.readFileSync(file, 'utf8');

// Monkey-patch generateViewConfig to capture the parsed schema before it throws
const origGenerateViewConfig = generateViewConfig;
// The babel plugin's generateViewConfig is async-ish but errors synchronously
try {
  const result = origGenerateViewConfig.call({ file, source: content }, content);
  console.log('Result:', JSON.stringify(result, null, 2).slice(0, 500));
} catch (e) {
  console.log('ERROR:', e.message);
  console.log('Stack:', e.stack.split('\n').slice(0,6).join('\n'));
}
