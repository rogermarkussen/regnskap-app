const plainValue = (value) => {
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map(plainValue);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plainValue(item)]));
  }
  return value;
};

export const createLocalDuckDb = async ({ duckdb, workerUrl, wasmUrl, files, fileNames }) => {
  const worker = new Worker(workerUrl);
  const database = new duckdb.AsyncDuckDB(
    new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING),
    worker
  );

  try {
    await database.instantiate(wasmUrl);
    for (const name of fileNames) {
      await database.registerFileBuffer(name, new Uint8Array(await files[name].arrayBuffer()));
    }
    const connection = await database.connect();
    return {
      async query(sql) {
        const result = await connection.query(sql);
        return result.toArray().map((row) => plainValue(row.toJSON()));
      },
      async close() {
        await connection.close();
        await database.terminate();
        worker.terminate();
      }
    };
  } catch (error) {
    await database.terminate();
    worker.terminate();
    throw error;
  }
};
