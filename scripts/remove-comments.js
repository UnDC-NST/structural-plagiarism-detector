const fs = require('fs');
const path = require('path');

function removeComments(content) {
  let result = '';
  let i = 0;
  let inString = false;
  let stringChar = '';
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  
  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (inSingleLineComment) {
      if (char === '\n') {
        inSingleLineComment = false;
        result += char;
      }
      i++;
      continue;
    }
    
    if (inMultiLineComment) {
      if (char === '*' && nextChar === '/') {
        inMultiLineComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    
    if (inString) {
      result += char;
      if (char === '\\') {
        result += nextChar;
        i += 2;
        continue;
      }
      if (char === stringChar) {
        inString = false;
      }
      i++;
      continue;
    }
    
    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      result += char;
      i++;
      continue;
    }
    
    if (char === '/' && nextChar === '/') {
      inSingleLineComment = true;
      i += 2;
      continue;
    }
    
    if (char === '/' && nextChar === '*') {
      inMultiLineComment = true;
      i += 2;
      continue;
    }
    
    result += char;
    i++;
  }
  
  return result.replace(/\n\n\n+/g, '\n\n');
}

function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

async function processFiles() {
  const srcDir = path.join(__dirname, '..', 'src');
  const files = getAllTsFiles(srcDir);
  
  let processed = 0;
  let errors = 0;
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const cleaned = removeComments(content);
      
      if (content !== cleaned) {
        fs.writeFileSync(file, cleaned, 'utf8');
        processed++;
        console.log(`✓ ${path.relative(process.cwd(), file)}`);
      }
    } catch (error) {
      errors++;
      console.error(`✗ ${path.relative(process.cwd(), file)}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Processed ${processed} files`);
  if (errors > 0) {
    console.log(`❌ Errors: ${errors}`);
  }
}

processFiles().catch(console.error);
