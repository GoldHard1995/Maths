import sharp from 'sharp';

const [source, outputStem] = process.argv.slice(2);
if (!source || !outputStem) throw new Error('Usage: node scripts/process-badge.mjs source output-stem');

const sizes = [128, 64, 48];
for (const size of sizes) {
  const { data, info } = await sharp(source)
    .resize(size, size, { fit: 'contain', kernel: sharp.kernel.nearest })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 3; index < data.length; index += 4) data[index] = data[index] >= 128 ? 255 : 0;

  await sharp(data, { raw: info })
    .png({ palette: true, colours: 64, dither: 0 })
    .toFile(`${outputStem}-${size}.png`);
}
