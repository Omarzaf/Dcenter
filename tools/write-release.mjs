import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const { version } = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
let commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.CORE_RELEASE_COMMIT;
if (!commit) {
  try {
    commit = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const changes = execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (changes.trim()) commit = null;
  } catch {
    // A downloaded source archive can still be built without Git metadata.
    commit = null;
  }
}
if (commit !== null && !/^[a-f0-9]{40}$/.test(commit)) {
  throw new Error("Release commit must be a full Git SHA.");
}
writeFileSync(
  new URL("dist/release.json", root),
  JSON.stringify({ version, commit }, null, 2) + "\n",
);
console.log(`Release ${version}: ${commit ?? "local or uncommitted source"}`);
