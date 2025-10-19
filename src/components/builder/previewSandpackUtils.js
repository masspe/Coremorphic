const DEFAULT_ENTRY_FALLBACK = "/src/main.tsx";
const PREVIEW_ENTRY_CANDIDATES = [
  "/src/main.tsx",
  "/src/main.ts",
  "/src/main.jsx",
  "/src/main.js",
  "/src/main.mjs",
  "/src/main.cjs",
  "/src/index.tsx",
  "/src/index.ts",
  "/src/index.jsx",
  "/src/index.js",
  "/src/index.mjs",
  "/src/index.cjs"
];

const PACKAGE_ENTRY_FIELDS = ["source", "module", "main", "browser"];

const OPTIONAL_PREVIEW_DEV_DEPENDENCIES = ["tailwindcss", "postcss", "autoprefixer"];

const DEFAULT_VITE_CONFIG_JS = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;

const DEFAULT_VITE_CONFIG_TS = DEFAULT_VITE_CONFIG_JS;

const normalizeSandpackPath = (path = "") => {
  if (!path) return "/";
  const normalized = path.replace(/^\.?\//, "").replace(/\\/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const normalizeEntryCandidate = (candidate) => {
  if (!candidate || typeof candidate !== "string") return null;
  const withoutQuery = candidate.split(/[?#]/)[0];
  if (!withoutQuery) return null;
  return normalizeSandpackPath(withoutQuery);
};

const parsePackageJson = (files) => {
  const packageFile = files.find((file) => normalizeSandpackPath(file.path) === "/package.json");

  if (!packageFile?.content) {
    return { parsedPackage: null, packageFile: null };
  }

  try {
    const parsedPackage = JSON.parse(packageFile.content);
    return { parsedPackage, packageFile };
  } catch (error) {
    console.warn("Failed to parse package.json for preview", error);
    return { parsedPackage: null, packageFile };
  }
};

const detectEntryFromPackage = (parsedPackage, normalizedPaths) => {
  if (!parsedPackage) return null;

  for (const field of PACKAGE_ENTRY_FIELDS) {
    const value = parsedPackage[field];
    if (typeof value !== "string") continue;
    const normalized = normalizeEntryCandidate(value);
    if (!normalized) continue;
    if (normalizedPaths.has(normalized)) {
      return normalized;
    }
  }

  return null;
};

const detectEntryFromIndexHtml = (files, normalizedPaths) => {
  const indexFile = files.find(
    (file) => normalizeSandpackPath(file.path) === "/index.html" || normalizeSandpackPath(file.path) === "/public/index.html"
  );

  if (!indexFile?.content) {
    return null;
  }

  const scriptRegex = /<script\b[^>]*\bsrc\s*=\s*[\"']([^\"']+)[\"'][^>]*>/gi;
  let match;

  while ((match = scriptRegex.exec(indexFile.content))) {
    const fullTag = match[0];
    const srcValue = match[1];
    const hasModuleType = /type\s*=\s*["']module["']/i.test(fullTag) || /type=module/i.test(fullTag);

    if (!hasModuleType) continue;

    const normalized = normalizeEntryCandidate(srcValue);
    if (normalized && normalizedPaths.has(normalized)) {
      return normalized;
    }
  }

  return null;
};

const resolveEntryFromFiles = (files) => {
  const normalizedPaths = new Set(files.map((file) => normalizeSandpackPath(file.path)));

  const { parsedPackage } = parsePackageJson(files);

  const packageEntry = detectEntryFromPackage(parsedPackage, normalizedPaths);
  if (packageEntry) {
    return { entry: packageEntry, parsedPackage, normalizedPaths };
  }

  const htmlEntry = detectEntryFromIndexHtml(files, normalizedPaths);
  if (htmlEntry) {
    return { entry: htmlEntry, parsedPackage, normalizedPaths };
  }

  const candidate = PREVIEW_ENTRY_CANDIDATES.find((option) => normalizedPaths.has(option));
  if (candidate) {
    return { entry: candidate, parsedPackage, normalizedPaths };
  }

  return { entry: DEFAULT_ENTRY_FALLBACK, parsedPackage, normalizedPaths };
};

const ensureDependency = (dependencies, devDependencies, name, fallback) => {
  if (!dependencies[name]) {
    dependencies[name] = devDependencies?.[name] || fallback;
  }
};

const buildSandpackConfig = (files) => {
  const { entry, parsedPackage, normalizedPaths } = resolveEntryFromFiles(files);

  const dependencies = {
    react: "18.2.0",
    "react-dom": "18.2.0",
    ...(parsedPackage?.dependencies ?? {})
  };

  OPTIONAL_PREVIEW_DEV_DEPENDENCIES.forEach((name) => {
    const version = parsedPackage?.devDependencies?.[name];
    if (version) {
      dependencies[name] = version;
    }
  });

  const devDependencies = parsedPackage?.devDependencies ?? {};
  const usesTypeScript = entry.endsWith(".ts") || entry.endsWith(".tsx");

  if (usesTypeScript) {
    ensureDependency(dependencies, devDependencies, "typescript", "5.6.2");
    ensureDependency(dependencies, devDependencies, "@types/react", "18.3.3");
    ensureDependency(dependencies, devDependencies, "@types/react-dom", "18.3.3");
  }

  ensureDependency(dependencies, devDependencies, "vite", "5.4.0");
  ensureDependency(dependencies, devDependencies, "@vitejs/plugin-react", "4.3.4");

  const template = usesTypeScript ? "vite-react-ts" : "vite-react";

  return {
    entry,
    template,
    dependencies,
    bundlerEntry: template.startsWith("vite-") ? "/index.html" : entry,
    parsedPackage,
    normalizedPaths
  };
};

const buildSandpackFiles = (files, activeFilePath, sandpackConfig) => {
  const map = {};

  const ensure = (path, code) => {
    if (!map[path]) {
      map[path] = { code };
    }
  };

  const entryScriptPath = sandpackConfig.entry.startsWith("/")
    ? sandpackConfig.entry
    : `/${sandpackConfig.entry}`;

  ensure(
    "/index.html",
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${entryScriptPath}"></script>
  </body>
</html>`
  );

  const isTypeScript = entryScriptPath.endsWith(".ts") || entryScriptPath.endsWith(".tsx");
  const supportsJSX = entryScriptPath.endsWith(".tsx") || entryScriptPath.endsWith(".jsx");
  const entrySegments = entryScriptPath.split("/").filter(Boolean);
  entrySegments.pop();
  const entryDir = entrySegments.length ? `/${entrySegments.join("/")}` : "";
  const appExtension = isTypeScript ? ".tsx" : ".jsx";
  const fallbackAppPath = `${entryDir || ""}/App${appExtension}`;

  const createEntryCode = () => {
    const rootLookup = isTypeScript ? "document.getElementById('root') as HTMLElement | null" : "document.getElementById('root')";
    if (supportsJSX) {
      return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = ${rootLookup};

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
    }

    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = ${rootLookup};

if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  React.createElement(React.StrictMode, null, React.createElement(App))
);
`;
  };

  const createAppCode = () => {
    if (isTypeScript) {
      return `import React from 'react';

const App: React.FC = () => {
  return <h1>Hello from preview</h1>;
};

export default App;
`;
    }

    return `export default function App() {
  return <h1>Hello from preview</h1>;
}
`;
  };

  ensure(entryScriptPath, createEntryCode());
  ensure(fallbackAppPath, createAppCode());

  if (sandpackConfig.template === "vite-react") {
    ensure("/vite.config.js", DEFAULT_VITE_CONFIG_JS);
  } else {
    ensure(
      "/tsconfig.json",
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            module: "ESNext",
            jsx: "react-jsx",
            moduleResolution: "Bundler",
            esModuleInterop: true,
            strict: true,
            skipLibCheck: true
          }
        },
        null,
        2
      )
    );

    ensure("/vite.config.ts", DEFAULT_VITE_CONFIG_TS);
    ensure("/src/vite-env.d.ts", `/// <reference types="vite/client" />`);
  }

  files.forEach((file) => {
    const normalizedPath = normalizeSandpackPath(file.path);
    map[normalizedPath] = {
      code: file.content ?? "",
      active: normalizedPath === activeFilePath
    };
  });

  const fallbackDependencies = { ...sandpackConfig.dependencies };

  ensure(
    "/package.json",
    JSON.stringify(
      {
        name: "generated-react-app",
        version: "1.0.0",
        private: true,
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
          start: "vite"
        },
        dependencies: fallbackDependencies
      },
      null,
      2
    )
  );

  return map;
};

export {
  buildSandpackConfig,
  buildSandpackFiles,
  normalizeSandpackPath,
  resolveEntryFromFiles,
  PREVIEW_ENTRY_CANDIDATES,
  DEFAULT_VITE_CONFIG_JS,
  DEFAULT_VITE_CONFIG_TS
};

export const __TEST_ONLY__ = {
  detectEntryFromIndexHtml,
  detectEntryFromPackage,
  parsePackageJson,
  normalizeEntryCandidate
};
