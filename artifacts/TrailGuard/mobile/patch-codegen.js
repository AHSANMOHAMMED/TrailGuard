const fs = require('fs');
const path = 'node_modules/@react-native/codegen/lib/parsers/typescript/parser.js';
let content = fs.readFileSync(path, 'utf8');

// Check if already patched
if (content.includes('tn.left && tn.right')) {
  console.log('Already patched!');
  process.exit(0);
}

// Find and replace getTypeAnnotationName
const oldStart = content.indexOf('getTypeAnnotationName(typeAnnotation) {');
if (oldStart < 0) {
  console.log('NOT FOUND: getTypeAnnotationName');
  process.exit(1);
}

// Find the end of the function (next method or closing brace at same indent)
const fnBodyStart = oldStart;
// The function ends with: return _typeAnnotation$typeN.name;\n  }
const searchFrom = fnBodyStart;
const slice = content.slice(searchFrom, searchFrom + 500);
const endMarkerIdx = slice.indexOf('return _typeAnnotation$typeN.name;\n  }');
if (endMarkerIdx < 0) {
  console.log('Could not find end of function');
  console.log('Slice:', slice.slice(0, 300));
  process.exit(1);
}

const endOfFn = searchFrom + endMarkerIdx + 'return _typeAnnotation$typeN.name;\n  }'.length;

const newFn = `getTypeAnnotationName(typeAnnotation) {
    var _typeAnnotation$typeN;
    if (typeAnnotation === null || typeAnnotation === void 0) return void 0;
    const tn = typeAnnotation.typeName;
    if (tn === null || tn === void 0) return void 0;
    // Handle qualified names like CT.DirectEventHandler (QualifiedName nodes have .left/.right, not .name)
    if (tn.name === undefined && tn.left && tn.right) {
      return tn.left.text + '.' + tn.right.text;
    }
    return tn.name;
  }`;

content = content.slice(0, fnBodyStart) + newFn + content.slice(endOfFn);
fs.writeFileSync(path, content);
console.log('Patched getTypeAnnotationName successfully');
console.log('Verify:');
const patched = fs.readFileSync(path, 'utf8');
const idx = patched.indexOf('getTypeAnnotationName');
console.log(patched.slice(idx, idx + 400));
