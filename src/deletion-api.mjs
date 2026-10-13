import {InputError} from './client-api.mjs';
import {unwrap} from './crawler.mjs';
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
function id(value){if(typeof value!=='string'||!uuid.test(value))throw new InputError('Identificador inválido.');return value;}
export function createDeletionApi(db){
  async function change(table,identifier,restore,scope={}){
    let query=db.from(table).update({deleted_at:restore?null:new Date().toISOString()}).eq('id',id(identifier));
    for(const [key,value] of Object.entries(scope))query=query.eq(key,id(value));
    query=restore?query.not('deleted_at','is',null):query.is('deleted_at',null);
    if(table==='oem_pages')query=query.neq('state','running');
    const row=unwrap(await query.select('id,deleted_at').maybeSingle());
    if(!row)throw new InputError(table==='oem_pages'?'Item indisponível ou em execução.':'Registro não encontrado nesta seleção.',table==='oem_pages'?409:404);
    return row;
  }
  return {
    product:(identifier,restore=false)=>change('oem_ads',identifier,restore),
    media:(adId,identifier,restore=false)=>change('oem_product_media',identifier,restore,{ad_id:adId}),
    queue:(factoryId,identifier,restore=false)=>change('oem_pages',identifier,restore,{factory_id:factoryId}),
  };
}
export function registerDeletionRoutes(app,db,wrap){
  const api=createDeletionApi(db);
  app.delete('/api/ads/:id',wrap(async(req,res)=>res.json(await api.product(req.params.id))));
  app.post('/api/ads/:id/restore',wrap(async(req,res)=>res.json(await api.product(req.params.id,true))));
  app.delete('/api/ads/:id/media/:mediaId',wrap(async(req,res)=>res.json(await api.media(req.params.id,req.params.mediaId))));
  app.post('/api/ads/:id/media/:mediaId/restore',wrap(async(req,res)=>res.json(await api.media(req.params.id,req.params.mediaId,true))));
  app.delete('/api/factories/:id/pages/:pageId',wrap(async(req,res)=>res.json(await api.queue(req.params.id,req.params.pageId))));
  app.post('/api/factories/:id/pages/:pageId/restore',wrap(async(req,res)=>res.json(await api.queue(req.params.id,req.params.pageId,true))));
}