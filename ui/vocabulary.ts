// Exact presentation translations; collected text and product identities stay unchanged.
const productTranslations: Record<string, string> = {
  "INCLINE CHEST PRESS": "Supino inclinado",
  "Incline Chest Press": "Supino inclinado",
  "Commercial Gym Fitness Strength Equipment Incline Chest Press": "Equipamento de musculação comercial para academia — supino inclinado",
  "XG-V12E Commercial Motorized Treadmill/Gym Equipment": "XG-V12E — esteira motorizada comercial / equipamento para academia",
  "Outer Thigh Abductor": "Abdutor de coxa",
  "Prone Leg Curl/Leg Extension": "Flexão de pernas em posição deitada / extensão de pernas",
  "Body Building Exercise Pin Selected Fitness Equipment Commercial Gym Equipment Strength Machine Chest Press": "Equipamento de musculação com seleção de carga por pino para academia comercial — máquina de supino",
  "Commercial Fitness Equipment Pin Load Pectoral Pearl Delt / Pec Fly Strength Training for Gym Use": "Equipamento de musculação comercial com seleção de carga por pino — peitoral Pearl Delt / crucifixo para academia",
  "Brtw Gym Equipment Commercial Strength Exercise Machine for Outer Thigh Abductor Leg Exercise": "Equipamento BRTW para academia comercial — máquina de força para abdução de coxa",
  "New Commercial Fitness Machine Gym Equipment Fitness Seated Lat Pulldown Machine": "Novo equipamento de musculação comercial para academia — máquina de puxada alta sentada",
  "Commercial Fitness Equipment Strength Gym Use New HS08 Rowing Machine": "Equipamento de musculação comercial para academia — nova máquina de remada HS08",
  "Commercial Home Gym Dual Functional Steel Machine Adductor Pin Load Selection for Legs Chest Arms-Adjustable Fitness Equipment": "Máquina de aço de dupla função para academia comercial ou residencial, adutor com seleção de carga por pino para pernas, peito e braços — equipamento ajustável",
  "Brightway Commercial Body Building Abductor Machine Pin Loaded Leg Hip Adductor Strength Training Bench Rack Sale": "Máquina abdutora Brightway para musculação comercial, adutor de pernas e quadril com carga selecionada por pino — banco e suporte para treino de força à venda",
  "Brtw Gym Machine Equipment Steel Plate Loaded Leg Curl Leg Extension Exercise Machine Seated Leg Curl Leg Extension": "Máquina BRTW para academia com carga por anilhas — flexão e extensão de pernas sentada",
  "Commercial Grade Vertical Chest Press for Gym Professionals": "Supino vertical de categoria comercial para profissionais de academia",
  "Brightway Selectorized Prone Leg Curl Gym Leg Extension Leg Curl Machine for Strength Training": "Máquina Brightway de flexão de pernas deitada com carga selecionável para academia — extensão e flexão de pernas para treino de força",
  "Fitness HS11 CE Approved Strength Gym Fitness Equipment Gym Exercise Machine DIP/Chin Assist": "Equipamento de musculação HS11 para academia com aprovação CE declarada — paralelas e barra fixa assistidas",
  "Professional Seated Shoulder Press Machine for Home Gyms": "Máquina profissional de desenvolvimento de ombros sentado para academia residencial",
  "Commercial Gym Equipment Pin Load Selection Machines Seated Triceps Extension for Gym": "Equipamento para academia comercial com seleção de carga por pino — extensão de tríceps sentada",
  "Commercial Gym Fitness Sport Equipment Pin Loaded Strength Training Leg Press": "Equipamento de musculação comercial para academia com seleção de carga por pino — leg press",
  "Innovative Seated Fixed Pulldown Machine for Strength Building": "Máquina inovadora de puxada fixa sentada para desenvolvimento de força",
  "Gym Equipment Chest Press and Shoulder Press Machine with Lateral Raise": "Equipamento para academia — máquina de supino e desenvolvimento de ombros com elevação lateral",
  "Custom Logo Leg Extension Seated Fitness Equipment Plywood Box": "Equipamento de extensão de pernas sentada com marca personalizada — caixa de compensado",
  "Brightway High Quality Strength Training Gym Fitness Machines Standing Calf Machine for Sale": "Máquina Brightway de musculação de alta qualidade para academia — panturrilha em pé à venda",
  "Gym Equipment Multi Hip Strength Training Multi Hip Machine Fine Workmanship Standing Multi Hip Machines": "Equipamento de musculação multi-quadril para academia — máquina multi-quadril em pé com acabamento refinado",
  "Commercial Triceps Extension Strength Gym Fitness Equipment Dual Functional Trainer Biceps Curl": "Equipamento de musculação comercial para academia — extensão de tríceps e rosca de bíceps de dupla função",
  "Multi Functional Trianer": "Treinador multifuncional",
  "China": "China",
  "Lat Pulldown": "Puxada alta",
  "Lat pull down": "Puxada alta",
  "Inner Thigh Adductor": "Adutor de coxa",
  "INNER THIGH ADDUCTOR": "Adutor de coxa",
  "Seated Leg Curl": "Flexão de pernas sentada",
  "Leg Curl": "Flexão de pernas",
  "Prone Leg Curl": "Flexão de pernas em posição deitada",
  "Prone Leg Curl Machine": "Máquina de flexão de pernas em posição deitada",
  "Dip/Chin Assist": "Paralelas / barra fixa assistidas",
  "Shoulder Press": "Desenvolvimento de ombros",
  "Shoulder Trainer": "Treinador de ombros",
  "Triceps Exercises": "Exercícios de tríceps",
  "Fitness Equipment Body Building Fitness Machine Triceps Extension": "Equipamento de musculação — máquina de extensão de tríceps",
  "Leg Press": "Leg press",
  "Leg press": "Leg press",
  "Fixed Pulldown": "Puxada fixa",
  "Seated Fixed Pulldown": "Puxada fixa sentada",
  "Lateral Raise": "Elevação lateral",
  "Lateral Shoulder Press (Pin Loaded)": "Desenvolvimento lateral de ombros (carga selecionada por pino)",
  "Leg Extension": "Extensão de pernas",
  "leg extension": "Extensão de pernas",
  "Standing Calf Raise": "Elevação de panturrilha em pé",
  "Standing Calf Raise Machine": "Máquina de elevação de panturrilha em pé",
  "Multi Hip Machine": "Máquina multi-quadril",
  "Multi Hip": "Multi-quadril",
  "Biceps Curl Trianer": "Treinador de rosca de bíceps",
  "Biceps curl machine": "Máquina de rosca de bíceps"
};

export function translateProductText(value: string): string | null {
  return Object.hasOwn(productTranslations, value) ? productTranslations[value] : null;
}

export const vocabulary = {
  classes:{commercial:'Comercial',light_commercial:'Comercial leve'},
  applications:{gym:'Academia',studio:'Estúdio',condominium:'Condomínio',home:'Residencial',hotel:'Hotel',community:'Comunidade'},
  fields:{motor:'Motor',console:'Painel',peak_power:'Potência de pico',folding:'Estrutura dobrável',speed_range:'Faixa de velocidade',incline_range:'Inclinação e declive',type:'Tipo de equipamento',max_weight_stack:'Carga máxima da torre',main_frame_gauge:'Tubulação da estrutura',loading_quantity:'Quantidade por contêiner',model:'Modelo',name:'Equipamento',brand:'Marca',age_group:'Faixa etária',gender:'Público',exercise_part:'Grupo muscular',material:'Material',declared_certifications:'Certificações',appliance:'Aplicações',application:'Aplicações',packing_dimensions:'Dimensões da embalagem',packing_type:'Embalagem',tube_size:'Tubulação',tube_thickness:'Espessura dos tubos',dimensions:'Dimensões',weight_stack:'Torre de pesos',micro_minor_adjustment:'Ajuste adicional',net_weight:'Peso líquido',gross_weight:'Peso bruto',max_user_weight:'Peso máximo do usuário',logo:'Personalização da marca',frame_color:'Cor da estrutura',cushion_color:'Cor do estofado',trade_mark:'Marca personalizada',transport_package:'Embalagem de transporte',origin:'Local de fabricação',hs_code:'Código aduaneiro',production_capacity:'Capacidade de produção',features:'Características',color:'Cores',price:'Preço',moq:'Pedido mínimo',payment_terms:'Pagamento',delivery_time:'Prazo de entrega',after_sales:'Pós-venda',faq_q5:'Planejamento do espaço',faq_q6:'Montagem'},
  terms:{MOQ:{label:'Pedido mínimo',meaning:'Quantidade mínima aceita por pedido. Não representa a capacidade mínima de fabricação.'},'T/T':{label:'Transferência bancária',meaning:'Pagamento por transferência bancária.'},'L/C':{label:'Carta de crédito',meaning:'Pagamento por carta de crédito; preservar a condição à vista quando informada.'},SKU:{label:'Modelo',meaning:'Identificador comercial do equipamento.'},packing_size:{label:'Dimensões da embalagem',meaning:'Medidas do equipamento acondicionado para transporte.'}}
} as const;
export function capitalize(value:string){return value?value[0].toLocaleUpperCase('pt-BR')+value.slice(1):value;}
export function fieldLabel(field:string){const box=field.match(/^packing_box_(\d+)$/);if(box)return 'Dimensões da caixa '+box[1];return vocabulary.fields[field as keyof typeof vocabulary.fields]??'Informação complementar';}
export function classLabel(value:string|null){return vocabulary.classes[value as keyof typeof vocabulary.classes]??'Classe não informada';}
export function applicationLabel(value:string){return vocabulary.applications[value as keyof typeof vocabulary.applications]??'Aplicação não informada';}

export function sourceSectionLabel(value:string):string {
 const exact:Record<string,string>={
  'Overview':'Vis\u00e3o geral',
  'Basic Info.':'Informa\u00e7\u00f5es b\u00e1sicas',
  'Basic Info':'Informa\u00e7\u00f5es b\u00e1sicas',
  'Product Description':'Descri\u00e7\u00e3o do produto',
  'Product Description / table':'Descri\u00e7\u00e3o do produto / tabela'
 };
 if(exact[value])return exact[value];

 const faq=value.match(/^Product Description \/ FAQ Q(\d+):\s*(.+)$/i);
 if(faq){
  const questions:Record<string,string>={
   'What is the MOQ?':'Qual \u00e9 o pedido m\u00ednimo?',
   'How about the payment?':'Quais s\u00e3o as condi\u00e7\u00f5es de pagamento?',
   'How long about the delivery time?':'Qual \u00e9 o prazo de entrega?'
  };
  return `Descri\u00e7\u00e3o do produto / FAQ Q${faq[1]}: ${questions[faq[2]] ?? faq[2]}`;
 }

 return value;
}

const translations:Record<string,string>={
 'Steel / Cement':'Aço / cimento','Universal':'Uso geral','Adjustable Pulley':'Polia ajustável',
 'Chest Press':'Supino sentado','Adult':'Adulto','Unisex':'Unissex','Chest':'Peitoral','Steel':'Aço','Plywood Box':'Caixa de compensado','Shandong, China':'Shandong, China','Customized Logo Availabled':'Marca personalizada','Customised':'Personalizável','More Colors for Choice or Customised':'Cores disponíveis ou personalizadas','Available':'Disponível','Green, yellow, or customized':'Verde, Amarelo ou personalizado','Professional gym club/Fitness center':'Academia e centro de treinamento','Community, Gymnasium, Home':'Comunidade, Academia e residência'
};
// Product presentation is deliberately separate from collected evidence.
// Unsupported wording is omitted instead of leaking untranslated text or inventing a value.
export function displayValue(field:string,raw:string):string|null {
 if(/^packing_box_\d+$/.test(field)&&/^\d+ × \d+ × \d+ mm$/.test(raw))return raw;
 if(field==='type'&&raw==='Treadmill')return 'Esteira';
 if(field==='motor'){const m=raw.match(/^(\d+(?:\.\d+)?) HP AC Motor$/);if(m)return 'Motor CA de '+m[1].replace('.',',')+' HP';}
 if(field==='peak_power'&&/^\d+(?:\.\d+)? HP$/.test(raw))return raw.replace('.',',');
 if(field==='console'&&raw==='LED display monitor with USB charging,FAN, etc.')return 'Monitor LED com carregamento USB, ventilador etc.';
 if(field==='folding'&&raw==='Unfolding')return 'Não dobrável';
 if(field==='speed_range'&&/^\d+(?:\.\d+)?-\d+(?:\.\d+)? km\/h$/.test(raw))return raw.replaceAll('.',',').replace('-','–');
 if(field==='incline_range'){const m=raw.match(/^decline(\d+(?:\.\d+)?)%-(\d+(?:\.\d+)?)% incline by motor$/);if(m)return 'Declive de '+m[1].replace('.',',')+'% a inclinação de '+m[2].replace('.',',')+'%, motorizada';}
 if(field==='origin'&&raw==='Zhejiang, China')return raw;

 if(field==='name'){const translated=translateProductText(raw);if(translated)return translated;}
 if(translations[raw])return translations[raw];
 if(field==='net_weight'&&/including/i.test(raw)){const m=raw.match(/^(\d+)\s*kg\s*\(including\s*(\d+)\s*kg\s*weight stacks\)/i);if(m)return m[1]+' kg (inclui torre de pesos de '+m[2]+' kg)';}
 if(field==='weight_stack'&&/Cement\/Steel/i.test(raw)){const kg=raw.match(/\d+\s*kg/i)?.[0];return kg?'Cimento / aço, '+kg.replace(/(?<=\d)kg/i,' kg')+' (padrão)':null;}
 if(field==='main_frame_gauge'){const m=raw.match(/Square Tube:\s*([\d*x×]+),\s*Rectangular Tube:\s*([\d*x×]+)/i);if(m)return 'Tubo quadrado: '+m[1].replaceAll('*',' × ')+'; tubo retangular: '+m[2].replaceAll('*',' × ');}
 if(field==='max_weight_stack'&&/^\d+\s*kg$/i.test(raw))return raw.replace(/(?<=\d)kg/i,' kg');
 if(field==='loading_quantity'){const m=raw.match(/20GP\s*(\d+)pcs\s*40HQ\s*(\d+)pcs/i);if(m)return '20 GP: '+m[1]+' unidades; 40 HQ: '+m[2]+' unidades';}
 if(['model','brand','hs_code','declared_certifications'].includes(field))return raw;
 if(['dimensions','packing_dimensions','tube_size','tube_thickness','weight_stack','net_weight','gross_weight','max_user_weight'].includes(field)&&/^[\d\s.,*x×+a-z()-]+$/i.test(raw))return raw.replace(/kgs?\b/gi,'kg').replace(/(?<=\d)\.(?=\d)/g,',').replace(/\s*[*x×]\s*/g,' × ').replace(/(?<=\d)(mm|kg)/g,' $1').replace(/\s*\+\s*/g,' + ');
 if(field==='micro_minor_adjustment'){const weight=raw.match(/\d+(?:\.\d+)?\s*kg/i)?.[0];return weight?'Sim, '+weight.replace('.',',').replace(/(?<=\d)kg/,' kg'):null;}
 if(field==='production_capacity'){const count=raw.match(/([\d,]+)\s*Pieces\s*Monthly/i)?.[1];return count?`${Number(count.replaceAll(',','')).toLocaleString('pt-BR')} unidades por mês`:null;}
 if(field==='price'){const amounts=[...raw.matchAll(/\d+(?:,\d{3})*(?:\.\d+)?/g)].map(x=>Number(x[0].replaceAll(',','')).toLocaleString('pt-BR',{minimumFractionDigits:2}));return amounts.length&&raw.includes('US$')?'US$ '+amounts.join(' – '):null;}
 if(field==='moq'){const count=raw.match(/\d+/)?.[0]??(/\bOne\b/i.test(raw)?'1':null);if(!count)return null;return /set/i.test(raw)?`${count} ${count==='1'?'conjunto':'conjuntos'}${/big strength/i.test(raw)?' para equipamentos de força':''}`:/piece/i.test(raw)?`${count} unidades`:null;}
 if(field==='delivery_time'){const period=raw.match(/(\d+)\s*[-–]\s*(\d+)\s*days/i);if(!period)return null;return `${period[1]} a ${period[2]} dias`+(/deposit received/i.test(raw)?' após confirmação do pedido e recebimento da entrada':/order quantities/i.test(raw)?', conforme a quantidade do pedido. Estruturas disponíveis para algumas séries.':'');}
 if(field==='payment_terms'){const methods=[];if(/T\/T/i.test(raw))methods.push('Transferência bancária');if(/WESTERN UNION/i.test(raw))methods.push('Western Union');if(/L\/C/i.test(raw))methods.push('Carta de crédito'+(/at sight/i.test(raw)?' à vista':''));if(!methods.length)return null;const deposit=raw.match(/(\d+)%\s*(?:as\s+)?deposit/i)?.[1];const minimum=/at least/i.test(raw)?' mínima':'';const balance=raw.match(/(\d+)%\s*balance/i)?.[1];return methods.join(' · ')+(deposit?`. Entrada${minimum} de ${deposit}%`:'')+(/balance before|balance.*before/i.test(raw)?`; ${balance?'saldo de '+balance+'%':'saldo'} antes do embarque.`:'.');}
 if(field==='after_sales'&&/2%/.test(raw)&&/replacement for free/i.test(raw))return 'Peças de desgaste adicionais equivalentes a 2% e reposição gratuita de peças danificadas durante a garantia.';
 if(field==='faq_q5'&&/Sure.*experience/i.test(raw))return 'Assessoria para planejamento do espaço da academia.';
 if(field==='faq_q6'&&/videos.*pictures.*Label/i.test(raw))return 'Orientações de montagem com vídeos, imagens e peças identificadas.';
 if(field==='features'&&/Q235/i.test(raw)&&/60x100x3mm/i.test(raw))return 'Aço Q235; tubos de 60 × 100 × 3 mm; acabamento pintado; soldagem lisa; desenho próprio; equipamento com carga por anilhas.';
 return null;
}

export function productLabel(title:string, model:string|null, declaredName?:string|null):string {
 return displayValue('name',declaredName??'') ?? (declaredName?.trim() || translateProductText(title) || title.trim() || (model?'Equipamento '+model:'Equipamento sem modelo informado'));
}

export function productDescription(_title:string):string|null {
 return null;
}
