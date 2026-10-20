export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
export async function prepareAvatar(file) {
 if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Pilih foto JPG, PNG, atau WebP.');
 if (!file.size || file.size > MAX_PHOTO_SIZE) throw new Error('Ukuran foto maksimal 5 MB.');
 const url = URL.createObjectURL(file);
 try {
  const image = new Image(); image.src = url; await image.decode();
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('Resolusi foto terlalu besar. Pilih foto maksimal 40 megapiksel.');
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Browser belum mendukung pemrosesan foto.');
  context.fillStyle = '#ffffff'; context.fillRect(0,0,256,256);
  const side = Math.min(image.naturalWidth,image.naturalHeight);
  context.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,256,256);
  const data = canvas.toDataURL('image/jpeg',0.82); const encoded = data.split(',')[1];
  if (!encoded || encoded.length > 699052) throw new Error('Foto terlalu besar setelah diproses. Pilih foto lain.');
  return { preview: data, encoded };
 } catch(error) {
  if (error.message.startsWith('Resolusi') || error.message.startsWith('Browser') || error.message.startsWith('Foto terlalu')) throw error;
  throw new Error('Foto tidak dapat dibaca. Pilih file gambar yang valid.', { cause: error });
 } finally { URL.revokeObjectURL(url); }
}
