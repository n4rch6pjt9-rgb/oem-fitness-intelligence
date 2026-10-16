import test from 'node:test';
import assert from 'node:assert/strict';
import {productLabel,displayValue,translateProductText} from '../ui/vocabulary.ts';
test('HS presentation translates full claims without inferring equipment from keywords',()=>{
 assert.equal(productLabel('Gym Equipment Chest Press and Shoulder Press Machine with Lateral Raise','HS05'),'Equipamento para academia — máquina de supino e desenvolvimento de ombros com elevação lateral');
 assert.equal(displayValue('name','Outer Thigh Abductor'),'Abdutor de coxa');
 assert.equal(translateProductText('Unknown Chest Press configuration'),null);
 assert.equal(productLabel('Unknown Chest Press configuration','HS99'),'Unknown Chest Press configuration');
});
test('Portuguese source names and conflicting claims remain distinct',()=>{
 assert.equal(productLabel('Título original','TN91','Máquina Smith'),'Máquina Smith');
 assert.equal(productLabel('Commercial Home Gym Dual Functional Steel Machine Adductor Pin Load Selection for Legs Chest Arms-Adjustable Fitness Equipment','HS37','Prone Leg Curl/Leg Extension'),'Flexão de pernas em posição deitada / extensão de pernas');
 assert.equal(displayValue('name','Commercial Home Gym Dual Functional Steel Machine Adductor Pin Load Selection for Legs Chest Arms-Adjustable Fitness Equipment'),'Máquina de aço de dupla função para academia comercial ou residencial, adutor com seleção de carga por pino para pernas, peito e braços — equipamento ajustável');
});
