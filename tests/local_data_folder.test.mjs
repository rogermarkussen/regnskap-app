import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMMON_DATA_FILES,
  indexLocalFiles,
  requireCommonDataFiles,
  requireLocalFiles
} from '../shared/browser/localDataFolder.js';

const fakeFile = (name, relativePath = name) => ({ name, webkitRelativePath: relativePath });

test('finner påkrevde filer i en valgt mappe', () => {
  const selection = indexLocalFiles([
    fakeFile('rapport.parquet', 'oppgave/rapport.parquet'),
    fakeFile('metadata.parquet', 'oppgave/metadata.parquet')
  ], 'oppgave');
  const resolved = requireLocalFiles(selection, ['rapport.parquet', 'metadata.parquet']);
  assert.equal(resolved['rapport.parquet'].name, 'rapport.parquet');
  assert.equal(resolved['metadata.parquet'].name, 'metadata.parquet');
});

test('bruker den samme kontrakten med 12 operative Parquet-filer for alle oppgaver', () => {
  assert.equal(COMMON_DATA_FILES.length, 12);
  const selection = indexLocalFiles(
    COMMON_DATA_FILES.map((name) => fakeFile(name, `korrekt-data/${name}`)),
    'korrekt-data'
  );
  const resolved = requireCommonDataFiles(selection);
  assert.deepEqual(Object.keys(resolved), [...COMMON_DATA_FILES]);
});

test('avviser en mappe med oppgavespesifikke eller andre ukjente Parquet-filer', () => {
  const selection = indexLocalFiles([
    ...COMMON_DATA_FILES.map((name) => fakeFile(name)),
    fakeFile('task2-report.parquet')
  ]);
  assert.throws(
    () => requireCommonDataFiles(selection),
    /ukjente Parquet-filer: task2-report\.parquet/
  );
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
