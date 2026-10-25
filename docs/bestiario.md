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
| `module/bestiary/rules.mjs` | As outras regras de monstro: crescer, o limiar, a queda, a couraça e o chamado. |
| `module/bestiary/spawn.mjs` | Trazer monstros para perto de um token (`spawnNear`): o ator do mundo de um monstro do compêndio (`worldActor`, importado uma vez), os quadrados livres mais próximos, `noLoot` e `calledBy` nos tokens, e o combate. |
| `module/bestiary/rifts.mjs` | As Fendas: o relógio, a escrita (`writeRift`), o crescimento, a leva de cada Manutenção, o fechamento e o cartão (`templates/chat/rift-card.hbs`); os pedidos ao Mestre `riftWrite` e `riftGrow`. |
| `module/bestiary/index.mjs` | Registra tudo e a API `game.eternia.bestiary`. |
| `css/bestiary.css` | A aba, o cartão dos itens deixados e o da Fenda (camada `modules`). |
| `tools/convert-drops.mjs` | Converte as tabelas de texto do compêndio em linhas (rodou uma vez, na 0.34; serve para monstros novos escritos no formato dos livros). |

Também tocam no bestiário: `helpers/combat-cards.mjs` (o Bando no cartão de dano), `conditions/realm.mjs` e
`conditions/forms.mjs` (o Reino e o `struckStatus` leem também as passivas das habilidades: as auras dos monstros),
`piles/pile-operations.mjs` (`lootAt`) e `sheets/monster-sheet.mjs` (a aba e o soltar).

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
| `noLoot` | chegou depois do começo do combate (posto com o combate andando, chamado, leva de Fenda): não rola sozinho |
| `felledBy` | o uuid de quem o derrubou (o atacante do cartão de dano que o levou a 0 PV) |
| `growth` | os passos de crescimento (a regra `grow`) |
| `stolenGold` | ouro roubado, que volta nos itens deixados (para as regras de roubo da Parte 2) |

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
| `threshold` | `below`, `statuses` | Passiva. A primeira vez que os PV caem a `below` do máximo (de pé), os estados até o fim da cena (`flags.eternia.thresholds` guarda as habilidades já disparadas) | `updateActor` na janela que mudou |
| `fall` | `radius` | Passiva. Quando cai (Incapacitado), um cartão de dano da habilidade contra todos a até `radius` Qd, sem Esquiva, com os `hitStatuses` dela | o Mestre principal |
| `cleanse` | `count` | Passiva. No Encerramento, tira `count` Estados Negativos (não os que ele mesmo se deu) | `_onPhaseStart` do Encerramento |
| `summon` | `actors: [{ uuid, count }]`, `radius` | O uso: os monstros saem a até `radius` Qd, no combate, sem itens deixados (`count`: número ou fórmula) | `eternia.skillUsed` |

O resto das mecânicas usa as flags que a Eternia já tinha (`docs/condicoes.md`): `hitStatuses`, `escalate`, `useActions`,
`revive`, `noKill`, `realm` (aura), `struckStatus`, `immune`, `cover`, `consumeOn: "attack"` com
`eternia.roll.damage.dice` (a emboscada do Some na Parede).

## As Fendas

Um monstro com `flags.eternia.rift = { dc, wave: [{ uuid, count }], first, grow, closed }`:

- **O relógio** é o Destino (`system.fate`: as escritas que faltam do máximo); o token o mostra com os losangos do Destino
  (`prototypeToken.bar1 = "fate"`, barras sempre à vista).
- **Escrever** (`writeRift(token, writer?)`, o botão do cartão): a até 1 Qd; em combate, no próprio turno e com a Ação
  Maior (`actionsLeft`/`spendAction`); 2d6 + POD contra `dc`; sucesso −1, crítico −2. Quem escreveu num combate guarda
  `flags.eternia.riftWriting = { riftUuid, combatId, round }`; o dano de um cartão na mesma rodada pede `riftGrow`
  (+`grow`, até o máximo).
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
```
