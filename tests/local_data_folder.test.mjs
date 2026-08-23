import assert from 'node:assert/strict';
import test from 'node:test';

import { indexLocalFiles, requireLocalFiles } from '../shared/browser/localDataFolder.js';

const fakeFile = (name, relativePath = name) => ({ name, webkitRelativePath: relativePath });

test('finner påkrevde filer i en valgt oppgavemappe', () => {
  const selection = indexLocalFiles([
    fakeFile('rapport.parquet', 'oppgave/rapport.parquet'),
    fakeFile('metadata.parquet', 'oppgave/metadata.parquet')
  ], 'oppgave');
  const resolved = requireLocalFiles(selection, ['rapport.parquet', 'metadata.parquet']);
  assert.equal(resolved['rapport.parquet'].name, 'rapport.parquet');
  assert.equal(resolved['metadata.parquet'].name, 'metadata.parquet');
});

test('avviser manglende og tvetydige filer uten å velge en tilfeldig kopi', () => {
  const missing = indexLocalFiles([fakeFile('rapport.parquet')]);
  assert.throws(
    () => requireLocalFiles(missing, ['rapport.parquet', 'metadata.parquet']),
    /mangler metadata\.parquet/
  );

  const duplicate = indexLocalFiles([
    fakeFile('rapport.parquet', 'første/rapport.parquet'),
    fakeFile('rapport.parquet', 'andre/rapport.parquet')
  ]);
  assert.throws(
    () => requireLocalFiles(duplicate, ['rapport.parquet']),
    /mer avgrenset datamappe/
  );
});
