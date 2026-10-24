# Condições: referência técnica

As regras de cada condição, como o jogador lê, estão na página **IX. CONDIÇÕES DA ETERNIA** do diário AS REGRAS
(`src/packs/rules`) e no tooltip de cada estado (`ETERNIA.StatusDesc.<id>` nos arquivos de idioma). Este arquivo
diz onde cada regra está no código e como criar uma condição nova.

## Onde fica cada coisa

| Arquivo | O que faz |
|---|---|
| `module/conditions/catalog.mjs` | As 41 condições (id, grupo, família, ícone, campo do Valor, acúmulo, origem) e as tabelas das regras: quem perde a vez (`NO_ACTIONS`), sem movimento (`NO_MOVEMENT`), sem reações (`NO_REACTIONS`), tags que o Silenciado impede (as habilidades com [Maldição] passam), o que acaba no fim do próprio turno, no Encerramento e no fim da cena, o que o Aflito protege, a ação para se livrar (`RECOVERY`) e os limiares dos acúmulos e o Sol (`SUN_NOON`, `SUN_NIGHT`). |
| `module/conditions/rules.mjs` | Consultas comuns: `has`, `rating`, `sourcesOf`, `isHostile`, `removeStatuses`, `addStatus` e as duas configurações. |
| `module/conditions/rolls.mjs` | −1d6 e +1d6 dos testes e das Esquivas, o dano a mais (e o a menos do Enfraquecido) e o Concentrado que se gasta. Chamado pelas rolagens de habilidade, pelos cartões de ataque, pelas fichas, pelo HUD e pelo Destino. |
| `module/conditions/damage.mjs` | O dano dos cartões (antes: Exposto, Intangível, Encharcado; depois: Último Fôlego, Vínculo, Espelho, Adormecido, Encantado, Chama no Congelando e no Encharcado), o que o Desfazer devolve, o Maldito, O Único (nada de ataques chega), o Contragolpe (`counterFor` e `counterBack`: o dano volta dobrado ao atacante, só de golpe direto, ou de qualquer um com o tipo "any"), o Rancor (guarda o PV perdido, até NP×4), a Chama Negra e o Maldito que bloqueiam a cura (`healBlocker`), o `takeDamage` (o dano das próprias condições, com Barreira, Anulação da tag e linha no chat; quem não é dono pede ao Mestre pelo socket) e o `takeHealing` (a cura do Dreno, pelo mesmo caminho). |
| `module/conditions/actions.mjs` | O que as condições proíbem ao usar uma habilidade (lido por `automation/use.mjs`; o Dominado não mira em quem o domina nem no lado dele) e ao mover o token, e as ações de cada turno (Acelerado, Lento). |
| `module/conditions/turns.mjs` | O Relógio do Sol na Manutenção (`setupConditions`; o feitiço da Magia Sol sobe o Sol em `afterAction`), início do turno (Envenenado, Confuso), Ação Maior (Eletrificado, Intangível, Oculto), Encerramento (Queimando, Chama Negra, Sentença, Pavio, o golpe do Servo, a contagem d'O Único, o que acaba na rodada), limiares dos acúmulos, Despertado que deixa Fadiga, Selado sem nome e a origem Incapacitada. |
| `module/conditions/derived.mjs` | Defesas (Exposto, Fissurado, Sol), Velocidade e Iniciativa na ficha. |
| `module/conditions/recovery.mjs` | Livrar-se gastando a ação da regra (botão do HUD). |
| `module/conditions/index.mjs` | Registra os ganchos. |

Também tocam nas condições: `helpers/statuses.mjs` (a lista dos 64 estados, o painel da ficha por família, a
sincronia campo ↔ efeito e os acúmulos), `helpers/combat-cards.mjs` e `helpers/magic-traits.mjs` (as flags de
golpe e o Traço das Magias, abaixo), `automation/round.mjs` (perder a vez, o Encerramento, o fim do próprio
Turno), `automation/scenes.mjs` (fim de cena), `documents/eterniaCombat.mjs` (a ordem do Lento),
`chat/status-links.mjs` (estados clicáveis), `hud/` (painel de Estados) e `template.json` (os campos de Valor em
`system.bad-status`).

## Os dados de um estado

- **Valor:** fica no campo `system.bad-status.<id>`. Cada efeito que dá o estado leva
  `flags.eternia.statusData = { statusId, value, tag }`; com vários efeitos, o campo guarda o maior Valor, ou a soma
  até o máximo nos estados com acúmulo (`stack`). Tirar o campo da ficha tira todos os efeitos do estado.
- **Origem:** `flags.eternia.source.casterUuid` do efeito, posto pelos efeitos de habilidade, pelos estados
  clicáveis, pelo Criar efeito e por `game.eternia.applyStatus(..., { from })`. Um estado ligado à mão, pelo HUD do
  token, fica sem origem.
- **Selado:** `statusData.tag` é o nome da habilidade selada.

## Criar uma condição nova

1. Uma entrada em `NEW_STATUSES` (`catalog.mjs`): `id`, `group` (`bad`, `combat` ou `other`), `family` (só nos
   Estados Negativos), `img`; com Valor, `path: "bad-status.<id>"` e `rated: true` (e `stack: n` se acumula);
   `source: true` se a regra depende de quem causou; `tagged: true` se leva uma tag.
2. O campo em `template.json` (`system.bad-status.<id>: 0`) se tiver Valor.
3. `ETERNIA.StatusEffect.<id>` (nome) e `ETERNIA.StatusDesc.<id>` (regra curta) em `lang/pt-BR.json` e `lang/en.json`.
4. O ícone: uma linha em `tools/make-status-icons.mjs`, depois `node tools/make-status-icons.mjs <pasta do
   game-icons>` (a pasta tem o formato de https://github.com/game-icons/icons) e o crédito na tabela do README. Ou
   arte própria, um SVG em `assets/ui/status/<id>.svg` (os cinco da 0.26).
5. As regras: as tabelas do `catalog.mjs` cobrem os casos comuns; o resto vai no arquivo da mecânica (`rolls`,
   `damage`, `actions`, `turns` ou `derived`).
6. O nome e os sinônimos em `chat/status-links.mjs` (`STATUSES` e `SYNONYMS`), para o estado virar link no chat.
7. A entrada na página IX do diário AS REGRAS e `npm run packs:build`.

## Configurações

- `conditionRules` (ligado): toda a automação das condições (`rulesOn()`). Desligada, as condições continuam como
  estados, sem efeito automático.
- `conditionLimits` (avisar): o que as condições proíbem, em `off`, `warn` ou `block` (o Mestre sempre pode seguir).
- `endOfProcess` (ligado): os estados que acabam no fim do turno de quem os recebeu.

## Flags de efeito e de habilidade

Usados pelas raças e pelas Magias, servem para qualquer habilidade (`conditions/effects.mjs`, `helpers/item-use.mjs`;
as flags de golpe, nos cartões de dano: `helpers/combat-cards.mjs`, `helpers/magic-traits.mjs`):

| Onde | Flag | O que faz |
|---|---|---|
| Efeito | `recipients` | `"targets"` (padrão), `"self"` (quem usa), `"both"`, `"allies"` (os alvos do mesmo lado de quem usa, pela disposição do token, e quem usa) ou `"enemies"` (os alvos do outro lado) |
| Efeito | `immune` | lista de estados que não pegam enquanto o efeito existir (e acabam quando ele chega) |
| Efeito | `fatigueOnEnd` | Fadiga ao acabar (fórmula resolvida ao aplicar) |
| Efeito | `endsWith` | acaba quando o ator perde esse estado |
| Efeito | `consumeOn` | acaba depois do próximo teste desse tipo (`"negotiation"`…, `"check"`), Esquiva (`"dodge"`), dano sofrido (`"damage"`) ou a próxima rolagem de dano de quem o tem (`"attack"`) |
| Efeito | `damageTags`, `onHit` | tags que o dano de quem o tem ganha; estado que esse dano dá em quem atinge (`docs/profissoes.md`) |
| Efeito | `onUse` | aplica o efeito ao usar a habilidade, também nas que pedem teste contra o alvo (a criatura que fica com quem invoca, [Servo]) |
| Efeito | `trait` | o Traço de uma Magia (só na habilidade da Magia): `{ magia, bonusVs, onHit, escalate, strip, pierce, keepHidden, bonus, healBonus }`, que vale para os feitiços dessa Magia; `bonus` soma no dano e `healBonus` na cura |
| Efeito | chave `eternia.passive.cancel` | Anulação passiva (tag em `cancelTag`) |
| Efeito | chave `eternia.passive.weakness` | Fraqueza passiva (tag em `weaknessTag`): o Tabu das Chamas do Purgatório, [Fraqueza (Radiância): NP] em combate |
| Efeito | condição `hasSkill` | só vale se quem usa tiver a habilidade com esse nome |
| Efeito | condição `notSkill` | só vale se quem usa não tiver a habilidade com esse nome (o Escudo Esculpido do Pictomante, que vira muralha no Caminho da Paisagem) |
| Habilidade | `chooseEffect` | os efeitos são alternativas: quem usa escolhe um |
| Habilidade | `randomEffect` | os efeitos são alternativas: um deles, sorteado ao usar |
| Habilidade | `useActions` | `{ type: "fatigue", value }`, `{ type: "doubleStatus", status }`, `{ type: "removeStatus", statuses }`, `{ type: "steal", statuses }` (os do alvo passam para quem usa) ou `{ type: "switch" }` (quem usa e o primeiro alvo trocam de lugar e de Ódio, só entre aliados: a habilidade básica Switch), com `recipients` (também em itens usáveis) |
| Habilidade | `bonusVs` | `[{ statuses, targetTags, value, perValue, consume }]`: dano a mais contra quem tem um dos estados ou uma das tags (`perValue`: vezes o Valor do estado; `consume`: o golpe tira o estado) |
| Habilidade | `escalate` | `[{ if, add: [{ statusId, value }] }]`: quem o golpe acerta e já tem o estado `if` ganha os de `add` |
| Habilidade | `strip` | estados que o golpe arranca de quem acerta |
| Habilidade | `pierce` | `{ defense: "half", cancel: true, barrier: true }`: a Defesa pela metade, a Anulação ignorada, a Barreira ignorada e quebrada |
| Habilidade | `keepHidden` | o golpe não tira o [Oculto] de quem ataca |
| Habilidade | `randomHit` | `[{ statusId, value }]`: um deles, sorteado, em cada acerto |
| Habilidade | `drain` | fração (0.5): quem conjura recupera essa parte do PV que o golpe tirou (Dreno, pelo `takeHealing`) |
| Habilidade | `steal` | `[statusId]`: o primeiro deles que o alvo tem passa para quem atacou, com o Valor, a cada acerto |
| Habilidade | `selfBonus` | `[{ statusId, per, spend }]`: dano a mais pelo Valor de um estado de quem ataca (vezes `per`); com `spend`, o estado sai quando o dano é rolado |
| Habilidade | `withItem` | nome de outro item que precisa estar equipado junto (habilidade de item, como um par de espadas) |
| Habilidade | `special` | `"pack"` (Matilha, em `rolls.mjs`) ou `"book"` (O Livro, no renascimento) |
| Habilidade | `minRank`, `choiceOnly`, `rankGrants` | NP mínimo, só por escolha, e habilidades dadas a cada NH |

## O Relógio do Sol e o Contragolpe

- **Sol:** quem tem um Traço com `sunClock` (a Magia Sol) ganha +1 de [Sol] na Manutenção de cada rodada
  (`automation/round.mjs` → `setupConditions`) e a cada feitiço dessa Magia. No `SUN_NOON` (5) é meio-dia:
  [O Único] com Valor 1 (as rodadas que faltam) e a flag `sunNoon` com o id do combate; depois o Sol desce 1 por
  Manutenção. Numa cena com a escuridão em 0.5 ou mais (`scene.environment.darknessLevel`), o Sol para em
  `SUN_NIGHT` (2). O Valor d'O Único cai 1 em cada Encerramento; a Proeminência Final o leva a 2 com um efeito de
  `fatigueOnEnd`, e a Fadiga chega quando ele acaba.
- **Contragolpe:** um efeito com `statusData = { statusId: "counter", value, tag }` (`magical`, `physical` ou
  `any`). No cartão de dano, o dano de um golpe direto do tipo (alvo único; `any` vale para tudo, até área) é
  calculado com a Defesa e a Anulação e volta ao atacante dobrado + o Valor + o `counterBonus` dos Traços, como dano
  direto; nada do golpe (estados, dano de Esquiva falha) chega a quem devolveu, e o Contragolpe sai.

## Para macros

```js
game.eternia.applyStatus(actor, "burning", { value: 3 });       // como os efeitos de habilidade
game.eternia.applyStatus(actor, "counter", {});                  // Contragolpe sem tipo: devolve qualquer ataque
game.eternia.applyStatus(actor, "charmed", { from: vampire });   // com origem
game.eternia.conditions.recover(actor, "prone");                 // livra-se gastando a ação da regra
game.eternia.conditions.damage(actor, 4, { reason: "poisoned" }); // dano de condição, com linha no chat
```
