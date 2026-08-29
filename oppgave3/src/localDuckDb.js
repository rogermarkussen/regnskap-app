import * as duckdb from '@duckdb/duckdb-wasm';
import workerUrl from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import wasmUrl from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';

import { createLocalDuckDb } from '../../shared/browser/createLocalDuckDb.js';

export const openLocalDuckDb = (files, fileNames) => createLocalDuckDb({
  duckdb,
  workerUrl,
  wasmUrl,
  files,
  fileNames
});
