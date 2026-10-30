# Ícones dos itens: referência técnica

Cada item do compêndio tem o seu próprio ícone, sem repetir (a mesma imagem com `hue` diferente conta como outro
ícone). Quase todos são ícones do Foundry (`icons/...`); as katanas, os chicotes e os itens de Sword Art Online têm
arte própria em `assets/icons/items/`. Por cima do ícone, o sistema desenha uma moldura pelo grau mágico e, nas armas e
equipamentos de nível alto, efeitos animados. Nada dos ícones do Foundry vai no zip: a licença deles (Rexard) só
permite usá-los dentro do Foundry, então o sistema aponta para o caminho e monta o desenho no navegador de cada
jogador. Ao escolher ícones novos, use só os pintados (fundo escuro), não os chapados de fundo claro.

## Onde fica cada coisa

| Arquivo | O que faz |
|---|---|
| `module/icons/data.mjs` | Tipos que ganham moldura (`FRAMED_TYPES`) e que se mexem (`MOVING_TYPES`), os níveis do brilho e da aura (`TIER_LEVELS`), as molduras por grau (`GRADES`), os temas (`THEMES`) e o tema de cada elemento e tipo de arma (`ELEMENT_THEMES`, `KIND_THEMES`). |
| `module/icons/compose.mjs` | O desenho: um SVG com o ícone dentro (reduzido para 192 px fora da linha principal, com `createImageBitmap` e `OffscreenCanvas`), o brilho atrás do item, as partículas, o reflexo e a moldura, entregue ao `<img>` como blob URL (`pictureOf`). |
| `module/icons/index.mjs` | Como o ícone de um item é desenhado (`iconStyleOf`), o registro caminho → item e o observador que troca os `<img>` de ícones de item em qualquer tela. |

## Como o desenho é escolhido

- **Moldura:** a tag de grau mágico. `M1` a `M3` (Mágico): uma linha na cor da qualidade das profissões (Incomum,
  Raro, Perfeito). `M4` a `M6` (Artefato): moldura dourada com uma gema por canto (âmbar, rubi, safira). `M7`
  (Fantasmal): moldura espectral.
- **Movimento**, só nos tipos de `MOVING_TYPES`: do nível 11, um reflexo passa pelo ícone de tempos em tempos; do
  nível 21, também o brilho atrás do item, uma borda de luz e as partículas do tema. A força cresce até o nível 30.
- **Tema:** `flags.eternia.icon.fx` do item; senão o elemento das tags (`ELEMENT_THEMES`); senão o tipo de arma
  (`KIND_THEMES`); senão `steel`, que usa a cor do fundo do próprio ícone.
- **Variação de cor:** `flags.eternia.icon.hue` (graus) gira as cores do ícone. Serve para os tipos com poucos desenhos
  no Foundry (katanas, chicotes).

```json
"flags": { "eternia": { "icon": { "fx": "petals", "hue": 150 } } }
```

Ícones genéricos (`systems/eternia/assets/ui/items_icons/`) e itens sem grau, sem nível 11+ e sem `hue` ficam como
estão.

## Onde aparece

O observador (`MutationObserver`) olha cada `<img>` que entra na página. Ele acha o item pela linha da ficha
(`data-item-id`), pela ficha do item, pela entrada do compêndio ou da barra lateral (`data-entry-id`) e, nas outras
telas (chat, HUD, bancada), pelo caminho do ícone, quando ele é de um item só, ou pelo nome no `alt` (cartões do
chat), quando o mesmo caminho tem variações de cor. Um desenho novo só é feito quando o `<img>` chega perto da tela
(`IntersectionObserver`); os já feitos entram na hora. As animações ficam dentro do SVG, então tocam em qualquer
lugar. A configuração **Ícones animados** (de cada jogador) desliga o movimento e deixa só as molduras; o sistema
também para o movimento quando o computador pede menos animação e no Modo de Desempenho Baixo do Foundry.

O observador não olha as barras laterais de atores, cenas, diários e músicas (nem as janelas soltas delas): ali só há
retratos e miniaturas, nenhum ícone de item. O caminho de cada `src` é calculado uma vez por página, a janela de cada
`<img>` é achada subindo a árvore uma vez por lote do observador, e um ícone genérico sai antes de procurar o item. No
`ready`, os ícones pedem só o índice dos compêndios que têm equipamento (`FRAMED_TYPES`).

## Arte própria

As katanas, os chicotes e os itens de Sword Art Online vieram de grades de 9 ícones geradas no ChatGPT a partir de
esboços de layout, recortadas por célula em 256 px (`assets/icons/items/<nome>.webp`). Para um item novo com arte própria, grave a imagem ali e
aponte o `img` do item para `systems/eternia/assets/icons/items/<nome>.webp`; a moldura e os efeitos vêm sozinhos.

## Para macros

```js
game.eternia.icons.styleOf(item);        // como o ícone do item é desenhado (ou null)
await game.eternia.icons.svgOf(path, s); // o SVG de um ícone com um estilo
game.eternia.icons.refresh();            // desenha de novo os ícones da tela
```
