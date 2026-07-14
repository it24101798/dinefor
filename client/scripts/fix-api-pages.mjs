import fs from "node:fs";
import path from "node:path";

const srcDirectory = path.resolve("src");

const supportedExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
]);

const changedFiles = [];
const reviewFiles = [];

function walk(directory) {
  const entries = fs.readdirSync(directory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (supportedExtensions.has(path.extname(entry.name))) {
      migrateFile(fullPath);
    }
  }
}

function getApiImport(filePath) {
  const servicesPath = path.join(srcDirectory, "services", "api");
  let relativePath = path.relative(path.dirname(filePath), servicesPath);

  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }

  return relativePath.replaceAll("\\", "/");
}

function migrateFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  let updated = original;

  const apiImportPath = getApiImport(filePath);

  // Replace direct Axios import.
  updated = updated.replace(
    /import\s+axios\s+from\s+["']axios["'];?/g,
    `import api from "${apiImportPath}";`
  );

  // Replace Axios method usage.
  updated = updated.replace(
    /\baxios\.(get|post|put|patch|delete)\s*\(/g,
    "api.$1("
  );

  // Remove direct localhost API prefixes.
  updated = updated.replace(
    /(["'`])http:\/\/localhost:5000\/api\//g,
    "$1/"
  );

  updated = updated.replace(
    /(["'`])http:\/\/127\.0\.0\.1:5000\/api\//g,
    "$1/"
  );

  // Remove duplicate /api from shared API calls.
  updated = updated.replace(
    /\bapi\.(get|post|put|patch|delete)\(\s*(["'`])\/api\//g,
    "api.$1($2/"
  );

  // Remove constants that hardcode the old API base.
  updated = updated.replace(
    /^\s*const\s+API_URL\s*=\s*["']http:\/\/localhost:5000\/api["'];?\s*$/gm,
    ""
  );

  // Convert ${API_URL}/route to /route.
  updated = updated.replace(
    /`\$\{API_URL\}\/([^`]+)`/g,
    "`/$1`"
  );

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, "utf8");
    changedFiles.push(path.relative(srcDirectory, filePath));
  }

  if (
    updated.includes("localhost:5000") ||
    updated.includes('"/api/') ||
    updated.includes("'/api/") ||
    updated.includes("`/api/")
  ) {
    reviewFiles.push(path.relative(srcDirectory, filePath));
  }
}

if (!fs.existsSync(srcDirectory)) {
  console.error("Cannot find client/src.");
  console.error("Run this command from the client folder.");
  process.exit(1);
}

walk(srcDirectory);

console.log("\nUpdated files:");

if (changedFiles.length === 0) {
  console.log("No automatic changes were required.");
} else {
  changedFiles.forEach((file) => console.log(`  ✓ ${file}`));
}

console.log("\nFiles requiring manual review:");

if (reviewFiles.length === 0) {
  console.log("None.");
} else {
  reviewFiles.forEach((file) => console.log(`  ! ${file}`));
}

console.log("\nMigration completed.");