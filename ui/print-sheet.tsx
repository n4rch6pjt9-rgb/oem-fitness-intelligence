import React, { useEffect, useState } from 'react';
import { Printer, ChevronLeft } from 'lucide-react';
import { Button } from './components/ui/button';
import { displayValue, fieldLabel, classLabel, applicationLabel } from './vocabulary';
interface Evidence { field:string; value:string; }
interface Product {
  id:string; factory_id:string; model:string|null; images:string[]|null;
  lines?:{oem_lines:{name:string}|null}[];
  attributes?:{extraction?:{
    product?:{name?:string|null;brand?:string|null};
    specifications?:Evidence[]; commercial_terms?:Evidence[];
    images?:{url:string}[];
    contextual_variants?:{field:string;values:{value:string;declared_class?:string|null}[]}[];
    usage_classification?:{declared_class?:string|null;classified_applications?:string[]};
  }};
}
function rows(records:Evidence[]) {
  const grouped = new Map<string,string[]>();
  for (const record of records) {
    const value=displayValue(record.field,record.value);
    if (!value) continue;
    const values=grouped.get(record.field)??[];
    if (!values.includes(value)) values.push(value);
    grouped.set(record.field,values);
  }
  return [...grouped];
}
function Table({data}:{data:[string,string[]][]}) {
  return <table className="sheet-table"><thead><tr><th>Informação</th><th>Especificação</th></tr></thead><tbody>{data.map(([field,values])=><tr key={field}><th scope="row">{fieldLabel(field)}</th><td>{values.map(value=><div key={value}>{value}</div>)}</td></tr>)}</tbody></table>;
}
export function PrintSheetApp() {
  const [product,setProduct]=useState<Product|null>(null);
  const [error,setError]=useState('');
  const [ready,setReady]=useState(false);
  const [failedPhotos,setFailedPhotos]=useState<string[]>([]);
  useEffect(()=>{
    const controller=new AbortController();
    const id=new URLSearchParams(location.search).get('id');
    if (!id||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {setError('Selecione um equipamento válido no catálogo.');return;}
    void fetch('/api/ads/'+id,{signal:controller.signal}).then(async response=>{
      if(!response.ok)throw new Error(response.status===401?'Entre como operador para abrir a ficha.':'Não foi possível carregar a ficha.');
      const item:Product=await response.json();
      if(!item.attributes?.extraction)throw new Error('A ficha técnica deste equipamento ainda não está disponível.');
      setProduct(item);
    }).catch((reason:unknown)=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:'Ficha indisponível.');});
    return ()=>controller.abort();
  },[]);
  useEffect(()=>{
    if(!product)return;
    const images=[...document.querySelectorAll<HTMLImageElement>('.sheet-photo')];
    const timeout=setTimeout(()=>setReady(true),10000);
    void Promise.all(images.map(image=>image.decode().catch(()=>{setFailedPhotos(values=>values.includes(image.src)?values:[...values,image.src]);}))).then(()=>{clearTimeout(timeout);setReady(true);});
    return ()=>clearTimeout(timeout);
  },[product]);
  const extraction=product?.attributes?.extraction;
  const name=displayValue('name',extraction?.product?.name??'')??`Equipamento ${product?.model??''}`;
  useEffect(()=>{if(product)document.title=`Ficha - ${product.model??'Equipamento'} - ${name}`;},[product,name]);
  if(error)return <main className="p-8"><p role="alert">{error}</p><a href="/catalogo.html">Voltar ao catálogo</a></main>;
  if(!product||!extraction)return <p role="status" className="p-8">Preparando ficha…</p>;
  const photos=[...new Set(extraction.images?.map(image=>image.url)??product.images??[])].filter(url=>{try{return new URL(url).protocol==='https:';}catch{return false;}}).slice(0,2);
  const variants=extraction.contextual_variants??[];
  const technical=rows((extraction.specifications??[]).filter(row=>!variants.some(variant=>variant.field===row.field)&&!['model','name','brand','features','faq_q5','faq_q6'].includes(row.field)));
  const middle=Math.ceil(technical.length/2);
  const complementary=rows((extraction.specifications??[]).filter(row=>['features','faq_q5','faq_q6'].includes(row.field)));
  const terms=rows(extraction.commercial_terms??[]);
  const usage=extraction.usage_classification;
  const header=(section:string)=><header className="sheet-header"><div><strong>OEM · Inteligência Fitness</strong><p>Ficha do equipamento</p></div><span>{section}</span></header>;
  const footer=(page:number)=><footer className="sheet-footer"><span>{extraction.product?.brand??'Fabricante não informado'} · {product.model??'Modelo não informado'}</span><span>Página {page} de 2</span></footer>;
  return <main className="print-document">
    <div className="sheet-toolbar"><Button variant="outline" onClick={()=>window.close()}><ChevronLeft/>Fechar ficha</Button><Button disabled={!ready} onClick={()=>window.print()}><Printer/>{ready?'Imprimir / Salvar PDF':'Preparando imagens…'}</Button></div>
    <article className="sheet-page" aria-label="Ficha técnica para impressão">
      {header('01 / Ficha técnica')}
      <div className="sheet-identity"><h1>{name}</h1><p><strong>Modelo {product.model??'Não informado'}</strong> · {extraction.product?.brand??'Marca não informada'} · {(product.lines??[]).flatMap(line=>line.oem_lines?.name?[line.oem_lines.name]:[]).join(' / ')||'Linha não informada'}</p><p>{classLabel(usage?.declared_class??null)}{usage?.classified_applications?.length?' · '+usage.classified_applications.map(applicationLabel).join(' · '):''}</p></div>
      <div className="sheet-photos">{photos.map((url,index)=><figure key={url}>{failedPhotos.includes(url)?<p>Imagem indisponível</p>:<img className="sheet-photo" src={url} alt={`${name} - Foto ${index+1}`}/>}<figcaption>Foto {index+1}</figcaption></figure>)}</div>
      {photos.length<2&&<p className="sheet-note">{photos.length===0?'Nenhuma foto disponível.':'Somente uma foto disponível.'}</p>}
      {variants.length>0&&<section><h2>Medidas e cargas por configuração</h2><table className="sheet-table"><thead><tr><th>Característica</th><th>Configuração 1</th><th>Outras configurações</th></tr></thead><tbody>{variants.map(group=><tr key={group.field}><th scope="row">{fieldLabel(group.field)}</th><td>{displayValue(group.field,group.values[0]?.value??'')??'Não informado'}</td><td>{group.values.slice(1).map((variant,index)=><div key={index}>{variant.declared_class?classLabel(variant.declared_class)+': ':''}{displayValue(group.field,variant.value)??'Valor aguarda padronização'}</div>)}</td></tr>)}</tbody></table></section>}
      <section><h2>Especificações do equipamento</h2><div className="sheet-columns"><Table data={technical.slice(0,middle)}/><Table data={technical.slice(middle)}/></div>{!technical.length&&<p>Especificações não informadas.</p>}</section>
      {footer(1)}
    </article>
    <article className="sheet-page" aria-label="Condições comerciais para impressão">
      {header('02 / Condições comerciais')}
      <div className="sheet-identity"><h1>{name}</h1><p>Modelo {product.model??'Não informado'} · {extraction.product?.brand??'Marca não informada'}</p></div>
      <section><h2>Condições comerciais</h2>{terms.length?<Table data={terms}/>:<p>Condições comerciais não informadas.</p>}</section>
      <section><h2>Características e serviços</h2>{complementary.length?<Table data={complementary}/>:<p>Informações complementares não disponíveis.</p>}</section>
      <p className="sheet-note">Os valores disponíveis para cada configuração e condição comercial foram preservados. Informações ausentes permanecem não informadas.</p>
      {footer(2)}
    </article>
  </main>;
}
