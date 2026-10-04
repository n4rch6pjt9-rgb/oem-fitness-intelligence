import React, { useEffect, useRef, useState } from "react";
import {
  Factory,
  Layers,
  Dumbbell,
  Tag,
  Info,
  Search,
  ChevronLeft,
  ChevronRight,
  Printer,
  ImageOff,
  Settings,
  Package,
  CreditCard,
} from "lucide-react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "./components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import {
  displayValue,
  fieldLabel,
  classLabel,
  applicationLabel,
  capitalize,
} from "./vocabulary";
interface Evidence {
  field: string;
  value: string;
  source_section: string;
}
interface Extraction {
  product?: {
    name?: string | null;
    brand?: string | null;
    model?: string | null;
  };
  specifications?: Evidence[];
  commercial_terms?: Evidence[];
  images?: { url: string; alt?: string | null }[];
  contextual_variants?: {
    field: string;
    values: { value: string; declared_class?: string | null }[];
  }[];
  usage_classification?: {
    declared_class?: string | null;
    classified_applications?: string[];
  };
}
interface FactoryRecord {
  id: string;
  name: string;
  ads?: number;
  skus?: number;
  queued?: number;
  running?: number;
  errors?: number;
}
interface Line {
  id: string;
  name: string;
  source_url: string;
}
interface Item {
  id: string;
  title: string;
  model: string | null;
  images: string[] | null;
  attributes?: { extraction?: Extraction } | null;
  lines?: { oem_lines: { name: string } | null }[];
}
interface Page {
  items: Item[];
  total: number;
  page: number;
  size: number;
}

interface ListingLink {
  url: string;
  kind: "product" | "listing";
}

interface ListingGroup {
  name: string;
  source_url: string;
}

interface ListingPreview {
  token: string;
  url: string;
  groups: ListingGroup[];
  products: ListingLink[];
  pages: ListingLink[];
  expected_ads: number | null;
  factory_name: string | null;
}

interface ListingSaved {
  lines: Line[];
  products: ListingLink[];
  pages: ListingLink[];
  expected_ads: number | null;
}
class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch("/api" + path, { signal });
  const data: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Consulta indisponível.";
    throw new ApiError(message, response.status);
  }
  return data as T;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch("/api" + path, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Operação indisponível.";
    throw new ApiError(message, response.status);
  }
  return data as T;
}
function productName(item: Item) {
  return (
    displayValue("name", item.attributes?.extraction?.product?.name ?? "") ??
    (item.model
      ? `Equipamento ${item.model}`
      : "Equipamento sem modelo informado")
  );
}
function validPhoto(url: string) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
function Photo({ url, alt }: { url: string | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return url && validPhoto(url) && !failed ? (
    <img
      src={url}
      alt={alt}
      className="h-72 w-full object-contain"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="flex h-72 flex-col items-center justify-center gap-3">
      <ImageOff />
      <p>Imagem indisponível</p>
    </div>
  );
}
function Records({ records }: { records: Evidence[] }) {
  const grouped = new Map<string, string[]>();
  let omitted = 0;
  for (const record of records) {
    const value = displayValue(record.field, record.value);
    if (!value) {
      omitted++;
      continue;
    }
    const values = grouped.get(record.field) ?? [];
    if (!values.includes(value)) values.push(value);
    grouped.set(record.field, values);
  }
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...grouped].map(([field, values]) => (
          <Card key={field}>
            <CardHeader>
              <CardTitle>
                <Badge variant="secondary">
                  <Info data-icon="inline-start" />
                  {fieldLabel(field)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {values.map((value) => (
                <p key={value}>{capitalize(value)}</p>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      {!grouped.size && (
        <p>Nenhuma informação disponível em português nesta seção.</p>
      )}
      {omitted > 0 && (
        <p className="text-sm text-muted-foreground">
          {omitted}{" "}
          {omitted === 1 ? "informação aguarda" : "informações aguardam"}{" "}
          padronização do vocabulário.
        </p>
      )}
    </>
  );
}
function ProductSheet({
  item,
  factory,
  onBack,
}: {
  item: Item;
  factory: string;
  onBack: () => void;
}) {
  const [photo, setPhoto] = useState(0);
  const extraction = item.attributes?.extraction;
  const photos = [
    ...new Set(
      (
        extraction?.images?.map((image) => image.url) ??
        item.images ??
        []
      ).filter(validPhoto),
    ),
  ];
  const usage = extraction?.usage_classification;
  const lines =
    item.lines?.flatMap((line) =>
      line.oem_lines?.name ? [line.oem_lines.name] : [],
    ) ?? [];
  return (
    <section className="flex flex-col gap-6" aria-label="Ficha do equipamento">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft data-icon="inline-start" />
          Voltar ao catálogo
        </Button>
        <Button variant="outline" onClick={() => window.open(`/ficha.html?id=${encodeURIComponent(item.id)}`, "_blank", "noopener,noreferrer")}>
          <Printer data-icon="inline-start" />
          Imprimir ficha
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge>
            <Factory data-icon="inline-start" />
            {factory}
          </Badge>
          <Badge variant="outline">
            <Tag data-icon="inline-start" />
            {item.model ?? "Modelo não informado"}
          </Badge>
          {lines.map((line) => (
            <Badge variant="secondary" key={line}>
              <Layers data-icon="inline-start" />
              {line}
            </Badge>
          ))}
        </div>
        <h2 className="text-3xl font-semibold">{productName(item)}</h2>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <Badge variant="outline">
                <Dumbbell data-icon="inline-start" />
                Equipamento
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Photo url={photos[photo]} alt={productName(item)} />
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            {photos.map((url, index) => (
              <Button
                key={url}
                variant={photo === index ? "secondary" : "outline"}
                aria-pressed={photo === index}
                onClick={() => setPhoto(index)}
              >
                Foto {index + 1}
              </Button>
            ))}
            {photos.length < 2 && (
              <p className="text-sm text-muted-foreground">
                {photos.length === 0
                  ? "Nenhuma foto disponível."
                  : "Somente uma foto disponível."}
              </p>
            )}
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <Badge>
                <Dumbbell data-icon="inline-start" />
                {classLabel(usage?.declared_class ?? null)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {usage?.classified_applications?.map((application) => (
              <Badge key={application} variant="outline">
                <Factory data-icon="inline-start" />
                {applicationLabel(application)}
              </Badge>
            ))}
            {!usage?.classified_applications?.length && (
              <p>Aplicação não informada.</p>
            )}
          </CardContent>
        </Card>
      </div>
      {!extraction ? (
        <Card>
          <CardHeader>
            <CardTitle>Ficha técnica ainda não disponível</CardTitle>
          </CardHeader>
          <CardContent>
            O registro existe no catálogo, mas a extração detalhada ainda não
            foi registrada. Nenhum dado de exemplo foi usado.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {extraction.contextual_variants?.map((group) => (
              <Card key={group.field}>
                <CardHeader>
                  <CardTitle>
                    <Badge variant="outline">
                      <Settings data-icon="inline-start" />
                      {fieldLabel(group.field)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {group.values.map((variant, index) => (
                    <div
                      className="flex flex-col items-start gap-2"
                      key={index}
                    >
                      <Badge variant="secondary">
                        <Layers data-icon="inline-start" />
                        {variant.declared_class
                          ? classLabel(variant.declared_class)
                          : `Configuração ${index + 1}`}
                      </Badge>
                      <p>
                        {displayValue(group.field, variant.value) ??
                          "Valor aguarda padronização"}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
          <Tabs defaultValue="technical">
            <TabsList>
              <TabsTrigger value="technical">
                <Settings />
                Ficha técnica
              </TabsTrigger>
              <TabsTrigger value="commercial">
                <CreditCard />
                Condições comerciais
              </TabsTrigger>
            </TabsList>
            <TabsContent value="technical">
              <Records
                records={(extraction.specifications ?? []).filter(
                  (record) =>
                    !extraction.contextual_variants?.some(
                      (variant) => variant.field === record.field,
                    ),
                )}
              />
            </TabsContent>
            <TabsContent value="commercial">
              <Records records={extraction.commercial_terms ?? []} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </section>
  );
}
export function CatalogApp() {
  const [factories, setFactories] = useState<FactoryRecord[]>([]);
  const [factory, setFactory] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [line, setLine] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [detail, setDetail] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [linesLoading, setLinesLoading] = useState(false);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [revision, setRevision] = useState(0);
  const [captureUrl, setCaptureUrl] = useState("");
  const [captureHtml, setCaptureHtml] = useState("");
  const [capturePreview, setCapturePreview] = useState<ListingPreview | null>(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [captureSaved, setCaptureSaved] = useState<ListingSaved | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      detailRequest.current?.abort();
    },
    [factory, line, page, query, revision, unauthorized],
  );
  function fail(error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    if (error instanceof ApiError && error.status === 401) {
      setUnauthorized(true);
      setData(null);
      setDetail(null);
    }
    setError(error instanceof Error ? error.message : "Consulta indisponível.");
  }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setUnauthorized(false);
    api<FactoryRecord[]>("/factories", controller.signal)
      .then((records) => {
        setFactories(records);
        setFactory((current) =>
          records.some((record) => record.id === current)
            ? current
            : (records[0]?.id ?? ""),
        );
      })
      .catch(fail)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    setLines([]);
    setLine("");
    setPage(1);
    setData(null);
    setDetail(null);
    if (!factory) return;
    const controller = new AbortController();
    setLinesLoading(true);
    api<{ items: Line[] }>(`/factories/${factory}/lines`, controller.signal)
      .then((result) => setLines(result.items))
      .catch(fail)
      .finally(() => {
        if (!controller.signal.aborted) setLinesLoading(false);
      });
    return () => controller.abort();
  }, [factory, revision]);
  useEffect(() => {
    if (!factory || unauthorized) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    const params = new URLSearchParams({ page: String(page), q: query });
    if (line) params.set("line_id", line);
    api<Page>(`/factories/${factory}/ads?${params}`, controller.signal)
      .then(setData)
      .catch(fail)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [factory, line, page, query, revision, unauthorized]);
  async function openItem(id: string) {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setLoading(true);
    setError("");
    try {
      const item = await api<Item>(`/ads/${id}`, controller.signal);
      if (!controller.signal.aborted) setDetail(item);
    } catch (error) {
      fail(error);
    } finally {
      setLoading(false);
    }
  }
  async function previewListingCapture() {
    if (!factory || !captureUrl.trim() || !captureHtml.trim()) return;
    setCaptureBusy(true);
    setCaptureError("");
    setCaptureSaved(null);
    try {
      const result = await apiPost<ListingPreview>(
        `/factories/${factory}/assisted/listing/preview`,
        {url: captureUrl.trim(), html: captureHtml},
      );
      setCapturePreview(result);
    } catch (error) {
      setCapturePreview(null);
      setCaptureError(
        error instanceof Error ? error.message : "Não foi possível analisar a página.",
      );
    } finally {
      setCaptureBusy(false);
    }
  }

  async function saveListingCapture() {
    if (!factory || !capturePreview) return;
    setCaptureBusy(true);
    setCaptureError("");
    try {
      const result = await apiPost<ListingSaved>(
        `/factories/${factory}/assisted/listing/save`,
        {token: capturePreview.token},
      );
      setCaptureSaved(result);
      setCapturePreview(null);
      setRevision((value) => value + 1);
    } catch (error) {
      setCaptureError(
        error instanceof Error ? error.message : "Não foi possível confirmar a descoberta.",
      );
    } finally {
      setCaptureBusy(false);
    }
  }

  const currentFactory = factories.find((record) => record.id === factory);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-3">
            <Factory />
            <h1 className="text-xl font-semibold">Catálogo de equipamentos</h1>
          </div>
          <Button asChild variant="outline">
            <a href="/">Operação de coleta</a>
          </Button>
        </div>
      </header>
      <main className="mx-auto flex max-w-[1600px] flex-col gap-6 p-5 lg:p-8">
        {unauthorized ? (
          <Card>
            <CardHeader>
              <CardTitle>Acesso do operador necessário</CardTitle>
            </CardHeader>
            <CardContent>
              Entre para consultar o catálogo da operação.
            </CardContent>
            <CardFooter>
              <Button asChild>
                <a href="/?next=catalog">Entrar no catálogo</a>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <>
            {error && (
              <Card>
                <CardHeader>
                  <CardTitle>Não foi possível concluir a consulta</CardTitle>
                </CardHeader>
                <CardContent>
                  <p role="alert">{error}</p>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    onClick={() => setRevision((value) => value + 1)}
                  >
                    Tentar novamente
                  </Button>
                </CardFooter>
              </Card>
            )}
            {detail ? (
              <ProductSheet
                key={detail.id}
                item={detail}
                factory={currentFactory?.name ?? "Fábrica"}
                onBack={() => setDetail(null)}
              />
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Badge>
                        <Factory data-icon="inline-start" />
                        Fábricas e linhas
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      className="flex flex-wrap items-end gap-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        setPage(1);
                        setQuery(search.trim());
                      }}
                    >
                      <label
                        className="flex flex-col gap-2"
                        htmlFor="catalog-factory"
                      >
                        Fábrica
                        <select
                          id="catalog-factory"
                          className="rounded-md border bg-background p-2"
                          value={factory}
                          disabled={!factories.length || loading}
                          onChange={(event) => {
                            setFactory(event.target.value);
                            setLine("");
                            setPage(1);
                            setQuery("");
                            setSearch("");
                            setCaptureUrl("");
                            setCaptureHtml("");
                            setCapturePreview(null);
                            setCaptureSaved(null);
                            setCaptureError("");
                          }}
                        >
                          {!factories.length && (
                            <option value="">Nenhuma fábrica</option>
                          )}
                          {factories.map((record) => (
                            <option key={record.id} value={record.id}>
                              {record.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label
                        className="flex flex-col gap-2"
                        htmlFor="catalog-line"
                      >
                        Linha de produtos
                        <select
                          id="catalog-line"
                          className="rounded-md border bg-background p-2"
                          value={line}
                          disabled={!factory || linesLoading || loading}
                          onChange={(event) => {
                            setLine(event.target.value);
                            setPage(1);
                          }}
                        >
                          <option value="">Todas as linhas</option>
                          {lines.map((record) => (
                            <option key={record.id} value={record.id}>
                              {record.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label
                        className="flex flex-col gap-2"
                        htmlFor="catalog-search"
                      >
                        Título do produto
                        <input
                          id="catalog-search"
                          className="rounded-md border bg-background p-2"
                          type="search"
                          maxLength={120}
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Buscar equipamento"
                        />
                      </label>
                      <Button disabled={!factory || loading}>
                        <Search data-icon="inline-start" />
                        Buscar
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                {factory && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Coleta assistida da listagem</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <p className="text-sm text-muted-foreground">
                        Cole a URL e o HTML capturado no navegador. A prévia não grava dados.
                      </p>

                      <label className="flex flex-col gap-2" htmlFor="listing-url">
                        URL da listagem
                        <input
                          id="listing-url"
                          className="rounded-md border bg-background p-2"
                          type="url"
                          value={captureUrl}
                          onChange={(event) => {
                            setCaptureUrl(event.target.value);
                            setCapturePreview(null);
                            setCaptureSaved(null);
                          }}
                          placeholder="https://...made-in-china.com/productList?..."
                        />
                      </label>

                      <label className="flex flex-col gap-2" htmlFor="listing-html">
                        HTML capturado
                        <textarea
                          id="listing-html"
                          className="min-h-48 rounded-md border bg-background p-3 font-mono text-xs"
                          value={captureHtml}
                          onChange={(event) => {
                            setCaptureHtml(event.target.value);
                            setCapturePreview(null);
                            setCaptureSaved(null);
                          }}
                          placeholder="Cole aqui o HTML completo da página."
                        />
                      </label>

                      {captureError && <p role="alert">{captureError}</p>}

                      <div>
                        <Button
                          type="button"
                          disabled={
                            captureBusy ||
                            !captureUrl.trim() ||
                            !captureHtml.trim()
                          }
                          onClick={() => void previewListingCapture()}
                        >
                          {captureBusy ? "Analisando…" : "Analisar página"}
                        </Button>
                      </div>

                      {capturePreview && (
                        <div className="flex flex-col gap-4 rounded-lg border p-4">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">
                              {capturePreview.expected_ads === null
                                ? "Cobertura não informada"
                                : `${capturePreview.expected_ads} produtos declarados`}
                            </Badge>
                            <Badge variant="outline">
                              {capturePreview.groups.length} linhas encontradas
                            </Badge>
                            <Badge variant="outline">
                              {capturePreview.products.length} produtos nesta página
                            </Badge>
                            <Badge variant="outline">
                              {capturePreview.pages.length} páginas restantes
                            </Badge>
                          </div>

                          {capturePreview.groups.length > 0 && (
                            <div>
                              <p className="mb-2 font-semibold">Linhas</p>
                              <div className="flex flex-wrap gap-2">
                                {capturePreview.groups.map((group) => (
                                  <Badge key={group.source_url} variant="outline">
                                    {group.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {capturePreview.products.length > 0 && (
                            <div>
                              <p className="mb-2 font-semibold">Produtos encontrados</p>
                              <ul className="space-y-2 text-sm">
                                {capturePreview.products.slice(0, 10).map((product) => (
                                  <li key={product.url} className="break-all">
                                    {product.url}
                                  </li>
                                ))}
                              </ul>
                              {capturePreview.products.length > 10 && (
                                <p className="mt-2 text-sm text-muted-foreground">
                                  + {capturePreview.products.length - 10} produtos
                                </p>
                              )}
                            </div>
                          )}

                          <div>
                            <Button
                              type="button"
                              disabled={captureBusy}
                              onClick={() => void saveListingCapture()}
                            >
                              {captureBusy
                                ? "Confirmando…"
                                : "Confirmar descoberta"}
                            </Button>
                          </div>
                        </div>
                      )}

                      {captureSaved && (
                        <p role="status" className="text-sm">
                          Descoberta confirmada: {captureSaved.lines.length} linhas,{" "}
                          {captureSaved.products.length} produtos e{" "}
                          {captureSaved.pages.length} páginas restantes identificadas.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {loading && (
                  <p role="status" aria-live="polite">
                    Carregando catálogo…
                  </p>
                )}
                {!loading && !error && !factories.length && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Nenhuma fábrica cadastrada</CardTitle>
                    </CardHeader>
                    <CardContent>
                      Cadastre uma loja e inicie a coleta pela tela de operação.
                    </CardContent>
                  </Card>
                )}
                {currentFactory && (
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="outline">
                      <Factory data-icon="inline-start" />
                      {currentFactory.name}
                    </Badge>
                    <Badge variant="secondary">
                      <Package data-icon="inline-start" />
                      {loading
                        ? "Consultando total…"
                        : data
                          ? `${data.total} Registros`
                          : "Total indisponível"}
                    </Badge>
                    {Number(currentFactory.errors) > 0 && (
                      <Badge variant="outline">
                        <Info data-icon="inline-start" />
                        {currentFactory.errors} Páginas com erro
                      </Badge>
                    )}
                  </div>
                )}
                {!loading && data?.items.length === 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Nenhum equipamento encontrado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      Revise a busca e a linha selecionada. Se a coleta ainda
                      estiver pendente, acompanhe a fila na operação.
                    </CardContent>
                  </Card>
                )}
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {data?.items.map((item) => (
                    <Card key={item.id}>
                      <CardHeader>
                        <CardTitle>
                          <Badge variant="outline">
                            <Tag data-icon="inline-start" />
                            {item.model ?? "Modelo não informado"}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        <Photo url={item.images?.[0]} alt={productName(item)} />
                        <h2 className="font-semibold">{productName(item)}</h2>
                        <Badge variant="secondary">
                          <Dumbbell data-icon="inline-start" />
                          {classLabel(
                            item.attributes?.extraction?.usage_classification
                              ?.declared_class ?? null,
                          )}
                        </Badge>
                      </CardContent>
                      <CardFooter>
                        <Button
                          variant="outline"
                          disabled={loading}
                          onClick={() => void openItem(item.id)}
                        >
                          Abrir ficha
                          <ChevronRight data-icon="inline-end" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                {data && data.total > 0 && (
                  <nav
                    aria-label="Paginação do catálogo"
                    className="flex flex-wrap items-center gap-3"
                  >
                    <Button
                      variant="outline"
                      disabled={page === 1 || loading}
                      onClick={() => setPage((value) => value - 1)}
                    >
                      <ChevronLeft data-icon="inline-start" />
                      Anterior
                    </Button>
                    <span>
                      Página {page} de {pages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={page >= pages || loading}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Próxima
                      <ChevronRight data-icon="inline-end" />
                    </Button>
                  </nav>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
