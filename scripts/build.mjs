import ts from 'typescript';
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const scheduler = require.resolve('scheduler', { paths: [path.dirname(require.resolve('react-dom/package.json'))] });

// A single-process build also works in restricted Windows environments.
const file = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
if (file.error) throw new Error(ts.flattenDiagnosticMessageText(file.error.messageText, '\n'));
const config = ts.parseJsonConfigFileContent(file.config, ts.sys, process.cwd());
const program = ts.createProgram(config.fileNames, config.options);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: f => f, getCurrentDirectory: process.cwd, getNewLine: () => '\n' }));
  process.exit(1);
}
await build({
  configFile: false,
  resolve: { preserveSymlinks: true, alias: { scheduler } },
  plugins: [{
    name: 'typescript-single-process', enforce: 'pre',
    transform(code, id) {
      if (!/\.[jt]sx?$/.test(id)) return;
      code = code.replaceAll('process.env.NODE_ENV', '"production"');
      if (id.includes('node_modules')) return { code, map: null };
      return { code: ts.transpileModule(code, { fileName: path.basename(id), compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, sourceMap: false } }).outputText, map: null };
    },
  }, tailwindcss()],
  esbuild: false,
  build: { target: 'esnext', minify: false, cssMinify: 'lightningcss', rollupOptions: { output: { compact: true } } },
});
