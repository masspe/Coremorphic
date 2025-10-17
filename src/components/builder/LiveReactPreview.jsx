import React from "react";
import * as Babel from "@babel/standalone";

const PREVIEW_WRAPPER_STYLES =
  "h-96 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-900";

const DEFAULT_ERROR_MESSAGE = "Unable to render the generated code.";

const HOOK_IMPORTS = `const { useState, useEffect, useMemo, useCallback, useRef, useReducer, useContext, useLayoutEffect, useImperativeHandle, useTransition, useDeferredValue, createContext, forwardRef, memo, Fragment, Suspense, StrictMode } = React;`;

const buildWrappedSource = rawCode => {
  const trimmed = rawCode.trim();
  const isLikelyExpression =
    trimmed.startsWith("(") ||
    trimmed.startsWith("<") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith("React.createElement");

  const body = isLikelyExpression
    ? `return (${rawCode});`
    : `${rawCode}\nreturn module.exports?.default ?? module.exports ?? exports.default ?? exports ?? (typeof App !== 'undefined' ? App : undefined);`;

  return `React => {\n  const exports = {};\n  const module = { exports };\n  ${HOOK_IMPORTS}\n  ${body}\n}`;
};

const resolveRenderable = result => {
  if (!result) {
    return null;
  }

  if (React.isValidElement(result)) {
    return () => result;
  }

  if (typeof result === "function") {
    return result;
  }

  if (typeof result === "object") {
    if (typeof result.default === "function") {
      return result.default;
    }

    if (React.isValidElement(result.default)) {
      return () => result.default;
    }
  }

  return null;
};

const persistCode = async (appId, code) => {
  if (!appId) {
    return;
  }

  const response = await fetch(`/api/apps/${encodeURIComponent(appId)}/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ code })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to persist generated code.");
  }
};

const LiveReactPreview = ({ code, appId }) => {
  const [RenderComponent, setRenderComponent] = React.useState(null);
  const [renderKey, setRenderKey] = React.useState(0);
  const [compileError, setCompileError] = React.useState(null);
  const [storageError, setStorageError] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;

    const compileAndRender = async () => {
      if (!code || !code.trim()) {
        if (!isMounted) return;
        setRenderComponent(null);
        setCompileError(null);
        setStorageError(null);
        return;
      }

      try {
        const wrappedSource = buildWrappedSource(code);
        const { code: compiledCode } = Babel.transform(`(${wrappedSource})`, {
          presets: ["env", "react"],
          plugins: ["transform-modules-commonjs"],
          sourceType: "module"
        });

        // eslint-disable-next-line no-new-func
        const executor = new Function(
          "React",
          `const renderFactory = ${compiledCode}; return renderFactory(React);`
        );

        const executionResult = executor(React);
        const Component = resolveRenderable(executionResult);

        if (!Component) {
          throw new Error(DEFAULT_ERROR_MESSAGE);
        }

        if (!isMounted) return;
        setRenderComponent(() => Component);
        setRenderKey(prev => prev + 1);
        setCompileError(null);

        try {
          await persistCode(appId, code);
          if (!isMounted) return;
          setStorageError(null);
        } catch (saveError) {
          if (!isMounted) return;
          console.error("Failed to persist generated code", saveError);
          setStorageError(saveError.message || "Failed to save generated code.");
        }
      } catch (compilationError) {
        if (!isMounted) return;
        console.error("Failed to compile generated code", compilationError);
        const message = compilationError.message || DEFAULT_ERROR_MESSAGE;
        setCompileError(message);
        setRenderComponent(null);
      }
    };

    compileAndRender();

    return () => {
      isMounted = false;
    };
  }, [code, appId]);

  const showFallback = !code || !code.trim();
  const hasCompileError = Boolean(compileError);

  return (
    <div className={PREVIEW_WRAPPER_STYLES}>
      {showFallback ? (
        <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
          Waiting for AI-generated code…
        </div>
      ) : hasCompileError ? (
        <div className="text-sm font-medium text-red-600">{compileError}</div>
      ) : RenderComponent ? (
        <div className="flex h-full w-full flex-col gap-3 overflow-hidden">
          {storageError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {storageError}
            </div>
          )}
          <div className="h-full w-full overflow-auto rounded-lg bg-white p-4 shadow-sm" key={renderKey}>
            <RenderComponent />
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
          Preparing preview…
        </div>
      )}
    </div>
  );
};

export default LiveReactPreview;

