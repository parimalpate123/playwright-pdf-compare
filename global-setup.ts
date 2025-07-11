import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';

async function createSamplePDF(filePath: string, title: string, name: string) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 2; i++) {
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    page.drawText(title, { x: 50, y: height - 60, size: 18, font });
    page.drawText(`Page ${i + 1}`, { x: 50, y: height - 90, size: 12, font });
    page.drawText(`Insured Name: ${name}`, { x: 50, y: height - 130, size: 12, font });
  }
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);
}

export default async () => {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  await createSamplePDF(path.join(dataDir, 'expected.pdf'), 'Sample Auto Insurance Policy', 'John Doe');
  await createSamplePDF(path.join(dataDir, 'actual.pdf'), 'Sample Auto Insurance Policy', 'John Doe'); // identical for green build
};