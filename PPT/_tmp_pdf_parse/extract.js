const fs = require('fs');
const path = require('path');
const pdf = require(path.resolve('PPT/_tmp_pdf_parse/node_modules/pdf-parse'));
const files = [
  'PPT/中安测简介230920-A1(1).pdf',
  'PPT/中正信评（深圳）技术服务有限公司介绍及资质2025-2.pdf',
  'PPT/华测集团介绍等保+第三方验收测评.pdf'
];
(async () => {
  for (const f of files) {
    const dataBuffer = fs.readFileSync(f);
    const data = await pdf(dataBuffer);
    const out = f + '.txt';
    fs.writeFileSync(out, data.text, 'utf8');
    console.log(out + '\t' + data.numpages + ' pages\t' + data.text.length + ' chars');
  }
})().catch(err => { console.error(err); process.exit(1); });
