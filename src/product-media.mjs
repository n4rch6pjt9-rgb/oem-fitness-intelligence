import express from 'express';
import { randomUUID } from 'node:crypto';
import { unwrap } from './crawler.mjs';
import { InputError } from './client-api.mjs';

const bucket = 'oem-product-media';
const categories = new Set(['photo','dimensions','construction','colors','accessories','video']);
const extensions = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4'};

export function validateMedia(body, mime, category) {
  if (!categories.has(category) || !Object.hasOwn(extensions, mime)) throw new InputError('Categoria ou formato não permitido.', 400);
  if ((category === 'video') !== (mime === 'video/mp4')) throw new InputError('Use MP4 para vídeo e uma imagem nas outras categorias.', 400);
  const limit = category === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (!Buffer.isBuffer(body) || !body.length || body.length > limit) throw new InputError('Limite: imagens de 10 MB ou vídeo de 50 MB.', 400);
  const matches = mime === 'image/jpeg' ? body.subarray(0,3).equals(Buffer.from([255,216,255]))
    : mime === 'image/png' ? body.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : mime === 'image/webp' ? body.toString('ascii',0,4) === 'RIFF' && body.toString('ascii',8,12) === 'WEBP'
    : body.length >= 12 && body.toString('ascii',4,8) === 'ftyp';
  if (!matches) throw new InputError('O conteúdo não corresponde ao formato informado.', 400);
}

export function mediaUploader(operatorId, testOperatorId) {
  const id = operatorId === 'local-test-operator' ? testOperatorId : operatorId;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    throw new InputError('Configure um usuário Auth válido em OEM_OPERATOR_IDS para testar o envio local.',400);
  }
  return id;
}

export function registerMediaRoutes(app, db, wrap, {testOperatorId = null} = {}) {
  const withUrl = row => ({...row, url: db.storage.from(bucket).getPublicUrl(row.object_path).data.publicUrl});
  app.get('/api/ads/:id/media', wrap(async(req,res) => {
    const rows = unwrap(await db.from('oem_product_media').select('id,category,caption,object_path,mime_type,byte_size,created_at')
      .eq('ad_id',req.params.id).order('created_at').order('id'));
    res.json(rows.map(withUrl));
  }));
  // Limit concurrent buffered uploads across this server.
  let uploads = 0;
  const reserve = (req,res,next) => {
    if (uploads >= 2) return res.status(429).json({error:'Há outros envios em andamento. Aguarde.'});
    uploads++;
    let released = false;
    const release = () => { if (!released) { released = true; uploads--; } };
    res.once('finish',release); res.once('close',release); next();
  };
  app.post('/api/ads/:id/media', reserve, express.raw({type:()=>true,limit:'50mb'}), wrap(async(req,res) => {
    const category = req.query.category;
    const caption = typeof req.query.caption === 'string' ? req.query.caption.trim() : '';
    if (!caption || caption.length > 160) throw new InputError('Informe uma legenda com até 160 caracteres.',400);
    const mime = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    validateMedia(req.body,mime,category);
    const ad = unwrap(await db.from('oem_ads').select('id,factory_id').eq('id',req.params.id).maybeSingle());
    if (!ad) throw new InputError('Produto não encontrado.',404);
    const uploadedBy = mediaUploader(req.operator.id,testOperatorId);
    const id = randomUUID();
    const path = ad.factory_id + '/' + ad.id + '/' + id + '.' + extensions[mime];
    unwrap(await db.storage.from(bucket).upload(path,req.body,{contentType:mime,upsert:false}));
    const saved = await db.from('oem_product_media').insert({id,ad_id:ad.id,category,caption,
      object_path:path,mime_type:mime,byte_size:req.body.length,uploaded_by:uploadedBy})
      .select('id,category,caption,object_path,mime_type,byte_size,created_at').single();
    if (saved.error) {
      const cleanup = await db.storage.from(bucket).remove([path]);
      if (cleanup.error) console.error('Falha ao remover mídia sem registro:',id);
      throw saved.error;
    }
    res.status(201).json(withUrl(saved.data));
  }));
}
