import { unwrap } from './crawler.mjs';
import { InputError } from './client-api.mjs';

const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const columns = 'id,title,model,price_min,price_max,currency,moq,images,source_url,dimensions_mm,packing_mm,collected_at,attributes';
function identifier(value, label) {
  if (typeof value !== 'string' || !uuid.test(value)) throw new InputError(`${label} inválido.`);
  return value;
}
async function requireFactory(db, id) {
  identifier(id, 'Identificador da fábrica');
  const factory = unwrap(await db.from('oem_factories').select('id').eq('id', id).maybeSingle());
  if (!factory) throw new InputError('Fábrica não encontrada.', 404);
}
export function createCatalogApi(db) {
  return {
    async lines(factoryId) {
      await requireFactory(db, factoryId);
      const items = unwrap(await db.from('oem_lines').select('id,name,source_url').eq('factory_id', factoryId).order('name').order('id'));
      return { items };
    },
    async ads(factoryId, input = {}) {
      const { page: rawPage = '1', q = '', line_id: lineId } = input;
      if (typeof rawPage !== 'string' || !/^\d+$/.test(rawPage)) throw new InputError('Página inválida.');
      const page = Number(rawPage), size = 24;
      if (!Number.isInteger(page) || page < 1 || page > 100000) throw new InputError('Página inválida.');
      if (typeof q !== 'string' || q.length > 120) throw new InputError('Busca inválida. Use até 120 caracteres.');
      if (lineId !== undefined) identifier(lineId, 'Identificador da linha');
      await requireFactory(db, factoryId);
      if (lineId !== undefined) {
        const line = unwrap(await db.from('oem_lines').select('id').eq('id', lineId).eq('factory_id', factoryId).maybeSingle());
        if (!line) throw new InputError('Linha não encontrada nesta fábrica.', 404);
      }
      let query = db.from('oem_ads').select(columns + (lineId !== undefined ? ',oem_ad_lines!inner(line_id)' : ''), { count: 'exact' }).eq('factory_id', factoryId);
      if (lineId !== undefined) query = query.eq('oem_ad_lines.line_id', lineId);
      if (q) query = query.ilike('title', `%${q.replace(/[\\%_]/g, character => '\\' + character)}%`);
      const result = await query.order('source_url').order('id').range((page - 1) * size, page * size - 1);
      const items = unwrap(result).map(({ oem_ad_lines: _association, ...item }) => item);
      return { items, total: result.count, page, size };
    }
  };
}
// Register only after the server's authenticated-operator middleware.
export function registerCatalogRoutes(app, db, wrap) {
  const catalog = createCatalogApi(db);
  app.get('/api/factories/:id/lines', wrap(async (req, res) => res.json(await catalog.lines(req.params.id))));
  app.get('/api/factories/:id/ads', wrap(async (req, res) => res.json(await catalog.ads(req.params.id, req.query))));
}
