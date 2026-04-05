const { exec } = require('child_process');

exec('npx vite build', (err, stdout, stderr) => {
  console.log("=== STDOUT ===");
  console.log(stdout);
  console.log("=== STDERR ===");
  console.log(stderr);
  if (err) {
    console.log("=== ERROR ===");
    console.log(err.message);
  }
});
