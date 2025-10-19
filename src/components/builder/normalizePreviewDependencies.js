const DEFAULT_DEPENDENCY_FALLBACKS = {
  react: "18.2.0",
  "react-dom": "18.2.0",
  vite: "5.4.0",
  "@vitejs/plugin-react": "4.3.4"
};

const TYPESCRIPT_DEPENDENCY_FALLBACKS = {
  typescript: "5.6.2",
  "@types/react": "18.3.3",
  "@types/react-dom": "18.3.3"
};

const UNSUPPORTED_PREFIXES = [
  { prefix: "workspace:", action: "strip" },
  { prefix: "file:", action: "skip" },
  { prefix: "link:", action: "skip" }
];

const sanitizeSpecifier = (name, specifier) => {
  if (typeof specifier !== "string") {
    return { skip: false, value: specifier };
  }

  let value = specifier.trim();

  if (!value) {
    return { skip: false, value };
  }

  for (const { prefix, action } of UNSUPPORTED_PREFIXES) {
    if (!value.startsWith(prefix)) {
      continue;
    }

    const remainder = value.slice(prefix.length).trim();

    if (action === "strip") {
      if (!remainder) {
        console.warn(
          `[preview] Skipping dependency "${name}" because specifier "${specifier}" does not include a version after the unsupported prefix.`
        );
        return { skip: true };
      }

      value = remainder;
      break;
    }

    if (action === "skip") {
      console.warn(
        `[preview] Skipping dependency "${name}" because specifier "${specifier}" is not supported by the preview sandbox.`
      );
      return { skip: true };
    }
  }

  return { skip: false, value };
};

const normalizePreviewDependencies = (sandpackConfig) => {
  const configDependencies = sandpackConfig?.dependencies ?? {};
  const normalized = {};

  Object.entries(configDependencies).forEach(([name, specifier]) => {
    if (specifier == null) {
      return;
    }

    const { skip, value } = sanitizeSpecifier(name, specifier);

    if (!skip) {
      normalized[name] = value;
    }
  });

  const usesTypeScript = Boolean(sandpackConfig?.entry && /\.tsx?$/.test(sandpackConfig.entry));

  const ensureFallback = (name, fallback) => {
    if (!normalized[name]) {
      normalized[name] = fallback;
    }
  };

  Object.entries(DEFAULT_DEPENDENCY_FALLBACKS).forEach(([name, fallback]) => {
    ensureFallback(name, fallback);
  });

  if (usesTypeScript) {
    Object.entries(TYPESCRIPT_DEPENDENCY_FALLBACKS).forEach(([name, fallback]) => {
      ensureFallback(name, fallback);
    });
  }

  return normalized;
};

export { normalizePreviewDependencies };
