const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const puppeteer = require('puppeteer');

const JDS_DIR = path.join(__dirname, '..', 'jds');

async function docxToHtml(filePath) {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.convertToHtml({ buffer });
  return result.value; // HTML string
}

async function htmlToPdfBuffer(html) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4' });
  await browser.close();
  return pdfBuffer;
}

exports.generate = async (req, res) => {
  try {
    const { role, qnty } = req.body || {};
    if (!role) return res.status(400).json({ success: false, message: 'role is required' });

    const filename = `${role}.docx`;
    const filePath = path.join(JDS_DIR, filename);

    let html;
    if (fs.existsSync(filePath)) {
      html = await docxToHtml(filePath);
    } else {
      // Fallback HTML when docx not present
      html = `<html><head><meta charset="utf-8"><title>${role} JD</title></head><body><h1>${role}</h1><p>Quantity: ${qnty || 1}</p><p>No JD file found on server. Please upload ${filename} to the jds folder.</p></body></html>`;
    }

    // Simple wrapper layout
    const wrapped = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,Helvetica,sans-serif;padding:24px}</style></head><body>${html}</body></html>`;
    const pdfBuffer = await htmlToPdfBuffer(wrapped);

    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${role}.pdf"`, 'Content-Length': pdfBuffer.length });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('JD generation error', err);
    res.status(500).json({ success: false, message: 'internal error', error: err.message });
  }
};
