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

## CSS
- `css/eternia.css` e `css/piles.css` são a base (camada `system`).
- O visual de pergaminho (`automation.css`, `sheet.css`, `chat.css`, `windows.css`, `hud.css`, `tbg.css`) vai na
  camada `modules` (campo `layer` em `styles` do `system.json`): ganha da base sem disputa de especificidade, como
  quando era um módulo. Arquivo novo de CSS no manifesto exige reiniciar o servidor do Foundry.
- Os campos das janelas em pergaminho (`windows.css`: `.application.lhwin.themed :is(input[type="text"], …, select,
  textarea)`, mais `:hover` e `:focus`) pesam (0,4,1) na mesma camada: um campo com visual próprio precisa de um
  seletor do mesmo peso, como `.application.creation-wizard .wz-hero .wz-name input[type="text"]`.

## Compêndios
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
  `pulse`, `start`, `save` e, na 0.37, `disguise`, `conceal`, `engulf`, `split`, `rust`, `contact`, `latch`, `gaze`,
  `lure`, `rise`, `raise`, `stack`, `rampage`, `surprise`, `throw`, `blink`, `copy`, `phase`, `nearest`, `heads`; cada
  uma no seu arquivo de `module/bestiary/`, como o Salvar dos Desgarrados em `save.mjs` e o levantar e o erguer dos
  mortos em `rise.mjs`); a Mão Leve é um efeito de uso com `flags.eternia.pickpocket`, a criatura que come um dano, um
  efeito com `flags.eternia.absorb` (lista de tags), o dano pela metade, `flags.eternia.halve`, e a Possessão, a flag de
  habilidade `flags.eternia.possess`. A Fenda é um monstro com `flags.eternia.rift` e o relógio no Destino (`growOn: "fall"`: cresce quando
  quem escreve cai). Os chamados (`spawnNear`) são numerados ali: o `getTokenDocument` do Foundry numera só pelos tokens
  que já existem. Teste de monstro numa cena: dentro do `sceneRect` (fora dele, o empurrar para na borda). A fera com
  nome sai de `module/bestiary/named-template.mjs`, que não pode importar nada do Foundry: a coroa da ficha e o gerador
  do compêndio usam o mesmo arquivo. Os monstros do Império (pasta O Império) foram gerados por um script fora do
  repositório: a fonte é o JSON. Um monstro do Império já trazido para um mundo é uma cópia: mudou um nome ou a arte no
  compêndio, a migração `bestiary` (`module/bestiary/migration.mjs`) leva a mudança às cópias.
  Uma tabela nova escrita no formato dos livros vira dados com `node tools/convert-drops.mjs`. A pasta NPCs do
  bestiário são 126 personagens prontos (raça, profissão, NP e classe só nos guerreiros, sem Magia), também gerados por
  um script fora do repositório: a fonte é o JSON (veja "Os NPCs" em `docs/bestiario.md`). A pasta Personagens Maiores
  são 122 personagens em branco, só com a raça e o token, para o Mestre montar a ficha; as feras e divindades
  absolutas têm o token Astro, 2×2 e com luz (veja "Os personagens maiores" no mesmo arquivo).
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
  vazio (`draft.kitOffered`). Os textos dos feitiços na janela de Magias vêm de `spellTexts` (`apps/magic-catalog.mjs`);
  `loadDocuments` fica em `helpers/pack-index.mjs` para o catálogo de Magias e o do assistente usarem sem importar um
  ao outro.

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
- O desenho dos tokens (`module/canvas/token-style.mjs`): a barra de PV e o Motor só aparecem em combate (configuração
  `tokenBarsCombat`); o nome é texto puro, sem faixa.

## Teste local
- `Data/systems/eternia` é uma junction para este repositório; mundo de teste `eternia-teste`.
- Servidor sem janela: `ELECTRON_RUN_AS_NODE=1 "Foundry Virtual Tabletop.exe" launcher.mjs --dataPath=... --port=30017
  --noupnp --noupdate --world=eternia-teste`, com um `launcher.mjs` que apaga `process.versions.electron` e importa
  `resources/app/main.mjs`. Entrar como Gamemaster, sem senha.

## Release
1. `version` e a URL de `download` no `system.json`, e a entrada no CHANGELOG.
2. `npm run packs:build` e `npm run package` (gera `dist/eternia.zip` e `dist/system.json`).
3. Commit, push e `gh release create vX.Y.Z dist/system.json dist/eternia.zip`.
