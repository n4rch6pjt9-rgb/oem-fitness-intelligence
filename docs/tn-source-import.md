# Importação dos 27 anúncios alternativos TN

Importação executada no Supabase osqkliwzowscupsykbbc em 15/10/2026. Os 27 HTMLs completos e suas duas listagens de origem foram capturados; cada anúncio recebeu hash do conteúdo e preservou valores, rótulos de origem, JSON-LD, fotos e conflitos. Os anúncios foram persistidos pelo fluxo existente createCrawler(db).persistProduct e associados à linha de origem TN.

- 27 anúncios incorporados.
- 25 vinculados a SKUs existentes.
- Dois sem SKU canônico, com identidade em revisão.
- 29 anúncios anteriores preservados integralmente, verificados campo a campo antes/depois.
- O conjunto dos 29 IDs de SKU do fabricante permaneceu idêntico: nenhum SKU novo.
- Os dez SKUs TN foram mantidos.
- TN91 manteve o ID db49d33d-e127-48e9-bf4e-6ed1c2553735 e agora reúne oito anúncios.
- Os cinco anúncios declarados TM91 não foram importados.
- Nenhuma variante foi criada a partir de divergências. Medidas e descrições diferentes continuam separadas por anúncio.

## Identificações em revisão

A conferência inicial no navegador havia identificado TN09 em ambos os anúncios. O HTML completo revelou declarações adicionais incompatíveis. A importação preservou todas elas e deixou model/sku_id vazios, sem escolher arbitrariamente uma identidade.

- Anúncio `b86d5590-aabb-416a-83b3-57653ec4c5d4`: BL09 / TN09. [Fonte](https://pt.made-in-china.com/co_brtw-fitness/product_Commercial-Fitness-Equipment-Multi-Gym-Trainer-Bodybuilding-Gym-Equipment-Smith-Machine-Squat-Rack_yuounuynug.html).
- Anúncio `6103f396-ab55-40e1-9232-749b32a7c1e6`: BH09 / TN09. [Fonte](https://pt.made-in-china.com/co_brtw-fitness/product_Strength-Training-Exercise-Body-Building-Gym-Equipment-Gym-Equipment-Commercial-Smith-Machine_yuogueyoeg.html).

## Verificações

67 testes passaram na composição local, incluindo rótulos portugueses, source_label original, exclusão de dados da empresa das especificações do produto, tratamento de Especificação textual e manutenção de conflitos de modelo. TypeScript e build passaram. A migração 20261015193947_oem_product_type_usage foi ensaiada com rollback e aplicada para reconhecer a declaração explícita do fornecedor no campo type.

O banco passou de 29 para 56 anúncios. Os originais não foram sobrescritos. Os anúncios novos têm duas fotos extraídas cada um; o JSON-LD original continua armazenado. O histórico automático preserva os snapshots dos registros novos.

## Inventário inserido

| Fonte | Modelo declarado resolvido | SKU ID | Anúncio ID |
|---|---|---|---|
| [yuogngihog](https://pt.made-in-china.com/co_brtw-fitness/product_Fitness-Equipment-Plate-Loaded-Gym-Trainer-Strength-ISO-Lateral-Rowing-Benches-Racks-Machine-Rower_yuogngihog.html) | TN06 | 0e8be30c-fc93-4312-a113-4d29b5335190 | d10f4806-ae14-48c8-9cd6-6af1c17ef386 |
| [yuogghgueg](https://pt.made-in-china.com/co_brtw-fitness/product_Commercial-Fitness-Equipment-Rowing-Back-Pull-Training-Device-Double-Position-Pull-Back-Fitness-Machine_yuogghgueg.html) | TN06 | 0e8be30c-fc93-4312-a113-4d29b5335190 | b56fbd47-656b-4070-ba13-5b8959e08511 |
| [yuoggyghog](https://pt.made-in-china.com/co_brtw-fitness/product_Brightway-Fitness-Equipment-Plate-Loaded-Gym-Trainer-Strength-ISO-Lateral-Rowing_yuoggyghog.html) | TN06 | 0e8be30c-fc93-4312-a113-4d29b5335190 | 152bc8d0-6074-4774-864c-7ea951e56d2f |
| [yuogngieug](https://pt.made-in-china.com/co_brtw-fitness/product_Brightway-Wholesale-Commercial-Chest-Clip-Loaded-Fitness-Gym-Equipment-Pectoral-Fly-with-Cables-for-Sale_yuogngieug.html) | TN06 | 0e8be30c-fc93-4312-a113-4d29b5335190 | dd1ff17e-cd47-4610-94be-a218fbdb4236 |
| [yiyhiniehg](https://pt.made-in-china.com/co_brtw-fitness/product_Brtw-Commercial-Seated-Row-Machine-Plate-Loaded-Back-Strength-Trainer-for-Gym-Studio_yiyhiniehg.html) | TN06 | 0e8be30c-fc93-4312-a113-4d29b5335190 | d0b72f10-1d0f-44f5-8ad2-c8c5d8bca137 |
| [yuogghseug](https://pt.made-in-china.com/co_brtw-fitness/product_Sport-Equipment-Wide-Chest-Press-Tn07-Strength-Machine-Training-Gym-Equipment-Supplier_yuogghseug.html) | TN07 | 65da69ef-3f9d-4266-806a-96a0fb041259 | a4cb4c49-3fec-4598-908f-d81eb8db9f4e |
| [yiueeyosog](https://pt.made-in-china.com/co_brtw-fitness/product_Brtw-Sports-Equipment-Strength-Commercial-Pin-Loaded-Chest-Press-Machine-Strength-Training-Gym-Equipment_yiueeyosog.html) | TN07 | 65da69ef-3f9d-4266-806a-96a0fb041259 | 932cabb3-5322-4170-86b9-816267809f02 |
| [yuounuynug](https://pt.made-in-china.com/co_brtw-fitness/product_Commercial-Fitness-Equipment-Multi-Gym-Trainer-Bodybuilding-Gym-Equipment-Smith-Machine-Squat-Rack_yuounuynug.html) | Em revisão: BL09 / TN09 | Não atribuído | b86d5590-aabb-416a-83b3-57653ec4c5d4 |
| [yysiyurnsg](https://pt.made-in-china.com/co_brtw-fitness/product_High-Performance-Multi-Function-Smith-Machine-for-Comprehensive-Commercial-Gym-Training_yysiyurnsg.html) | TN09 | 79127a59-26b1-401b-b628-785c140fc3d6 | 4cf37745-87e0-427e-88f5-4071ae5d9619 |
| [yuogueyoeg](https://pt.made-in-china.com/co_brtw-fitness/product_Strength-Training-Exercise-Body-Building-Gym-Equipment-Gym-Equipment-Commercial-Smith-Machine_yuogueyoeg.html) | Em revisão: BH09 / TN09 | Não atribuído | 6103f396-ab55-40e1-9232-749b32a7c1e6 |
| [yyssgusing](https://pt.made-in-china.com/co_brtw-fitness/product_2025-New-Fitness-Strength-Seated-Chest-Press-Machine-Body-Building-Machine-Chest-Press_yyssgusing.html) | TN26 | e620f775-e255-4c00-be6f-a0091f5e7553 | f4f5770a-5095-4d9f-ad42-32998807c873 |
| [yyssgusnsg](https://pt.made-in-china.com/co_brtw-fitness/product_Gym-Equipment-Power-Machine-Commercial-Fitness-Product-Chest-Press-Machine-Sports-Fitness-Equipment_yyssgusnsg.html) | TN26 | e620f775-e255-4c00-be6f-a0091f5e7553 | b51617c4-1210-4e6a-bb86-1b972abd716d |
| [yysshuinng](https://pt.made-in-china.com/co_brtw-fitness/product_Plate-Loaded-ISO-Lateral-Decline-Seated-Chest-Press-Machine-Commercial-Grade-Gym-Quality-Fitness-Equipment_yysshuinng.html) | TN26 | e620f775-e255-4c00-be6f-a0091f5e7553 | ec66f625-49e7-4480-8bb9-1a551a148e2b |
| [yiueehehgg](https://pt.made-in-china.com/co_brtw-fitness/product_Brightway-Heavy-Duty-Incline-Seated-Chest-Press-Equipment-Full-Steel-Frame-Chest-Muscle-Workout-Station_yiueehehgg.html) | TN26 | e620f775-e255-4c00-be6f-a0091f5e7553 | 15f39d86-afd6-42d4-9873-3c71a9076512 |
| [yyssgyygyg](https://pt.made-in-china.com/co_brtw-fitness/product_Brightway-Body-Building-Gym-Use-Fitness-Equipment-Incline-Plate-Loaded-Pec-Fly-Chest-Muscle-Exercise_yyssgyygyg.html) | TN56 | 9e7e0f39-1139-4d7c-8931-9b07c961b1cb | e6474ba2-342e-4fb7-9670-a512613eae96 |
| [yyssnonoyg](https://pt.made-in-china.com/co_brtw-fitness/product_Adjustable-Shoulder-and-Chest-Machine-Free-Weights-Pec-Fly-Gym-Machine-Portable-Incline-Chest-Fly-Machine_yyssnonoyg.html) | TN56 | 9e7e0f39-1139-4d7c-8931-9b07c961b1cb | c7bf7a00-9c85-4f9e-8400-526afe82d561 |
| [yyssnogung](https://pt.made-in-china.com/co_brtw-fitness/product_Bodybuilding-Factory-Direct-Sales-Incline-Chest-Fly-Machine-Commercial-Gym-Equipment-Plate-Loaded-Incline-Pec-Fly-Machine_yyssnogung.html) | TN56 | 9e7e0f39-1139-4d7c-8931-9b07c961b1cb | d85979b5-206b-4b47-a6b3-d275646d411b |
| [yyssghygsg](https://pt.made-in-china.com/co_brtw-fitness/product_Commercial-Fitness-Equipment-Pec-Fly-Machine-Strength-Plate-Loaded-Machine_yyssghygsg.html) | TN56 | 9e7e0f39-1139-4d7c-8931-9b07c961b1cb | b57c5299-1673-4b48-a2bc-7c10cca28a4b |
| [yuoyguhogg](https://pt.made-in-china.com/co_brtw-fitness/product_Commercial-Fitness-Equipment-Specials-Pec-Fly-Hot-Selling-Pin-Loaded-Gym-Machine_yuoyguhogg.html) | TN56 | 9e7e0f39-1139-4d7c-8931-9b07c961b1cb | 333de350-c369-4448-abe1-cca641feac27 |
| [yuhsyoeuyg](https://pt.made-in-china.com/co_brtw-fitness/product_Fitness-Gym-Equipment-Strength-Plate-Loaded-Hip-Belt-Squat-Machines-Load_yuhsyoeuyg.html) | TN91 | db49d33d-e127-48e9-bf4e-6ed1c2553735 | cec8e5ca-0670-4d1e-a426-8ec0b075b9df |
| [yuhsyorurg](https://pt.made-in-china.com/co_brtw-fitness/product_Wholesale-Squat-Leg-Press-Commercial-Gym-Fitness-Equipment-Medium-Exercise-Board-Loaded-45-Degree-Leg-Press_yuhsyorurg.html) | TN91 | db49d33d-e127-48e9-bf4e-6ed1c2553735 | d675817d-a97a-4046-87ef-cdb100778fdf |
| [yuhsieeuhg](https://pt.made-in-china.com/co_brtw-fitness/product_Commercial-Steel-Incline-Leg-Press-Machine-for-Gym-Workouts_yuhsieeuhg.html) | TN91 | db49d33d-e127-48e9-bf4e-6ed1c2553735 | a0b43bfc-2f83-4a8a-89fd-2387d39e5e6b |
| [yuhsnuuusg](https://pt.made-in-china.com/co_brtw-fitness/product_Wholesale-High-Quality-Plate-Load-45-Degree-Leg-Press-Machine-for-Gym-Body-Excise_yuhsnuuusg.html) | TN91 | db49d33d-e127-48e9-bf4e-6ed1c2553735 | a98d8840-14b7-4104-a975-ecde43075fc8 |
| [yuouyogsig](https://pt.made-in-china.com/co_brtw-fitness/product_Commercial-Fitness-Equipment-Seated-45-Degree-Leg-Press-Machine-Universal-Gym-Machines_yuouyogsig.html) | TN91 | db49d33d-e127-48e9-bf4e-6ed1c2553735 | be006205-facb-477b-87ea-1d4b0311f8d2 |
| [yuouiuohog](https://pt.made-in-china.com/co_brtw-fitness/product_Brightway-Commercial-Fitness-Equipment-Plate-Loaded-Fitness-Equipment-Multi-Gym-Equipment-Linear-Leg-Press_yuouiuohog.html) | TN91 | db49d33d-e127-48e9-bf4e-6ed1c2553735 | f77a9ad5-5396-4062-9252-00b1a5771929 |
| [yuouiysuog](https://pt.made-in-china.com/co_brtw-fitness/product_Brightway-High-Quality-Plate-Loaded-Commercial-Gym-Equipment-Fitness-45-Degree-Leg-Press-Machine_yuouiysuog.html) | TN91 | db49d33d-e127-48e9-bf4e-6ed1c2553735 | 3f650bbb-f1aa-4d50-af6a-6f01804ca171 |
| [yiihersong](https://pt.made-in-china.com/co_brtw-fitness/product_Brtw-High-Strength-Steel-Adjustable-Gym-Equipment-Commercial-Multi-Function-Smith-Machine-with-Cables_yiihersong.html) | TN116 | 017454ea-b85e-4df0-af02-84078356431c | 43428801-789e-4239-b0ba-d5207d17a098 |
