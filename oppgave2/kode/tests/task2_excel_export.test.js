import assert from 'node:assert/strict';
import test from 'node:test';

import { unzipSync } from 'fflate';
import writeExcelFile from 'write-excel-file/node';

import {
  createTask2WorkbookSheets,
  task2WorkbookFilename
} from '../components/task2ExcelExport.js';

const decode = (value) => new TextDecoder().decode(value);

test('Excel-eksporten lager fire lesbare faner med forventede verdier', async () => {
  const sheets = createTask2WorkbookSheets({
    virksomhetRows: [{ Konto: '5000', Hovedbok: 12.5, Investeringsbudsjett: 20, Investeringsregnskap: 15 }],
    kontantRows: [{ Konto: '5000', Kontantbudsjett: 0, Kontant: 10 }],
    maanedRows: [{ Konto: '5000', Januar: 4, Februar: 6, 'Totalt alle måneder': 10 }],
    metadata: [{ Felt: 'Finansiering', Verdi: '154301' }]
  });

  const buffer = await writeExcelFile(sheets).toBuffer();
  const files = unzipSync(new Uint8Array(buffer));
  const workbookXml = decode(files['xl/workbook.xml']);
  const worksheetXml = decode(files['xl/worksheets/sheet1.xml']);
  const allXml = Object.entries(files)
    .filter(([name]) => name.endsWith('.xml'))
    .map(([, value]) => decode(value))
    .join('\n');

  for (const sheetName of ['Virksomhet', 'Kontant', 'Måneder', 'Rapportinfo']) {
    assert.match(workbookXml, new RegExp(`name="${sheetName}"`));
  }
  assert.match(allXml, /Hovedbok/);
  assert.match(allXml, /Kontantbudsjett/);
  assert.match(allXml, /Investeringsbudsjett/);
  assert.match(allXml, /Investeringsregnskap/);
  assert.match(allXml, /Totalt alle måneder/);
  assert.match(allXml, /Finansiering/);
  assert.match(worksheetXml, /<c r="B2"[^>]*><v>12\.5<\/v><\/c>/);
  assert.equal(task2WorkbookFilename('154301', '01–03 2026'), 'kontogruppering-154301-01-03-2026.xlsx');
});
