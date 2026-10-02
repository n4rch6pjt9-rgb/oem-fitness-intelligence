// These rules classify supplier wording, not mechanical performance or suitability.
export function classifyUsage(title, specifications) {
  const evidence=[];
  const candidates=[{field:'title',value:title,source_section:'Overview / title'},...specifications.filter(x=>['application','appliance','use_class','usage','intended_use'].includes(x.field))];
  const applications=new Set();const classes=new Set();
  for(const record of candidates) {
    if(typeof record.value!=='string'||!record.value.trim())continue;
    const text=record.value;
    // Negated or restricted claims require review rather than keyword assignment.
    if(/\b(?:not|no|non|except|unsuitable|não)\b/i.test(text)) {evidence.push({...record,classification:null,requires_review:true});continue;}
    const light=/\blight[\s-]+commercial\b|\bcomercial\s+leve\b/i.test(text);
    const remaining=text.replace(/\blight[\s-]+commercial\b|\bcomercial\s+leve\b/gi,'');
    const commercial=/\b(?:full[\s-]+)?commercial\b|\bcomercial\b/i.test(remaining);
    const declared=[];if(light)declared.push('light_commercial');if(commercial)declared.push('commercial');
    for(const value of declared)classes.add(value);
    const matched=[];
    for(const [value,pattern] of [['studio',/\bstudios?\b/i],['condominium',/\bcondos?\b|\bcondominiums?\b|\bcondom[ií]nios?\b/i],['gym',/\bgym(?:s|nasium)?\b|\bfitness\s+cent(?:er|re)s?\b|\bacademias?\b/i],['home',/\bhome\b|\bresidential\b|\bresidencial\b/i],['hotel',/\bhotels?\b|\bhot[eé]is\b/i],['community',/\bcommunity\b/i]]) {
      if(pattern.test(text)){applications.add(value);matched.push(value);}
    }
    if(declared.length||matched.length)evidence.push({...record,declared_classes:declared,classified_applications:matched});
  }
  return {declared_class:classes.size===1?[...classes][0]:null,declared_class_versions:[...classes],classified_applications:[...applications],evidence,conflict:classes.size>1,verification_status:'supplier_declaration',duty_rating:null};
}
