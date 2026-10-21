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
  `lhk` Kuden, `lhauto`) continuam como estão.

## CSS
- `css/eternia.css` e `css/piles.css` são a base (camada `system`).
- O visual de pergaminho (`automation.css`, `sheet.css`, `chat.css`, `windows.css`, `hud.css`, `tbg.css`) vai na
  camada `modules` (campo `layer` em `styles` do `system.json`): ganha da base sem disputa de especificidade, como
  quando era um módulo. Arquivo novo de CSS no manifesto exige reiniciar o servidor do Foundry.

## Compêndios
- Fonte em `src/packs/<pacote>/*.json`, em português. Campos lidos pela automação (tags, Momento, alcance, alvo,
  custo, limite, tipos, subtipos) ficam em inglês; `module/i18n/` traduz na tela.
- Raças, classes e habilidades gerais e de combate da Eternia entram nos pacotes vazios (`races-classes`,
  `skills-common`, `skills-racial`, `skills-archetype`, `skills-class`). O navegador de habilidades acha a origem
  de cada habilidade pelo nome das pastas (arquétipo, classe, raça).
- Raça = item `race` com atributos, `hp`, `fate` e `grants` (as 2 inatas, uma Geral e uma de Combate; uma escolha vira
  um espaço com várias opções). As habilidades ficam em `skills-racial`, na pasta com o nome da raça: as inatas e as
  variantes levam `flags.eternia.choiceOnly` (só aparecem no navegador depois de concedidas) e as 2 desbloqueáveis
  `flags.eternia.minRank` (3 na Geral, 5 na de Combate).
- Profissão = item `subclass` com `system.identifier` igual a um id de `module/professions/data.mjs`, na pasta
  Profissões de `races-classes`. O progresso fica no personagem (`flags.eternia.professions.<id>`) e o item feito guarda
  a base em `flags.eternia.craft` (veja `docs/profissoes.md`). Engenhocas e Canções ficam em `items` (pastas próprias).
- Fórmulas de rolagem ficam no próprio campo: `damage.dice: "@sr+1"`, `damage.mod: "@cr*2+10"` (nunca em
  `diceFormula`/`formula`, que são derivados). Flags de efeito e de habilidade: veja `docs/condicoes.md`.
- `npm run packs:build` (Foundry CLI, com o mundo fechado) gera `packs/`; `npm run packs:unpack` volta para `src/`.

## Teste local
- `Data/systems/eternia` é uma junction para este repositório; mundo de teste `eternia-teste`.
- Servidor sem janela: `ELECTRON_RUN_AS_NODE=1 "Foundry Virtual Tabletop.exe" launcher.mjs --dataPath=... --port=30017
  --noupnp --noupdate --world=eternia-teste`, com um `launcher.mjs` que apaga `process.versions.electron` e importa
  `resources/app/main.mjs`. Entrar como Gamemaster, sem senha.

## Release
1. `version` e a URL de `download` no `system.json`, e a entrada no CHANGELOG.
2. `npm run packs:build` e `npm run package` (gera `dist/eternia.zip` e `dist/system.json`).
3. Commit, push e `gh release create vX.Y.Z dist/system.json dist/eternia.zip`.
