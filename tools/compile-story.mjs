import { readFileSync, writeFileSync } from "node:fs";
import { Compiler } from "inkjs/full";
const source = readFileSync(
  new URL("../src/firstlight/firstLight.ink", import.meta.url),
  "utf8",
);
const errors = [];
const story = new Compiler(source, {
  errorHandler: (message, type) => {
    if (type === 2) errors.push(message);
  },
}).Compile();
if (errors.length) throw new Error(errors.join("\n"));
writeFileSync(
  new URL("../src/firstlight/story.json", import.meta.url),
  story.ToJson() + "\n",
);
console.log("Compiled First light: 13 authored story beats.");
