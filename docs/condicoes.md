# Condições: referência técnica

As regras de cada condição, como o jogador lê, estão na página **IX. CONDIÇÕES DA ETERNIA** do diário AS REGRAS
(`src/packs/rules`) e no tooltip de cada estado (`ETERNIA.StatusDesc.<id>` nos arquivos de idioma). Este arquivo
diz onde cada regra está no código e como criar uma condição nova.

## Onde fica cada coisa

| Arquivo | O que faz |
|---|---|
| `module/conditions/catalog.mjs` | As 31 condições (id, grupo, família, ícone, campo do Valor, acúmulo, origem) e as tabelas das regras: quem perde a vez (`NO_ACTIONS`), sem movimento (`NO_MOVEMENT`), sem reações (`NO_REACTIONS`), tags que o Silenciado impede (as habilidades com [Maldição] passam), o que acaba no fim do próprio turno, no Encerramento e no fim da cena, o que o Aflito protege, a ação para se livrar (`RECOVERY`) e os limiares dos acúmulos. |
| `module/conditions/rules.mjs` | Consultas comuns: `has`, `rating`, `sourcesOf`, `isHostile`, `removeStatuses`, `addStatus` e as duas configurações. |
| `module/conditions/rolls.mjs` | −1d6 e +1d6 dos testes e das Esquivas, o dano a mais e o Concentrado que se gasta. Chamado pelas rolagens de habilidade, pelos cartões de ataque, pelas fichas, pelo HUD e pelo Destino. |
| `module/conditions/damage.mjs` | O dano dos cartões (antes: Exposto, Intangível; depois: Último Fôlego, Vínculo, Espelho, Adormecido, Encantado, Chama no Congelando), o que o Desfazer devolve, o Maldito e o `takeDamage` (o dano das próprias condições, com Barreira, Anulação da tag e linha no chat; quem não é dono pede ao Mestre pelo socket). |
| `module/conditions/actions.mjs` | O que as condições proíbem ao usar uma habilidade (lido por `automation/use.mjs`) e ao mover o token, e as ações de cada turno (Acelerado, Lento). |
| `module/conditions/turns.mjs` | Início do turno (Envenenado, Confuso), Ação Maior (Eletrificado, Intangível, Oculto), Encerramento (Queimando, Sentença, o que acaba na rodada), limiares dos acúmulos, Despertado que deixa Fadiga, Selado sem nome e a origem Incapacitada. |
| `module/conditions/derived.mjs` | Defesas, Velocidade e Iniciativa na ficha. |
| `module/conditions/recovery.mjs` | Livrar-se gastando a ação da regra (botão do HUD). |
| `module/conditions/index.mjs` | Registra os ganchos. |

Também tocam nas condições: `helpers/statuses.mjs` (a lista dos 54 estados, o painel da ficha por família, a
sincronia campo ↔ efeito e os acúmulos), `automation/round.mjs` (perder a vez, o Encerramento, o fim do próprio
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
   game-icons>` (a pasta tem o formato de https://github.com/game-icons/icons) e o crédito na tabela do README.
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

Usados pelas raças, servem para qualquer habilidade (`conditions/effects.mjs`, `helpers/item-use.mjs`):

| Onde | Flag | O que faz |
|---|---|---|
| Efeito | `recipients` | `"targets"` (padrão), `"self"` (quem usa), `"both"`, `"allies"` (os alvos do mesmo lado de quem usa, pela disposição do token, e quem usa) ou `"enemies"` (os alvos do outro lado) |
| Efeito | `immune` | lista de estados que não pegam enquanto o efeito existir (e acabam quando ele chega) |
| Efeito | `fatigueOnEnd` | Fadiga ao acabar (fórmula resolvida ao aplicar) |
| Efeito | `endsWith` | acaba quando o ator perde esse estado |
| Efeito | `consumeOn` | acaba depois do próximo teste desse tipo (`"negotiation"`…, `"check"`), Esquiva (`"dodge"`), dano sofrido (`"damage"`) ou a próxima rolagem de dano de quem o tem (`"attack"`) |
| Efeito | `damageTags`, `onHit` | tags que o dano de quem o tem ganha; estado que esse dano dá em quem atinge (`docs/profissoes.md`) |
| Efeito | chave `eternia.passive.cancel` | Anulação passiva (tag em `cancelTag`) |
| Efeito | condição `hasSkill` | só vale se quem usa tiver a habilidade com esse nome |
| Efeito | condição `notSkill` | só vale se quem usa não tiver a habilidade com esse nome (o Escudo Esculpido do Pictomante, que vira muralha no Caminho da Paisagem) |
| Habilidade | `chooseEffect` | os efeitos são alternativas: quem usa escolhe um |
| Habilidade | `useActions` | `{ type: "fatigue", value }`, `{ type: "doubleStatus", status }`, `{ type: "removeStatus", statuses }` ou `{ type: "switch" }` (quem usa e o primeiro alvo trocam de lugar e de Ódio, só entre aliados: a habilidade básica Switch), com `recipients` (também em itens usáveis) |
| Habilidade | `withItem` | nome de outro item que precisa estar equipado junto (habilidade de item, como um par de espadas) |
| Habilidade | `special` | `"pack"` (Matilha, em `rolls.mjs`) ou `"book"` (O Livro, no renascimento) |
| Habilidade | `minRank`, `choiceOnly`, `rankGrants` | NP mínimo, só por escolha, e habilidades dadas a cada NH |

## Para macros

```js
game.eternia.applyStatus(actor, "burning", { value: 3 });       // como os efeitos de habilidade
game.eternia.applyStatus(actor, "charmed", { from: vampire });   // com origem
game.eternia.conditions.recover(actor, "prone");                 // livra-se gastando a ação da regra
game.eternia.conditions.damage(actor, 4, { reason: "poisoned" }); // dano de condição, com linha no chat
```
