import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Compile a service/handler in memory, substituting external boundaries only.
// This does not start Next, open a socket, or contact Supabase.
export function loadTsModule(path, stubs = {}) {
  const filename = fileURLToPath(new URL("../" + path, import.meta.url));
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = new Module(filename);
  loaded.filename = filename;
  const require = createRequire(filename);
  loaded.require = name => Object.hasOwn(stubs, name) ? stubs[name] : require(name);
  loaded._compile(compiled, filename);
  return loaded.exports;
}
