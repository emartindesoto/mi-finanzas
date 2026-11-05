/** Small client-side XLSX reader for straightforward tabular exports, without network dependencies.
 * Supports ZIP stored/deflate entries and shared/inline strings. Does not run macros or formulas.
 */
export async function readSpreadsheet(file) {
    const buffer = await file.arrayBuffer();
    const data = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder('utf-8');
    const sig = (i) => data.getUint32(i, true);
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
        if (sig(i) === 0x06054b50) {
            end = i;
            break;
        }
    }
    if (end < 0)
        throw Error('No se reconoce el archivo Excel (.xlsx).');
    const entries = data.getUint16(end + 10, true), offset = data.getUint32(end + 16, true);
    let ptr = offset;
    const files = new Map();
    for (let i = 0; i < entries; i++) {
        if (ptr + 46 > bytes.length || sig(ptr) !== 0x02014b50)
            throw Error('Estructura Excel dañada.');
        const method = data.getUint16(ptr + 10, true), compressed = data.getUint32(ptr + 20, true), uncompressed = data.getUint32(ptr + 24, true);
        const nLen = data.getUint16(ptr + 28, true), exLen = data.getUint16(ptr + 30, true), cLen = data.getUint16(ptr + 32, true), local = data.getUint32(ptr + 42, true);
        const name = decoder.decode(bytes.slice(ptr + 46, ptr + 46 + nLen));
        if (uncompressed > 20 * 1024 * 1024)
            throw Error('La hoja de Excel es demasiado grande.');
        files.set(name, { method, compressed, uncompressed, offset: local });
        ptr += 46 + nLen + exLen + cLen;
    }
    async function read(name) {
        const entry = files.get(name);
        if (!entry)
            return '';
        const off = entry.offset;
        if (sig(off) !== 0x04034b50)
            throw Error('Archivo ZIP incorrecto.');
        const start = off + 30 + data.getUint16(off + 26, true) + data.getUint16(off + 28, true);
        const chunk = bytes.slice(start, start + entry.compressed);
        let output;
        if (entry.method === 0)
            output = chunk;
        else if (entry.method === 8) {
            const stream = new Blob([chunk]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            output = new Uint8Array(await new Response(stream).arrayBuffer());
        }
        else
            throw Error('Método de compresión XLSX no compatible.');
        if (output.byteLength > 20 * 1024 * 1024)
            throw Error('La hoja descomprimida es demasiado grande.');
        return decoder.decode(output);
    }
    const parser = new DOMParser();
    const xml = (s) => { const d = parser.parseFromString(s, 'application/xml'); if (d.querySelector('parsererror'))
        throw Error('XML de Excel no válido.'); return d; };
    const sharedXML = await read('xl/sharedStrings.xml');
    const strings = [];
    if (sharedXML) {
        const doc = xml(sharedXML);
        for (const item of Array.from(doc.getElementsByTagName('si'))) {
            strings.push(Array.from(item.getElementsByTagName('t')).map(t => t.textContent || '').join(''));
        }
    }
    const candidates = [...files.keys()].filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => Number(a.match(/(\d+)\.xml$/)?.[1] || 0) - Number(b.match(/(\d+)\.xml$/)?.[1] || 0));
    if (!candidates.length)
        throw Error('Excel sin hojas compatibles.');
    const doc = xml(await read(candidates[0]));
    const out = [];
    for (const row of Array.from(doc.getElementsByTagName('row'))) {
        const cells = Array.from(row.getElementsByTagName('c'));
        const result = [];
        for (const cell of cells) {
            const r = cell.getAttribute('r') || '';
            const letters = r.match(/^[A-Z]+/)?.[0] || '';
            let index = 0;
            for (const ch of letters)
                index = index * 26 + (ch.charCodeAt(0) - 64);
            index = Math.max(0, index - 1);
            if (index > 100)
                continue;
            const typ = cell.getAttribute('t');
            let text = cell.getElementsByTagName('v')[0]?.textContent || '';
            if (typ === 's')
                text = strings[Number(text)] || '';
            if (typ === 'inlineStr')
                text = Array.from(cell.getElementsByTagName('t')).map(x => x.textContent || '').join('');
            result[index] = text;
        }
        if (result.some(x => x))
            out.push(Array.from({ length: result.length }, (_, i) => result[i] || ''));
        if (out.length > 25001)
            throw Error('Límite de 25.000 filas en Excel.');
    }
    if (!out.length)
        throw Error('La hoja de Excel está vacía.');
    return out;
}
