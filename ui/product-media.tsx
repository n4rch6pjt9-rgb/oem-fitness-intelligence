import React, { useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";

export interface ProductMedia {
  id: string;
  category: string;
  caption: string;
  mime_type: string;
  url: string;
}
const categories = [
  ["photo","Foto do equipamento"], ["dimensions","Imagem das medidas"],
  ["construction","Detalhes de construção"], ["colors","Cores"],
  ["accessories","Acessórios"], ["details","Detalhes da máquina"],
  ["description","Descrição do produto"], ["delivery","Despacho do produto"],
  ["video","Vídeo de demonstração"],
];

export function MediaUpload({adId}: {adId: string}) {
  const [trash,setTrash] = useState(false);
  const [revision,setRevision] = useState(0);
  const [media,setMedia] = useState<ProductMedia[]>([]);
  const [category,setCategory] = useState("photo");
  const [caption,setCaption] = useState("");
  const [file,setFile] = useState<File | null>(null);
  const [published,setPublished] = useState(false);
  const [busy,setBusy] = useState(false);
  const [loaded,setLoaded] = useState(false);
  const [error,setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/ads/" + adId + "/media?deleted=" + trash,{signal:controller.signal})
      .then(async response => {
        if (!response.ok) throw new Error("Não foi possível consultar as mídias.");
        return response.json() as Promise<ProductMedia[]>;
      })
      .then(items => {setMedia(items); setLoaded(true);})
      .catch(reason => {if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Consulta indisponível.");});
    return () => controller.abort();
  },[adId,trash,revision]);
  async function upload() {
    if (!file || !caption.trim() || !published || busy) return;
    const limit = category === "video" ? 50 : 10;
    if (file.size > limit * 1024 * 1024) {setError("O limite para este arquivo é " + limit + " MB."); return;}
    setBusy(true); setError("");
    try {
      const query = new URLSearchParams({category,caption:caption.trim()});
      const response = await fetch("/api/ads/" + adId + "/media?" + query,{
        method:"POST",headers:{"Content-Type":file.type || "application/octet-stream"},body:file,
      });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "Falha no envio.");
      setMedia(items => [...items,data as ProductMedia]);
      setFile(null); setCaption(""); setPublished(false);
      if (input.current) input.current.value = "";
    } catch(reason) {setError(reason instanceof Error ? reason.message : "Falha no envio.");}
    finally {setBusy(false);}
  }
  async function remove(item: ProductMedia) {
    if (!trash && !window.confirm('Excluir este arquivo da ficha? Ele ficará na lixeira e poderá ser restaurado.')) return;
    setBusy(true); setError('');
    try {
      const response=await fetch('/api/ads/'+adId+'/media/'+item.id+(trash?'/restore':''),{method:trash?'POST':'DELETE'});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error ?? 'Operação indisponível.');
      setRevision(value=>value+1);
    } catch(reason){setError(reason instanceof Error?reason.message:'Falha na operação.');}
    finally{setBusy(false);}
  }
  return <Card>
    <CardHeader><CardTitle>Imagens e vídeo da ficha</CardTitle></CardHeader>
    <CardContent className="flex flex-col gap-4">
      <p>Selecione arquivos revisados para apresentar ao comprador. Imagens: JPG, PNG ou WebP até 10 MB. Vídeo: MP4 até 50 MB.</p>
      <label className="flex flex-col gap-2">Tipo de conteúdo
        <select className="rounded-md border p-2" value={category} disabled={busy} onChange={event => {setCategory(event.target.value);setFile(null);if(input.current)input.current.value="";}}>
          {categories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-2">Legenda
        <input className="rounded-md border p-2" maxLength={160} value={caption} disabled={busy} onChange={event => setCaption(event.target.value)}/>
      </label>
      <label className="flex flex-col gap-2">Arquivo
        <input ref={input} type="file" disabled={busy} accept={category === "video" ? "video/mp4" : "image/jpeg,image/png,image/webp"} onChange={event => setFile(event.target.files?.[0] ?? null)}/>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={published} disabled={busy} onChange={event => setPublished(event.target.checked)}/>
        Este arquivo pode ser disponibilizado ao comprador por link público.
      </label>
      {error && <p role="alert">{error}</p>}
      <Button type="button" disabled={trash || !loaded || busy || !file || !caption.trim() || !published} onClick={() => void upload()}>
        {busy ? "Enviando…" : "Enviar para a ficha"}
      </Button>
      {loaded && <p role="status">{media.length} arquivos disponíveis na ficha.</p>}
      <Button type="button" variant="outline" disabled={busy} onClick={()=>setTrash(value=>!value)}>{trash?"Ver arquivos ativos":"Lixeira de arquivos"}</Button>
      <ul className="space-y-2">
        {media.map(item => <li key={item.id}><a href={item.url} target="_blank" rel="noopener noreferrer" className="underline">{item.caption}</a><Button type="button" variant="outline" disabled={busy} onClick={()=>void remove(item)}>{trash?"Restaurar":"Excluir arquivo"}</Button></li>)}
      </ul>
    </CardContent>
  </Card>;
}
