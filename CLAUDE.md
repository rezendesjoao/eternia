# Eternia — notas de desenvolvimento

Sistema do Foundry VTT v14 (id `eternia`). Fork do LHTTRPG 2.1.1 (remoto `upstream`) com o módulo lhtrpg-automacao
1.4.0 e a tradução lhttrpg-br 1.0.1 incorporados. O README descreve o que o sistema faz.

## Convenções
- Código e comentários em inglês; interface em `lang/pt-BR.json` e `lang/en.json` (as outras línguas caem no inglês).
- Commits em pt-BR. CHANGELOG no formato Adicionado / Alterado / Removido.
- Toda flag fica em `flags.eternia`. Cuidado com nomes repetidos: `use` é o cartão de uso de item do sistema e `usage`
  é o registro de custos de uma habilidade (`automation/use.mjs`).
- Configurações, teclas e o socket usam o id `eternia`. A API de macros fica em `game.eternia`.
- Os prefixos de CSS e de `data-action` herdados do módulo (`lhpf` ficha, `lhc` chat, `lhh` HUD, `lhwin` janelas,
  `lhauto`) continuam como estão; a aba Classe usa `lhcl`.
- Quem é Aventureiro (a disputa de Ódio, os custos, o desempate de Iniciativa, o −1 de Ódio na esquiva falha, o fim de
  cena) é `isAdventurer` de `helpers/utils.mjs`: personagem num token que não é hostil. Um NPC pronto num token hostil
  luta como inimigo; não decida isso pelo tipo de ficha.
- O combate guarda o que já rodou na rodada (`flags.eternia.ran`, em `EterniaCombat#_applyState`): depois de Voltar
  turno ou rodada, o que se refaz chega com `options.eterniaRepeat` (`phase`, `start`, `ended`) no `updateCombat`, e o
  `_onPhaseStart` nem roda. Um gancho novo de começo ou fim de turno ou de fase pula o que vier marcado como repetido.
  O trabalho de uma fase terminado dispara `eternia.phaseDone`, que o avanço sozinho da Manutenção e do Encerramento
  escuta (`automation/round.mjs`, configuração `autoPhases`).
- Desde a 0.44 a tela do Mestre principal aplica sozinha os cartões de dano em quem o golpe atingiu e os efeitos da
  habilidade em quem ele alcançou (`onAutoCard` em `helpers/combat-cards.mjs`, configuração `autoApply`); o cartão tratado
  leva `flags.eternia.autoDone`. Código novo que lê um cartão de dano conta com o dano já aplicado quando ele aparece.
- O que um uso gasta além da ação do Momento fica em `flags.eternia.alsoSpends` da habilidade (a Disparada) e em
  `usage.alsoSpent` no registro; o (Menor) e o [Destino 1] dos monstros, em `flags.eternia.minor` e `fateOption`
  (`bestiary/minor.mjs`, veja `docs/bestiario.md`).

## O Guia do Jogador (manter sempre atualizado)
- **Toda mudança no sistema que o jogador sente (uma regra, uma mecânica, um número das tabelas, uma aba ou um botão da
  ficha, do HUD ou do chat) vem com a mudança no Guia do Jogador, na mesma entrega.** Pedido do usuário: "toda vez que a
  gente mexer alguma coisa no sistema, você vai lá e também altera o guia do jogador".
- O guia explica como o sistema funciona; não lista raças, classes, Magias nem habilidades (essas ficam nos compêndios
  e em AS REGRAS). Texto próprio, em pt-BR, sem nomes de obras; os exemplos usam os personagens do guia (Tadeu,
  Centurião Dracônico; Lia, Maga Negra Elfa; Ravi, Caçador Bestial Lupino; Mirela, Hierofante; Kenji, Samurai Felino).
- Fonte: `src/guide/NN-nome.html`, um capítulo por página, com `<!-- id: … | slug: … | titulo: … -->` na primeira
  linha (o id é da página para sempre; capítulo novo pega id novo). Links: `@Guia[slug]{texto}` entre capítulos,
  `@Regras[XI]{texto}` para AS REGRAS. `node tools/build-guide.mjs` gera `src/packs/guide` com a versão (um hash das
  páginas) que faz cada mundo reescrever a cópia do Diário (`module/journal/index.mjs`, `syncGuide`).
- Os blocos de livro estão no cabeçalho de `css/journal.css`: `header.et-cap`, `p.et-abre`, `aside.et-box` com
  `.et-regra/.et-exemplo/.et-dica/.et-atencao/.et-foundry/.et-resumo/.et-mestre` (h4 na primeira linha é o título),
  `.et-grade` + `.et-cartao` (`.et-duas` para quatro cartões), `.et-fluxo`, `ol.et-passos`, `.et-formula`, `dl.et-def`,
  `.et-medidor`, `table.et-quadros`, `span.et-d6`. Sem SVG embutido (o Foundry o tira do HTML salvo); sem estilo inline.
- Para testar sem recompilar o compêndio (o servidor trava o LevelDB): leia o JSON por
  `fetch("systems/eternia/src/packs/guide/…json")` e recrie as páginas da cópia do Diário.

## CSS
- `css/eternia.css` e `css/piles.css` são a base (camada `system`).
- `css/interface.css` (a interface do Foundry: barra lateral, listas, controles, jogadores, avisos, menus, a barra das
  janelas) e `css/journal.css` (o diário como livro) ficam na camada `modules`, debaixo das classes `et-ui` e `et-journal`
  do `body`, que duas configurações de cada jogador ligam (`uiTheme`, `journalTheme`). As cores do Foundry viram as da
  Eternia trocando as variáveis base (`--color-cool-*`, `--color-warm-*`, `--color-light-*`) no `body`; o Foundry declara
  as variáveis da interface no próprio `#interface`, então as de lá se trocam no `#interface`. As regras de texto do
  diário usam `:where()` para os blocos de livro (que pesam mais) ganharem delas; botão que é só ícone (`fa-` na classe)
  não pode receber `font-family`. O Eczar desenha o "×" como losango: os sinais das fórmulas vêm do Gelasio (a fonte
  "Eternia Sinais", por `unicode-range`).
- Na interface (`css/interface.css`), listas, botões, campos, menus e dicas usam a Signika (`--et-sans`); Eczar e Gelasio
  ficam para títulos e para o texto de leitura em pergaminho. O usuário achou a serifa pequena na barra lateral ruim de
  ler no fundo escuro. As dicas comuns (`#tooltip`) entram com `:where(body.et-ui)`, abaixo das dicas próprias do sistema
  (`#tooltip.lhb-tooltip`, `.lhcl-tooltip`, `.lhh-tip`), que são pergaminho com texto escuro: um seletor mais pesado
  pinta o fundo delas de verde e o texto some.
- O visual de pergaminho (`automation.css`, `sheet.css`, `chat.css`, `windows.css`, `hud.css`, `tbg.css`) vai na
  camada `modules` (campo `layer` em `styles` do `system.json`): ganha da base sem disputa de especificidade, como
  quando era um módulo. Arquivo novo de CSS no manifesto exige reiniciar o servidor do Foundry.
- Os campos das janelas em pergaminho (`windows.css`: `.application.lhwin.themed :is(input[type="text"], …, select,
  textarea)`, mais `:hover` e `:focus`) pesam (0,4,1) na mesma camada: um campo com visual próprio precisa de um
  seletor do mesmo peso, como `.application.creation-wizard .wz-hero .wz-name input[type="text"]`.

## Compêndios
- **A matemática do sistema fica em `docs/matematica.md`.** Toda classe, Magia, habilidade de raça ou criatura nova (e
  toda mudança de número numa delas) segue a régua de lá: o valor por rodada das classes e as Leis do Motor, os dados
  dos feitiços por categoria e o peso do Tabu, o orçamento das raças, o dano dos inimigos por NP e o alvo do encontro
  (o grupo de 4 perde pelo menos 65% dos PV no NP 1, +1,5% por NP). Confira no simulador antes de entrar.
- Fonte em `src/packs/<pacote>/*.json`, em português. Campos lidos pela automação (tags, Momento, alcance, alvo,
  custo, limite, tipos, subtipos) ficam em inglês; `module/i18n/` traduz na tela.
- Raças, classes e habilidades gerais e de combate da Eternia ficam em `races-classes`, `skills-racial`,
  `skills-class` e `skills-common` (este ainda vazio). O navegador de habilidades acha a origem de cada habilidade
  pelo nome das pastas (a classe, a raça) e pelas flags da Dedicação e dos Caminhos.
- Classe = item `class` (base, tags de papel, `grants` com o kit, a escolha do elemento no NP 1 quando a classe tem
  elementos, o Caminho no NP 3 e o Ápice no NP 10) + habilidades na pasta com o nome da classe em `skills-class`, com o
  Motor em código em `module/classes/` (estado em `flags.eternia.motor.<classe>`). Regras de construção, flags e como
  criar uma classe: `docs/classes.md`. Não há arquétipos nem Kuden. Uma classe que saiu da lista leva
  `flags.eternia.retired` no item e na Dedicação (o Ressonante, que virou o Mago Vermelho, o Tecelão, que virou o Mago
  Branco, o Feiticeiro, que virou o Mago Negro com a Magia Fogo, e, na 0.22, o Druida, o Sacerdote, o Oráculo, o
  Estrategista e o Menestrel). As 14 classes da lista têm família (física ou mágica) e função no grupo em `CLASSES`
  (`module/classes/data.mjs`), que dão a cor do emblema e da aba. O Monge, o Guardião e o Comandante se chamam Lutador,
  Centurião e Hierofante desde a 0.22, com os mesmos ids.
- Magia = habilidade passiva com `flags.eternia.magic` (dada pelas vagas de Magia da classe: NP 1, 5 e 10 nas
  mágicas, 1 e 10 nas físicas, 5 e 10 no Matador de Dragões) e os feitiços com `flags.eternia.magicSpell`, em
  `skills-class`, pasta `Magias/<Magia>`; o Motor dos feitiços é o da classe de quem conjura (`motor.id: "@class"`). Veja "As Magias" em `docs/classes.md`. Uma classe que já existia e ganha
  vagas de Magia (o Invocador na 0.13; as físicas e o Matador de Dragões na 0.22) entra em `MAGIC_CLASSES` de
  `module/classes/migration.mjs`, com os NP das vagas: a migração `kudenCleanup` põe as vagas no item de classe das
  fichas.
- Um efeito de habilidade que depende de outra habilidade (um Caminho, um talento) usa as condições `hasSkill` e
  `notSkill`, pelo nome, conferidas em quem usa (o Escudo Esculpido do Pictomante vira muralha no Caminho da Paisagem).
- Raça = item `race` com atributos, `hp`, `fate` e `grants` (as 2 inatas, uma Geral e uma de Combate; uma escolha vira
  um espaço com várias opções) e os cinco estágios da forma em `flags.eternia.stages` (todos com o nome e `look`, o que
  muda no corpo; do 2 ao 5 o NP, o rito, `grants` em espaços, vários uuids = uma escolha, e no 4 `attribute`, os
  atributos do +1). O item de raça do personagem é uma cópia: mudou um estágio no compêndio, suba a versão da migração
  `raceStages` (`module/races/migration.mjs`), que devolve às cópias os estágios do compêndio (pelo `identifier`).
  As habilidades ficam em `skills-racial`, na pasta com o nome da raça: as inatas e as variantes levam
  `flags.eternia.choiceOnly` (só aparecem no navegador depois de concedidas), e as dos estágios também, com `minRank` (o NP do estágio) e `raceStage`:
  só a evolução as dá (`module/races/evolution.mjs`). O item de raça do personagem guarda `flags.eternia.stage` (1 sem
  a flag), `stageBonus` (o +1 dos estágios, somado por `raceStats`) e `stageLog` (o que cada estágio criou, para
  voltar um). Os Bestiais são três itens (Felinos, Lupinos, Vulpinos) com `raceGroup: "bestial"` e `lineage`: o
  assistente mostra um cartão só. As raças que saíram (Oni, Flügel, Etherious, Vargr, Kitsune, Exceed) e as habilidades
  que não passaram adiante levam `flags.eternia.retired`. A cor e a ordem das raças ficam em `module/races/data.mjs`.
- O Mundo de Eternia (`world`, JournalEntry, só do Mestre): os capítulos do mundo, um diário por capítulo e uma página
  por seção, gerados de `Eternia-Mundo/diario/` (fora do repositório); "capítulo N" vira link para o diário.
- Bestiário (`bestiary`, veja `docs/bestiario.md`): os itens deixados são itens guardados no monstro com
  `flags.eternia.drop` (`min`/`max`, `fixed`, `growth`, `qty`, `gold`), rolados por `module/bestiary/drops.mjs` quando
  ele cai; quem derrubou leva tudo (um token posto no meio do combate leva `noLoot` no próprio token: `cameLate` lê o do
  ator e o do token). As regras de monstro vão em `flags.eternia.monster = { rule, ... }` nas habilidades (`pack`,
  `grow`, `threshold`, `fall`, `cleanse`, `summon`, `recharge`, `struck`, `offer`, `troop`, `retreat`, `forget`,
  `pulse`, `start`, `save`; na 0.37, `disguise`, `conceal`, `engulf`, `split`, `rust`, `contact`, `latch`, `gaze`,
  `lure`, `rise`, `raise`, `stack`, `rampage`, `surprise`, `throw`, `blink`, `copy`, `phase`, `nearest`, `heads`; e, na 0.47,
  `breed`, `brood`, `curse`, `shuffle`, `devour`, `spill`, `thirst` e `bow` (com `round` no `retreat`, `steps` no `latch`,
  `notMetal` no `engulf` e `bound` no `summon`); cada
  uma no seu arquivo de `module/bestiary/`, como o Salvar dos Desgarrados em `save.mjs` e o levantar e o erguer dos
  mortos em `rise.mjs`); o disfarce (`disguise`, desde a 0.47.1) esconde o token (`hidden`), com a arte e o lado dele,
  até ele andar um quadrado, agir, ser tocado ou atacado, ou o Mestre o mostrar pelo olho do HUD (o usuário não quis o
  ícone do Foundry no lugar da arte); a Mão Leve é um efeito de uso com `flags.eternia.pickpocket`, a criatura que come um dano, um
  efeito com `flags.eternia.absorb` (lista de tags), o dano pela metade, `flags.eternia.halve`, e a Possessão, a flag de
  habilidade `flags.eternia.possess`. A Fenda é um monstro com `flags.eternia.rift` e o relógio no Destino (`growOn: "fall"`: cresce quando
  quem escreve cai). As criaturas numeram o token com número romano ("Kobold II": `freeNumber` em
  `canvas/token-defaults.mjs`, por `EterniaActor#getTokenDocument` e pelos chamados de `spawnNear`, que contam o lote,
  porque o `getTokenDocument` só vê os tokens que já existem). Teste de monstro numa cena: dentro do `sceneRect` (fora dele, o empurrar para na borda). A fera com
  nome sai de `module/bestiary/named-template.mjs`, que não pode importar nada do Foundry: a coroa da ficha e o gerador
  do compêndio usam o mesmo arquivo. Os monstros do Império (pasta O Império) foram gerados por um script fora do
  repositório: a fonte é o JSON. Desde a 0.43 o Bestiário só tem essas criaturas (os monstros antigos de Log
  Horizon saíram). As 52 de Norlangarth (NP 1 a 3, a 0.47) saem de `Eternia-Bestiario-Expansao/gerador/make-new.mjs`
  (fora do repositório), que escreve só elas, com o dano calibrado pelo simulador (`tune-new.js` → `apply-tune.py`):
  nunca rode o gerador antigo do Império por cima, porque a 0.42 e a 0.44 mudaram aqueles JSON à mão. A arte de cada
  criatura (o token com a moldura, que também é o retrato) é `assets/tokens/bestiary/<nome sem acentos>.webp`: o
  `make-new.mjs` a põe sozinho quando o arquivo existe, e os tokens saem de `prompts/bestiario-norlangarth/tokens.py`
  (fora do repositório, ao lado das imagens do ChatGPT). Um monstro do Império já trazido para um mundo é uma cópia: mudou um nome ou a arte no
  compêndio, a migração `bestiary` (`module/bestiary/migration.mjs`) leva a mudança às cópias.
  Uma tabela nova escrita no formato dos livros vira dados com `node tools/convert-drops.mjs`.
- NPCs e personagens maiores ficam fora do Bestiário (desde a 0.40), em compêndios próprios, para o Mestre importar só a
  categoria que mudou: `npcs`, 126 personagens prontos (raça, profissão, NP e classe só nos guerreiros, sem Magia), e
  `major-characters`, 140 personagens em branco, só com a raça e o token, para o Mestre montar a ficha (as feras e
  divindades absolutas têm o token Astro, 2×2, com a luz fraca de cada uma; nos demônios, sem luz e com a névoa escura na
  arte, porque a escuridão do Foundry cobre o próprio token). Os dois saem de scripts fora do repositório: a fonte é o JSON
  (veja "Os NPCs" e "Os personagens maiores" em `docs/bestiario.md`).
- Profissão = item `subclass` com `system.identifier` igual a um id de `module/professions/data.mjs`, na pasta
  Profissões de `races-classes`. O progresso fica no personagem (`flags.eternia.professions.<id>`) e o item feito guarda
  a base em `flags.eternia.craft` (veja `docs/profissoes.md`). Engenhocas e Canções ficam em `items` (pastas próprias).
- Ícones de item: cada item tem um só seu (`img` + `flags.eternia.icon.hue` nunca se repetem). Ícones do Foundry entram
  pelo caminho (`icons/...`), nunca copiados para o repositório (licença); arte própria fica em `assets/icons/items/`.
  Molduras e efeitos são desenhados no navegador (`module/icons/`, veja `docs/icones.md`).
- Fórmulas de rolagem ficam no próprio campo: `damage.dice: "@sr+1"`, `damage.mod: "@cr*2+10"` (nunca em
  `diceFormula`/`formula`, que são derivados). Flags de efeito e de habilidade: veja `docs/condicoes.md`.
- `npm run packs:build` (Foundry CLI, com o mundo fechado) gera `packs/`; `npm run packs:unpack` volta para `src/`.
- Índices de compêndio: todo campo que o código lê de um índice de Item entra em `ITEM_INDEX_FIELDS`
  (`module/helpers/pack-index.mjs`, posto em `CONFIG.Item.compendiumIndexFields`). O Foundry guarda um índice por
  compêndio com os campos do último pedido: um `getIndex({ fields })` com um campo de fora dessa lista busca o índice
  inteiro de novo (e o seguinte, também). As descrições ficam de fora (pesariam todos os compêndios): quem as lê carrega
  os documentos (o catálogo de Magias carrega só as 97 Magias, uma vez).
- O que as janelas leem dos compêndios é preparado com o jogo ocioso (`module/helpers/prewarm.mjs`): o índice das
  habilidades de classe, o do navegador de habilidades, as opções, o catálogo de Magias (`apps/magic-catalog.mjs`) e o do
  assistente de criação (`apps/creation-catalog.mjs`). Cada um se refaz quando um item de compêndio muda.

## Criação de personagem
- O assistente (`module/apps/creation-wizard.mjs`, `templates/apps/creation/`, `css/creation-wizard.css`) não muda o ator
  até o fim: cria tudo num `createEmbeddedDocuments` só, com a opção `eterniaCreation: true`, que os ganchos das caixas
  antigas (character-options, choice-grants, rank-grants, progression) respeitam. As marcas são as mesmas das caixas:
  `grantedBy` da raça, da classe e da Magia de escolha, `skillPicks` de NP 1 nas escolhas e `skillProgress` `{ base: 1,
  creation: true }`. A lista de escolhas vem de `creationCandidates` (`apps/skill-browser.mjs`), com as regras do
  navegador no NP 1: uma regra nova do navegador vale para os dois.
- Itens iniciais (`module/apps/starting-gear.mjs`): a Mochila, o Kit de Aventureiro e o Sanduíche de graça (por uuid
  do compêndio `eternia.items`) e uma loja com os itens de Nível 1 com preço dos compêndios do sistema e do mundo, sem
  [Not For Sale], [Untradeable] nem [M1]–[M7]. O orçamento é o ouro do personagem (350 no template). Os itens criados
  levam `flags.eternia.starting` ("free" ou "bought") e o personagem `flags.eternia.startingGear { spent }`: criar de
  novo apaga os marcados e devolve o ouro gasto. Onde cada peça vai é `gearLayout` (o mesmo cálculo da prévia e da
  criação); os números seguem `EterniaActor#_computeBattleStatuses`. O kit de cada classe é `KITS` (nomes de itens) e
  a sugestão de atributos é `suggestBonus` (a base da classe ao quadrado pesa cada modificador).
- O passo Itens desenha o corpo com `DOLL` (`creation-wizard.mjs`: o tamanho do palco e o ponto de cada lugar na
  silhueta; `dollPlace` põe o cartão do lado certo). Cada acessório vai para a parte do corpo que o nome diz
  (`ACCESSORY_SPOTS`, por expressão no nome dobrado; o que não casa fica no quadril), e a coluna da esquerda segue o
  corpo de cima para baixo para as linhas não se cruzarem. O passo equipa o kit uma vez só, ao chegar com o carrinho
  vazio (`draft.kitOffered`). No passo Habilidades, o clique numa habilidade abre a caixa de leitura (`#renderReader`,
  `templates/apps/creation/reader.hbs`, dados de `skillReading` em `creation-catalog.mjs`) e quem escolhe é o
  quadradinho (`data-action="skill"`). A caixa vai no `.window-content`, ao lado das partes, sobre a área do passo
  (`grid-area: step`): desenhar o passo de novo (uma escolha) a deixa lá, e ela se redesenha no `_onRender`. O Esc e as
  setas dela são pegos no `document`, em captura, porque o Esc do core fecha todas as janelas; o Espaço num botão do
  assistente não segue para as teclas do core (pausaria o jogo do Mestre). Os textos dos feitiços na janela de Magias vêm de `spellTexts` (`apps/magic-catalog.mjs`);
  `loadDocuments` fica em `helpers/pack-index.mjs` para o catálogo de Magias e o do assistente usarem sem importar um
  ao outro.

## O Mercado e as lojas
- `module/market/`: `catalog.mjs` (`marketCatalog`: todo item físico dos compêndios de Item do sistema e do mundo e os
  itens do mundo, o primeiro de cada nome e tipo vale, o do sistema antes; a entrada é a `gearEntry` do assistente com o
  grau, `forSale`, a pasta e a busca), `market.mjs` (`EterniaMarket`: uma classe para o Mercado e para a vitrine de uma
  loja; os filtros rodam nas entradas, sem desenhar de novo, em `#applyFilters`, que também conta cada botão), `shops.mjs`
  (`marketPurchase`, só do Mestre e na tela dele; `createShop`/`createShopDialog`/`addToShop`/`placeShop`; `buyFromShop`
  vai pelo `buyItem` das pilhas) e `index.mjs` (configuração `marketPlayers`, o botão na barra dos tokens, os ganchos que
  desenham de novo a vitrine quando a loja ou quem compra muda, e `game.eternia.market`). Modelos em `templates/market/`,
  CSS em `css/market.css` (prefixo `mk`).
- Uma loja é uma pilha no modo mercador (`module/piles/`): o estoque, a compra pelo socket do Mestre, a venda e o registro
  no chat são os dela. A vitrine troca a ficha da pilha nos dois cliques (`openPile` e `EterniaToken#_onClickLeft2`, para
  o Mestre também); a ficha continua para configurar. O jogador precisa de Limitado no ator da loja para os dois cliques
  pegarem (`Token#_canView`), e a loja criada pelo Mercado já vem assim.
- Não use `tab` como `data-action` numa janela nova: é a ação de abas do `ApplicationV2`.

## Ficha e tokens
- A aba Raça (`module/races/sheet.mjs`, `templates/character/race.hbs`, CSS em `css/classes.css`, prefixo `lhrc`) usa a
  faixa e os blocos de habilidade da aba Classe (os seletores `:is(.tab.class, .tab.race)`) e as dicas de
  `classes/sheet.mjs`. A barra de abas da ficha cabe nove abas com os números no tamanho padrão: aba nova pede medir de
  novo (`css/sheet.css`, `nav.lhpf-tabs`).
- A aba Biografia (`templates/character/biography.hbs`) guarda o Perfil em `flags.eternia.bio` (alcunha, bordão, dados
  pessoais, aparência, personalidade, anotações); a guilda é `system.social.guild` e a história, `system.biography`.
  As Origens são lidas na hora do texto em itálico depois do `<hr>` que fecha a descrição da raça, da classe, da
  profissão e das Magias: um item novo desses ganha a sua origem escrevendo esse parágrafo.
- Como os tokens vêm (`module/canvas/token-defaults.mjs`): personagem com visão sem limite de alcance, vinculado e do
  lado dos aliados; monstro sem vínculo; todo nome sempre à vista. O token de personagem posto na cena é vinculado pelo
  `preCreateToken`, e a troca de retrato leva o token junto (`EterniaActor#_preUpdate`/`_onUpdate`). Mundos antigos
  recebem isso pela migração `tokens`, que também desliga o marcador de turno do core.
- O retrato nas fichas (aba Personagem, Perfil da Biografia, cabeçalho do monstro): `portraitFit`
  (`module/helpers/portrait.mjs`) lê a imagem num canvas de 96 px e, quando é um token (cantos transparentes e a forma
  enchendo ao menos 70% da caixa dela), a ficha põe a classe `token` e as variáveis `--tw/--th/--tl/--tt`, que tiram o
  quadrado escuro e escalam a forma até a borda (`css/sheet.css`). As artes padrão (`DEFAULT_ART`) ficam no quadro.
- O desenho dos tokens (`module/canvas/token-style.mjs`): a barra de PV e o Motor só aparecem em combate (configuração
  `tokenBarsCombat`); a barra é um arco no aro de cima do token (a primeira barra em cima, a segunda embaixo: com as
  barras do sistema, o Destino em losangos na borda de baixo); os ícones de estado começam abaixo da ponta esquerda do
  arco; o nome é texto puro, sem faixa, logo abaixo da borda (abaixo dos losangos quando eles aparecem).

## Teste local
- `Data/systems/eternia` é uma junction para este repositório; mundo de teste `eternia-teste`.
- Servidor sem janela: `ELECTRON_RUN_AS_NODE=1 "Foundry Virtual Tabletop.exe" launcher.mjs --dataPath=... --port=30017
  --noupnp --noupdate --world=eternia-teste`, com um `launcher.mjs` que apaga `process.versions.electron` e importa
  `resources/app/main.mjs`. Entrar como Gamemaster, sem senha.
- Os testes ficam em `Data/eternia-tests` (fora do repositório) e rodam na página do jogo: `run-044.js` roda a bateria
  inteira. As suítes de antes da 0.44 rodam com as automações do lote 2 desligadas (`OLD` no executor), como foram
  escritas. O `createEmbeddedDocuments` devolve os documentos em qualquer ordem: ache cada um pelo nome.

## Release
1. `version` e a URL de `download` no `system.json`, e a entrada no CHANGELOG.
2. `npm run packs:build` e `npm run package` (gera `dist/eternia.zip` e `dist/system.json`).
3. Commit, push e `gh release create vX.Y.Z dist/system.json dist/eternia.zip`.
