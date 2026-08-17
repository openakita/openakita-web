import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");

async function listFiles(directory, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolutePath, relativePath)));
    } else if (entry.isFile()) {
      files.push({ absolutePath, relativePath });
    }
  }

  return files;
}

function lengthPrefix(length) {
  const buffer = Buffer.allocUnsafe(8);
  buffer.writeBigUInt64BE(BigInt(length));
  return buffer;
}

const files = await listFiles(distDir);
files.sort((left, right) =>
  left.relativePath < right.relativePath
    ? -1
    : left.relativePath > right.relativePath
      ? 1
      : 0,
);

const hash = createHash("sha256");

for (const file of files) {
  const relativePath = Buffer.from(file.relativePath, "utf8");
  const content = await readFile(file.absolutePath);

  hash.update(lengthPrefix(relativePath.length));
  hash.update(relativePath);
  hash.update(lengthPrefix(content.length));
  hash.update(content);
}

console.log(hash.digest("hex"));
