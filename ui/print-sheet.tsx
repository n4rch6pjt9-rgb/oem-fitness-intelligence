import React, { useEffect, useState } from 'react';
import { Printer, ChevronLeft } from 'lucide-react';
import { Button } from './components/ui/button';
import {
  displayValue,
  fieldLabel,
  classLabel,
  applicationLabel,
  sourceSectionLabel,
} from './vocabulary';

interface Evidence {
  field: string;
  value: string;
  source_section: string;
}

interface Conflict {
  field: string;
  values: Evidence[];
}

interface ProductMedia {
  id: string;
  category: string;
  caption: string;
  mime_type: string;
  url: string;
}

interface Product {
  media?: ProductMedia[];
  id: string;
  factory_id: string;
  model: string | null;
  images: string[] | null;
  lines?: { oem_lines: { name: string } | null }[];
  attributes?: {
    extraction?: {
      product?: {
        name?: string | null;
        brand?: string | null;
      };
      specifications?: Evidence[];
      commercial_terms?: Evidence[];
      images?: { url: string }[];

      // Mantido temporariamente para compatibilidade com registros antigos.
      // Conflitos técnicos novos não devem ser promovidos a variantes.
      contextual_variants?: {
        field: string;
        values: {
          value: string;
          declared_class?: string | null;
        }[];
      }[];

      conflicts?: Conflict[];

      usage_classification?: {
        declared_class?: string | null;
        classified_applications?: string[];
      };
    };
  };
}

function rows(records: Evidence[]) {
  const grouped = new Map<string, string[]>();

  for (const record of records) {
    const value = displayValue(record.field, record.value);

    if (!value) continue;

    const values = grouped.get(record.field) ?? [];

    if (!values.includes(value)) {
      values.push(value);
    }

    grouped.set(record.field, values);
  }

  return [...grouped];
}

function Table({ data }: { data: [string, string[]][] }) {
  return (
    <table className="sheet-table">
      <thead>
        <tr>
          <th>Informação</th>
          <th>Especificação</th>
        </tr>
      </thead>
      <tbody>
        {data.map(([field, values]) => (
          <tr key={field}>
            <th scope="row">{fieldLabel(field)}</th>
            <td>
              {values.map((value, index) => (
                <div key={`${index}-${value}`}>
                  {values.length > 1 && (
                    <span style={{
                      display: "inline-block",
                      background: "#f5f5f4",
                      borderRadius: "4px",
                      padding: "1px 4px",
                      marginRight: "5px",
                      fontWeight: 600
                    }}>
                      Contexto {index + 1}
                    </span>
                  )}
                  {value}
                </div>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ConflictsTable({ conflicts }: { conflicts: Conflict[] }) {
  return (
    <table className="sheet-table">
      <thead>
        <tr>
          <th>Característica</th>
          <th>Origem</th>
          <th>Valor declarado</th>
        </tr>
      </thead>

      <tbody>
        {conflicts.flatMap((conflict) =>
          conflict.values.map((evidence, index) => (
            <tr
              key={`${conflict.field}-${evidence.source_section}-${index}`}
            >
              <th scope="row">{fieldLabel(conflict.field)}</th>

              <td>
                {evidence.source_section
                  ? sourceSectionLabel(evidence.source_section)
                  : 'Bloco de origem n?o informado'}
              </td>

              <td>
                {displayValue(conflict.field, evidence.value) ??
                  'Valor aguarda padronização'}
              </td>
            </tr>
          )),
        )}
      </tbody>
    </table>
  );
}

export function PrintSheetApp() {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [failedPhotos, setFailedPhotos] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const id = new URLSearchParams(location.search).get('id');

    if (
      !id ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
    ) {
      setError('Selecione um equipamento válido no catálogo.');
      return;
    }

    void fetch('/api/ads/' + id, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? 'Entre como operador para abrir a ficha.'
              : 'Não foi possível carregar a ficha.',
          );
        }

        const item: Product = await response.json();

        if (!item.attributes?.extraction) {
          throw new Error(
            'A ficha técnica deste equipamento ainda não está disponível.',
          );
        }

        const mediaResponse = await fetch('/api/ads/' + id + '/media', {signal:controller.signal});
        if (!mediaResponse.ok) throw new Error('Não foi possível carregar as mídias da ficha.');
        item.media = await mediaResponse.json() as ProductMedia[];
        setProduct(item);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Ficha indisponível.',
          );
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!product) return;

    const images = [
      ...document.querySelectorAll<HTMLImageElement>('.sheet-photo'),
    ];

    const timeout = setTimeout(() => setReady(true), 10000);

    void Promise.all(
      images.map((image) =>
        image.decode().catch(() => {
          setFailedPhotos((values) =>
            values.includes(image.src)
              ? values
              : [...values, image.src],
          );
        }),
      ),
    ).then(() => {
      clearTimeout(timeout);
      setReady(true);
    });

    return () => clearTimeout(timeout);
  }, [product]);

  const extraction = product?.attributes?.extraction;

  const name =
    displayValue('name', extraction?.product?.name ?? '') ??
    `Equipamento ${product?.model ?? ''}`;

  useEffect(() => {
    if (product) {
      document.title = `Ficha - ${product.model ?? 'Equipamento'} - ${name}`;
    }
  }, [product, name]);

  if (error) {
    return (
      <main className="p-8">
        <p role="alert">{error}</p>
        <a href="/catalogo.html">Voltar ao catálogo</a>
      </main>
    );
  }

  if (!product || !extraction) {
    return (
      <p role="status" className="p-8">
        Preparando ficha…
      </p>
    );
  }

  const photos = [
    ...new Set(
      extraction.images?.map((image) => image.url) ??
        product.images ??
        [],
    ),
  ]
    .filter((url) => {
      try {
        return new URL(url).protocol === 'https:';
      } catch {
        return false;
      }
    })
    .slice(0, 2);

  /*
   * Regra de proveniência:
   *
   * conflitos representam declarações incompatíveis encontradas na fonte.
   * Eles NÃO provam a existência de configurações físicas diferentes.
   *
   * contextual_variants permanece no contrato apenas para compatibilidade
   * com registros antigos. O extrator atual não promove conflitos técnicos
   * automaticamente para esse campo.
   */
  const technical = rows(
    (extraction.specifications ?? []).filter(
      (row) =>
        ![
          'model',
          'name',
          'brand',
          'features',
          'faq_q5',
          'faq_q6',
        ].includes(row.field),
    ),
  );

  const middle = Math.ceil(technical.length / 2);

  const complementary = rows(
    (extraction.specifications ?? []).filter((row) =>
      ['features', 'faq_q5', 'faq_q6'].includes(row.field),
    ),
  );

  const terms = rows(extraction.commercial_terms ?? []);
  const usage = extraction.usage_classification;

  const imageMedia = (product.media ?? []).filter(item => item.mime_type.startsWith('image/'));
  const uploadedPhotos = imageMedia.filter(item => item.category === 'photo');
  const gallery = [
    ...(uploadedPhotos.length ? uploadedPhotos : photos.map((url,index) => ({
      id:url, url, caption:'Foto ' + (index + 1), category:'photo', mime_type:'image/jpeg',
    }))),
    ...imageMedia.filter(item => item.category !== 'photo'),
  ];
  const mediaPages: typeof gallery[] = [];
  for (let index = 0; index < gallery.length; index += 2) mediaPages.push(gallery.slice(index,index + 2));
  const videos = (product.media ?? []).filter(item => item.category === 'video');
  const videoPages: ProductMedia[][] = [];
  for (let index = 0; index < videos.length; index += 8) videoPages.push(videos.slice(index,index + 8));
  const totalPages = 2 + mediaPages.length + videoPages.length;



  const header = (section: string) => (
    <header className="sheet-header">
      <div>
        <strong>OEM · Inteligência Fitness</strong>
        <p>Ficha do equipamento</p>
      </div>

      <span>{section}</span>
    </header>
  );

  const footer = (page: number) => (
    <footer className="sheet-footer">
      <span>
        {extraction.product?.brand ?? 'Fabricante não informado'} ·{' '}
        {product.model ?? 'Modelo não informado'}
      </span>

      <span>Página {page} de {totalPages}</span>
    </footer>
  );

  return (
    <main className="print-document">
      <div className="sheet-toolbar">
        <Button
          variant="outline"
          onClick={() => window.close()}
        >
          <ChevronLeft />
          Fechar ficha
        </Button>

        <Button
          disabled={!ready}
          onClick={() => window.print()}
        >
          <Printer />
          {ready
            ? 'Imprimir / Salvar PDF'
            : 'Preparando imagens…'}
        </Button>
      </div>

      <article
        className="sheet-page"
        aria-label="Ficha técnica para impressão"
      >
        {header('01 / Ficha técnica')}

        <div className="sheet-identity">
          <h1>{name}</h1>

          <p>
            <strong>
              Modelo {product.model ?? 'Não informado'}
            </strong>
            {' · '}
            {extraction.product?.brand ?? 'Marca não informada'}
            {' · '}
            {(product.lines ?? [])
              .flatMap((line) =>
                line.oem_lines?.name
                  ? [line.oem_lines.name]
                  : [],
              )
              .join(' / ') || 'Linha não informada'}
          </p>

          <p>
            {classLabel(usage?.declared_class ?? null)}

            {usage?.classified_applications?.length
              ? ' · ' +
                usage.classified_applications
                  .map(applicationLabel)
                  .join(' · ')
              : ''}
          </p>
        </div>

        <section>
          <h2>Especificações do equipamento</h2>

          <div className="sheet-columns">
            <Table data={technical.slice(0, middle)} />
            <Table data={technical.slice(middle)} />
          </div>

          {!technical.length && (
            <p>Especificações não informadas.</p>
          )}
        </section>

        {footer(1)}
      </article>

      {mediaPages.map((images,index) => (
        <article key={'media-' + index} className="sheet-page" aria-label="Imagens do equipamento">
          {header(String(index + 2).padStart(2,'0') + ' / Imagens do equipamento')}
          <div className="sheet-identity"><h1>{name}</h1><p>Modelo {product.model ?? 'Não informado'}</p></div>
          {images.map(image => (
            <figure key={image.id}>
              {failedPhotos.includes(image.url) ? <p>Imagem indisponível</p> : (
                <img className="sheet-photo" src={image.url} alt={image.caption}
                  style={{width:'100%',height:'85mm',objectFit:'contain'}} />
              )}
              <figcaption>{image.caption}</figcaption>
            </figure>
          ))}
          {footer(index + 2)}
        </article>
      ))}

      {videoPages.map((items,index) => {
        const page = mediaPages.length + index + 2;
        return (
          <article key={'videos-' + index} className="sheet-page" aria-label="Vídeos do equipamento">
            {header(String(page).padStart(2,'0') + ' / Vídeos do equipamento')}
            <div className="sheet-identity"><h1>{name}</h1><p>Modelo {product.model ?? 'Não informado'}</p></div>
            <section>
              <h2>Demonstrações em vídeo</h2>
              {items.map(video => (
                <p key={video.id} style={{marginBottom:'8mm',overflowWrap:'anywhere'}}>
                  <a href={video.url} target="_blank" rel="noopener noreferrer">Abrir vídeo: {video.caption}</a>
                </p>
              ))}
            </section>
            {footer(page)}
          </article>
        );
      })}

      <article
        className="sheet-page"
        aria-label="Condições comerciais para impressão"
      >
        {header(String(totalPages).padStart(2,'0') + ' / Condições comerciais')}

        <div className="sheet-identity">
          <h1>{name}</h1>

          <p>
            Modelo {product.model ?? 'Não informado'} ·{' '}
            {extraction.product?.brand ?? 'Marca não informada'}
          </p>
        </div>

        <section>
          <h2>Condições comerciais</h2>

          {terms.length ? (
            <Table data={terms} />
          ) : (
            <p>Condições comerciais não informadas.</p>
          )}
        </section>

        <section>
          <h2>Características e serviços</h2>

          {complementary.length ? (
            <Table data={complementary} />
          ) : (
            <p>Informações complementares não disponíveis.</p>
          )}
        </section>

        <p className="sheet-note">Os valores foram preservados por contexto. Informações ausentes permanecem não informadas.</p>

        {footer(totalPages)}
      </article>
    </main>
  );
}