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
  O dano de todo golpe que acerta também rola sozinho lá (configuração `hitDamage`; sem ela, só o dos monstros, pela
  `monsterDamage`), e um ataque sem alvo marcado nem é usado nem rolado (`lacksTarget` de `helpers/skill-rolls.mjs`).
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
  `skills-class` e `skills-common` (este só com as habilidades das profissões, o Selar do Selador, pasta Profissões). O navegador de habilidades acha a origem de cada habilidade
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
- Os portadores e a Absoluta (0.51): toda Magia que não é Conjuração pode ter um limite de portadores no mundo
  (`flags.eternia.magic.holders`: 1, 2 ou 3; sem a flag, sem limite), contado por `module/apps/magic-holders.mjs` (as
  fichas do mundo, os tokens soltos das cenas e o Despertar ainda aberto); esgotada, não sai no sorteio e o jogador não a
  escolhe. A Absoluta (`category: "absolute"`, `exclusive: true`) fecha as vagas do NP 5 e 10 e só entra numa ficha sem
  outra Magia. Uma Magia nova pede o limite dela e, se for de propósito mais forte que as outras, a "apelação" (a régua
  na seção 5 de `docs/matematica.md`). As 13 Magias da 0.51 e o buff do Sol, das Artes Negras, da Magia das Fadas e do
  Contra-ataque saem de `Eternia-Onda-Apelona/` (fora do repositório: `gen.mjs` escreve só as 13, `buffs.py` as quatro
  com buff e os limites de portadores, `rules.py` AS REGRAS XII, `lang.py` os textos). As três do elenco (1.0.4: a
  Página em Branco, A Escrita e a Escrita de Cardinal) saem de `Eternia-Magias-Elenco/` (`gen.mjs`, `rules.py`, `lang.py`). Nunca rode os geradores antigos
  dos kits de Magias por cima: o balanço da 0.42 mudou aqueles JSON à mão. Mudou uma Magia que as fichas já têm, suba a
  versão da migração `kudenCleanup` (`refreshMagias` com a lista dela, como `BUFFED_051`). A Cataclismo é a antiga Fruta
  do Tremor (renomeada na 0.51.1, com o mesmo id, `fruta-do-tremor`, e o nome repetido de propósito com o talento do
  Feiticeiro aposentado: `SHARED_WITH_RETIRED` no `lib.mjs` do gerador).
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
  `major-characters`, 141 personagens em branco, só com a raça e o token, para o Mestre montar a ficha (as feras e
  divindades absolutas têm o token Astro, 2×2, com a luz fraca de cada uma; nos demônios, sem luz e com a névoa escura na
  arte, porque a escuridão do Foundry cobre o próprio token). Os dois saem de scripts fora do repositório: a fonte é o JSON
  (veja "Os NPCs" e "Os personagens maiores" em `docs/bestiario.md`). A exceção são os 97 atores do elenco de *A Última
  Etapa* (`flags.eternia.elenco`): nome do papel e ficha inteira, de `Eternia-Enredo/fichas/gerar_fichas.py`, que tem de
  rodar de novo depois de qualquer um dos dois scripts acima (veja "O elenco de A Última Etapa" em `docs/bestiario.md`).
- Profissão = item `subclass` com `system.identifier` igual a um id de `module/professions/data.mjs`, na pasta
  Profissões de `races-classes`. O progresso fica no personagem (`flags.eternia.professions.<id>`) e o item feito guarda
  a base em `flags.eternia.craft` (veja `docs/profissoes.md`). Desde a 1.0.1, o Selador (`sealer`) e o Domador (`tamer`)
  estão nos lugares (e nos `_id`) do Engenheiro e do Bardo, que saíram (a migração `professions` passou os personagens
  e a EXP). Selos e Montarias ficam em `items` (pastas próprias); as Engenhocas e as Canções continuam lá, mas nenhuma
  profissão as faz. Uma habilidade de profissão (o Selar) leva `flags.eternia.profession` e `choiceOnly`: a profissão a
  dá e tira (`professions/skills.mjs`), e cada uso gasta uma tentativa.
- Ícones de item: cada item tem um só seu (`img` + `flags.eternia.icon.hue` nunca se repetem). Ícones do Foundry entram
  pelo caminho (`icons/...`), nunca copiados para o repositório (licença); arte própria fica em `assets/icons/items/`.
  Molduras e efeitos são desenhados no navegador (`module/icons/`, veja `docs/icones.md`).
- Fórmulas de rolagem ficam no próprio campo: `damage.dice: "@sr+1"`, `damage.mod: "@cr*2+10"` (nunca em
  `diceFormula`/`formula`, que são derivados). Flags de efeito e de habilidade: veja `docs/condicoes.md`.
- O `flags.eternia.damageText` (o rótulo do campo Dano, no HUD e na ficha) repete a fórmula em texto: mudou os dados,
  o modificador ou a fórmula escrita no texto de uma habilidade, mude o rótulo junto, e nas cópias dos NPCs prontos
  (`npcs`). O balanço da 0.42 deixou 24 rótulos velhos (corrigidos depois, com a migração `kudenCleanup` 9).
- `npm run packs:build` (Foundry CLI, com o mundo fechado) gera `packs/`; `npm run packs:unpack` volta para `src/`.
- Índices de compêndio: todo campo que o código lê de um índice de Item entra em `ITEM_INDEX_FIELDS`
  (`module/helpers/pack-index.mjs`, posto em `CONFIG.Item.compendiumIndexFields`). O Foundry guarda um índice por
  compêndio com os campos do último pedido: um `getIndex({ fields })` com um campo de fora dessa lista busca o índice
  inteiro de novo (e o seguinte, também). Peça sempre por `packIndex(pack, fields)` (mesmo arquivo), que junta os pedidos
  em andamento. As descrições ficam de fora (pesariam todos os compêndios): quem as lê carrega os documentos (o catálogo
  de Magias carrega só as 113 Magias, em fatias de 20). A exceção é o Mercado: ele pede as descrições
  (`MARKET_INDEX_FIELDS` de `helpers/pack-index.mjs`) só ao índice dos compêndios com itens físicos, de propósito, para
  não carregar ~1000 documentos; no Mestre, os ícones já pedem esses campos no `ready`.
- O que as janelas leem dos compêndios é preparado com o jogo ocioso (`module/helpers/prewarm.mjs`), um passo por vez,
  cada um esperando o jogo ficar ocioso de novo: os índices dos compêndios de Item (`itemIndexes`), o das habilidades de
  classe, o do navegador de habilidades, as opções, o catálogo de Magias (`apps/magic-catalog.mjs`, os textos em fatias)
  e, para o Mestre ou para o jogador que tem um personagem em branco (sem raça nem classe), o do assistente de criação
  (`apps/creation-catalog.mjs`) e a loja dele; para o Mestre, o Mercado por último. Cada um se refaz quando um item de
  compêndio muda.

## Criação de personagem
- O assistente (`module/apps/creation-wizard.mjs`, `templates/apps/creation/`, `css/creation-wizard.css`) não muda o ator
  até o fim: cria tudo num `createEmbeddedDocuments` só, com a opção `eterniaCreation: true`, que os ganchos das caixas
  antigas (character-options, choice-grants, rank-grants, progression) respeitam. As marcas são as mesmas das caixas:
  `grantedBy` da raça, da classe e da Magia de escolha, `skillPicks` de NP 1 nas escolhas e `skillProgress` `{ base: 1,
  creation: true }`. A lista de escolhas vem de `creationCandidates` (`apps/skill-browser.mjs`), com as regras do
  navegador no NP 1: uma regra nova do navegador vale para os dois.
- Itens iniciais (`module/apps/starting-gear.mjs`): a Mochila, o Kit de Aventureiro e o Sanduíche de graça (por uuid
  do compêndio `eternia.items`) e uma loja com os itens de Nível 1 com preço dos compêndios do sistema e do mundo, sem
  [Not For Sale], [Untradeable] nem [M1]–[M7]. O orçamento é o Yuld do personagem (700 no template, `START_YULD`). Os itens criados
  levam `flags.eternia.starting` ("free" ou "bought") e o personagem `flags.eternia.startingGear { spent }`: criar de
  novo apaga os marcados e devolve o Yuld gasto. Onde cada peça vai é `gearLayout` (o mesmo cálculo da prévia e da
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
- O Despertar (`module/apps/awakening.mjs`, configuração `awakening`): a Magia do NP 1 de um jogador é sorteada. As
  rolagens (1d o número de Magias livres, `awakeningPool`: as esgotadas pelo limite de portadores ficam de fora; uma
  repetida rola de novo, até 3) ficam em `flags.eternia.awakening`
  `{ rolls, chosen }` assim que saem, com um cartão no chat; `chosen` trava a Magia (o `preDeleteItem` e a lixeira da
  ficha não deixam o jogador tirá-la). Um personagem sem a flag e com Magia despertou com a primeira (`awakeningOf`).
  Mostram o sorteio o passo Magia do assistente e a `MagicPicker` com `awakening: true`, que `offerGrants` abre para a
  primeira vaga de NP 1; o Mestre sempre escolhe livre, e a escolha dele também trava. `resetAwakening` (o botão do
  Mestre no assistente) grava a flag vazia, para o sorteio abrir mesmo com a Magia na ficha.

## A economia (0.48)
- **A moeda é o Yuld; os números da economia ficam em `module/economy/data.mjs`** (puro, sem Foundry: o bestiário, a
  fera com nome, as profissões, o assistente, as lojas e os scripts `economia-*` do simulador o leem). A unidade é o
  comum (o que um comum do NP deixa); a régua, a seção 9 de `docs/matematica.md`. Nos dados, o campo continua o do ouro
  (`system.inventory.gold`, `system.gold` da pilha, `gold` da linha de drop, `stolenGold`, `startingGear.spent`): só o
  nome na tela mudou. Texto novo diz Yuld, nunca ouro ou "G" (o ouro que é metal fica).
- Preço de item novo: o peso da categoria (a tabela da seção 9) × o comum do nível × a força dele; drop de criatura nova:
  `monsterValue` (pelo tipo e por quantas fazem um encontro), conferido com `node economia-drops.mjs`. Os preços e os
  drops do compêndio saem de `economia-aplicar.mjs` (no simulador), a partir de `economia-base.json` (os de 0.47):
  mudou um número de `data.mjs`, rode-o de novo em vez de editar os JSON à mão.
- **O script reescreve a partir da base** as criaturas do bestiário inteiras e as descrições dos itens com receita: mudar
  o texto de uma criatura ou de um item com receita pede a mesma troca em `economia-base.json` (com os preços em G), ou o
  script a desfaz. A limpeza da 0.49 entrou assim; confira com `node economia-aplicar.mjs --dry` (0 arquivos mudados).
  AS REGRAS não sai mais da base (desde a 0.49, que reescreveu o ÍNDICE e as páginas I a VIII): o script só refaz o
  bloco V.e e acerta os números no texto atual.
- A venda é `saleRate` (`sellPrice` de `piles/pile-utils.mjs`): tesouros pelo cheio, mágicos e Anima-mundi pela metade, o
  resto pela taxa da loja (10% por padrão); o Anima-mundi sem o Selo (`flags.eternia.unsealed`) não se vende, nem pelo
  Mercador. A migração `economy` (`economy/migration.mjs`) levou as bolsas (×2), os preços e os drops aos mundos de antes.

## O Mercado e as lojas
- `module/market/`: `catalog.mjs` (`marketCatalog`: todo item físico dos compêndios de Item do sistema e do mundo e os
  itens do mundo, o primeiro de cada nome e tipo vale, o do sistema antes; a entrada é a `gearEntry` do assistente com o
  grau, `forSale`, a pasta e a busca), `market.mjs` (`EterniaMarket`: uma classe para o Mercado e para a vitrine de uma
  loja; os filtros rodam nas entradas em `#filter`, que também conta cada botão, e a lista desenha só a página atual,
  `PAGE_SIZE` linhas, com o paginador; filtro, busca (com 200 ms de espera) e ordem voltam à página 1 e desenham só a
  parte "list"; as contagens do banner são escritas por `#applyCounts`, sem desenhar o banner), `shops.mjs`
  (`marketPurchase`, só do Mestre e na tela dele; `createShop`/`createShopDialog`/`addToShop`/`placeShop`; `buyFromShop`
  vai pelo `buyItem` das pilhas) e `index.mjs` (configuração `marketPlayers`, o botão na barra dos tokens, os ganchos que
  desenham de novo a vitrine quando a loja ou quem compra muda, e `game.eternia.market`). Modelos em `templates/market/`,
  CSS em `css/market.css` (prefixo `mk`).
- Uma loja é uma pilha no modo mercador (`module/piles/`): o estoque, a compra pelo socket do Mestre, a venda e o registro
  no chat são os dela. A vitrine troca a ficha da pilha nos dois cliques (`openPile` e `EterniaToken#_onClickLeft2`, para
  o Mestre também); a ficha continua para configurar. O jogador precisa de Limitado no ator da loja para os dois cliques
  pegarem (`Token#_canView`), e a loja criada pelo Mercado já vem assim.
- Não use `tab` como `data-action` numa janela nova: é a ação de abas do `ApplicationV2`.

## O Grimório, o Hall da Fama e os duelos (0.52)
- Os botões da barra dos tokens saem na ordem em que os `register*` rodam no `init` (cada um usa
  `order: Object.keys(tokens.tools).length`): Mercado, Grimório (`apps/magic-codex.mjs`), Hall da Fama (`hall/`) e
  Duelos (`duels/`). Botão novo entra depois deles, do mesmo jeito.
- **O visual é sempre o da Eternia** (verde, pergaminho e dourado; as caixas de `windows.css`, o medalhão dourado do
  Mercado). Os duelos seguem as regras dos duelos de Aincrad, mas o usuário rejeitou o visual de lá: um pedido "tipo
  <obra>" é sobre a mecânica, nunca sobre as cores.
- O Grimório é a `MagicBrowser` da escolha de Magia com todas as Magias (`magicBrowserContext` sem `ownedIds`), sem
  bloquear nenhuma (`blocked: null`) e com `owned` nas do personagem selecionado (o livrinho de `magic-browser.hbs`).
- O Hall guarda as entradas na configuração do mundo `hallOfFame` (`{ id, uuid, name, img, epithet, reason, category,
  renown, hidden, pinned }`), com cópia do nome e do retrato; só o Mestre grava, e `visibleEntries` tira os ocultos dos
  jogadores. O menu da lista de atores vem do gancho `getActorContextOptions` (`label`/`visible`/`onClick`, v14).
- Um duelo é um combate com `flags.eternia.duel` (`duels/state.mjs`: `{ id, mode, state, a, b, result… }`, o lado `a` é
  quem desafiou). O Mestre principal faz tudo pelos `request` das pilhas (`duelChallenge`, `duelAnswer`, `duelCancel`,
  `duelResign`, `duelStop`) e avisa as telas no socket, escopo `duels` (`ask`, `closed`, `countdown`, `end`; `to` limita
  a usuários); os desafios esperando ficam só na memória dele. Ele vigia os dois pelo `updateActor` e pelos estados
  (`watch`); o "ninguém cai" do Primeiro Golpe e da Metade da Vida são ganchos em toda tela (`preUpdateActor` segura os
  PV em 1, `preCreateActiveEffect` barra [Incapacitado] e [Morto]) e valem enquanto o combate do duelo existir; o
  cartão de dano relê os PV depois do `update` (`sparedNow`). Fora isso, o duelo é um combate comum: `areDuelFoes` faz
  os dois inimigos no "aplicar só nos inimigos", o Ódio do grupo ignora combates de duelo (`hate.mjs`) e os dois lados
  do `bothSidesStanding` (`round.mjs`) são os dois duelistas.
- O ranking é refeito da história (`duelHistory`, configuração do mundo, um registro por duelo com resultado) em
  `duels/ranking.mjs`: Elo a partir de 1000, `K_FACTOR` por modo, títulos em `TIERS`. Anular um duelo é tirá-lo da
  história. A bolha do clique direito no personagem de outro jogador vem de `EterniaToken` (`_canHUD`,
  `_onClickRight`, `_propagateRightClick`), pela API (`game.eternia.duels.bubbleFor`/`openBubble`), sem importar o
  módulo dos duelos no token.
- Testes: `Data/eternia-tests/test-052.js` (faz os dois duelistas e apaga no fim); para testar o pedido de verdade, um
  segundo navegador entra como "Jogador Teste".

## A experiência e os grupos (0.53)
- **O NP sobe com o XP.** Os números ficam em `module/experience/data.mjs` (puro: o sistema, o modelo da fera com nome e
  os scripts `xp-*` do simulador o leem); a régua, a seção 10 de `docs/matematica.md`. O total é `system.infos.xp`, lido
  por `xpOf` (nunca abaixo do XP que o NP começa: um personagem de antes da 0.53 começa o NP dele no número da tabela).
  Todo XP passa por `addXp` (`experience/level.mjs`), que sobe com `{ eterniaXpGain }` (o "+N XP" de cada tela) e deixa o
  NP seguir (`followXp`, uma mudança por vez por personagem): chegou, `levelTo(actor, np, { auto: true })` muda sem caixa;
  o XP que desce (o Desfazer, a caixa do Mestre) pergunta antes de descer. O NP muda com `{ eterniaXpLevel: { from, to } }`:
  toda tela mostra o anel e "NP N!", e a tela dos jogadores do personagem, o aviso com Escolher agora (`openChoices`).
- `levelTo` sem `auto` é a caixa de antes, para o Mestre: o XP vai junto (subindo, pelo menos o XP do NP; descendo, dentro
  dele). O `preUpdateActor` de `rank-up.mjs` segura o NP que um jogador digita num personagem de jogador. As escolhas de
  um NP que o XP deu esperam o jogador (o aviso na tela dele; fora do jogo, as abas com o número dourado): só personagens
  de jogador ganham XP, então nenhuma tela de Mestre as abre. As de um NP que o Mestre pôs à mão abrem na tela do
  Mestre só quando nenhum jogador do personagem está no jogo (os personagens do próprio Mestre).
- O XP de um personagem é lido e gravado numa fila por personagem (`inLine` de `level.mjs`), e as premiações e os
  Desfazer passam por uma fila só no Mestre (`award.mjs`): dois monstros caídos na mesma área nunca gravam o XP um por
  cima do outro. Com um Mestre no jogo, o uso do Tíquete vai a ele (pedido `xpTickets`), a única mão que grava XP; sem
  Mestre, a tela do jogador grava. O `xpGiven` só fica no ator de um token (ou num vinculado): o ator do mundo de tokens
  sem vínculo passaria a marca a todos eles.
- **O XP dos monstros** (`experience/award.mjs`): no Mestre principal, 700 ms depois de [Incapacitado] ou [Morto] (como os
  itens deixados), quem derrubou (`fellerOf` de `bestiary/drops.mjs`; o mestre de uma criatura [Dominada]: `creditOf`) e o
  grupo dele na cena; um chefe ([Boss]), todos os personagens dos jogadores do combate dele. Só fichas com jogador
  (`hasPlayerOwner`) ganham XP. Uma vez por monstro (`flags.eternia.xpGiven`, que o Desfazer tira), nunca o que chegou
  tarde (`cameLate`). A Fenda dá quando fecha e o Desgarrado salvo a quem salvou, pelos ganchos `eternia.riftClosed` e
  `eternia.saved` (`rifts.mjs` e `save.mjs` não importam a experiência). O cartão (`templates/chat/xp-card.hbs`,
  `flags.eternia.xpCard`) vai sussurrado aos jogadores de quem ganhou e aos Mestres.
- **O XP de cada criatura** fica em `flags.eternia.xp`, escrito por `economia-aplicar.mjs` a partir de `xp-monstros.mjs`
  (o `dropPlan` dos itens deixados: o peso no encontro). Criatura nova: rode os dois; não escreva o XP à mão no JSON, que o
  script reescreve o bestiário a partir de `economia-base.json`. A fera com nome ganha o XP no `named-template.mjs`. Uma
  criatura sem a flag vale `monsterXpValue` pelo NP e pelas tags. A migração `bestiary` 6 leva o XP às cópias dos mundos.
- **Os bônus** (`experience/boosts.mjs`): item com `flags.eternia.xpBoost = { kind, pct, count }` dá um efeito com a mesma
  flag e `left`, gasto pelo `awardMonster` (um monstro por XP recebido), um de cada tipo por vez. Quem recebe é o
  `recipients` de `content/content.mjs` (o mesmo da comida: Pessoal, os alvos, o Banquete). O Potente da Oficina soma 5
  monstros (`potentKind` "xp").
- **O Tíquete de Evolução** (`experience/tickets.mjs`): item `ticket` com subtipo `Evolution` (o espaço próprio em
  `templates/actor/parts/inventory/inventory-ticket-evolution.html`); o "+" e o "−" são só do Mestre (`#onTicketIncrement`
  segura o jogador).
- **Os grupos** (`module/party/`): a configuração do mundo `parties` (`[{ id, leader, members, created }]`, uuids dos
  atores do mundo), gravada só pelo Mestre principal pelos pedidos `partyInvite`, `partyAnswer`, `partyCancel`,
  `partyLeave`, `partyKick`, `partyPromote`, `partyDisband` e `partyForm`; o convite no socket, escopo `party` (`ask`,
  `closed`). Toda tela redesenha pelo `onChange` da configuração (gancho `eternia.partiesChanged`). O quadro do grupo
  (`#eternia-party`) é desenhado em `ui.mjs`, ao lado de `#scene-controls`; a janela em `window.mjs` com
  `templates/party/`; CSS em `css/party.css` (prefixo `pt`). O Banquete lê o grupo (`recipients`).
- **A bolha e os painéis comuns:** o clique direito no personagem de outro jogador (`canvas/bubble.mjs`,
  `registerBubbleEntry`: os duelos e os grupos põem as entradas) e os painéis dos pedidos (`helpers/panels.mjs`: o convite
  do grupo e o desafio do duelo, com as classes `dl-*` de `css/duels.css`). Entrada nova na bolha: `registerBubbleEntry`.
- Testes: `Data/eternia-tests/test-053.js` (XP, grupo, Tíquete, bônus, telas; faz os personagens "XP A (teste)"… e apaga
  no fim) e `run-053.js` (a bateria inteira); o convite e o quadro se testam com o segundo navegador como "Jogador Teste"
  (`setup-053-grupo.js` monta a cena, com um usuário "Jogador Dois").

## As montarias (1.0.1)
- **A montaria é o tipo de item `mount`** (`template.json`; `module/mounts/`, veja `docs/montarias.md`): equipar é
  montar, uma por vez, e ela não ocupa a mochila (fora de `SPACE_TYPES`, dentro de `EQUIP_TYPES` e `PHYSICAL_TYPES`). A
  montada soma Velocidade, espaço, Iniciativa e Defesas em `documents/actor.mjs`; os efeitos dela só valem montada, como
  os do equipamento. Os dragões terrestres (de Re:Zero, no lugar do "dragão pequeno, sem asas" do Mundo) saem de
  `Eternia-Montarias/gen-itens.mjs` (fora do repositório), que também faz os selos, as duas profissões e o Selar.
- Montar e desmontar passam por `mounts/actions.mjs` (a ficha, o HUD e a API): livre fora das rodadas e na Preparação,
  a Ação de Movimento no turno durante elas. [Incapacitado], [Morrendo], [Morto] e [Derrubado] derrubam (o gancho de
  `createActiveEffect` em `mounts/index.mjs`). O [Montado] é o efeito da própria montaria, com `showIcon` sempre (o Foundry
  14 só desenha no token o efeito temporário ou o "sempre"), e o estado `mounted` tem `hud: false`: fica fora do HUD do
  token e do painel de estados.
- Os poderes da montaria são `flags.eternia.powers` (habilidades de item, só montada: `Use.NotMounted`), com `name` e
  `check` opcionais (`content/content.mjs`). A Bênção de Repelir o Vento (`flags.eternia.mount.blessing = "wind"`) tira a
  Ação Menor da Disparada em `alsoSpendsOf` (`automation/use.mjs`).
- Montaria nova: 10 comuns do nível (seção 9 de `docs/matematica.md`), o efeito [Montado] e, se for dragão terrestre, a
  Bênção. Teste: `Data/eternia-tests/test-101.js` (montarias, Domador, Selador, migração, conteúdo e telas).
- O retrato da montaria (1.0.2) é o token dela no padrão do bestiário (`flags.eternia.mount.token`,
  `assets/tokens/mounts/<nome sem acentos>.webp`, de `prompts/montarias/tokens.py`, fora do repositório; o
  `gen-itens.mjs` o põe quando o arquivo existe): a ficha da montaria o mostra no cabeçalho (`headerToken` em
  `sheets/item-sheet.mjs`, ajustado por `portraitFit`), com o ícone no canto; o inventário, o HUD e o Mercado continuam
  com o ícone (`img`). As cópias dos mundos ganharam o token pela migração `content` 4. Teste: `test-102.js`.

## A morte (0.50)
- `module/automation/death.mjs`: quem cai num token que não é hostil (`isAdventurer`) fica [Morrendo: 2]
  (`system.bad-status.dying`, um Estado Vital: o Destino não tira), menos o colapso pela Fadiga e a queda de uma
  transformação no fim da cena (`fallingNow`). No Encerramento (gancho `eternia.combatPhase`, no Mestre principal) sai um
  cartão do Teste da Morte por personagem; o ator guarda o cartão que espera em `flags.eternia.deathCheck`, e os botões
  vão ao Mestre por `request("deathCheck")`, que rola, muda o ator e o cartão. O dano no chão passa por `groundBlow`
  (`afterDamage` e `takeDamage`); o Desfazer devolve a morte de um crítico (`dead` em `snapshotForUndo`). O fim da cena
  chama `deathAtSceneEnd`. A configuração `revive` não existe mais: ninguém revive. Monstros e personagens em token
  hostil caem como antes (mortos no fim da cena). O Erguer os Mortos e a Sombra não levantam quem está [Morrendo].

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
  escritas. `test-050.js` cobre a morte e o Despertar pela API; o Despertar do jogador se testa entrando como "Jogador
  Teste" (sem senha) num personagem dele. O `createEmbeddedDocuments` devolve os documentos em qualquer ordem: ache cada um pelo nome.

## Desempenho (1.0)
- **A release é empacotada** (`tools/bundle.mjs`, chamado por `tools/package.mjs`): o servidor do Foundry responde todo
  arquivo com `Cache-Control: no-cache`, em HTTP/1.1 (6 pedidos por vez), e cada arquivo custa uma ida e volta até a VPS
  a cada entrada. O zip carrega `module/eternia.bundle.mjs` (esbuild, ESM, só espaços tirados, `keepNames`: o Foundry
  guarda as fichas pelo nome da classe) com todos os modelos de `templates/` dentro (`helpers/template-bundle.mjs` é
  `null` no repositório e vira o conteúdo da pasta no pacote; `registerBundledTemplates` os registra no `init`) e
  `css/eternia.bundle.system.css` + `css/eternia.bundle.modules.css` (os estilos de cada camada, na ordem do manifesto;
  nenhum pode ter `@import`/`@charset`, e todos ficam em `css/` por causa dos `url(../assets…)`). O `system.json` do zip
  aponta para eles; o do repositório carrega os arquivos soltos, e o teste local roda o código-fonte. Arquivo de CSS
  novo continua indo no `styles` do manifesto, como sempre.
- **Testar o pacote:** monte uma cópia de release (os pacotes de `bundle()` numa pasta, com junctions para `assets`,
  `packs`, `lang` e `templates`), aponte `Data/systems/eternia` para ela e reinicie o servidor. A bateria importa
  arquivos de `module/` direto, então roda contra o código-fonte; contra o pacote, compare os mesmos testes (um import
  direto carrega uma segunda cópia do módulo, com o estado dela).
- `setting(key)` (`settings.mjs`) guarda os valores simples (sim/não, número, texto) até mudarem: o `onChange` de cada
  configuração é embrulhado para esquecer o valor antes de qualquer outro ouvinte, e os ganchos de `Setting` e
  `clientSettingChanged` também esquecem. Configuração que é objeto é lida de novo a cada vez. Nunca escreva uma
  configuração do sistema direto no `localStorage`.
- Toda leitura de índice de compêndio passa por `packIndex(pack, fields)` (`helpers/pack-index.mjs`): um pedido em
  andamento que já cobre os campos serve o seguinte. Os campos do Mercado são `MARKET_INDEX_FIELDS` (mesmo arquivo); no
  Mestre, os ícones dos itens já pedem a união deles no `ready`. O `ready` só pede os compêndios com equipamento; os
  outros vêm no primeiro passo do `prewarm` (`itemIndexes`), um por vez. Um catálogo que se refaz quando um compêndio muda
  filtra o `updateCompendium` por `pack.documentName === "Item"` (o primeiro argumento é o compêndio).
- Varredura de todos os atores do mundo e das cenas: `worldActors({ effect, flags })` (`helpers/world-actors.mjs`). Ler
  `token.actor` de um token sem vínculo monta o ator sintético inteiro (o delta é preguiçoso no v14) e ele fica vivo; com
  o teste, só os tokens cujos dados podem casar são montados. Nunca percorra `scene.tokens` lendo `token.actor` de todos.
- Os portadores das Magias de uma janela inteira: `holderCensus()` uma vez e `holderState(m, actor, census)` em cada uma.
- As condições de estado dos efeitos (`helpers/effect-conditions.mjs`): cada ator guarda no preparo os tipos que os
  efeitos dele usam (`_lhStateTypes`, por `noteStateTypes`), e `refreshStateConditions` só prepara de novo quem usa um
  tipo cujo dado mudou: `COMBAT_INPUTS` diz o que cada tipo lê do combate, `OWN_TYPES` os que só leem os estados do
  próprio ator. **Tipo de condição de estado novo entra numa das duas tabelas**; fora delas, ele é preparado de novo a
  cada evento (como o Topo e o Abaixo de Ódio). A ficha só se redesenha quando um efeito passou a valer ou deixou de valer
  (ou quando há duração do core), num `requestAnimationFrame`.
- Durante `EterniaActor#prepareData`, `actor._lhPrep` guarda o que só depende dos itens (as mãos de `getHands`, os
  Motores de `motorsOf`), dividido por todas as fases de efeito; fora do preparo é `null`. O que entrar ali não pode
  depender de atributos, PV ou flags, que mudam entre as fases. O `getRollData` monta `itemData`/`skillData` só na leitura.
- Um `game.socket.emit` com `{ recipients }` chega também às janelas do próprio usuário quando ele está na lista
  (inclusive a que mandou): quem escuta ignora o próprio eco (`clientId`, ou o `pending` dos pedidos). Sem `recipients`, o
  servidor manda a todos menos a quem mandou. Os pedidos das pilhas vão só aos Mestres e a resposta só a quem pediu.
- O HUD (`hud/hud.mjs`) só redesenha com um cartão de ataque que mira o personagem mostrado, com uma Esquiva na barra ou
  com uma mudança que pode trazer uma de volta (`dodging`, `dodgesStale`), e ignora o movimento do token fora de combate
  (`MOVE_KEYS`). Uma parte nova do HUD que leia outra coisa precisa do gancho que a redesenha.
- **A ficha de personagem é uma moldura e uma parte por aba** (`sheets/character-sheet.mjs`: `PARTS` = `frame` + uma por
  `TABS`; `_replaceHTML` põe as abas no `.lhpf-body` da moldura). Um render com `renderContext` (toda mudança do
  documento, e os redesenhos do sistema devem passar um, como `eternia.conditions`) desenha só `frame` + a aba aberta; as
  outras ficam velhas (`#stale`) e se desenham ao abrir (`changeTab`). O que uma aba mostra é montado no
  `_preparePartContext` dela (o comum, no `_prepareContext`), e os ouvintes de uma parte vão no `_activateSheetListeners`
  (por parte), não no `_onRender`. `_processFormData` tira do envio os campos das abas velhas. Aba nova: um template com
  uma raiz `section.tab`, uma entrada em `TABS` e o contexto no `_preparePartContext`. As fichas de personagem, monstro,
  item e pilha juntam os redesenhos em fila e não desenham minimizadas (`sheets/sheet-render.mjs`, `SheetRenderMixin`).
- `canvas/token-style.mjs` guarda as configurações dos tokens (`known`, zeradas no gancho `eterniaTokenStyle`), um estilo
  só para os nomes (atribuir um estilo, mesmo igual, refaz o texto) e a chave do desenho do Motor (`lhKey`: tudo o que o
  desenho lê; algo novo no desenho entra na chave).
- **Computador fraco:** com o Modo de Desempenho do Foundry em Baixo (`body.performance-low`, `lowPerformance()` de
  `helpers/performance.mjs`), as animações infinitas que só enfeitam param (`css/performance.css`: animação infinita nova
  entra na lista), os ícones dos itens não se mexem, o medalhão dos estados vira o texto do core e o chat abre com 50
  mensagens. Os outros modos ficam como estão.
- Os ícones de estado são buscados no `i18nInit` e entregues ao `PIXI.settings.ADAPTER.fetch` quando a cena os pede
  (`helpers/status-prefetch.mjs`); as fontes da cena carregam os arquivos de cada família juntos (`helpers/font-loading.mjs`,
  por cima do `FontConfig.loadFont` do core).
- Medir: o Chrome sem janela com a placa de vídeo (`--use-angle=d3d11`) e um proxy TCP com atraso (60 ms de ida e volta)
  na frente do servidor de teste; o `Network.enable` do CDP trava a página com os 75 MB do mundo de teste (não ligue).

## Release
1. `version` e a URL de `download` no `system.json`, e a entrada no CHANGELOG.
2. `npm run packs:build` e `npm run package` (gera `dist/eternia.zip` e `dist/system.json`, já com os pacotes de
   `tools/bundle.mjs`).
3. Commit, push e `gh release create vX.Y.Z dist/system.json dist/eternia.zip`.
