import { useEffect, useRef, useState } from 'react';
import * as runtime from 'react/jsx-runtime';
import { preprocessMdx } from './preprocess.js';

const cache = new Map();
let pipelinePromise = null;

// Lazily load the (heavy) MDX compiler + remark/rehype plugins so they form a
// separate chunk fetched only when the first doc page is opened.
function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = Promise.all([
      import('@mdx-js/mdx'),
      import('remark-gfm'),
      import('remark-math'),
      import('rehype-katex'),
      import('rehype-slug'),
    ]).then(([mdx, gfm, math, katex, slug]) => ({
      evaluate: mdx.evaluate,
      options: {
        ...runtime,
        remarkPlugins: [gfm.default, math.default],
        rehypePlugins: [slug.default, [katex.default, { strict: false, throwOnError: false }]],
      },
    }));
  }
  return pipelinePromise;
}

async function compile(source) {
  const { evaluate, options } = await getPipeline();
  const processed = preprocessMdx(source);
  const mod = await evaluate(processed, options);
  return mod.default;
}

/**
 * Compile an MDX body string into a React component.
 * Results are cached by `cacheKey` so revisiting a page is instant.
 */
export function useMdx(source, cacheKey) {
  const [state, setState] = useState(() => {
    if (cacheKey && cache.has(cacheKey)) {
      return { Content: cache.get(cacheKey), error: null, loading: false };
    }
    return { Content: null, error: null, loading: true };
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (cacheKey && cache.has(cacheKey)) {
      setState({ Content: cache.get(cacheKey), error: null, loading: false });
      return;
    }
    setState({ Content: null, error: null, loading: true });
    compile(source)
      .then((Content) => {
        if (cacheKey) cache.set(cacheKey, Content);
        if (mounted.current) setState({ Content, error: null, loading: false });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('MDX compile error:', err);
        if (mounted.current) setState({ Content: null, error: err, loading: false });
      });
    return () => {
      mounted.current = false;
    };
  }, [source, cacheKey]);

  return state;
}
