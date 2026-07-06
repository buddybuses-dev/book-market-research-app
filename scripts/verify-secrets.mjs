import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const ignoreDirs = new Set([".git", "node_modules", ".next", "out", "coverage"]);
const ignoreFiles = new Set([".env", ".env.local", ".env.development", ".env.production"]);

const secretPatterns = [
  { name: "SerpApi key", regex: /SERPAPI_API_KEY\s*=\s*[^\s#]+/i },
  { name: "DataForSEO login", regex: /DATAFORSEO_LOGIN\s*=\s*[^\s#]+/i },
  { name: "DataForSEO password", regex: /DATAFORSEO_PASSWORD\s*=\s*[^\s#]+/i },
  { name: "n8n webhook secret", regex: /N8N_WEBHOOK_SECRET\s*=\s*[^\s#]+/i },
  { name: "Generic API key", regex: /(?:api|secret|token|password)[-_ ]?key\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}/i }
];

const findings = [];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) {
        continue;
      }

      walk(join(dir, entry.name));
      continue;
    }

    if (ignoreFiles.has(entry.name) || entry.name === ".env.example") {
      continue;
    }

    const filePath = join(dir, entry.name);
    const relPath = filePath.replace(`${root}\\`, "").replaceAll("\\", "/");

    try {
      if (statSync(filePath).size > 1024 * 1024) {
        continue;
      }

      const content = readFileSync(filePath, "utf8");

      for (const pattern of secretPatterns) {
        if (pattern.regex.test(content)) {
          findings.push({ file: relPath, pattern: pattern.name });
        }
      }
    } catch {
      // Ignore binary files or files that cannot be decoded as utf8.
    }
  }
}

walk(root);

if (findings.length > 0) {
  console.error("Potential secret leaks found:");
  for (const finding of findings) {
    console.error(`- ${finding.file} (${finding.pattern})`);
  }
  process.exit(1);
}

console.log("secret scan passed");