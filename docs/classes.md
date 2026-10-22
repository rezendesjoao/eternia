# Classes: o esqueleto

As regras de construção das classes da Eternia, fechadas em 2026-10-21, e a referência técnica dos Motores. A
primeira classe é o [Samurai](#a-classe-piloto-o-samurai); as regras como o jogador lê estão na página **XI. CLASSES**
do diário AS REGRAS.

## A ideia

Uma classe é um **Motor**, uma regra que só ela tem, com tudo o mais girando em volta dele:

- **Base:** atributos e PV, que cada classe define para si.
- **Motor:** a regra ou o recurso exclusivo da classe, desde o NP 1.
- **Talentos:** escolhidos a cada NP; todos mexem no Motor.
- **Caminho:** no NP 3, um de três; cada um reescreve uma regra do Motor.
- **Dedicação:** a partir do NP 5, a versão menor do Motor de outra classe.
- **Ápice:** no NP 10, transforma o Motor.

Da base de Log Horizon fica a gramática: teste de 2D com crítico em dois ou mais 6, os Processos (Manutenção,
Iniciativa, Principal, Encerramento), os Momentos das habilidades, Ódio, Destino, quadrados, engajamento, as condições
e as habilidades básicas. Saíram os arquétipos e o Kuden (veja [O que saiu do sistema](#o-que-saiu-do-sistema)).

## A base da classe

Cada classe define a sua, sem família de arquétipo, com os campos que o item `class` já tem.

- **Atributos:** 10 pontos entre Força, Destreza, Poder e Inteligência, de 0 a 4 em cada (o mesmo orçamento das
  classes de Log Horizon). O sistema já soma +1 em todos a cada NP.
- **PV:** uma das cinco faixas abaixo, que são as das classes de Log Horizon; assim o bestiário e os itens continuam
  calibrados. A faixa vem do Motor: quanto mais ele pede apanhar ou segurar a linha, mais alta.

  | Faixa | PV inicial | PV por NP | PV no NP 10 (sem a raça) |
  |---|---|---|---|
  | Frágil | 35 | +4 | 71 |
  | Leve | 40 | +5 | 85 |
  | Firme | 40 | +6 | 94 |
  | Robusta | 50 | +8 | 122 |
  | Colossal | 55 | +9 | 136 |

- **Equipamento:** livre, como hoje. A classe não tem lista de armas; quem pede arma é o talento (um golpe de saque
  que exige [Katana] ou [Blade], por exemplo).
- **Destino:** continua vindo da raça.
- **Kit do NP 1** (os `grants` da classe): o Motor e 2 talentos de entrada, um que alimenta o Motor e um que o gasta.
  Depois vêm as escolhas da criação (3 de Combate e 1 Geral), como hoje.
- **Papéis:** tags só descritivas (Defesa, Cura, Dano, Controle, Apoio). A única regra que olha papel é a das Joias
  do Chamado da Vida, que hoje pede o arquétipo Curandeiro e passa a pedir a tag Cura.

## O Motor

O Motor é o que faz a classe jogar diferente das outras. Ele é escrito num cartão com estes campos:

| Campo | O que diz |
|---|---|
| Forma | recurso que enche, dado que cresce, estado que alterna, marca no inimigo, número escolhido, peça que muda de lugar |
| Parte da regra | onde ele mexe: tempo, seus dados, dados dos outros, Ódio, risco, inimigo, aliados, itens (veja [Partes da regra](#partes-da-regra)) |
| Ganha | como enche ou avança |
| Gasta | o que faz quando é usado |
| Teto | quanto cabe, e como cresce com o NP |
| Zera | quando volta ao começo |
| A decisão | a pergunta que ele faz em quase toda rodada, numa frase |

Regras do Motor:

1. **É exclusivo.** Nenhuma outra classe ganha o Motor, nem por talento. Quem quiser pega pela Dedicação, na versão
   menor.
2. **Joga sozinho.** No NP 1, só com o Motor e os 2 talentos de entrada, a classe já tem o que decidir.
3. **Cresce pela própria fórmula.** O teto ou o efeito lê o NP; ninguém gasta escolha só para o Motor acompanhar o
   nível.
4. **Fica à vista** na aba Classe, no HUD e no token, para a mesa toda ver.
5. **Cabe num cartão** de até seis linhas.

## Talentos

- Cada classe tem uns 16 talentos de Combate (6 deles com a tag [Dedicação]) e uns 4 Gerais, que usam o Motor fora
  de combate (viagem, conversa, investigação).
- **Todo talento mexe no Motor:** alimenta (outra forma de ganhar), gasta (outra forma de usar) ou dobra (muda uma
  regra dele). Cada talento diz qual dos três ele é.
- **Nada de número solto.** "+1D de dano" sozinho não é talento. O dano cresce com o NP e com a arma, dentro da
  fórmula (`@cr`, poder de ataque), igual para toda a classe.
- **NH de 1 a 3** (5 só como exceção). O NH aumenta a frequência, a capacidade ou o alcance da regra ((NH)/Cena, +1 no
  teto, +1 alvo), nunca o dano direto.
- **Fixos:** aprendeu, é seu. Só saem pelo desfazer que o sistema já tem (NP abaixado ou troca de classe).
- **Requisitos:** NP mínimo (`flags.eternia.minRank`, que já existe) e, quando for o caso, um talento anterior,
  formando ramos.
- **Custo e limite:** Ódio, como em Log Horizon, e/ou o próprio Motor; limite por Cena ou Cenário quando a regra
  pedir.
- O talento da profissão (um por profissão, na aba Profissão) é outra coisa e continua como está.

## Caminho

- No NP 3 o personagem escolhe um dos três Caminhos da classe, para sempre.
- O Caminho reescreve **uma** regra do Motor (como ganha, como gasta, o teto, quando zera ou o que ele faz) e diz
  qual. Não soma +2 em nada.
- Cada Caminho traz 2 talentos próprios (NP mínimo 3 e 7), que só aparecem para quem o segue.
- O nome é Caminho porque "subclasse", na Eternia, já é a profissão.

## Dedicação

A multiclasse da Eternia, no molde dos arquétipos do Pathfinder 2e.

- A partir do NP 5, custa 1 escolha de Combate.
- Dá o **Motor Menor** da outra classe. Cada classe escreve o seu: teto pela metade, uma forma de ganhar e uma de
  gastar.
- Abre os 6 talentos [Dedicação] da outra classe, com NP mínimo 2 acima do normal.
- Uma segunda Dedicação só depois de 2 talentos da primeira; no máximo 2 Dedicações.
- Nunca dá Caminho nem Ápice de outra classe.
- Os Motores ficam separados: cada talento mexe só no Motor da própria classe.

## Ápice

No NP 10, sem custo, a classe ganha o seu Ápice: uma regra que transforma o Motor de vez, em vez de somar número (o
Samurai, por exemplo, passaria a contar como embainhado no primeiro golpe de toda rodada). Um por classe, com uma linha
a mais para cada Caminho.

## Progressão

| NP | O que a classe dá |
|---|---|
| 1 | Base, Motor e 2 talentos de entrada; 3 escolhas de Combate e 1 Geral |
| 2 a 10 | 2 escolhas de Combate e 1 Geral por NP |
| 3 | Caminho |
| 5 | Dedicação liberada |
| 10 | Ápice |
| 11 em diante | 1 escolha de Combate e 1 Geral por NP |

As escolhas são as que o navegador de habilidades já conta (`rankUpSkills` em `module/apps/skill-browser.mjs`). Com
uns 16 talentos de NH 1 a 3, mais os 2 do Caminho, a lista da classe absorve as escolhas de Combate até perto do NP 20,
sem contar as Dedicações.

As escolhas Gerais compram os talentos Gerais da classe, a habilidade Geral desbloqueável da raça (NP 3) e uma lista
de **Talentos Gerais comuns** que ainda vai ser escrita (viagem, conversa, conhecimento, sobrevivência). Sem essa
lista, as escolhas Gerais começam a sobrar perto do NP 5.

## Leis de design

Antes de entrar no sistema, cada classe passa por esta lista:

1. O Motor mexe numa parte da regra que nenhuma outra classe usa do mesmo jeito.
2. O Motor faz uma pergunta em quase toda rodada (guardar ou gastar, agora ou depois, em quem, onde).
3. Trocar o nome da classe muda o jeito de jogar. Se ela joga igual a outra, não entra.
4. Todo talento alimenta, gasta ou dobra o Motor.
5. Nenhum número solto; o NH mexe em frequência, capacidade ou alcance.
6. Cada Caminho reescreve uma regra; o Ápice transforma o Motor.
7. A classe tem o que fazer fora de combate (os talentos Gerais).
8. A curva de poder segue a de Log Horizon: PV pela faixa, dano por rodada parecido com o das habilidades oficiais no
   mesmo NP. A Régua do Golpe do Kuden (`Desktop/Daggerheart/Log Horizon TTRPG/kuden/calibragem.md`, fora do
   repositório) vira ferramenta de quem desenha a classe, para conferir o dano; o jogador nunca a vê.
9. O nome não bate com o de uma profissão (Bardo, Alquimista, Engenheiro...) nem com o de uma raça.
10. O Motor cabe num cartão de seis linhas e aparece no token.

## Partes da regra

O mapa que a lista de classes vai seguir. Se duas classes mexem na mesma parte do mesmo jeito, uma delas não entra.

| Parte da regra | Exemplo de Motor | Ideia de classe |
|---|---|---|
| Tempo | Bainha: junta Cortes embainhado e saca no Processo de Iniciativa | Samurai |
| Seus dados | Leitura: rola 2D na Manutenção e guarda, para trocar um teste seu | Estrategista |
| Dados dos outros | Padrão: um total de 2 a 12; quando ele sai, ganha Fios, que mudam dados em ±1 | Tecelão |
| Ódio | Baluarte: um dado que cresce a cada Proteger | Guardião |
| Risco | Calor: a magia esquenta e soma dano; no topo, Erupção ou Sobrecarga | Feiticeiro |
| Inimigo | Marca: acertos de aliados no marcado viram Brechas; com 3, Execução | Assassino |
| Aliados | Movimentos: a canção sobe I → II → III; trocar de canção zera | Menestrel |
| Itens | Centelha: acorda o poder de uma peça equipada e pula para outra | Ressonante |
| Criatura extra | Vínculo: a criatura divide os seus PV | Invocador |
| Forma | Formas: cada forma troca o menu de ações | Druida |
| PV baixo | Fúria: mais forte quanto mais perto de cair | Berserker |
| Maldição | Maldição: o poder cresce e a maldição piora junto | Oráculo |
| Comando | Táticas: gastar a sua ação para um aliado agir | Comandante |
| Sequência de golpes | Corrente: abertura, elo e finalizador, como num jogo de luta | Monge |
| Arte de espada | Artes: golpe forte com atraso depois e conexão entre golpes | Duelista |

Nada desta tabela está fechado: os nomes, os Motores e o número final de classes saem do cruzamento com as classes do
Pathfinder 2e e do Daggerheart, depois da classe piloto.

## O que saiu do sistema

Na mesma versão da classe piloto, para o sistema nunca ter os dois:

- **Kuden:** o código (`module/kuden/`), a configuração, as abas da ficha e da habilidade, o painel do HUD, o
  ambiente da cena, as 11 condições de efeito e `game.eternia.kuden`.
- **Arquétipos:** o campo `archetype` do item `class`, a lista `ARCHETYPES`, a fonte "arquétipo" do navegador de
  habilidades e o pacote `skills-archetype`. As Joias do Chamado da Vida olham a tag [Healing] (Cura) da classe.
- **Forja:** era o construtor das peças do Kuden e nunca chegou a ser feita.
- A migração `kudenCleanup` (`module/classes/migration.mjs`) tira dos mundos as condições dos tipos do Kuden, as flags
  das peças, a tag e o ambiente das cenas, e o `archetype` dos itens de classe. Na versão 2 ela troca a imagem dos
  itens que ainda apontam para um ícone de classe que saiu (o `samurai.svg`) pela imagem em branco.

## A classe piloto: o Samurai

O Motor **Bainha** mexe no tempo: a lâmina Embainhada junta Cortes na Manutenção, e o Iai, no Processo de
Iniciativa de qualquer personagem, saca gastando todos (cada um soma 2D + NP; com a Bainha cheia, Corte Perfeito:
acerto sem Esquiva e +[NP×2+10]). As regras como o jogador lê estão na página **XI. CLASSES** do diário AS REGRAS e
na descrição de cada habilidade; o resumo está no README ("As classes").

| Parte | O que tem |
|---|---|
| Base | FOR 4, DES 2, POD 2, INT 2; faixa Robusta (50, +8/NP); papéis Damage e Defense |
| Kit | Bainha (Motor), Embainhar (Menor), Iai (Iniciativa, gasta a Ação Maior), Respiração (Menor, +1) |
| A Espera | Silêncio Antes do Golpe, Grito do Saque*, Lâmina que Espera*, Contra-saque, Desafio do Samurai |
| O Fio | Corte do Vento, Corte Circular, Aparar com o Saque*, Primeira Lâmina |
| A Bainha | Mão no Cabo*, Bainha Longa*, Passo do Saque, Respiração Profunda |
| O Aço | Kesagiri, Eco do Aço, Chiburi* |
| Gerais | Primeiro a Sacar, Corte Limpo, Postura de Vigília, Duelo de Olhares |
| Caminhos (NP 3) | Lua Cheia (Maré Lunar, Eclipse), Água Corrente (Correnteza, Espelho d'Água), Relâmpago (Trovão Atrasado, Raio que Volta) |
| Ápice (NP 10) | Mente Vazia |
| Dedicação (NP 5) | Dedicação: Samurai, que dá a Bainha Menor, Embainhar e o Iai |

\* talentos [Dedicação].

A calibragem do dano é a primeira; vale conferir na mesa e ajustar os números (Teto, dados por Corte, bônus do Corte
Perfeito) antes da lista final.

## Referência técnica

### Onde fica cada coisa

| Arquivo | O que faz |
|---|---|
| `module/classes/motor.mjs` | O Motor genérico: o registro (`registerMotor`), o estado no ator, o Teto, as habilidades de Motor e de Motor Menor, os requisitos (`motorUseIssues`), a ação que a habilidade gasta (`motorActionOf`), o plano antes do cartão (`planMotorUse`, que guarda `flags.eternia.motorUse`), a mudança depois (`commitMotorUse`) e o Desfazer, os valores das fórmulas e do custo, os bônus de rolagem, os estados que o dano dá e os eventos. |
| `module/classes/samurai.mjs` | A Bainha: o Teto, o Corte Perfeito, os Caminhos, o Ápice e as reações (Manutenção, Encerramento, início e fim do combate, ataque com arma, ataque sofrido, esquiva, inimigo derrubado). |
| `module/classes/index.mjs` | Registra os Motores, embrulha `EterniaCombat#_onPhaseStart` (Manutenção e Encerramento, uma vez, na janela do Mestre que mudou a fase) e ouve os eventos dos cartões (`eternia.attack`, `eternia.dodge`, `eternia.defeated`); a API `game.eternia.motor`. |
| `module/classes/progression.mjs` | O NP mudado à mão oferece o que a classe dá no NP; a Dedicação dá as habilidades dela ao ser aprendida e as tira junto. |
| `module/classes/sheet.mjs`, `data.mjs` | A aba Classe (`templates/character/class.hbs`, `css/classes.css`) e os dados de cada classe para a aba (cor, faixa, ramos, Caminhos). |
| `module/classes/migration.mjs` | A limpeza do Kuden e dos arquétipos, e dos ícones antigos das classes. |

Também tocam nas classes: `automation/use.mjs` (requisitos, ação, plano, mudança e Desfazer do Motor; o custo
"Hate 1+Cortes"), `helpers/skill-rolls.mjs` (acerto automático do Corte Perfeito, bônus do Motor, `damageText`),
`chat/cards.mjs` (bônus do Motor no Dano dos cartões), `helpers/combat-cards.mjs` (os três eventos e os estados que
o Motor dá no acerto), `helpers/effect-formulas.mjs` (as variáveis), `apps/option-grants.mjs` e `apps/rank-up.mjs`
(o que chega pelo NP), `apps/skill-browser.mjs` (requisitos, Caminhos, Dedicação), `hud/` e `canvas/token-style.mjs`
(o Motor no HUD e no token).

### As flags de uma habilidade de classe

| Flag (`flags.eternia.`) | O que faz |
|---|---|
| `identifier` | `<classe>-<nome>`; requisitos, regras do Motor e aba Classe acham a habilidade por ele |
| `kind` | `motor`, `feeds` (alimenta), `spends` (gasta) ou `bends` (dobra): o selo da aba |
| `branch` | o grupo da aba: `kit`, um ramo da classe, `general`, `path`, `pathTalent`, `apex` ou `dedication` |
| `motor` | `{ id, role, needs: { state, min, full, weapon }, spend, max, gain, set, action, alsoSpends, draw, perfect, inCombat }` |
| `requires` | identificadores dos talentos que vêm antes |
| `path` | `{ class, id }`: a habilidade do Caminho |
| `pathTalent` | `{ class, id }`: um talento do Caminho |
| `apex` | a classe de quem é o Ápice |
| `dedication` | `{ name, id }`: a Dedicação de uma classe |
| `dedicationGrants` | uuids das habilidades que a Dedicação dá |
| `damageText` | o texto do dano no lugar da fórmula (`[Poder de Ataque] + (1+2×Cortes)D + Cortes×NP Físico`) |
| `minRank`, `choiceOnly` | como nas raças: NP mínimo; listada só depois de dada (kit, Caminhos, Ápice, Motor Menor) |

O item `class` leva `identifier`, atributos, `hp`, `hpPerRank`, as tags de papel (`Damage`, `Defense`, `Healing`,
`Control`, `Support`) e `grants`: um espaço por habilidade do kit, `{ rank: 3, uuids: [os três Caminhos] }` e
`{ rank: 10, auto: true, uuids: [o Ápice] }`.

### Criar uma classe nova

1. Um arquivo em `module/classes/` com a definição do Motor (veja `SAMURAI`: `id`, `i18n`, `states`, `defaults`,
   `costKeyword`, `max`, e o que a classe precisar de `issues`, `actionOf`, `plan`, `rollBonuses`, `onHit`,
   `display` e dos eventos), registrada em `index.mjs`.
2. Os dados da aba em `data.mjs` (`CLASSES`) e os textos em `lang/pt-BR.json` e `lang/en.json` (`Motor.<Classe>`:
   `Name`, `Unit`, `State`, `Card` com `Gain`, `Spend`, `Cap` e `Reset`, e as versões `Lesser` da Dedicação;
   `Classes.<id>.Branch`).
3. O item de classe na pasta Classes de `races-classes` e as habilidades numa pasta com o nome da classe em
   `skills-class` (o Samurai foi gerado por um script; a fonte é o JSON em `src/packs`). Por enquanto as classes não
   têm ícone: o item e a Dedicação usam `assets/icons/classes/blank.svg` (só o verde do emblema), e o medalhão da aba
   Classe é só o verde.
4. A página XI do diário AS REGRAS, o README e o CHANGELOG; `npm run packs:build` com o mundo fechado.

As cópias das habilidades nas fichas guardam as flags de quando foram ganhas: a ferramenta de atualizar habilidades
do Mestre só atualiza os campos do sistema, então flags novas pedem arrastar a habilidade de novo.
