# Profissões: referência técnica

As regras, como o jogador lê, estão na página **X. PROFISSÕES** do diário AS REGRAS (`src/packs/rules`) e na
descrição de cada profissão (compêndio Raças e Classes, pasta Profissões). Este arquivo diz onde cada regra está no
código, que dados um item feito guarda e como criar uma profissão ou um aprimoramento novo.

## Onde fica cada coisa

| Arquivo | O que faz |
|---|---|
| `module/professions/data.mjs` | As dez profissões (cor, ícone, tipos de item que fazem, talento), os talentos, a escada de Ranks (`RANK_EXP`), a tabela da Oficina (`QUALITIES`) e da Coleta (`GATHER`), os preços da Anima-mundi (de `economy/data.mjs`), o multiplicador por nível, o tipo de cada item (`kindOf`), as listas de aprimoramentos (`ENHANCEMENTS`, `LEGENDARY`) e o Rank de um personagem sem estado do jogo (`professionRank`, o `@prank` das fórmulas). |
| `module/professions/state.mjs` | A profissão do personagem (`professionOf`), a EXP e as tentativas (`record`, `setExp`, `refundAttempt`), o cartão de Rank novo e os materiais (`materialsOf`, `materialFor`, `materialData`, `shardData`). |
| `module/professions/forge.mjs` | O item feito: `buildCrafted` monta o item a partir da base e dos aprimoramentos (campos, efeitos, tags, grau, nome, preço e texto); o que cada aprimoramento faz e o texto dele; o pergaminho do Escriba (`scrollFromSkill`) e o Banquete (`banquetFrom`). |
| `module/professions/actions.mjs` | As ações, cada uma com o seu cartão de chat: `craftAttempt` e `finishCraft` (Oficina), `fuse` (Fusão), `retouch` e `sell` (Mercador), `gather` (Coletor), `sharpen`, `mend`, `banquet`, `copy` e `train` (talentos). |
| `module/professions/skills.mjs` | As habilidades que uma profissão dá (o Selar do Selador): `syncProfessionSkills` dá e tira conforme a profissão (na troca da subclasse e na criação do ator), `professionSkillIssue` barra o uso sem a profissão ou sem tentativa (`automation/use.mjs`), e o `eternia.skillUsed` gasta a tentativa e soma a EXP. |
| `module/professions/migration.mjs` | A migração `professions` (1.0.1): Bardo → Domador e Engenheiro → Selador nos personagens e nos itens do mundo, com a EXP; as Regiões de armadilha que sobraram saem. |
| `module/professions/bench.mjs` | A bancada: a janela das ações, com os modos e os passos (escolher, rolar, aprimorar, pronto). |
| `module/professions/sheet.mjs` | A aba Profissão da ficha (`professionContext`) e os botões dela (`professionAction`). |
| `module/professions/index.mjs` | Registra os templates, os pedidos ao Mestre (`professionSharpen`, `professionTrain`), as habilidades das profissões e o fim do Afiar e do Adestrar com o cenário; a API de macros. |
| `templates/character/profession.hbs` | A aba da ficha. |
| `templates/professions/` | A bancada (`bench*.hbs`) e o cartão de chat (`chat-card.hbs`). |
| `css/professions.css` | O visual da aba, da bancada e dos cartões (camada `modules`). |

Também tocam nas profissões: `content/content.mjs` (o Banquete alimenta o grupo; estados de início de combate
como o Último Fôlego do Coração Estelar), `helpers/item-use.mjs` (itens usáveis com `useActions`, como o Purificante),
`helpers/combat-cards.mjs` (tags de dano e estados ao acertar vindos de efeitos, como a Pedra de Faísca), `bestiary/rifts.mjs` (o Rank do Selador na escrita das Fendas e a ação de uso `riftSeal` do Selo de Fenda), `mounts/` (as montarias que o Domador faz),
`conditions/rolls.mjs` (efeitos gastos pelo próximo dano, `consumeOn: "attack"`), `conditions/effects.mjs` (ação
`removeStatus`), `documents/actor.mjs` (`eternia.passive.luck`, o Destino máximo do Da Sorte) e
`piles/pile-utils.mjs` (o Mercador vende pelo valor cheio nas lojas, menos o Anima-mundi sem o Selo, `flags.eternia.unsealed`).

## Os dados

### Profissão

Item `subclass` com `system.identifier` igual a um id de `PROFESSIONS` (`blacksmith`, `tailor`, `artisan`,
`alchemist`, `cook`, `scribe`, `sealer`, `tamer`, `gatherer`, `merchant`). Um personagem tem uma subclasse por
vez (`helpers/character-options.mjs` troca a anterior). O Selador e o Domador ficaram nos ids (e nos `_id` do
compêndio) do Engenheiro e do Bardo, que saíram na 1.0.1: a migração `professions` passou os personagens deles.

O progresso fica no personagem, por profissão, e sobrevive à troca de subclasse:

```js
flags.eternia.professions.<id> = { exp, used, scenario }
```

`used` são as tentativas gastas no cenário `scenario` (o contador `flags.eternia.scenario` de
`automation/scenes.mjs`); quando o Mestre encerra o cenário, o contador sobe e as tentativas voltam sozinhas.

Uma obra que saiu na Oficina e espera os aprimoramentos fica em `flags.eternia.craftPending` (base, grau, número de
aprimoramentos, dados, cópias, se a base estava equipada).

### Item feito

```js
flags.eternia.craft = {
  grade,                         // 1 Incomum, 2 Raro, 3 Perfeito, 4 Lendário
  enhancements: [{ id, tag?, cut? }],
  base,                          // os dados da base (sem ids), para a Fusão e o Retoque refazerem o item
  crafter, profession, rank,     // quem fez
  masterpiece?,                  // "mass" | "instant" (a Obra-prima das canções feitas por um Bardo antes da 1.0.1)
  retouches                      // quantos Retoques o item já teve (2 Anima-mundi do nível, dobrando a cada um: retouchCost)
}
```

- Os números entram nos campos do próprio item quando o personagem lê aquele campo do tipo dele (`ITEM_FIELDS`:
  Poder de Ataque e Mágico, Precisão e Iniciativa das armas, Defesas e Iniciativa das armaduras, Defesas dos
  escudos, Defesas, Poder Mágico e Iniciativa dos acessórios, espaço das bolsas). O resto vira um efeito do item
  (`flags.eternia.craftEnh`), que vale enquanto ele está equipado.
- A tag do Elemental vai para as tags do item (o dano das armas herda as tags da arma). O Resistente é
  `eternia.passive.cancel` com `cancelTag`.
- Os lendários: Fio do Destino é `eternia.roll.damage.dice` +1 (filtro: dano que não é cura); Égide é um poder do
  item (`flags.eternia.powers`, momento Antes do Dano, 1/Cena) que dá Anulação 9999 gasta pelo próximo dano; Coração
  Estelar é `flags.eternia.sceneStatuses: [{ status: "lastStand" }]`; Sangue de Solus (montarias) é
  `sceneStatuses: [{ status: "hasted" }]`, que vale com a montaria montada.
- Um aprimoramento `flat` não cresce com o nível (a Ligeira: +1 de Velocidade em qualquer montaria).
- O grau vira a tag `M1`…`M4`; o preço é o da base mais o da Anima-mundi vezes o grau; o texto ganha um bloco
  `lhp-craft-note` com a qualidade, quem fez e os aprimoramentos.

### Materiais e itens novos

- Anima-mundi N: `gear` com a tag `Magic Catalyst N` (`catalystLevel`), preço `animaPrice(N)` (50 a 370 Yuld). O que a Coleta
  acha leva `flags.eternia.unsealed` (sem o Selo do Anima): serve na Oficina e nenhuma loja compra (`saleRate`). A Coleta
  acha até o NP do personagem (`gatherLevelCap`).
- Quintessência: `gear` com `flags.eternia.material = "starShard"` (o valor vem do nome que ela tinha na 0.4.0,
  Estilhaço Estelar).
- Selos (Selador): `usable` com a tag `Seal`. O Selo de Fenda tem `useActions: [{ type: "riftSeal", value, recipients: "self" }]`.
- Montarias (Domador): o tipo de item `mount` (veja `docs/montarias.md`).
- Engenhocas (`Gadget`) e Canções (`Song`, o Silenciado impede): continuam no compêndio, mas nenhuma profissão as faz
  desde a 1.0.1. A Pedra de Faísca dá um efeito com `consumeOn: "attack"`, `damageTags: ["Shock"]` e
  `onHit: { statusId: "shocked", value }`.

### Flags novas de efeito e de item

| Onde | Flag | O que faz |
|---|---|---|
| Efeito | `consumeOn: "attack"` | acaba depois da próxima rolagem de dano de quem o tem |
| Efeito | `damageTags` | tags que o dano de quem o tem ganha (`combat-cards.mjs attackTags`) |
| Efeito | `onHit: { statusId, value }` | estado que o dano dá em quem atinge (o Desfazer tira) |
| Efeito | chave `eternia.passive.luck` | Destino máximo que não se soma: só o maior conta |
| Item usável | `useActions: [{ type: "removeStatus", statuses }]` | tira esses estados de quem recebe o item |
| Item usável | `banquet` | quem usa e o grupo dele na cena comem (sem grupo, os personagens dos jogadores na cena) |
| Item usável | `xpBoost: { kind, pct, count }` | bônus de XP: +pct% dos próximos `count` monstros (`experience/boosts.mjs`); o Potente soma 5 monstros |
| Item usável | `useActions: [{ type: "riftSeal", value }]` | Selo de Fenda: a Fenda aberta a até 1 Qd perde `value` escritas, sem rolagem |
| Habilidade | `profession: "<id>"` | habilidade de uma profissão (o Selar): dada e tirada com ela, gasta uma tentativa a cada uso |
| Efeito de montaria | `trained: { scenario, tamer }` | o Adestrar do Domador (+1 de Velocidade), até o fim do cenário do dono |
| Item | `copy` | pergaminho do Escriba (habilidade, NH, quem gravou) |

## Criar uma profissão ou um aprimoramento

- **Aprimoramento:** uma entrada na lista certa de `ENHANCEMENTS` (`fields`, `changes`, `tags`, `cancel`, `repeat`,
  `uncut`, ou os campos de consumível) e os textos em `ETERNIA.Profession.Enh.<id>` (`name`, `text`, `epithet`).
  `buildCrafted` e a bancada já o tratam.
- **Profissão:** uma entrada em `PROFESSIONS` (tipos de item em `kinds`, um talento de `TALENTS`), os textos em
  `ETERNIA.Profession.Name/Crafts/Talent` e a subclasse no compêndio com o `identifier`. Um talento com ação própria
  pede um modo na bancada (`modesOf`) e uma função em `actions.mjs`; um talento que se usa em combate é uma habilidade
  com `flags.eternia.profession` em Habilidades Comuns (`choiceOnly`), como o Selar, e a EXP do uso em `SKILL_EXP`
  (`skills.mjs`).
- **Tipo de item novo:** `USABLE_KINDS` (pela tag) e `CATEGORY` em `data.mjs`, e o nome em
  `ETERNIA.Profession.Kind`.

## Para macros

```js
game.eternia.professions.open(actor, "craft");   // a bancada num modo (craft, fusion, gather, retouch, sell…)
game.eternia.professions.of(actor);              // profissão, Rank, EXP, tentativas, nível máximo
game.eternia.professions.addExp(actor, 10);      // EXP (anuncia o Rank novo)
```
