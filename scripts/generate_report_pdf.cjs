const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function buildPdf() {
  const mdPath = path.join(__dirname, '../docs/SE3070_Assignment02_Final_Report.md');
  const pdfPath = path.join(__dirname, '../docs/SE3070_Assignment02_Final_Report.pdf');
  const mdContent = fs.readFileSync(mdPath, 'utf8');

  // Convert image relative paths to absolute file:/// URIs for local chromium rendering
  const docsDir = path.join(__dirname, '../docs');
  const processedMd = mdContent.replace(/!\[(.*?)\]\(\.\/(.*?)\)/g, (match, alt, relPath) => {
    const absImagePath = path.join(docsDir, relPath);
    return `![${alt}](file://${absImagePath})`;
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SE3070 Assignment 02 Final Report</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 0;
      margin: 0;
    }
    h1, h2, h3, h4 {
      color: #1f5a43;
      font-weight: 700;
      page-break-after: avoid;
    }
    h1 { font-size: 22pt; border-bottom: 2px solid #1f5a43; padding-bottom: 6px; text-align: center; }
    h2 { font-size: 16pt; border-bottom: 1px solid #dcdcdc; padding-bottom: 4px; margin-top: 24pt; }
    h3 { font-size: 13pt; margin-top: 18pt; }
    h4 { font-size: 11pt; margin-top: 14pt; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14pt 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #c8d6cf;
      padding: 6pt 8pt;
      text-align: left;
    }
    th {
      background-color: #f0f5f2;
      color: #1f5a43;
      font-weight: 700;
    }
    tr:nth-child(even) {
      background-color: #fafcfb;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 14pt auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      page-break-inside: avoid;
    }
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      background-color: #f4f6f5;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 9pt;
    }
    pre {
      background-color: #0a100c;
      color: #79d2a6;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    pre code {
      background-color: transparent;
      color: inherit;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #3b7a57;
      margin: 12pt 0;
      padding-left: 12pt;
      color: #4a5568;
      font-style: italic;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 20pt 0;
    }
    .footer {
      font-size: 8pt;
      color: #718096;
      text-align: center;
      margin-top: 30pt;
    }
  </style>
</head>
<body>
  <div id="content"></div>
  <script>
    const markdownText = ${JSON.stringify(processedMd)};
    document.getElementById('content').innerHTML = marked.parse(markdownText);
  </script>
</body>
</html>`;

  const htmlPath = path.join(__dirname, '../docs/SE3070_Assignment02_Final_Report.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('Generated HTML file at:', htmlPath);

  console.log('Launching Chromium with Playwright...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  // Wait a second for marked and images to load completely
  await page.waitForTimeout(2000);

  console.log('Printing PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });

  await browser.close();
  console.log('Successfully created PDF report at:', pdfPath);
}

buildPdf().catch(err => {
  console.error('Failed to generate PDF:', err);
  process.exit(1);
});
