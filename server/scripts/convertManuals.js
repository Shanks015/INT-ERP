import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, ImageRun, TextRun, AlignmentType } from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse Markdown inline text to docx TextRuns robustly
function parseTextRuns(text) {
    const runs = [];
    const tokens = [];
    let idx = 0;
    
    while (idx < text.length) {
        // Parse Bold (**text**)
        if (text.startsWith('**', idx)) {
            const next = text.indexOf('**', idx + 2);
            if (next !== -1) {
                tokens.push({ type: 'bold', text: text.substring(idx + 2, next) });
                idx = next + 2;
                continue;
            }
        }
        // Parse Code (`text`)
        if (text.startsWith('`', idx)) {
            const next = text.indexOf('`', idx + 1);
            if (next !== -1) {
                tokens.push({ type: 'code', text: text.substring(idx + 1, next) });
                idx = next + 1;
                continue;
            }
        }
        // Parse Link ([text](url))
        if (text.startsWith('[', idx)) {
            const closingBracket = text.indexOf(']', idx);
            if (closingBracket !== -1 && text.substring(closingBracket + 1).startsWith('(')) {
                const closingParen = text.indexOf(')', closingBracket + 2);
                if (closingParen !== -1) {
                    const linkText = text.substring(idx + 1, closingBracket);
                    tokens.push({ type: 'link', text: linkText });
                    idx = closingParen + 1;
                    continue;
                }
            }
        }
        
        // Find next candidate for special token
        let nextSpecial = -1;
        const nextBold = text.indexOf('**', idx + 1);
        const nextCode = text.indexOf('`', idx + 1);
        const nextLink = text.indexOf('[', idx + 1);
        
        const specials = [nextBold, nextCode, nextLink].filter(n => n > idx);
        if (specials.length > 0) {
            nextSpecial = Math.min(...specials);
        }
        
        if (nextSpecial === -1) {
            tokens.push({ type: 'text', text: text.substring(idx) });
            break;
        } else {
            tokens.push({ type: 'text', text: text.substring(idx, nextSpecial) });
            idx = nextSpecial;
        }
    }
    
    for (const token of tokens) {
        if (token.text.length === 0) continue;
        if (token.type === 'bold') {
            runs.push(new TextRun({ text: token.text, bold: true }));
        } else if (token.type === 'code') {
            runs.push(new TextRun({ text: token.text, font: 'Courier New', color: 'A31515' }));
        } else if (token.type === 'link') {
            runs.push(new TextRun({ text: token.text, color: '0000FF', underline: true }));
        } else {
            runs.push(new TextRun({ text: token.text }));
        }
    }
    
    if (runs.length === 0) {
        runs.push(new TextRun({ text: "" }));
    }
    return runs;
}

// Function to convert single markdown file to docx
async function convertMdToDocx(mdPath, docxPath) {
    console.log(`Converting ${path.basename(mdPath)} -> ${path.basename(docxPath)}...`);
    const mdContent = fs.readFileSync(mdPath, 'utf8');
    
    // Split into structural blocks by double newlines
    const blocks = mdContent.split(/\r?\n\r?\n/);
    const docChildren = [];
    
    for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;
        
        // 1. Heading 1
        if (trimmed.startsWith('# ')) {
            docChildren.push(new Paragraph({
                children: parseTextRuns(trimmed.substring(2)),
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 240, after: 120 }
            }));
            continue;
        }
        
        // 2. Heading 2
        if (trimmed.startsWith('## ')) {
            docChildren.push(new Paragraph({
                children: parseTextRuns(trimmed.substring(3)),
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 80 }
            }));
            continue;
        }
        
        // 3. Heading 3
        if (trimmed.startsWith('### ')) {
            docChildren.push(new Paragraph({
                children: parseTextRuns(trimmed.substring(4)),
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 160, after: 60 }
            }));
            continue;
        }
        
        // 4. Image Markdown Block `![caption](path)`
        const imgRegex = /!\[(.*?)\]\((.*?)\)/;
        const imgMatch = trimmed.match(imgRegex);
        if (imgMatch) {
            const caption = imgMatch[1];
            const relativeImgPath = imgMatch[2];
            const absoluteImgPath = path.resolve(path.dirname(mdPath), relativeImgPath);
            
            if (fs.existsSync(absoluteImgPath)) {
                console.log(`  Embedding image: ${relativeImgPath}`);
                const imageBuffer = fs.readFileSync(absoluteImgPath);
                
                // Add spacer
                docChildren.push(new Paragraph({ text: "" }));
                
                // Embed image run
                docChildren.push(new Paragraph({
                    children: [
                        new ImageRun({
                            data: imageBuffer,
                            transformation: {
                                width: 500,
                                height: 260
                            }
                        })
                    ],
                    alignment: AlignmentType.CENTER
                }));
                
                // Add caption paragraph below
                docChildren.push(new Paragraph({
                    children: [new TextRun({ text: caption, italic: true, size: 18, color: "555555" })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 }
                }));
            } else {
                console.error(`  Warning: Image file not found at ${absoluteImgPath}`);
                docChildren.push(new Paragraph({
                    children: [new TextRun({ text: `[Image Missing: ${caption}]`, color: "FF0000" })]
                }));
            }
            continue;
        }
        
        // 5. Table Block
        if (trimmed.startsWith('|')) {
            const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l);
            const rows = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Skip MD separator line |---|---|
                if (line.includes('---')) continue;
                
                // Parse cells
                const cells = line.split('|').map(c => c.trim()).slice(1, -1);
                const isHeader = i === 0;
                
                const tableRow = new TableRow({
                    children: cells.map(cellText => 
                        new TableCell({
                            children: [
                                new Paragraph({
                                    children: parseTextRuns(cellText),
                                    spacing: { before: 80, after: 80 }
                                })
                            ],
                            shading: isHeader ? { fill: "EFEFEF" } : undefined,
                            margins: { top: 100, bottom: 100, left: 150, right: 150 }
                        })
                    )
                });
                rows.push(tableRow);
            }
            
            if (rows.length > 0) {
                docChildren.push(new Table({
                    rows: rows,
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    spacing: { before: 120, after: 120 }
                }));
            }
            continue;
        }
        
        // 6. Blockquote or Alerts `> `
        if (trimmed.startsWith('>')) {
            const cleanLines = trimmed.split('\n')
                .map(l => l.replace(/^>\s*/, '').trim())
                .filter(l => l);
            
            let blockText = cleanLines.join(' ');
            
            // Clean up alert banners (e.g. `[!IMPORTANT]`)
            blockText = blockText.replace(/\[!(IMPORTANT|NOTE|WARNING|TIP|CAUTION)\]/g, '[$1]');
            
            docChildren.push(new Paragraph({
                children: parseTextRuns(blockText),
                indent: { left: 720 }, // 0.5 inches indent
                spacing: { before: 120, after: 120 },
                style: "Quote"
            }));
            continue;
        }
        
        // 7. Bullet List Block (contains lines starting with `- ` or `* `)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const items = trimmed.split('\n').map(item => item.trim()).filter(item => item);
            for (const item of items) {
                const cleanItem = item.replace(/^[-\*]\s*/, '');
                docChildren.push(new Paragraph({
                    children: parseTextRuns(cleanItem),
                    bullet: { level: 0 },
                    spacing: { before: 40, after: 40 }
                }));
            }
            continue;
        }
        
        // 8. Normal Paragraph
        docChildren.push(new Paragraph({
            children: parseTextRuns(trimmed),
            spacing: { before: 60, after: 120 }
        }));
    }
    
    // Create the final Document package
    const doc = new Document({
        sections: [{
            properties: {},
            children: docChildren
        }]
    });
    
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(docxPath, buffer);
    console.log(`✅ Saved ${docxPath}`);
}

async function main() {
    try {
        console.log("=== STARTING DOCX CONVERSION PROCESS ===");
        
        const rootDir = path.resolve(__dirname, '../..');
        
        const filesToConvert = [
            {
                md: path.join(rootDir, 'USER_MANUAL.md'),
                docx: path.join(rootDir, 'USER_MANUAL.docx')
            },
            {
                md: path.join(rootDir, 'manuals', 'ADMIN_MANUAL.md'),
                docx: path.join(rootDir, 'manuals', 'ADMIN_MANUAL.docx')
            },
            {
                md: path.join(rootDir, 'manuals', 'EMPLOYEE_MANUAL.md'),
                docx: path.join(rootDir, 'manuals', 'EMPLOYEE_MANUAL.docx')
            }
        ];
        
        for (const filePair of filesToConvert) {
            if (fs.existsSync(filePair.md)) {
                await convertMdToDocx(filePair.md, filePair.docx);
            } else {
                console.error(`Error: Source file not found at ${filePair.md}`);
            }
        }
        
        console.log("\n=== ALL FILES CONVERTED SUCCESSFULLY ===");
        process.exit(0);
    } catch (error) {
        console.error("Fatal Conversion Error:", error);
        process.exit(1);
    }
}

main();
