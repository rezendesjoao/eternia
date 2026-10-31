# Bestiário: referência técnica

As regras, como o Mestre lê, estão na página **XIV. O BESTIÁRIO** do diário AS REGRAS (`src/packs/rules`). Este arquivo diz
onde cada regra está no código, que dados um monstro guarda e como criar um monstro novo. O bestiário do Império é a
entrega 7 do plano do mundo (o capítulo 18 de `Eternia-Mundo/`, fora do repositório).

## Onde fica cada coisa

| Arquivo | O que faz |
|---|---|
| `module/bestiary/drop-table.mjs` | A tabela "Itens Deixados" escrita na descrição (o formato dos livros), lida sem Foundry: as faces (`parseRange`), cada entrada (`parseEntry`: nome, tags, preço em Yuld ou no "G" dos livros, `x3`, Yuld "2d6×3", "conforme a Lista de Itens"), a tabela inteira (`parseDropTable`), a descrição sem ela (`withoutDropTable`), o ícone de uma parte pelo nome (`partIcon`) e o preço de um catalisador sem preço (`priceOf`, o Anima-mundi de `economy/data.mjs`). Usado também por `tools/convert-drops.mjs`. |
| `module/bestiary/drops.mjs` | Os itens deixados: as linhas (`dropRows`: as guardadas no monstro, senão a tabela do texto), a conversão do texto em linhas (`convertTable`), quem derrubou (`fellerOf`), a rolagem (`rollDrops`), a entrega (o inventário de quem derrubou; o que não cabe, uma pilha no chão, por `lootAt` de `piles/pile-operations.mjs`), o cartão (`templates/chat/drop-card.hbs`) e o Desfazer (`undoDrop`). Também a configuração `dropRoll` e os ganchos: a queda (Incapacitado ou Morto chegando, no Mestre principal), `eternia.defeated` (quem derrubou), o fim do combate, o token posto no meio do combate (`noLoot` no token; `cameLate` lê o do ator e o do token). |
| `module/bestiary/drop-tab.mjs` | A aba Itens Deixados da ficha de monstro (`templates/monster/drops.hbs`): as linhas pelas faces, os campos das faces, das cópias e da fórmula do Yuld, a média da tabela e a da economia (`economy/data.mjs`), a linha de Yuld, o botão Rolar (com a escolha de quem recebe) e o Virar dados. Soltar um item físico na ficha cria uma linha (`addDropRow`, chamado por `EterniaMonsterSheet#_onDropItem`). |
| `module/bestiary/pack.mjs` | O Bando: as entradas `bonusVs` com `pack` que o cartão de dano leva (`packBonuses`, chamado por `createDamageCard`) e o bônus contado quando o dano é aplicado (`packBonus`, em `applyDamage`). |
| `module/bestiary/rules.mjs` | As outras regras de monstro: crescer, o limiar (e o uivo que chama), a queda, a couraça, o chamado, a recarga (gastar no uso, o 1d6 da Manutenção), o golpe de uma tag, a Mão Leve, A Proposta (o cartão `templates/chat/offer-card.hbs`), as perdas da tropa, o recuar e o esquecer; os pedidos ao Mestre `bestiaryPickpocket` e `bestiaryOffer`. |
| `module/bestiary/recharge.mjs` | Quais habilidades recarregam e quais estão gastas (lido também por `automation/use.mjs`, que avisa como num limite). |
| `module/bestiary/troop.mjs` | A tropa: o dano em área em dobro (`troopDoubles`, lido por `createDamageCard`… `applyDamage`), quantos do bando restam (`troopLeft`, `troopByHp`) e o limite de alvos do ataque em área dela (`troopTargets`, lido por `automation/use.mjs`). |
| `module/bestiary/named-template.mjs` | O modelo da fera com nome, sem Foundry (`nameBeast`, `markSkill`, `MARKS`): usado pela coroa da ficha e pelo gerador do compêndio. |
| `module/bestiary/named.mjs` | A coroa Dar Nome da ficha de monstro (Mestre): a janela, o Anima-mundi do compêndio de itens, o ator novo. |
| `module/bestiary/spawn.mjs` | Trazer monstros para perto de um token (`spawnNear`): o ator do mundo de um monstro do compêndio (`worldActor`, importado uma vez), os quadrados livres mais próximos, `noLoot` e `calledBy` nos tokens, e o combate. Uma entrada `{ uuids: [...], count }` sorteia cada um numa lista; `loot: true` deixa os itens deles (a fera com nome da Fenda-mãe). O número romano do nome ("Worg II") é contado aqui (`freeNumber`, de `canvas/token-defaults.mjs`): o `getTokenDocument` só vê os tokens que já existem, e um lote sairia com o mesmo número. |
| `module/bestiary/save.mjs` | Salvar um Desgarrado (`trySave`, `canBeSaved`): o cartão com o botão Salvar (`templates/chat/save-card.hbs`, a primeira vez que os PV chegam à parte), a Negociação contra a Resistência, o [Pacificado] infinito até o fim da cena, o pedido ao Mestre `bestiarySave` e o Virar Conexão (um item `connection` em quem salvou). |
| `module/bestiary/rifts.mjs` | As Fendas: o relógio, a escrita (`writeRift`), o crescimento, a leva de cada Manutenção, o fechamento e o cartão (`templates/chat/rift-card.hbs`); os pedidos ao Mestre `riftWrite` e `riftGrow`. |
| `module/bestiary/disguise.mjs` | O disfarce (`disguiseOf`, `isDisguised`, `reveal`, `disguise`): o token novo nasce escondido (`hidden`), com a arte e o lado dele (`preCreateToken`); revela quando ele usa uma habilidade (antes do cartão: `EterniaItem#ItemThrow`) ou se move (um quadrado basta), quando o Mestre mostra o token (o olho do HUD), quando alguém do outro lado pisa num quadrado dele (os estados de `touch`) e quando um cartão de ataque ou de dano o alcança; revelado, a linha no chat, o combate da cena (o rastreador esconde os combatentes dele enquanto disfarçado) e o gancho `eternia.revealed`; a regra `conceal` (a habilidade que o esconde de novo). Um token disfarçado antes da 0.47.1 (com a imagem e o nome da regra e a disposição secreta) volta à aparência dele ao se revelar. O pedido ao Mestre `bestiaryReveal`. |
| `module/bestiary/engulf.mjs` | O engolir (`engulf`, `release`, `insideOf`, `engulfRule`): o cartão de dano da habilidade que engole põe o alvo [Agarrado] dentro do monstro (o efeito com `engulfed` e `escape`, o token nos quadrados dele), quem está dentro anda com o monstro, o ácido de cada Manutenção (`_onPhaseStart`), o golpe que atravessa e acerta quem está dentro, e a saída (o token vai para o quadrado livre mais perto quando o efeito acaba; o monstro que sai da cena solta todos). |
| `module/bestiary/split.mjs` | O dividir (`splitRule`, `piecesOf`): o cartão de dano físico que fere o monstro o divide, a metade dos PV num pedaço novo ao lado (`spawnNear`, sem itens deixados), a família de pedaços (`split` nos tokens) e o limite. |
| `module/bestiary/rust.mjs` | A ferrugem e o metal (`isMetal`, `wornMetal`, `metalWeapon`, `statusList`): o golpe da habilidade que enferruja dá os estados só a quem veste metal. Lido também por `contact.mjs`. |
| `module/bestiary/contact.mjs` | O contato: o estado em quem fere o monstro, só com golpe corpo a corpo (`close`) ou só com arma de metal (`metal`), infinito com `infinite`. |
| `module/bestiary/latch.mjs` | O grudar (a regra `latch`): o golpe que fere gruda o monstro (o efeito no alvo, o token no quadrado dele e o cartão `templates/chat/latch-card.hbs`), a sucção da Manutenção (o alvo perde PV pelo `takeDamage`, o monstro se cura pelo `takeHealing`), o token que vai junto quando o alvo anda (`updateToken`, `eterniaLatch` nos movimentos que não soltam), o Arrancar (`ripOff`: a Ação Menor de quem toca o alvo) e as quedas; o pedido ao Mestre `bestiaryLatch`. |
| `module/bestiary/gaze.mjs` | O olhar (a regra `gaze`): o cartão `templates/chat/gaze-card.hbs` no começo do turno de quem o olhar alcança, o Encarar (a Resistência contra o olhar, pela regra do Teste de Acerto, e o estado seguinte de `steps`), o Desviar (o efeito Olhos Desviados, −1d6 nos ataques até o fim do turno), o cartão sem resposta encarado no fim do turno (`eternia.processEnd`); o pedido ao Mestre `bestiaryGaze`. |
| `module/bestiary/lure.mjs` | O atrair (a regra `lure`): o [Encantado] de quem tem a regra faz o encantado andar até ele no começo do turno (a Ação de Movimento, a Velocidade, quadrado a quadrado até uma parede ou o quadrado dele), e acaba com qualquer dano (`eternia.damaged` e a perda de PV de uma condição) ou quando ele cai. |
| `module/bestiary/rise.mjs` | Os mortos que levantam: a regra `rise` (quem cai por um golpe do monstro fica marcado, `rising`, e levanta como ele na Manutenção seguinte se ainda estiver caído), a `raise` (o uso ergue os caídos em volta) e `riseAs` (o corpo some, o monstro novo fica no quadrado dele, do lado de quem o ergueu, com o nome "X de Fulano", e o corpo fica [Morto]); o corpo que volta quando o erguido cai (ou o token dele some) e quando o [Morto] de um personagem acaba; os ligados (`bound`) que caem com quem os ergueu. |
| `module/bestiary/stack.mjs` | O estado que soma (a regra `stack`): no `preCreateActiveEffect`, o efeito de um estado com Valor dado por um monstro com a regra soma o Valor que o alvo já tem (o campo então guarda a soma). |
| `module/bestiary/rampage.mjs` | A Fúria Sanguinária (a regra `rampage`): quem derruba alguém (`eternia.defeated`) ganha na hora a ação da habilidade na janela de ações (`flags.eternia.window`, de `conditions/window.mjs`, uma a mais por queda), pedida ao Mestre (`bestiaryRampage`); o aviso no uso sem essa ação (`rampageIssues`, lido por `automation/use.mjs`); e a ação da janela que vai junto quando a habilidade usa uma ação do turno. |
| `module/bestiary/rush.mjs` | O avançar (o use action `rush`, por `registerUseAction`): o token de quem usa vai na direção do alvo, até o quadrado dele, e as contas de quadrados que o arremessar também usa (`cellOf`, `cellsOf`, `nearestCell`, `overlaps`, `clampCell`, `sceneToken`). |
| `module/bestiary/surprise.mjs` | O Golpe Surpresa (a regra `surprise`): quem ainda não agiu na rodada (`notActed`) e os dados a mais da rolagem de dano (`surpriseBonuses`, lido por `helpers/skill-rolls.mjs`). |
| `module/bestiary/throw.mjs` | O Arremessar (a regra `throw`): a janela do Mestre (contra quem, ou em que linha), o voo do token, o cartão do impacto (`flags.eternia.damage.impact`) e o pedido ao Mestre `bestiaryThrow`; `throwCreature` para macros. |
| `module/bestiary/blink.mjs` | O teleporte (a regra `blink`): o salto às costas do alvo, ou da presa (`preyNear`: a criatura do outro lado com mais Ódio, depois a mais perto), no quadrado dela (`backOf`), com o movimento "blink" do Foundry (`jump`); a distância como os cartões de ataque contam (`squaresBetween`). A fase volta pelo mesmo caminho. |
| `module/bestiary/likeness.mjs` | Tomar o rosto (a regra `copy`): o token copia o de quem ele toca (`copyLook`: a imagem, o nome, o tamanho, o anel e a borda; o rosto dele fica em `likeness`) e volta (`restoreLook`) quando ele cai ou fica [Identificado], com a linha no chat. Também refaz o nome e a imagem dos combatentes de um token que muda de nome ou de imagem (o rastreador guardava os antigos). |
| `module/bestiary/phase.mjs` | A fase (a regra `phase`): sumir no fim do turno (`eternia.processEnd`), a nota do cartão de dano (`phasedNote`, lida por `conditions/damage.mjs`), a volta no começo do turno (o `active` do combate), a janela de uma Ação Maior de quem está em Espera (`held`) e a Ação Maior do turno que ela gasta (o Desfazer devolve); a volta quando cai ou o combate acaba. |
| `module/bestiary/halve.mjs` | O dano pela metade (o efeito `halve`: a Pele de Pedra da Gárgula), lido pelo cartão de dano (`halvedBy`). |
| `module/bestiary/nearest.mjs` | A regra `nearest`: os mais perto (`nearestTo`: os quadrados entre os tokens, `squaresBetween`, contados do quadrado mais perto de cada um), se o monstro mira neles agora (`aimsNearest`), o aviso do uso (`nearestIssues`) e o alvo que o Mestre principal marca no começo do turno dele, com a linha no chat. |
| `module/bestiary/possess.mjs` | O possuir (`flags.eternia.possess` numa habilidade): entrar (o [Dominado] do possuído com `renew`, o token escondido no quadrado dele, o [Ausente]), o dano dividido (com o `felledBy`), a saída (as tags de `expel` num cartão de dano ou de cura, a Resistência no fim do turno, as quedas, o [Dominado] que sai de outro jeito), o token que acompanha o possuído, o aviso do uso e o pedido ao Mestre `bestiaryPossess`. |
| `module/bestiary/heads.mjs` | A regra `heads`: as cabeças (`headsOf`), as Ações Maiores a mais (`extraMajors`, lido por `conditions/actions.mjs`), o corte a cada quinto dos PV, o fogo que cauteriza (um cartão de dano com a tag; o [Queimando], a [Chama Negra] e o [Pavio] do Encerramento), os tocos que nascem em dobro na Manutenção, a linha do começo do turno e o aviso da Ação Maior livre (`headsIssues`). |
| `module/bestiary/use-checks.mjs` | O que essas regras dizem contra o uso de uma habilidade (`monsterUseIssues`, lido por `automation/use.mjs`, ao lado do aviso da tropa): o mais perto, as cabeças, a possessão e a reverência. |
| `module/bestiary/breed.mjs` | A ninhada (a regra `breed`): na Manutenção de cada rodada a partir da segunda, os da mesma espécie (a fonte do compêndio do token) de pé e sem ferimento formam pares a até `radius` Qd e cada par faz mais um ao lado (`spawnNear`, sem itens deixados), até `max` na cena; a linha no chat. |
| `module/bestiary/curse.mjs` | A maldição (a regra `curse`): o cartão de dano da habilidade que fere dá os estados com `flags.eternia.curseOf` (o uuid do monstro); quando aquele monstro cai (o Mestre principal), os efeitos com a marca dele saem de todos os atores do mundo e das cenas, com a linha no chat (`cursesOn`). |
| `module/bestiary/shuffle.mjs` | A escrita instável (a regra `shuffle`): na Manutenção de cada rodada, uma cópia de um dos efeitos da habilidade, ao acaso e nunca a mesma duas vezes seguidas, no monstro (`flags.eternia.shuffled`), no lugar da anterior; o fim do combate a tira (`shuffledOf`). |
| `module/bestiary/devour.mjs` | Engolir o equipamento (a regra `devour`): o cartão de dano da habilidade que fere um personagem tira dele a primeira peça vestida de `types` (escudo, depois armadura): `system.equipped` falso e `flags.eternia.devoured = { by, name }`; vestir de novo é recusado (`preUpdateItem`, com aviso); a queda do monstro e o fim do combate devolvem (`giveBack`, também na API). |
| `module/bestiary/spill.mjs` | O derrame (a regra `spill`): a primeira vez na cena que o monstro ganha um dos estados de `when`, ganha também os de `statuses` até o fim da cena (`flags.eternia.spilled` guarda a cena); o kappa derrubado, a coisa sem nome identificada. |
| `module/bestiary/thirst.mjs` | A sede (a regra `thirst`): o monstro que não tirou PV de ninguém na rodada seca um passo no Encerramento (os estados de `steps`, com `thirstStep`) e cai depois do último; ferir alguém zera (o pedido ao Mestre `bestiaryThirst`, porque quem aplica o dano pode não ser dono do monstro). Guarda `flags.eternia.thirst = { combat, round, dry }`. |
| `module/bestiary/bow.mjs` | A reverência (a regra `bow`): as habilidades hostis do monstro não miram quem está [Derrubado] (`bowIssues`, lido por `use-checks.mjs`, pelos limites das condições); com `leave`, no Encerramento em que todos do outro lado no combate estão [Derrubados] ou caídos, ele vai embora (derrotado no combate, token escondido, `noLoot`). |
| `module/bestiary/migration.mjs` | A migração do mundo (`helpers/migrations.mjs`, versão 1 na 0.37): os monstros do Império que o mundo já tinha trazido do compêndio (`_stats.compendiumSource`) ganham os nomes da 0.37 (o ator, o token-modelo, os tokens nas cenas, os nomes nos textos e nos itens, pela mesma troca que o compêndio fez) e a arte (os ícones do Foundry trocados pelo token; nas Fendas, a luz). O que o Mestre mudou fica. Versão 2 (0.42): o dano dos 17 monstros que subiram; versão 3 (0.44): o (Menor) e o [Destino 1] como dados; versão 4 (0.47.1): o disfarce que esconde o token (os textos das habilidades de disfarce e da pose de pedra, a frase da nota da Gárgula e do Mímico, e os tokens disfarçados do jeito antigo nas cenas, que voltam à arte deles, escondidos). |
| `module/bestiary/index.mjs` | Registra tudo e a API `game.eternia.bestiary`. |
| `css/bestiary.css` | A aba, o cartão dos itens deixados e o da Fenda (camada `modules`). |
| `tools/convert-drops.mjs` | Converte as tabelas de texto do compêndio em linhas (rodou uma vez, na 0.34; serve para monstros novos escritos no formato dos livros). |

Também tocam no bestiário: `helpers/combat-cards.mjs` (o Bando no cartão de dano; a linha do dano absorvido; `critical`
no cartão de dano, quando o Teste de Acerto do ataque foi crítico; o dano pela metade de `halve`, depois do [Petrificado]),
`conditions/realm.mjs` e `conditions/forms.mjs` (o Reino e o `struckStatus` leem também as passivas das habilidades: as
auras dos monstros; o Reino de quem está derrotado no combate não age mais), `conditions/damage.mjs` (a flag `absorb`;
`isAreaAttack`, para a tropa; o Fôlego Extra com chance, `chance` e `not` do `revive`; a fase em `beforeDamage`: nada
chega), `conditions/recovery.mjs` e `conditions/escape.mjs` (o Livrar-se pergunta o teste do efeito com `escape`: a saída
de quem foi engolido), `conditions/window.mjs` (a chave da janela, `keyOf`, exportada para a Fúria Sanguinária),
`conditions/actions.mjs` (uma Ação Maior por cabeça, `extraMajors`), `automation/use.mjs` (o aviso da recarga, o da
tropa, o da Fúria Sanguinária e os de `bestiary/use-checks.mjs`), `automation/round.mjs` (as linhas do Fôlego que não
segurou no Encerramento), `helpers/skill-rolls.mjs` (o Golpe Surpresa na rolagem de dano), `helpers/effect-formulas.mjs`
(a fórmula `@hpMax`), `piles/pile-operations.mjs` (`lootAt`), `sheets/monster-sheet.mjs` (a aba, o soltar e a coroa) e
`i18n/pt-br.mjs` (as tags [Wolf], Lobo, [Stray], Desgarrado, [Gnoll], [Orc], [Ogre], Ogro, e as raças dos Desgarrados:
[Elf], [Draconic], [Celestial], [Beastfolk]).

## Os itens deixados

Uma linha da tabela é um item guardado no monstro com `flags.eternia.drop`:

```js
flags.eternia.drop = {
  min, max,      // as faces do 1d6 (1 a 6); ou
  fixed: true,   // cai sempre ("Fixo")
  growth: true,  // cai uma vez por passo de crescimento (flags.eternia.growth do monstro), qualquer que seja o 1d6
  qty,           // cópias (um tíquete vem com essa quantidade)
  gold           // fórmula ("2d6*3"): a linha dá esse Yuld (o campo guarda o nome antigo), e o item é só o cartão da linha
}
```

No monstro (o token, num monstro sem vínculo):

| Flag | O que guarda |
|---|---|
| `dropped` | já rolou (o id do cartão); o Desfazer tira |
| `noLoot` | chegou depois do começo do combate (chamado, leva de Fenda; o token posto com o combate andando leva a flag no próprio token) ou foi embora por A Proposta: não rola sozinho |
| `felledBy` | o uuid de quem o derrubou (o atacante do cartão de dano que o levou a 0 PV) |
| `growth` | os passos de crescimento (a regra `grow`) |
| `stolenGold` | o Yuld que a Mão Leve roubou, que volta nos itens deixados |
| `recharging` | os ids das habilidades gastas (a regra `recharge`); o fim do combate limpa |
| `named` | `{ from, mark, solo, rank }`: a fera com nome, de que monstro e de que Nível ela veio |
| `troopLeft` | quantos do bando restam numa tropa (a regra `troop`); os perdidos não voltam com a cura |
| `fled`, `retreatHeld` | fugiu (a regra `retreat`); tentou fugir e estava preso (o aviso sai uma vez, e de novo em cada Manutenção) |
| `saveOffered`, `saved` | o cartão do Salvar já saiu; `{ by, name }` de quem o salvou (a regra `save`) |
| `started` | o id do combate em que a regra `start` já deu os estados |
| `rising` | `{ uuid, by, combat, round }`: caiu pelo golpe de um monstro com a regra `rise` e levanta como `uuid` na próxima Manutenção desse combate (no token do corpo; sai quando ele volta a ter PV, quando levanta e no fim do combate) |
| `risen` | o uuid do token do monstro em que o corpo levantou (no token do corpo): não levanta de novo; num personagem, sai quando o [Morto] acaba |
| `risenFrom` | o uuid do token do corpo (no token do monstro que levantou): quando ele cai, ou o token some, o corpo volta ao chão no lugar dele |
| `disguise` | no token: `{ hidden: true }` enquanto disfarçado (escondido pelo disfarce); sai quando ele se revela. Nos disfarçados antes da 0.47.1, a aparência dele (`{ name, img, scaleX, scaleY, disposition }`) |
| `revealed` | no token: já se revelou (uma cópia dele não se disfarça de novo) |
| `split` | no token: a família de pedaços (o uuid do token do primeiro pedaço) |
| `phased` | `{ combatId, round }`: fora de fase (a regra `phase`); o token está escondido |
| `likeness` (no token) | `{ original, from, name }`: o rosto que ele usa (a regra `copy`), de quem, e o próprio, para voltar |
| `heads` | `{ n, stumps, cut, other }`: as cabeças, os tocos abertos, os quintos dos PV já cortados e a rodada em que a Ação Maior livre foi usada (a regra `heads`) |
| `possessing` | `{ host, effect, absent }`: o token de quem ele possui e os dois efeitos (o [Dominado] do possuído, o [Ausente] dele) |

- **Quem leva:** quem derrubou (decisão da mesa, 2026-10-25): todos os itens e todo o Yuld. Sem ninguém (ou um
  monstro), tudo vai para a pilha. Quem derrubou é `felledBy`, senão a origem de um estado que fere ([Envenenado],
  [Queimando], [Deterioração]…).
- **Os itens** vão com as cópias inteiras (`system.equipped: false`, sem a flag `drop`); o que passa do espaço do
  inventário (`maxSpace − usedSpace`, só os tipos que ocupam espaço) vai para a pilha.
- **O cartão** guarda em `flags.eternia.dropCard` o que foi dado (ids, Yuld, a pilha) para o Desfazer.
- **A economia** (`economy/data.mjs`, docs/matematica.md seção 9; `EXPECTED_VALUE` = o comum: 25, 31, 38, 46, 56, 68, 81, 95, 111 e 129 Yuld do NP 1 ao 10): a aba
  compara a média da tabela com o valor do NP (lacaio: um encontro ÷ 6, fixo; chefe: ×4 no 1d6, mais um Anima-mundi do NP + 1 e
  um [Material-Base] do NP, fixos).

## O XP

Cada criatura do bestiário traz o XP que dá em `flags.eternia.xp` (desde a 0.53): o peso dela num encontro × o XP de um
comum do NP dela (`monsterXpValue` de `module/experience/data.mjs`: o comum 1, o lacaio ⅔, as de "3 por encontro" 4/3, a
tropa 2, o chefe 4, o chefe solo 6; a Fenda, 1 a 3 encontros). O valor sai de `xp-monstros.mjs` (o mesmo `dropPlan` dos
itens deixados) e é escrito por `economia-aplicar.mjs`, junto com os drops: criatura nova, rode os dois. Sem a flag, o
sistema calcula pelo NP e pelas tags (Chefe, Lacaio). A fera com nome ganha o XP de um chefe do NP dela no
`named-template.mjs`. Quem leva, o grupo, o chefe e o cartão: `module/experience/award.mjs` e a seção 10 de
`docs/matematica.md`.

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
| `struck` | `tags`, `self: [{ statusId, value }]`, `strip: [statusId]` | Passiva. Um cartão de dano com uma das tags que fere o monstro, ou que ele come (o efeito `absorb`: o dano vira cura), lhe dá os estados de `self` (o [Fissurado] que soma; o [Acelerado] do Arbusto Errante) e tira os de `strip` (a [Regeneração]) | `eternia.damaged`, na janela que aplicou |
| `pickpocket` | `gold` | Não é regra de habilidade: um efeito de uso em quem usa com `flags.eternia.pickpocket = { gold }` (a Mão Leve, `recipients: "self"`, até o fim da rodada). O próximo cartão de dano dele que fere um personagem pede `bestiaryPickpocket`: o Mestre rola a fórmula ("2d6*10"), tira até o que a bolsa tem, soma em `stolenGold` e apaga a mão | `eternia.damaged`; o Mestre |
| `offer` | `gold` | O uso: um cartão com o Yuld (a fórmula; a metade do que o monstro deixa, `OFFER_SHARE`) e Aceitar/Recusar (`flags.eternia.offerCard = { actorUuid, itemName, gold, state, receiver }`). Aceitar acha o personagem de quem clicou (o token selecionado, senão o personagem do jogador; o Mestre escolhe) e pede `bestiaryOffer`: o Yuld vai para ele, o monstro ganha `noLoot`, sai do combate (derrotado) e o token some | `eternia.skillUsed`; o Mestre |
| `troop` | `size` (4) | Passiva. Um bando num token (`troop.mjs`): o cartão de dano de um ataque em área (`isAreaAttack`: Área, Linha, vários alvos) o acerta em dobro, depois da Defesa; com 2/3 e 1/3 dos PV, `troopLeft` cai 1 e sai a mensagem; os ataques em área dele com mais alvos que `troopLeft` avisam no uso | o cartão de dano; `updateActor`; `inspectUse` |
| `retreat` | `below` (0.25), `held` | Passiva. Com os PV em `below` do máximo ou menos (de pé), foge: `fled`, `leave` (noLoot, derrotado no combate, token escondido) e o Yuld roubado vai com ele. Com um estado de `held` (padrão: Agarrado, Enraizado, Paralisado, Petrificado, Adormecido), fica e avisa (`retreatHeld`); tenta de novo em cada Manutenção | `updateActor`; `_onPhaseStart` da Manutenção |
| `forget` | — | Passiva. Quando um Fôlego Extra dele é gasto (`eternia.revived`), uma das habilidades dele que não são Passivas nem regras, ao acaso, fica [Selada] (o `sealed` com a tag do nome) até o fim da cena | `eternia.revived`, na janela que aplicou o golpe |
| `pulse` | `radius`, `self` | Passiva. No Encerramento, um cartão de dano da habilidade (o `damage` e as tags dela) contra todos a até `radius` Qd e, com `self`, ele mesmo; sem Esquiva. Não age quem está derrotado no combate | `_onPhaseStart` do Encerramento |
| `start` | `statuses` | Passiva. Na Manutenção da rodada 1, os estados até o fim da cena (`started` guarda o combate: uma vez por combate) | `_onPhaseStart` da Manutenção |
| `save` | `below` (0.25) | Passiva. Pode ser salvo (`save.mjs`): na primeira vez que os PV caem a `below`, o cartão com o Salvar; quem está engajado gasta a Ação Maior e rola Negociação (`checks.negotiation`) contra a Resistência dele, pela regra do Teste de Acerto; vencendo, [Pacificado] com `infinite` e `expires: endOfScene`, `noLoot`, `saved` e derrotado no combate | `updateActor`; o botão do cartão; o Mestre |
| `disguise` | `name`, `touch: [{ statusId, value }]`, `reveal` (`["act", "touch"]`) | Passiva. O token novo nasce escondido, com a arte e o lado dele: o Mestre o vê transparente, os jogadores não o veem no mapa nem no rastreador e não o miram; `name` é o que o Mestre descreve (o baú, a moita), que a linha do chat usa. Revela com `"act"` quando usa uma habilidade (antes do cartão) ou se move sozinho (um quadrado basta), e com `"touch"` quando um token do outro lado para num quadrado dele (que ganha os estados de `touch`, ele como origem) ou um cartão de ataque ou de dano o alcança. O Mestre mostrar o token (o olho do HUD) também o revela, seja qual for a regra. Disfarçado, os combatentes dele ficam escondidos do rastreador dos jogadores. Revelado: o token aparece, `revealed`, a linha no chat, o rastreador, o combate iniciado da cena e `eternia.revealed(token, { by, why })`. `eterniaNoDisguise` na criação do token o faz nascer como ele mesmo | `preCreateToken`, `preCreateCombatant`; `EterniaItem#ItemThrow`; `updateToken`, `eternia.attack`, `eternia.damaged` na janela que viu; o Mestre (`bestiaryReveal`) |
| `conceal` | — | O uso esconde de novo quem a usa (o disfarce da regra `disguise` dele), no mapa e no rastreador; usá-la não o revela antes (a pose de pedra da Gárgula) | `eternia.skillUsed`, no Mestre |
| `engulf` | `acid`, `tag`, `escape: { check, dc }`, `max`, `through`, `statuses` | Na habilidade de ataque. O cartão de dano dela que tira PV ou Barreira engole o alvo (não maior que ele, enquanto couber: `max`, 0 sem limite): [Agarrado] por ele num efeito com `engulfed = { by, item }` e `escape` (padrão: Atletismo contra 10); os `statuses` vêm junto (`endsWith: "grappled"`, infinitos); o token vai para dentro e anda com ele. Em cada Manutenção, quem está dentro sofre `acid` como dano direto (Anulação de `tag`). Um golpe de outro, que não é em área, que o fere acerta um de dentro com 1d6 até `through` (2; 0 nunca): os PV que ele perdeu, direto. Sai pelo teste, quando ele cai e no fim da cena; o token vai para o quadrado livre mais perto | `eternia.damaged` na janela que aplicou; `_onPhaseStart` da Manutenção; `updateToken` e `deleteActiveEffect` na janela que mudou |
| `split` | `types` (`["physical"]`), `not` (`["Flame"]`), `max` (4), `min` (2) | Passiva. O cartão de dano de um dos `types`, sem as tags de `not`, que fere o monstro o divide: ele fica com metade dos PV que sobravam (arredondada para cima) e um pedaço novo sai ao lado com a outra metade (PV e PV máximos), no combate, sem itens deixados. Até `max` pedaços da família na cena; com menos de `min` PV, não divide | `eternia.damaged`, no Mestre (uma divisão da família por vez) |
| `rust` | `statuses` | Na habilidade de ataque. O cartão de dano dela que chega dá os estados só a quem veste armadura ou escudo de metal (`isMetal`: a flag `metal` do item; senão as tags, [Lâmina], [Katana], [Lança], [Contundente], [Armadura Pesada] sim, [Cajado], [Arco], [Besta], [Chicote], [Instrumento], [Armadura Leve] não; senão o nome: ferro, aço, malha, cota, escamas…) | `eternia.damaged`, na janela que aplicou |
| `contact` | `statuses`, `close`, `metal`, `infinite` | Passiva. Quem o fere com um cartão de dano ganha os estados, ele como origem: só com ataque corpo a corpo (`close`) ou só com arma de metal (`metal`: a arma principal, num ataque com arma). Com `infinite`, duram até o fim da cena ou uma Ação Maior no Livrar-se | `eternia.damaged`, na janela que aplicou |
| `latch` | `drain` (número ou fórmula do monstro) | Na habilidade de ataque. O cartão de dano dela que tira PV ou [Barreira] de alguém do outro lado gruda o monstro nele: um efeito no alvo com `flags.eternia.latch = { tokenUuid, actorUuid, drain, item, messageId }` (o ícone do monstro no token dele, até o fim da cena), o token do monstro no quadrado do alvo e o cartão com o Arrancar (`flags.eternia.latchCard`). Em cada Manutenção, o alvo perde `drain` PV (dano direto, pela [Barreira]) e o monstro recupera o que ele perdeu; quando o token do alvo anda (sozinho ou forçado), o do monstro vai junto, do mesmo jeito (animado ou na hora; `eterniaLatch`). Solta quando alguém o arranca (o alvo, ou quem toca o alvo, gasta a Ação Menor no próprio turno; ele cai num quadrado livre ao lado), quando o token dele se move por outro motivo, quando um dos dois cai e no fim da cena. Um monstro gruda em um alvo por vez | `eternia.damaged` → o Mestre; `_onPhaseStart` da Manutenção; `updateToken` e a queda, no Mestre principal |
| `gaze` | `radius` (3), `dice` (2), `mod`, `steps` (`["slowed", "petrified"]`) | Passiva. Quando um inimigo (pela disposição do token) que não está [Cego] começa o turno a até `radius` Qd do monstro (contados como nos cartões de ataque), o cartão do olhar (`flags.eternia.gazeCard`) pergunta: Encarar (a Resistência dele, com as condições do Teste de Esquiva, contra `dice`d6 + `mod`, pela regra do Teste de Acerto; na falha, o primeiro estado de `steps` que ele ainda não tem: o primeiro até o fim da cena, infinito, que sai com uma Ação Maior; o último pela regra dele, com o monstro como origem) ou Desviar (um efeito com `flags.eternia.gazeAverted` e `eternia.roll.check.dice` −1 nas habilidades com tag de ataque, até o fim do turno). Responde quem controla a criatura, ou o Mestre; o cartão aberto no fim do turno é encarado. Um cartão por turno, do monstro mais perto | `updateCombat` (o começo do turno), no Mestre principal; o botão → `bestiaryGaze`; `eternia.processEnd` |
| `lure` | — | Passiva. Todo [Encantado] que o monstro dá (ele é a origem) atrai: no começo do turno do encantado, em combate, ele gasta a Ação de Movimento e anda a Velocidade dele na direção do monstro, quadrado a quadrado (movimento forçado; para numa parede, na borda da cena ou no quadrado do monstro); sem a Ação de Movimento ([Lento]) ou preso (Velocidade 0, [Enraizado], [Agarrado]), fica. Qualquer dano acaba com ele, de qualquer um (o cartão de dano que tira PV ou [Barreira], o dano de uma condição); a queda do monstro também, e a Ação Maior do [Encantado] | `updateCombat` (o começo do turno) e a queda, no Mestre principal; o dano, na janela que o causou |
| `rise` | `uuid` (o próprio monstro, se faltar) | Passiva. Quem cai a 0 PV por um cartão de dano dele fica marcado (`rising`) e o chat avisa; na Manutenção seguinte do combate, se ainda estiver caído, levanta como `uuid` (`riseAs`): o token do corpo some, o novo fica no quadrado, do lado dele, com `noLoot`, e o corpo fica [Morto]. Volta a ter PV antes, não levanta (e o chat diz). Quando o novo cai, o corpo volta ao chão (a Sombra que Fica) | `eternia.defeated`, na janela que aplicou (a marca); `_onPhaseStart` da Manutenção (o Mestre) |
| `raise` | `uuid`, `radius` (4), `bound` | O uso: cada criatura caída (0 PV, Incapacitado ou Morto) a até `radius` Qd dele, de qualquer lado, sem os corpos que já levantaram, levanta como `uuid` (`riseAs`, do lado dele, `calledBy` ele). Com `bound`, quando ele cai, todos os tokens com `calledBy` dele (os erguidos e os chamados) caem (0 PV e Incapacitado) | `eternia.skillUsed` (o Mestre); a queda dele (o Mestre principal) |
| `stack` | `statuses` | Os estados desses ids, com Valor e sem acúmulo próprio no catálogo, que o monstro dá (o golpe, um efeito com a origem nele) somam ao Valor que o alvo já tem, sem teto (o [Enfraquecido] da Sombra). Pode ficar na própria habilidade do golpe | `preCreateActiveEffect`, na janela que cria o efeito |
| `rampage` | — | A habilidade é o golpe da fúria. Quando um cartão de dano do monstro leva outra criatura a 0 PV, com ele de pé num combate começado, ele ganha uma ação do Momento da habilidade (Menor: uma Ação Menor) na janela de ações (`flags.eternia.window`), até o fim do turno em curso; uma a mais por criatura derrubada. Sem essa ação, o uso da habilidade avisa (ou bloqueia, pela configuração dos limites); usada com uma ação do turno, a da janela vai junto: um golpe por queda | `eternia.defeated` (o pedido `bestiaryRampage` ao Mestre); `inspectUse`; `eternia.skillUsed` |
| `surprise` | `dice` (2) | Passiva. +`dice`d6 nas rolagens de dano do monstro contra quem ainda não agiu na rodada (num combate começado, quem não é Pós-Ação nem está no turno); todos os alvos da rolagem precisam ser assim. O cartão lista o bônus com o nome da habilidade | `rollSkill` (`helpers/skill-rolls.mjs`) |
| `throw` | `squares` (4) | Quando um cartão de dano da habilidade fere uma criatura (`eternia.damaged`), uma janela pergunta ao Mestre para onde ela voa: contra uma criatura a até `squares` Qd dela, numa linha reta desse tamanho (a primeira criatura no caminho a para) ou não arremessar. O token voa até lá (movimento forçado; no quadrado de quem acerta, engajado), e quem é acertado sofre o dano da habilidade num cartão sem Teste de Esquiva, com os `hitStatuses` dela. Esse cartão leva `impact` e não arremessa ninguém | `eternia.damaged`; o pedido `bestiaryThrow` ao Mestre |
| `blink` | `range` (6) | O uso: o token vai às costas do alvo marcado (o quadrado dele, engajado; num alvo maior, o quadrado mais longe de onde estava), a até `range` Qd; sem alvo, a presa com mais Ódio a esse alcance. Um salto (o movimento "blink" do Foundry): nada no caminho o segura. Mais longe, avisa e fica. Com a tag [Movement], o que prende no lugar barra a habilidade como qualquer [Movimento] | `eternia.skillUsed`, na janela de quem usou |
| `copy` | `dice` (1) | O uso: o token copia o do alvo, que precisa estar engajado ou ao lado (a imagem, o nome, o tamanho, o anel e a borda: copiando um personagem, ele fica do lado dos personagens também para o sistema), e ganha um efeito sem ícone de +`dice`d6 no próximo dano (`consumeOn: "attack"`). Volta quando toma outro rosto, cai ou fica [Identificado], com a linha no chat; a linha da cópia vai só para o Mestre | `eternia.skillUsed`; a volta, no Mestre principal |
| `phase` | `range` (6), `dice` (1), `held` | Passiva. No fim de cada turno dele, fica `phased`, o token some e nada o alcança (o cartão de dano: nem dano, nem estados); não some com um estado de `held` (padrão: Agarrado, Enraizado, Paralisado, Petrificado, Adormecido; avisa) nem tendo perdido o turno. No começo do próximo turno, volta às costas da presa com mais Ódio a até `range` Qd de onde sumiu (ou ali mesmo), com +`dice`d6 no próximo dano do turno (`endOfProcess`). Quem está em Espera ganha a janela de uma Ação Maior (`window` com `held`), usada fora da vez, que gasta a Ação Maior do próprio turno (o Desfazer devolve). Se cai ou o combate acaba fora de fase, volta onde sumiu | `eternia.processEnd`; `updateCombat` (o `active`); `eternia.skillUsed` e `updateChatMessage` (a janela) |
| `nearest` | `status` | Passiva. Com o estado `status` (sempre, sem ele), os ataques do monstro vão na criatura mais perto, de qualquer lado (contados os quadrados entre os tokens; quem está escondido, caído, Ausente, uma pilha ou uma Fenda não conta; empatados, qualquer um). No começo do turno dele o Mestre principal mira num deles (sorteado) e o chat diz quem; uma habilidade hostil em outro alvo avisa, ou é bloqueada, pelos limites das condições | `updateCombat` (o turno); `inspectUse` |
| `heads` | `start` (5), `skills`, `regrow` (2), `burn` (["Flame"]) | Passiva. Uma Ação Maior por cabeça no turno (`extraMajors`, somado em `actionAllowance`): uma para qualquer habilidade, as outras só para as de `skills` (o aviso segue a configuração das ações). Cada quinto dos PV perdido corta uma cabeça e deixa um toco (a cura não as devolve). Na Manutenção, cada toco vira `regrow` cabeças, a menos que um dano com uma tag de `burn` tenha ferido o monstro desde o corte: um cartão de dano (o que corta também) ou o [Queimando], a [Chama Negra] e o [Pavio] do Encerramento. O chat conta as cabeças a cada mudança e no começo do turno | `updateActor`; `eternia.damaged`; `eternia.skillUsed`; `updateCombat`; `_onPhaseStart` do Encerramento e da Manutenção |
| `brood` | `actors: [{ uuid, count }]`, `radius` (1), `once` | Passiva. Quando cai, esses monstros saem dele, ao lado, no combate, sem itens deixados (`spawnNear`). Com `once`, só o primeiro da espécie que cai na cena chama (a cena guarda os nomes em `flags.eternia.brood`): o Floco-Vivo e o Guardião do Inverno | a queda, no Mestre principal (`rules.mjs`) |
| `breed` | `uuid` (a própria espécie), `radius` (1), `max` (8), `whole` (true) | Passiva. Na Manutenção de cada rodada a partir da segunda, dois da espécie de pé, sem ferimento (com `whole`: PV cheios) e a até `radius` Qd um do outro fazem mais um ao lado, até `max` de pé na cena; cada um forma um par por Manutenção | `_onPhaseStart` da Manutenção (o Mestre principal) |
| `curse` | `statuses` | Na habilidade de ataque. O cartão de dano dela que tira PV ou [Barreira] dá os estados (o monstro como origem e `curseOf`), que acabam quando aquele monstro cai ou no fim da cena | `eternia.damaged`; a queda, no Mestre principal |
| `shuffle` | — | Passiva. Os efeitos da própria habilidade são as formas; em cada Manutenção, uma delas ao acaso (nunca a mesma da rodada anterior) fica no monstro até a seguinte | `_onPhaseStart` da Manutenção (o Mestre principal); `deleteCombat` |
| `devour` | `types` (`["shield", "armor"]`) | Na habilidade de ataque. O cartão de dano dela que fere um personagem engole a primeira peça vestida dos `types`: sai do corpo e não volta até o monstro cair ou o combate acabar | `eternia.damaged`; a queda e `deleteCombat`, no Mestre principal |
| `spill` | `when` (um estado ou uma lista), `statuses` | Passiva. A primeira vez na cena que ganha um estado de `when`, ganha os `statuses` até o fim da cena | `createActiveEffect`, no Mestre principal |
| `thirst` | `steps` (`[[{ weakened: 3 }], [{ slowed }]]`) | Passiva. Cada rodada em que nenhum cartão de dano dele tirou PV de alguém do outro lado, no Encerramento, os estados do passo seguinte; depois do último passo, cai (0 PV e Incapacitado). Ferir alguém zera a sede e tira os estados dela | `eternia.damaged` → `bestiaryThirst`; `_onPhaseStart` do Encerramento |
| `bow` | `leave` | Passiva. As habilidades hostis dele não miram quem está [Derrubado] (avisa ou bloqueia, pelos limites das condições). Com `leave`, vai embora no Encerramento da rodada que termina com todos os inimigos dele no combate [Derrubados] ou caídos | `inspectUse`; `_onPhaseStart` do Encerramento |

Desde a 0.47, regras antigas aceitam campos novos: `retreat` com `round` (foge na Manutenção seguinte àquela rodada,
quaisquer que sejam os PV, a menos que esteja preso: a Lagartixa-Tesouro), `latch` com `steps` (os ids dos estados que o
alvo ganha, um a cada Manutenção, infinitos enquanto o monstro gruda e tirados quando ele solta, com `latchStep`: a
Criança-Fardo), `engulf` com `notMetal` (não engole quem veste armadura ou escudo de metal, pelo `isMetal` da ferrugem: o
Sapo-Boca-de-Poço) e `summon` com `bound` (quem ele chamou cai quando ele cai, como no `raise`: o Juiz de Pedra e as
estátuas). O `absorb` conta o tipo do cartão como tag ([Physical], [Magic]), como o `halve` já contava: o Duende do Avesso
come o dano físico. E o `healingHurts` aceita `"any"`: toda cura que um cartão dá ao portador vira dano direto.

O resto das mecânicas usa as flags que a Eternia já tinha (`docs/condicoes.md`): `hitStatuses`, `escalate` (a Picada que
Sobe), `useActions` (o empurrar das Investidas, o puxar do Fio de Teia e da Corrente, os [Clones] dos Sósias e o avançar,
`{ type: "rush", value }` de `module/bestiary/rush.mjs`: o Agressivo do Orc Guerreiro, sem gastar ação, e a Fúria
Sanguinária do Gnoll Saqueador, com `onUse`, antes do teste), `revive` (a Ferocidade, a Persistência do orc; o Retorno
Vazio com `hp: "@hpMax/2"`; a Teimosia dos Mortos do Zumbi Cambaleante com `chance: 4`, sem `uses` e com
`not: ["Radiance", "critical"]`), `infinite` (o frio do Toque Frio, que só sai com a Ação Maior), `noKill` (O Selo Dói), `realm` (as auras: o Coração de Anima, o Come a
Luz, a Bomba de Fumaça, o Grito do Bando, a fumaça da Bomba das Cavernas), `struckStatus` (o Pelo de Faísca), `immune` (o
Sem Memória), `cover` (a Guarda do Bando), `onUse` com `recipients: "self"` (a [Rigidez] depois da Arte de Cavaleiro e da
Alabarda em Roda, o [Exposto] depois da Investida Azul), `bonusVs` com `consume` (+7 contra a presa [Marcada], que perde a
marca), a [Fraqueza] passiva (`eternia.passive.weakness` com `weaknessTag`: o Medo da Luz) e `consumeOn: "attack"` com
`eternia.roll.damage.dice` (as emboscadas), o [Paralisado] com `recharge` e o `bonusVs` contra ele (a Garra Paralisante
e a Mordida do Banquete do Carniçal), o `immune` de um efeito passivo junto de `statuses: ["intangible"]` (o Corpo de
Sombra: sempre [Intangível]; um efeito de item transferido não sai pela Ação Maior nem pelo Encerramento) e o ataque
que só dá estado (o [Medo] do Uivo de Guerra: um teste contra a Resistência, sem dano; o Mestre aplica os efeitos nos
alvos que falharam, com o botão Aplicar efeitos). Uma posição de teste fora do retângulo da cena (`sceneRect`) faz o
empurrar parar na borda: monte as cenas dentro dele.

Um efeito novo, também para qualquer criatura: `flags.eternia.absorb = ["Radiance"]`, a lista das tags que a curam. O dano
de um cartão com uma delas vira cura pela regra da [Inversão] (depois da Defesa e da Anulação), e o resumo diz "Absorve
Radiância" (`conditions/damage.mjs`).

Outro efeito, também para qualquer criatura: `flags.eternia.halve = { tags: ["Physical"], pure: true }`, o dano de um cartão
com uma das tags (as dele e a do tipo de dano: [Physical], [Magic]) cai à metade, depois da Defesa e da Anulação, como no
[Petrificado], e o cartão escreve "÷ 2 (nome do efeito)". Com `pure`, só um cartão sem magia: nenhuma tag de elemento
([Chama], [Choque], [Radiância]...) nem [Ataque Mágico] ou [Feitiço] (a Pele de Pedra da Gárgula, `bestiary/halve.mjs`).

Uma flag de habilidade, também para qualquer monstro: `flags.eternia.possess = { expel: ["Radiance"], expelled: [{ statusId:
"exposed" }] }` (a Possessão do Fantasma, que leva também a regra `recharge`). O cartão de dano dela aplicado num alvo leva
o monstro para dentro (`possess.mjs`): o alvo ganha um [Dominado] com `flags.eternia.possessedBy` (o token do monstro) e
`renew` (o fim do turno não o tira); o token do monstro fica escondido no quadrado do alvo e anda com ele; o monstro fica
[Ausente] (o combate pula o turno dele) e guarda `possessing`. Os PV que um cartão de dano tira do possuído saem também do
monstro, como dano direto. Ele sai com um cartão (de dano ou de cura) com uma tag de `expel` no possuído, ganhando os
estados de `expelled`; quando o possuído vence, no fim do próprio turno, a Resistência dele contra a do monstro (as duas
roladas, pela regra do Teste de Acerto); quando um dos dois cai; ou quando o [Dominado] sai de qualquer outro jeito (o fim
da cena, uma habilidade que liberta). O token volta no quadrado livre mais perto.

## A fera com nome

`nameBeast(dados, { name, solo, mark, newId, catalyst, t })` (`named-template.mjs`) faz os dados de um monstro novo a partir
dos de outro: Nível +2, atributos +1, Defesas +3, Esquiva e Resistência +1, Iniciativa +1, multiplicador de Ódio +1,
Identificação +2, PV ×1,25 e então ×2 (com o bando) ou ×4 (`solo`), 3 de Destino, [Boss] (sem [Mob]), os ataques +1 no
acerto e o dano do Nível novo (`scaleDamage`: na proporção do comum de cada NP de `docs/matematica.md`; o número escrito no
texto segue), o [Destino 1] no ataque mais forte, as linhas dos itens deixados ×4 (o Yuld, `(fórmula)*4`), o Anima-mundi do Nível + 1 (`catalyst(nível)`
dá os dados do item) e um troféu ([Core Material], o preço do [Material-Base] do Nível, `materialPrice`), fixos, o cabeçalho na descrição, a Marca e
`flags.eternia.named`. Os efeitos com estados ficam para trás.

| Marca (`mark`) | O que vira |
|---|---|
| `skin` (Pele de Anima) | passiva com `eternia.passive.cancel` = Nível |
| `eyes` (Olhos da Fenda) | passiva com `system.checks.evasion.dice` +1 e `immune: ["blinded", "frightened", "confused"]` |
| `fury` (Fúria do Peso) | regra `threshold` na metade: [Fúria] = Nível e [Acelerado] |
| `sparks` (Sangue de Faísca) | passiva com `struckStatus` [Eletrificado] = máx(2, Nível ÷ 2) |
| `regen` (Regeneração do Peso) | passiva com o Traço `immortal: { regen: Nível × 2 }` e a regra `struck` da [Chama] que tira a [Regeneração] |
| `breath` (Sopro do Peso) | Ação Maior, Ataque Mágico em área de 2 Qd contra a Resistência, 2d6 + Nível × 6, regra `recharge` (5) |

A coroa (`named.mjs`, só o Mestre) usa a ficha do monstro do mundo, não a cópia do token (o "II" do nome, os ferimentos
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
- **O token** é um hexágono de fundo roxo (`assets/tokens/bestiary/fenda-*.webp`), com a luz violeta animada no
  `prototypeToken.light`: `starlight` na Pequena (2 Qd), `energy` na Grande (3,5 Qd) e `vortex` na Fenda-mãe (4,5 Qd).
- **Fechar:** no 0, `rift.closed`, o cartão, os itens deixados para quem escreveu a última linha
  (`rollDrops(..., { force: true, receiver })`) e o token escondido. A Fenda não rola itens ao cair (só ao fechar), e a
  passiva Rasgo na Escrita (`eternia.passive.cancel` 999) anula o dano.

## O (Menor) e o [Destino 1]

Desde a 0.44 (`bestiary/minor.mjs`), o bônus que o texto do ataque promete também é dado da habilidade:

- **O (Menor):** `flags.eternia.minor = { damage: N }` ("(Menor): +N de dano.") ou `{ statuses: [{ statusId, value }] }`
  ("(Menor): o alvo fica [Derrubado]."). Usado no próprio Processo Principal, com a Ação Menor livre depois do que o
  próprio uso gasta, o ataque gasta também a Ação Menor (`usage.alsoSpent`, `usage.minor`, no registro do cartão): o dano
  entra na rolagem (`minorBonuses`, em `rollDamage` de `chat/cards.mjs`) e os estados no `onHit` do cartão de dano
  (`useHitStatuses`). Configuração `monsterMinor`.
- **O [Destino 1]:** `flags.eternia.fateOption = { fate: 1, mode, range, statuses }`, perguntado no uso (`askFateOption`,
  em `planUse`). `mode` é `engaged` ("o golpe acerta todos os personagens engajados com este inimigo": perguntado com dois
  ou mais Aventureiros engajados, só os que lutam no combate, e marca todos como alvo antes do cartão), `area` ("Área
  (Escolha) a até N Qd": perguntado quando o Mestre marca mais de um alvo; `range` vai no texto da pergunta) ou `status`
  (os estados vão em quem o golpe acertar, como os do (Menor)). O Destino sai junto com os custos (`usage.fate`,
  `usage.fateOption`), e o Desfazer devolve.
- **O chefe** (Destino máximo acima de 0, sem `rift`) usa os botões de Destino pela tela do Mestre (`spendsFate`, em
  `automation/fate.mjs`), o HUD mostra o Destino dele e o token traz a barra de Destino à vista do dono
  (`prototypeToken.displayBars = 40`). A Fenda fica de fora: o Destino dela é o relógio.

## Criar um monstro

1. O monstro no compêndio `bestiary`: os números do Guia de Criação de Inimigos (compêndio `rules`) pelo tipo e pelo NP
   (lacaio: PV pela metade e testes fixos, 3 por dado; chefe de grupo: PV ×2, 3 de Destino; sozinho: PV ×4).
2. As habilidades com os campos da automação (`check`, `damage`, as flags acima). O (Menor) e o [Destino 1] ficam no
   texto e nos dados (veja acima).
3. A tabela: itens guardados com `flags.eternia.drop` (ou, numa ficha do mundo, arrastar itens para a aba).
4. Os monstros do Império foram gerados por um script (fora do repositório; a fonte é o JSON em `src/packs/bestiary`,
   pasta O Império, com uma subpasta por NP), com ids estáveis. Os ids saem do primeiro nome de cada monstro: a 0.37
   trocou os nomes (o Kobold Garimpeiro virou Kobold Batedor, o Oco virou Revenante e assim por diante) sem mudar nenhum
   id, nem os das habilidades, nem o nome dos arquivos da arte. As 24 criaturas da 0.37 vieram em seis lotes
   (`eternia-lotes-bestiario/loteN/monstros.mjs`, também fora do repositório), que o script carrega. As 52 criaturas
   da 0.47 (NP 1 a 3, a região de Norlangarth) saem de outro gerador, que escreve só elas e nunca reescreve as de antes
   (`Eternia-Bestiario-Expansao/gerador/make-new.mjs`, com os lotes em `Eternia-Bestiario-Expansao/lotes/` e o dano
   calibrado por `apply-tune.py` a partir do `tune-new.js` do simulador), com os mesmos ids pelo nome. A arte fica em
   `assets/tokens/bestiary/<nome sem acentos>.webp` (512 px: o token com a moldura, que também é o retrato), e os dois
   geradores põem `img` e `prototypeToken.texture.src` quando o arquivo existe. Cada token sai de uma imagem do ChatGPT
   com quatro criaturas sobre fundo transparente, recortada e emoldurada por um script (fora do repositório:
   `prompts/bestiario-imperio/tokens.py` para o Império, `prompts/bestiario-norlangarth/tokens.py` para Norlangarth,
   com os prompts e as imagens ao lado). Um monstro sem arte usa um ícone do Foundry pelo caminho (`icons/...`), como
   nos itens.
5. O token numera (`prototypeToken.appendNumber`, ligado em todas as criaturas do compêndio, menos nas vinculadas): no
   mapa, cada uma ganha um número romano depois do nome, "Kobold I", "Kobold II", o menor que nenhum token da cena com
   aquele nome tem (`freeNumber` em `canvas/token-defaults.mjs`, por `EterniaActor#getTokenDocument` e pelos chamados de
   `spawnNear`). Os nomes antigos do Foundry, "Kobold (1)", contam como o mesmo número.

Os NPCs e os personagens maiores ficam em compêndios próprios desde a 0.40, fora do Bestiário (que ficou só com as
criaturas), para o Mestre importar uma categoria sem trazer as outras.

## Os NPCs

O compêndio **NPCs** (`npcs`, só do Mestre) tem 126 personagens prontos em nove pastas: Campo e Aldeias, Cidades e
Ofícios, Igreja Axiom, Nobreza e Governo, Guardas e Cavaleiros, Academias e Saber, Guildas e Aventureiros, Povos da Forma
e Além do Muro. 31 deles são papéis do elenco de *A Última Etapa*, com o nome do papel e a ficha inteira (veja
[O elenco de A Última Etapa](#o-elenco-de-a-última-etapa)); o que segue vale para os outros.

- **São personagens** (`type: "character"`), montados como o assistente de criação monta um: a raça com as duas inatas
  (a escolha: a Bênção, o Pacto, a linhagem, o Astro) e as habilidades dos estágios da forma até o do NPC (as flags
  `stage`, `stageBonus` e `stageLog` no item de raça, como `races/evolution.mjs` deixa), a profissão com o Rank em
  `flags.eternia.professions.<id>.exp`, as habilidades básicas, os 5 pontos de atributo, o NP e PV e Destino cheios. As
  habilidades dadas levam `grantedBy`. `flags.eternia.skillProgress.base` é o NP, para a ficha não cobrar escolhas
  antigas.
- **Classe só nos guerreiros**, com o kit, o Caminho no NP 3 e o Ápice no NP 10. Nenhum tem Magia: as vagas da classe
  ficam vazias. Sem classe, a ficha soma só os números da raça (um Humano civil tem 8 PV), como o sistema calcula.
- **O perfil** vem em `flags.eternia.bio` (alcunha, idade, gênero, terra natal), a guilda em `system.social.guild` e o
  gancho em `system.biography`.
- **O token** é neutro (`disposition: 0`), vinculado e com o nome à vista. A arte fica em
  `assets/tokens/npcs/<nome sem acentos>.webp` (512 px, a moldura do bestiário com o fio verde-azulado dos NPCs no lugar
  do carmesim dos monstros), também como retrato.
- **A fonte é o JSON** em `src/packs/npcs` (cada NPC leva `flags.eternia.npc = { lote, pos, token }`). Ele saiu de
  um script fora do repositório (`prompts/npcs-lhtrpg/gerar_npcs.py`, com o elenco em `npcs.py` e os tokens em
  `tokens_npcs.py`), com ids estáveis: rodar de novo troca só os arquivos dele.

## Os personagens maiores

O compêndio **Personagens Maiores** (`major-characters`, só do Mestre) tem 141 personagens de grande relevância na
história, em 15 pastas: Espadachins, Guerreiras e Aventureiras, Cavaleiros e Armaduras, Damas,
Sacerdotisas e Magas, Nobres e Lordes, Aventureiros e Foras da Lei, Meninas e Moças, Guerreiros Veteranos, Anciãos, Magos
e Eruditos, Meio-Feras e Monstros, Feras e Divindades, Mascotes e Bichos, Rapazes e Forasteiros e v2 (os 18 que chegaram
na 0.41, entre eles Bercouli, Chudelkin e Deusolbert com os nomes da obra). 66 deles são o elenco de *A Última Etapa*,
com o nome do papel e a ficha inteira: 65 dos 140 de antes e Aldric Artorius, que entrou com o token do Guardião do
Inverno (veja [O elenco de A Última Etapa](#o-elenco-de-a-última-etapa)). O que segue vale para os outros 75.

- **São personagens em branco** (`type: "character"`, NP 1) com o nome, o token e só o item de raça, copiado do
  compêndio com o `_stats.compendiumSource`. Sem habilidades, classe, Magia, profissão, NP nem números: o Mestre monta a
  ficha. O assistente de criação (o botão da pena) abre com a raça já marcada (`#initialDraft` lê o `compendiumSource`).
  Como têm raça, não contam como em branco para o gancho `createActor`: importar a pasta inteira não abre um assistente
  para cada um.
- **O token** é neutro, vinculado e com o nome à vista, como o dos NPCs. A arte fica em
  `assets/tokens/major/<nome sem acentos>.webp` (512 px, a moldura dos NPCs), também como retrato.
- **As feras e divindades absolutas** (a pasta Feras e Divindades) têm o token de outro formato: o Astro, o círculo de
  ouro com um leque de raios em cada canto, o fio de luz e um céu da noite com estrelas atrás, e a aura de cada uma
  atrás dos raios. O token é 2×2 e a luz é fraca, só de cor e sem luz forte no meio (as animações `emanation`,
  `starlight`, `fog` e `energy`, que não clareiam): Ladon âmbar, Hyperion dourado-claro, Hati lilás, Raijū violeta,
  Sköll dourado e Seiryū ciano. Os demônios (Marbas, Malphas e Abaddon) não têm luz: a aura escura deles é uma névoa na
  arte do token, porque a escuridão do Foundry (`negative`) cobre o próprio token.
- **A fonte é o JSON** em `src/packs/major-characters` (cada um leva `flags.eternia.major = { lote, pos }`). Ele saiu de um
  script fora do repositório (`prompts/personagens-maiores/gerar_compendio.py`, com o elenco em `elenco.py` e os tokens
  em `tokens.py`), com ids estáveis pela posição: rodar de novo troca só os arquivos dele.

## O elenco de A Última Etapa

Os 97 papéis do enredo da campanha (o capítulo 9 de `Desktop/Daggerheart/Eternia-Enredo`) têm a ficha inteira, no NP que
cada um tem quando entra na história (AS 377 para quase todos; os capitães do Torneio no de 380; Tuk e Primula depois de
receberem a Palavra). São 31 atores dos NPCs e 65 dos Personagens Maiores, com o nome do papel no ator e no token, e
Aldric Artorius, um ator novo dos Personagens Maiores com o token do Guardião do Inverno (a criatura do Bestiário fica
como está: é ele contido, para os NP baixos).

- **O que a ficha tem**, montado como o sistema monta, NP a NP: a raça com as inatas e os estágios da forma até o do
  papel (os Cavaleiros da Integridade presos no I pela Síntese, a Kaimei no V, os humanos fiéis à Igreja até o IV; a
  Coleção de Bênçãos com uma Bênção por NH, como `apps/rank-grants.mjs` dá); a classe com o kit, o elemento do Matador de
  Dragões, o Caminho e o Ápice; as Magias nas vagas da classe (`grantedBy` da classe; a Absoluta fecha as outras vagas) e
  os Decretos dos Mandamentos (`grantedBy` da Magia e do Absorver Mandamento); as escolhas de cada NP gastas como o
  navegador de habilidades gastaria (os feitiços, os talentos da classe, do Caminho, do elemento e das Dedicações, e o NH
  das que sobem); as básicas, a profissão com o Rank, os 5 pontos de atributo, armas e armadura do NP (os Objetos Divinos
  dos Cavaleiros) e a Pedra Mágica do NP para quem tem Magia e não luta de cajado (o Poder Mágico tem uma fonte só); PV e
  Destino cheios.
- **As marcas:** `flags.eternia.elenco = { slug, papel }` no ator; `skillProgress = { base: NP, creation: false }` e
  nenhuma marca `skillPicks`: a ficha não deve escolha nenhuma, e subir de NP depois conta só as escolhas novas. Os NP
  mais altos têm mais escolhas Gerais do que a classe e a raça oferecem (os Talentos Gerais comuns ainda não existem): as
  que sobram ficam sem gastar.
- **O perfil:** `system.biography` diz o que o mundo sabe do papel; o segredo fica nas Anotações da Biografia
  (`flags.eternia.bio.notes`, sob "Só o Mestre").
- **Os portadores** contam quando o ator vai para o mundo (`apps/magic-holders.mjs`). O Cataclismo (Rübezahl e Tuk) e o
  Impecável (Scheherazade e Primula) são a mesma Palavra antes e depois da herança: ponha no mundo um de cada vez. Os
  Mandamentos estão nos seis Senhores do Conselho, acima do limite de 3 de propósito (no Território Negro, cada Senhor tem
  o seu Mandamento). As outras Magias de um portador só do elenco são de um papel cada; 17 delas continuam livres para os
  jogadores.
- **As vagas em branco:** O Pontífice (as três), Kriegger (as duas; ele não tem Janela) e Viridiana Varn (a do NP 10)
  esperam Magias que ainda vão ser criadas: a Escrita, o Página em Branco e a Escrita de Cardinal.
- **A fonte é o JSON**, que sai de `Eternia-Enredo/fichas/gerar_fichas.py` (fora do repositório; as decisões de cada
  papel em `elenco_fichas.py`, o relatório em `FICHAS.md`). Ele acha cada ator pela marca do elenco (ou pelo nome de
  antes), e rodar de novo reescreve só os 97. Rodar `gerar_npcs.py` ou `gerar_compendio.py` devolve os atores do elenco
  ao que eram: depois deles, rode o `gerar_fichas.py`.

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
await game.eternia.bestiary.reveal(token, { by, why });  // mostra o que o disfarçado é (Mestre, ou pede a ele)
await game.eternia.bestiary.disguise(token);             // disfarça de novo (Mestre)
game.eternia.bestiary.isDisguised(token);
await game.eternia.bestiary.engulf(monstroToken, alvoToken, habilidade); // engole (a habilidade: a regra; senão a do monstro)
await game.eternia.bestiary.release(alvoToken);          // solta quem foi engolido (o token sai)
game.eternia.bestiary.insideOf(monstroToken);            // os tokens dentro dele
game.eternia.bestiary.isMetal(item);                     // a peça é de metal (a ferrugem)
await game.eternia.bestiary.ripOff(estirgeToken, personagemToken); // arranca o monstro grudado (a Ação Menor de quem arranca)
await game.eternia.bestiary.answerGaze(message, "avert");         // responde a um cartão do olhar: "meet" ou "avert"
await game.eternia.bestiary.riseAs(corpoToken, uuidDoMonstro, { by: quemErgueu.uuid, disposition: -1 }); // o corpo levanta como o monstro
await game.eternia.bestiary.throwCreature(alvo, ogro, arremessar, { at: tokenAtingido }); // ou at: "right" | "left" | "up" | "down"; sem at, a janela
await game.eternia.bestiary.copyLook(token, outroToken); // o token toma o rosto do outro (a regra copy)
await game.eternia.bestiary.restoreLook(token);          // e volta ao dele; devolve o nome que usava
game.eternia.bestiary.isPhased(actor);                   // fora de fase agora (a regra phase)
game.eternia.bestiary.headsOf(actor);                    // { n, stumps, cut, other, rule } de um monstro com cabeças
game.eternia.bestiary.nearestTo(tokenDocument);          // os tokens mais perto dele, de qualquer lado
game.eternia.bestiary.possessingOf(actor);               // { host, effect, absent } enquanto ele possui alguém
```
