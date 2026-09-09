import sharp from 'sharp';

const [source, destination, rawSize] = process.argv.slice(2);
const size = Number(rawSize);
if (!source || !destination || ![128, 64, 48].includes(size)) throw new Error('Usage: resize-badge.mjs source destination 128|64|48');

const { data, info } = await sharp(source).resize(size, size, { kernel: sharp.kernel.nearest }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const outline = [[0.00,.43,.57],[.08,.39,.61],[.15,.34,.66],[.22,.28,.72],[.29,.18,.82],[.36,.12,.88],[.66,.12,.88],[.73,.18,.82],[.80,.25,.75],[.87,.33,.67],[.94,.41,.59],[1.01,.47,.53]];
for (let y = 0; y < info.height; y++) {
  const ratio = y / info.height;
  const band = outline.find(([, , ,], index) => ratio < outline[index][0]) || outline[outline.length - 1];
  const min = Math.floor(band[1] * info.width), max = Math.ceil(band[2] * info.width);
  for (let x = 0; x < info.width; x++) if (x < min || x > max) data[(y * info.width + x) * 4 + 3] = 0;
}
await sharp(data, { raw: info }).png({ palette: true, colours: 128 }).toFile(destination);
