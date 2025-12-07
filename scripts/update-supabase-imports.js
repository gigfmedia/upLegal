import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const directory = path.join(__dirname, '..', 'src');
const oldImport = 'from "@/integrations/supabase/client"';
const newImport = 'from "@/lib/supabaseClient"';

function updateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(oldImport)) {
    const newContent = content.replace(new RegExp(oldImport, 'g'), newImport);
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true;
  }
  return false;
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  let updatedCount = 0;

  for (const file of files) {
    // Skip node_modules and .git directories
    if (file === 'node_modules' || file === '.git') {
      continue;
    }

    const filePath = path.join(directory, file);
    
    try {
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        updatedCount += processDirectory(filePath) ? 1 : 0;
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        if (updateFile(filePath)) {
          updatedCount++;
        }
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  }

  return updatedCount;
}

try {
  const updatedFiles = processDirectory(directory);
} catch (error) {
  console.error('\n❌ Error updating files:', error.message);
}
