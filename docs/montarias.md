# Montarias: referência técnica

As regras, como o jogador lê, estão em **IV.i. AS MONTARIAS** do diário AS REGRAS e no capítulo 15 do Guia do Jogador
(A montaria). Este arquivo diz onde cada regra está no código e como criar uma montaria nova. As montarias da 1.0.1
são os dragões terrestres de Re:Zero trazidos para o mundo (o "dragão pequeno, sem asas" do capítulo 10 do Mundo de
Eternia); a fonte é `Eternia-Montarias/` (fora do repositório: `DESIGN.md`, o gerador `gen-itens.mjs`).

## Onde fica cada coisa

| Arquivo | O que faz |
|---|---|
| `template.json` | O tipo de item `mount`: `rank`, `price`, `equipped` (= montado), `speed`, `bagSpace`, `pdef`, `mdef`, `initiative`. |
| `module/mounts/data.mjs` | O tipo, o estado [Montado] (`mounted`) e o efeito dele (`mountedEffect`: `transfer`, `showIcon` sempre), os estados que derrubam (`THROWN_BY`) e a Bênção (`WIND`). Puro. |
| `module/mounts/state.mjs` | As montarias de um personagem (`mountsOf`), a montada (`riddenMount`), as regras da raça (`mountRules`), o token dela (`mountToken`) e se ele tem a Bênção de Repelir o Vento (`windBlessed`). |
| `module/mounts/actions.mjs` | `mountUp` (livre fora das rodadas; nelas, a Ação de Movimento no turno de quem monta, que o Mestre pode passar por cima), `dismount` e `toggleMount`, com o cartão no chat (`flags.eternia.mountCard`). |
| `module/mounts/index.mjs` | Os ganchos: a montaria sem o efeito [Montado] ganha um (`preCreateItem`); [Incapacitado], [Morrendo], [Morto] ou [Derrubado] derrubam (`createActiveEffect`, na tela que deu o estado); uma montada pela ficha do item deixa a outra (`updateItem`). A API `game.eternia.mounts`. |
| `module/documents/actor.mjs` | A montada soma Velocidade (`speed.total`), Defesas, Iniciativa e espaço (`maxSpace`); a montaria não ocupa a mochila (fora de `SPACE_TYPES`). |
| `module/content/content.mjs` | Os poderes da montaria (`flags.eternia.powers`) viram habilidades de item; o poder pode ter `name` próprio (o Galope) e `check` (a Investida); os `sceneStatuses` de uma montada valem no começo do combate (o Sangue de Solus). |
| `module/automation/use.mjs` | O poder de uma montaria não montada avisa "você não está montado" (`Use.NotMounted`); montado num dragão terrestre, a Disparada não gasta a Ação Menor (`alsoSpendsOf` + `isDash`). |
| `module/sheets/character-sheet.mjs`, `templates/character/inventory.hbs` | A seção Montarias da aba Inventário (a montada primeiro, o que dá, o botão de montar). |
| `module/hud/data.mjs`, `templates/hud/panel.hbs`, `module/hud/hud.mjs` | O grupo Montarias do painel Itens do HUD, com o botão (`lhh-mount`) e os poderes da montada. |
| `templates/item/item-mount-sheet.html`, `templates/dialogs/itemCard.hbs` | A ficha da montaria e o cartão dela no chat. |
| `module/sheets/item-sheet.mjs`, `templates/item/parts/item-header.html`, `css/windows.css` | O retrato da ficha da montaria: o token (`headerToken`), ajustado por `portraitFit` como o retrato de monstro, com o ícone do item no canto (`.profile-token`, `.profile-icon`); cada um troca a própria imagem. Sem token, o ícone de sempre. |
| `module/content/migration.mjs` | A versão 4 da migração `content`: as montarias dos mundos ganham o token do dragão do compêndio (pelo nome, ou pelo da base numa montaria feita). |
| `module/helpers/statuses.mjs` | O estado `mounted` (Outro Estado, só personagens, `hud: false`: fora do HUD do token e do painel de estados, porque quem o dá é a montaria). |

## Os dados

```js
// Item "mount"
system: { rank, price, equipped, speed, bagSpace, pdef, mdef, initiative, ... }
effects: [{ name: "Montado", statuses: ["mounted"], transfer: true, showIcon: 2, flags: { eternia: { mounted: true } } }]
flags.eternia.mount = { blessing: "wind",          // a Bênção de Repelir o Vento
                        token: "systems/eternia/assets/tokens/mounts/dragao-diana.webp" }   // o retrato da ficha
flags.eternia.powers = [{ name, timing, target, range, cost, limit, text, check?, damage?, effects? }]
```

- Montar é `system.equipped = true`; as atualizações levam a opção `eterniaMount` (`"up"`/`"down"`).
- Os efeitos de uma montaria valem só montada (`EterniaItem#areEffectsSuppressed`, como os do equipamento): o
  [Montado], o Adestrar (`flags.eternia.trained`) e os aprimoramentos que viram efeito (Robusta).
- Uma montaria feita na Oficina é um item feito como os outros (`flags.eternia.craft`); a lista dela é `mount` em
  `ENHANCEMENTS` (`professions/data.mjs`), com a Ligeira `flat` (a Velocidade não cresce com o nível).
- O `img` é o ícone (o inventário, o HUD, o Mercado e o cartão no chat); o `token` é o retrato da ficha. A montaria
  feita copia os dois da base.

## Os tokens

Os tokens dos dragões terrestres (1.0.2) seguem o padrão do bestiário: o dragão inteiro, no traço de frame do anime dos
monstros, na moldura circular (aro de ouro, fio carmesim, fundo branco), 512 px. Saem de `prompts/montarias/` (fora do
repositório): `escrever_prompt.py` escreve o `prompt.md` (uma imagem por dragão, com o estilo aprovado dos kobolds e os
quadros dos dragões terrestres como referências), as imagens do ChatGPT ficam ao lado (`01-tracao.png` …
`06-diana.png`), e `tokens.py` recorta cada uma com as peças do bestiário do Império
(`prompts/bestiario-imperio/tokens.py`) em `tokens/<nome sem acentos>.webp`. Os arquivos vão para
`assets/tokens/mounts/`, e o `gen-itens.mjs` põe o `token` na montaria quando o arquivo existe. Montaria nova com
token: o prompt e o corte nos dois scripts, o arquivo em `assets/tokens/mounts/` e o gerador de novo; as cópias dos
mundos pedem uma versão nova da migração `content`.

## Criar uma montaria

1. Um item `mount` no compêndio de itens (pasta Montarias), com os números, o efeito [Montado] e, se for dragão
   terrestre, `flags.eternia.mount.blessing = "wind"`. O gerador `gen-itens.mjs` faz isso a partir de uma linha da
   lista `MOUNTS`.
2. O preço: 10 comuns do nível (seção 9 de `docs/matematica.md`), vezes a força dela (a Diana, 1,2).
3. Os poderes em `flags.eternia.powers`, com o texto em português na descrição (`[Momento: …] <strong>Nome.</strong>`)
   e o `text` em inglês; o `name` dá o nome da habilidade.
4. Um teste no `Data/eternia-tests/test-101.js` (montar, os números, o poder montado e não montado).

## Para macros

```js
game.eternia.mounts.up(actor, item);    // montar (as regras da Ação de Movimento valem)
game.eternia.mounts.down(actor);        // desmontar
game.eternia.mounts.toggle(actor, item);
game.eternia.mounts.ridden(actor);      // a montaria montada, ou null
game.eternia.mounts.of(actor);          // todas as montarias do personagem
```
