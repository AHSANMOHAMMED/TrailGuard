const tsParser = require('./node_modules/@react-native/codegen/lib/parsers/typescript/parser').TypeScriptParser;
const RNCodegen = require('./node_modules/@react-native/codegen/lib/generators/RNCodegen');
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, 'node_modules/react-native-screens/src/fabric/ScreenStackHeaderConfigNativeComponent.ts');
console.log('Parsing:', file);
const code = fs.readFileSync(file, 'utf8');

const parser = new tsParser();
let schema;
try {
  schema = parser.parseString(code);
  console.log('Schema parsed OK');
  console.log('schema type:', typeof schema);
  console.log('schema keys:', Object.keys(schema).slice(0,20));
  console.log('schema.displayName:', schema.displayName);
} catch (e) {
  console.log('PARSE ERROR:', e.message);
  console.log('Stack:', e.stack.split('\n').slice(0,4).join('\n'));
  process.exit(1);
}

try {
  const vc = RNCodegen.generateViewConfig({ schema, libraryName: 'ScreenStackHeaderConfig' });
  console.log('ViewConfig generated OK');
  console.log(JSON.stringify(vc, null, 2).slice(0, 800));
} catch (e) {
  console.log('GENERATE ERROR:', e.message);
  console.log('Stack:', e.stack.split('\n').slice(0,6).join('\n'));
}
