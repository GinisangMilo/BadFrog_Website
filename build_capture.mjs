import { exec } from 'child_process';
import fs from 'fs';

exec('npx vite build', (err, stdout, stderr) => {
  fs.writeFileSync('build_output_debug.log', "=== STDOUT ===\n" + stdout + "\n=== STDERR ===\n" + stderr + (err ? "\n=== ERROR ===\n" + err.message : ""));
});
