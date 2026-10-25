# Bestiário: referência técnica

As regras, como o Mestre lê, estão na página **XIV. O BESTIÁRIO** do diário AS REGRAS (`src/packs/rules`). Este arquivo diz
onde cada regra está no código, que dados um monstro guarda e como criar um monstro novo. O bestiário do Império é a
entrega 7 do plano do mundo (o capítulo 18 de `Eternia-Mundo/`, fora do repositório).

## Onde fica cada coisa

| Arquivo | O que faz |
|---|---|
| `module/bestiary/drop-table.mjs` | A tabela "Itens Deixados" escrita na descrição (o formato dos livros), lida sem Foundry: as faces (`parseRange`), cada entrada (`parseEntry`: nome, tags, preço, `x3`, ouro "2d6×3", "conforme a Lista de Itens"), a tabela inteira (`parseDropTable`), a descrição sem ela (`withoutDropTable`), o ícone de uma parte pelo nome (`partIcon`) e o preço de um catalisador sem preço (`priceOf`). Usado também por `tools/convert-drops.mjs`. |
| `module/bestiary/drops.mjs` | Os itens deixados: as linhas (`dropRows`: as guardadas no monstro, senão a tabela do texto), a conversão do texto em linhas (`convertTable`), quem derrubou (`fellerOf`), a rolagem (`rollDrops`), a entrega (o inventário de quem derrubou; o que não cabe, uma pilha no chão, por `lootAt` de `piles/pile-operations.mjs`), o cartão (`templates/chat/drop-card.hbs`) e o Desfazer (`undoDrop`). Também a configuração `dropRoll` e os ganchos: a queda (Incapacitado ou Morto chegando, no Mestre principal), `eternia.defeated` (quem derrubou), o fim do combate, o token posto no meio do combate (`noLoot`). |
| `module/bestiary/drop-tab.mjs` | A aba Itens Deixados da ficha de monstro (`templates/monster/drops.hbs`): as linhas pelas faces, os campos das faces, das cópias e da fórmula do ouro, a média da tabela e a do Guia de Criação de Inimigos, a linha de ouro, o botão Rolar (com a escolha de quem recebe) e o Virar dados. Soltar um item físico na ficha cria uma linha (`addDropRow`, chamado por `EterniaMonsterSheet#_onDropItem`). |
| `module/bestiary/pack.mjs` | O Bando: as entradas `bonusVs` com `pack` que o cartão de dano leva (`packBonuses`, chamado por `createDamageCard`) e o bônus contado quando o dano é aplicado (`packBonus`, em `applyDamage`). |
| `module/bestiary/rules.mjs` | As outras regras de monstro: crescer, o limiar (e o uivo que chama), a queda, a couraça, o chamado, a recarga (gastar no uso, o 1d6 da Manutenção), o golpe de uma tag, a Mão Leve, A Proposta (o cartão `templates/chat/offer-card.hbs`), as perdas da tropa, o recuar e o esquecer; os pedidos ao Mestre `bestiaryPickpocket` e `bestiaryOffer`. |
| `module/bestiary/recharge.mjs` | Quais habilidades recarregam e quais estão gastas (lido também por `automation/use.mjs`, que avisa como num limite). |
| `module/bestiary/troop.mjs` | A tropa: o dano em área em dobro (`troopDoubles`, lido por `createDamageCard`… `applyDamage`), quantos do bando restam (`troopLeft`, `troopByHp`) e o limite de alvos do ataque em área dela (`troopTargets`, lido por `automation/use.mjs`). |
| `module/bestiary/named-template.mjs` | O modelo da fera com nome, sem Foundry (`nameBeast`, `markSkill`, `MARKS`): usado pela coroa da ficha e pelo gerador do compêndio. |
| `module/bestiary/named.mjs` | A coroa Dar Nome da ficha de monstro (Mestre): a janela, o Anima-mundi do compêndio de itens, o ator novo. |
| `module/bestiary/spawn.mjs` | Trazer monstros para perto de um token (`spawnNear`): o ator do mundo de um monstro do compêndio (`worldActor`, importado uma vez), os quadrados livres mais próximos, `noLoot` e `calledBy` nos tokens, e o combate. Uma entrada `{ uuids: [...], count }` sorteia cada um numa lista; `loot: true` deixa os itens deles (a fera com nome da Fenda-mãe). O número no nome é contado aqui (`lastNumber`): o `getTokenDocument` do Foundry numera só pelos tokens que já existem, e um lote sairia com o mesmo número. |
| `module/bestiary/save.mjs` | Salvar um Desgarrado (`trySave`, `canBeSaved`): o cartão com o botão Salvar (`templates/chat/save-card.hbs`, a primeira vez que os PV chegam à parte), a Negociação contra a Resistência, o [Pacificado] infinito até o fim da cena, o pedido ao Mestre `bestiarySave` e o Virar Conexão (um item `connection` em quem salvou). |
| `module/bestiary/rifts.mjs` | As Fendas: o relógio, a escrita (`writeRift`), o crescimento, a leva de cada Manutenção, o fechamento e o cartão (`templates/chat/rift-card.hbs`); os pedidos ao Mestre `riftWrite` e `riftGrow`. |
| `module/bestiary/index.mjs` | Registra tudo e a API `game.eternia.bestiary`. |
| `css/bestiary.css` | A aba, o cartão dos itens deixados e o da Fenda (camada `modules`). |
| `tools/convert-drops.mjs` | Converte as tabelas de texto do compêndio em linhas (rodou uma vez, na 0.34; serve para monstros novos escritos no formato dos livros). |

Também tocam no bestiário: `helpers/combat-cards.mjs` (o Bando no cartão de dano; a linha do dano absorvido),
`conditions/realm.mjs` e `conditions/forms.mjs` (o Reino e o `struckStatus` leem também as passivas das habilidades: as
auras dos monstros; o Reino de quem está derrotado no combate não age mais), `conditions/damage.mjs` (a flag `absorb`;
`isAreaAttack`, para a tropa), `automation/use.mjs` (o aviso da recarga e o da tropa), `helpers/effect-formulas.mjs` (a
fórmula `@hpMax`), `piles/pile-operations.mjs` (`lootAt`), `sheets/monster-sheet.mjs` (a aba, o soltar e a coroa) e
`i18n/pt-br.mjs` (as tags [Wolf], Lobo, [Stray], Desgarrado, e as raças dos Desgarrados: [Elf], [Draconic],
[Celestial], [Beastfolk]).

## Os itens deixados

Uma linha da tabela é um item guardado no monstro com `flags.eternia.drop`:

```js
flags.eternia.drop = {
  min, max,      // as faces do 1d6 (1 a 6); ou
  fixed: true,   // cai sempre ("Fixo")
  growth: true,  // cai uma vez por passo de crescimento (flags.eternia.growth do monstro), qualquer que seja o 1d6
  qty,           // cópias (um tíquete vem com essa quantidade)
  gold           // fórmula ("2d6*3"): a linha dá esse ouro, e o item é só o cartão da linha
}
```

No monstro (o token, num monstro sem vínculo):

| Flag | O que guarda |
|---|---|
| `dropped` | já rolou (o id do cartão); o Desfazer tira |
| `noLoot` | chegou depois do começo do combate (posto com o combate andando, chamado, leva de Fenda) ou foi embora por A Proposta: não rola sozinho |
| `felledBy` | o uuid de quem o derrubou (o atacante do cartão de dano que o levou a 0 PV) |
| `growth` | os passos de crescimento (a regra `grow`) |
| `stolenGold` | o ouro que a Mão Leve roubou, que volta nos itens deixados |
| `recharging` | os ids das habilidades gastas (a regra `recharge`); o fim do combate limpa |
| `named` | `{ from, mark, solo, rank }`: a fera com nome, de que monstro e de que Nível ela veio |
| `troopLeft` | quantos do bando restam numa tropa (a regra `troop`); os perdidos não voltam com a cura |
| `fled`, `retreatHeld` | fugiu (a regra `retreat`); tentou fugir e estava preso (o aviso sai uma vez, e de novo em cada Manutenção) |
| `saveOffered`, `saved` | o cartão do Salvar já saiu; `{ by, name }` de quem o salvou (a regra `save`) |
| `started` | o id do combate em que a regra `start` já deu os estados |

- **Quem leva:** quem derrubou (decisão da mesa, 2026-10-25): todos os itens e todo o ouro. Sem ninguém (ou um
  monstro), tudo vai para a pilha. Quem derrubou é `felledBy`, senão a origem de um estado que fere ([Envenenado],
  [Queimando], [Deterioração]…).
- **Os itens** vão com as cópias inteiras (`system.equipped: false`, sem a flag `drop`); o que passa do espaço do
  inventário (`maxSpace − usedSpace`, só os tipos que ocupam espaço) vai para a pilha.
- **O cartão** guarda em `flags.eternia.dropCard` o que foi dado (ids, ouro, a pilha) para o Desfazer.
- **O Guia de Criação de Inimigos** (`EXPECTED_VALUE`: 23, 28, 35, 42, 52, 63, 75, 89, 104 e 120 G do NP 1 ao 10): a aba
  compara a média da tabela com o valor do NP (lacaio: um quarto, fixo; chefe: ×4 no 1d6, mais um Anima-mundi do NP + 1 e
  um [Material-Base] do NP, fixos).

## As regras de monstro

Uma habilidade de monstro traz uma regra em `flags.eternia.monster = { rule, ... }`:

| `rule` | Campos | O que faz | Quem roda |
|---|---|---|---|
| `pack` | `per`, `tag` | Passiva. +`per` de dano por aliado (com a tag, se houver) engajado com o alvo (no mesmo quadrado), contado na aplicação do cartão de dano | o cartão de dano |
| `grow` | `empowered`, `heal`, `at`, `size` | O uso: `growth` +1; um [Fortalecido] de `empowered` × passos (troca o anterior, com `growthEffect`); +`heal` PV; no passo `at`, o token vira `size`×`size` | `eternia.skillUsed`, na janela de quem usou |
| `threshold` | `below`, `statuses`, `summon: { actors, radius }` | Passiva. A primeira vez que os PV caem a `below` do máximo (de pé), os estados até o fim da cena (`flags.eternia.thresholds` guarda as habilidades já disparadas) e o chamado de `summon` (o Uivo; um monstro que veio chamado, com `calledBy` no token, não chama) | `updateActor` na janela que mudou |
| `fall` | `radius` | Passiva. Quando cai (Incapacitado), um cartão de dano da habilidade contra todos a até `radius` Qd, sem Esquiva, com os `hitStatuses` dela | o Mestre principal |
| `cleanse` | `count` | Passiva. No Encerramento, tira `count` Estados Negativos (não os que ele mesmo se deu) | `_onPhaseStart` do Encerramento |
| `summon` | `actors: [{ uuid, count }]`, `radius` | O uso: os monstros saem a até `radius` Qd, no combate, sem itens deixados (`count`: número ou fórmula) | `eternia.skillUsed` |
| `recharge` | `min` | O uso a gasta (`recharging`); em cada Manutenção, um 1d6 por habilidade gasta: `min` (5) ou mais, ela volta. Gasta, o uso avisa (ou bloqueia, pela configuração dos limites) | `eternia.skillUsed`; `_onPhaseStart` da Manutenção |
| `struck` | `tags`, `self: [{ statusId, value }]`, `strip: [statusId]` | Passiva. Um cartão de dano com uma das tags que fere o monstro lhe dá os estados de `self` (o [Fissurado] que soma) e tira os de `strip` (a [Regeneração]) | `eternia.damaged`, na janela que aplicou |
| `pickpocket` | `gold` | Não é regra de habilidade: um efeito de uso em quem usa com `flags.eternia.pickpocket = { gold }` (a Mão Leve, `recipients: "self"`, até o fim da rodada). O próximo cartão de dano dele que fere um personagem pede `bestiaryPickpocket`: o Mestre rola a fórmula ("2d6*5"), tira até o que a bolsa tem, soma em `stolenGold` e apaga a mão | `eternia.damaged`; o Mestre |
| `offer` | `gold` | O uso: um cartão com o ouro (a fórmula, "2d6*10") e Aceitar/Recusar (`flags.eternia.offerCard = { actorUuid, itemName, gold, state, receiver }`). Aceitar acha o personagem de quem clicou (o token selecionado, senão o personagem do jogador; o Mestre escolhe) e pede `bestiaryOffer`: o ouro vai para ele, o monstro ganha `noLoot`, sai do combate (derrotado) e o token some | `eternia.skillUsed`; o Mestre |
| `troop` | `size` (4) | Passiva. Um bando num token (`troop.mjs`): o cartão de dano de um ataque em área (`isAreaAttack`: Área, Linha, vários alvos) o acerta em dobro, depois da Defesa; com 2/3 e 1/3 dos PV, `troopLeft` cai 1 e sai a mensagem; os ataques em área dele com mais alvos que `troopLeft` avisam no uso | o cartão de dano; `updateActor`; `inspectUse` |
| `retreat` | `below` (0.25), `held` | Passiva. Com os PV em `below` do máximo ou menos (de pé), foge: `fled`, `leave` (noLoot, derrotado no combate, token escondido) e o ouro roubado vai com ele. Com um estado de `held` (padrão: Agarrado, Enraizado, Paralisado, Petrificado, Adormecido), fica e avisa (`retreatHeld`); tenta de novo em cada Manutenção | `updateActor`; `_onPhaseStart` da Manutenção |
| `forget` | — | Passiva. Quando um Fôlego Extra dele é gasto (`eternia.revived`), uma das habilidades dele que não são Passivas nem regras, ao acaso, fica [Selada] (o `sealed` com a tag do nome) até o fim da cena | `eternia.revived`, na janela que aplicou o golpe |
| `pulse` | `radius`, `self` | Passiva. No Encerramento, um cartão de dano da habilidade (o `damage` e as tags dela) contra todos a até `radius` Qd e, com `self`, ele mesmo; sem Esquiva. Não age quem está derrotado no combate | `_onPhaseStart` do Encerramento |
| `start` | `statuses` | Passiva. Na Manutenção da rodada 1, os estados até o fim da cena (`started` guarda o combate: uma vez por combate) | `_onPhaseStart` da Manutenção |
| `save` | `below` (0.25) | Passiva. Pode ser salvo (`save.mjs`): na primeira vez que os PV caem a `below`, o cartão com o Salvar; quem está engajado gasta a Ação Maior e rola Negociação (`checks.negotiation`) contra a Resistência dele, pela regra do Teste de Acerto; vencendo, [Pacificado] com `infinite` e `expires: endOfScene`, `noLoot`, `saved` e derrotado no combate | `updateActor`; o botão do cartão; o Mestre |

O resto das mecânicas usa as flags que a Eternia já tinha (`docs/condicoes.md`): `hitStatuses`, `escalate` (a Picada que
Sobe), `useActions` (o empurrar das Investidas, o puxar do Fio de Teia e da Corrente, os [Clones] dos Sósias), `revive` (a
Ferocidade; o Retorno Vazio com `hp: "@hpMax/2"`), `noKill` (O Selo Dói), `realm` (as auras: o Coração de Anima, o Come a
Luz, a Bomba de Fumaça, o Grito do Bando, a fumaça da Bomba das Cavernas), `struckStatus` (o Pelo de Faísca), `immune` (o
Sem Memória), `cover` (a Guarda do Bando), `onUse` com `recipients: "self"` (a [Rigidez] depois da Arte de Cavaleiro e da
Alabarda em Roda, o [Exposto] depois da Investida Azul), `bonusVs` com `consume` (+7 contra a presa [Marcada], que perde a
marca), a [Fraqueza] passiva (`eternia.passive.weakness` com `weaknessTag`: o Medo da Luz) e `consumeOn: "attack"` com
`eternia.roll.damage.dice` (as emboscadas). Uma posição de teste fora do retângulo da cena (`sceneRect`) faz o empurrar parar
na borda: monte as cenas dentro dele.

Um efeito novo, também para qualquer criatura: `flags.eternia.absorb = ["Radiance"]`, a lista das tags que a curam. O dano
de um cartão com uma delas vira cura pela regra da [Inversão] (depois da Defesa e da Anulação), e o resumo diz "Absorve
Radiância" (`conditions/damage.mjs`).

## A fera com nome

`nameBeast(dados, { name, solo, mark, newId, catalyst, t })` (`named-template.mjs`) faz os dados de um monstro novo a partir
dos de outro: Nível +2, atributos +1, Defesas +3, Esquiva e Resistência +1, Iniciativa +1, multiplicador de Ódio +1,
Identificação +2, PV ×1,25 e então ×2 (com o bando) ou ×4 (`solo`), 3 de Destino, [Boss] (sem [Mob]), os ataques +1 no
acerto e +6 no dano, as linhas dos itens deixados ×4 (o ouro, `(fórmula)*4`), o Anima-mundi do Nível + 1 (`catalyst(nível)`
dá os dados do item) e um troféu ([Core Material], 20 × Nível de preço), fixos, o cabeçalho na descrição, a Marca e
`flags.eternia.named`. Os efeitos com estados ficam para trás.

| Marca (`mark`) | O que vira |
|---|---|
| `skin` (Pele de Anima) | passiva com `eternia.passive.cancel` = Nível |
| `eyes` (Olhos da Fenda) | passiva com `system.checks.evasion.dice` +1 e `immune: ["blinded", "frightened", "confused"]` |
| `fury` (Fúria do Peso) | regra `threshold` na metade: [Fúria] = Nível e [Acelerado] |
| `sparks` (Sangue de Faísca) | passiva com `struckStatus` [Eletrificado] = máx(2, Nível ÷ 2) |
| `regen` (Regeneração do Peso) | passiva com o Traço `immortal: { regen: Nível × 2 }` e a regra `struck` da [Chama] que tira a [Regeneração] |
| `breath` (Sopro do Peso) | Ação Maior, Ataque Mágico em área de 2 Qd contra a Resistência, 2d6 + Nível × 6, regra `recharge` (5) |

A coroa (`named.mjs`, só o Mestre) usa a ficha do monstro do mundo, não a cópia do token (o "(2)" do nome, os ferimentos
e os estados), põe o ator novo na mesma pasta e abre a ficha. Os textos vêm de `ETERNIA.Named.*`; o gerador do compêndio
usa o mesmo modelo com os textos do `pt-BR.json` (a Velha Cicatriz).

## As Fendas

Um monstro com `flags.eternia.rift = { dc, wave: [{ uuid, count }], first, grow, growOn, closed }` (a Pequena: 9, 1, a
leva fixa; a Grande: 11, 2, `growOn: "fall"` e `wave: [{ uuids: [...], count: 2 }]`, sorteada a cada Manutenção; a Fenda-mãe:
13, 3, `growOn: "fall"`, `first: [{ uuid: Uivo Violeta, count: 1, loot: true }]` e a leva de `"1d2+1"` sorteada):

- **O relógio** é o Destino (`system.fate`: as escritas que faltam do máximo); o token o mostra com os losangos do Destino
  (`prototypeToken.bar1 = "fate"`, barras sempre à vista).
- **Escrever** (`writeRift(token, writer?)`, o botão do cartão): a até 1 Qd; em combate, no próprio turno e com a Ação
  Maior (`actionsLeft`/`spendAction`); 2d6 + POD contra `dc`; sucesso −1, crítico −2. Quem escreveu num combate guarda
  `flags.eternia.riftWriting = { riftUuid, combatId, round }`; o dano de um cartão na mesma rodada pede `riftGrow`
  (+`grow`, até o máximo). Com `growOn: "fall"`, o dano não conta: só quem escreveu e cai (Incapacitado, por qualquer
  coisa) na mesma rodada a faz crescer (o Mestre principal, no `createActiveEffect`).
- **A leva:** em cada Manutenção do combate da cena, `wave` (ou `first`, na primeira rodada) sai ao lado (`spawnNear`).
- **Fechar:** no 0, `rift.closed`, o cartão, os itens deixados para quem escreveu a última linha
  (`rollDrops(..., { force: true, receiver })`) e o token escondido. A Fenda não rola itens ao cair (só ao fechar), e a
  passiva Rasgo na Escrita (`eternia.passive.cancel` 999) anula o dano.

## Criar um monstro

1. O monstro no compêndio `bestiary`: os números do Guia de Criação de Inimigos (compêndio `rules`) pelo tipo e pelo NP
   (lacaio: PV pela metade e testes fixos, 3 por dado; chefe de grupo: PV ×2, 3 de Destino; sozinho: PV ×4).
2. As habilidades com os campos da automação (`check`, `damage`, as flags acima). Um ataque com [Menor] fica no texto.
3. A tabela: itens guardados com `flags.eternia.drop` (ou, numa ficha do mundo, arrastar itens para a aba).
4. Os monstros do Império foram gerados por um script (fora do repositório; a fonte é o JSON em `src/packs/bestiary`,
   pasta O Império), com ids estáveis. Ícones do Foundry pelo caminho (`icons/...`), como nos itens.

## Para macros

```js
await game.eternia.bestiary.rollDrops(actor, { force: true, receiver: personagem }); // receiver null: a pilha
await game.eternia.bestiary.undoDrop(message);
await game.eternia.bestiary.dropRows(actor);       // as linhas (as guardadas, ou as do texto)
await game.eternia.bestiary.convertTable(actor);   // a tabela do texto vira linhas
await game.eternia.bestiary.spawnNear(token, [{ uuid, count: "1d3" }], { radius: 2 });
await game.eternia.bestiary.writeRift(fendaToken); // escreve com o token selecionado
game.eternia.bestiary.riftState(fendaActor);       // { left, max, dc, grow, closed, wave }
await game.eternia.bestiary.nameMonster(actor);    // a janela Dar Nome (Mestre); devolve o ator novo
game.eternia.bestiary.nameBeast(actor.toObject(), { name, solo, mark, newId, catalyst, t }); // só os dados
game.eternia.bestiary.marks;                       // ["skin", "eyes", "fury", "sparks", "regen", "breath"]
await game.eternia.bestiary.trySave(token, personagemToken); // tenta salvar um Desgarrado (o botão do cartão)
game.eternia.bestiary.canBeSaved(actor);           // já dá para alcançá-lo (1/4 dos PV, de pé, não salvo)
```
