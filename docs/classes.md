# Classes: o esqueleto

As regras de construção das classes da Eternia, fechadas em 2026-10-21, as [14 classes](#as-classes) (7 físicas e 7 mágicas, mais as 8 antigas), as [Magias](#as-magias) e a referência
técnica dos Motores. As regras como o jogador lê estão nas páginas **XI. CLASSES** (a geral e uma por classe) do diário
AS REGRAS.

## A ideia

Uma classe é um **Motor**, uma regra que só ela tem, com tudo o mais girando em volta dele:

- **Base:** atributos e PV, que cada classe define para si.
- **Motor:** a regra ou o recurso exclusivo da classe, desde o NP 1.
- **Talentos:** escolhidos a cada NP; todos mexem no Motor.
- **Caminho:** no NP 3, um de três; cada um reescreve uma regra do Motor.
- **Dedicação:** a partir do NP 5, a versão menor do Motor de outra classe.
- **Ápice:** no NP 10, transforma o Motor.
- **Magias:** escolhidas nas vagas de Magia da classe (veja [As Magias](#as-magias)): as físicas no NP 1 e 10, as
  mágicas no NP 1, 5 e 10, o Matador de Dragões no NP 5 e 10. Os feitiços alimentam o Motor.

As 14 classes são 7 **físicas** (Assassino, Berserker, Caçador, Centurião, Hierofante, Lutador e Samurai) e 7
**mágicas** (Invocador, Mago Azul, Mago Branco, Mago Negro, Mago Vermelho, Matador de Dragões e Pictomante), cada uma
com uma função no grupo (veja [A base da classe](#a-base-da-classe)).

Da base de Log Horizon fica a gramática: teste de 2d6 com crítico em dois ou mais 6, as fases da rodada (Manutenção,
Iniciativa, Turno, Encerramento), os Momentos das habilidades, Ódio, Destino, quadrados, engajamento, as condições
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
- **Família e função:** física ou mágica (`family` em `CLASSES`, `module/classes/data.mjs`) e a função no grupo
  (`role`): Tanque, Dano, Precisão ou Suporte nas físicas; Dano, Híbrida, Controle ou Suporte nas mágicas. A função dá
  a cor: tons quentes nas físicas (bronze, carmesim, laranja, ouro) e frios nas mágicas (violeta, azul, turquesa,
  prata), no emblema (`ROLE_COLORS` em `tools/make-class-icons.mjs`) e na faixa da aba Classe (`CLASS_COLORS`). O topo da
  faixa diz "Classe física · Tanque"; uma classe antiga, sem família, diz "Classe antiga".

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
- **Nada de número solto.** "+1d6 de dano" sozinho não é talento. O dano cresce com o NP e com a arma, dentro da
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
| 1 | Base, Motor e 2 talentos de entrada; 3 escolhas de Combate e 1 Geral; a primeira Magia (no Matador de Dragões, o elemento) |
| 2 a 10 | 2 escolhas de Combate e 1 Geral por NP |
| 3 | Caminho |
| 5 | Dedicação liberada; a segunda Magia das mágicas (a primeira do Matador de Dragões) |
| 10 | Ápice; a última Magia |
| 11 em diante | 1 escolha de Combate e 1 Geral por NP |

Mudar o NP (o botão de subir ou um NP digitado na ficha, para cima ou para baixo) passa por `module/apps/rank-up.mjs`:
o resumo do que muda (atributos, PV, escolhas, o que libera e o que a classe dá em cada NP do salto), o registro das
escolhas a partir do NP de onde saiu (`skillProgress`), as escolhas da classe (`offerGrants`) e o navegador. Um NP
digitado espera o resumo (`preUpdateActor` segura a mudança); uma atualização com `eterniaRankUp: true` ou
`eterniaLevelFlow: false` passa direto. Sem escolhas pendentes, o navegador fica no modo livre só para o Mestre.

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
8. A curva de poder segue a régua de `docs/matematica.md`: PV pela faixa, valor por rodada de 0,8× a 1,3× a régua
   do NP 3 ao NP 7 (0,6× a 1,1× no NP 1, 1,1× a 1,4× no NP 10), conferido no simulador antes de entrar. E as Leis do
   Motor de lá: 2 pontos por rodada; 1d6 + NP por ponto num alvo e 1d6 + NP÷2 em área no golpe que gasta tudo; um
   bônus só de Motor cheio, uma vez por cena quando vem de talento; talento de Teto +1; o Ápice transforma sem dar
   ação a mais; NP÷2 sempre para baixo.
9. O nome não bate com o de uma profissão (Bardo, Alquimista, Engenheiro...) nem com o de uma raça.
10. O Motor cabe num cartão de seis linhas e aparece no token.

## Partes da regra

O mapa da lista de classes: cada Motor mexe numa parte da regra que nenhuma outra classe usa do mesmo jeito.

| Parte da regra | Classe | Motor |
|---|---|---|
| Tempo | Samurai | Bainha: junta Cortes embainhado e saca no Processo de Iniciativa |
| Ser atacado (Ódio) | Centurião | Baluarte: cada ataque contra ele é uma Camada de Anulação |
| PV baixo | Berserker | Ira: cada ferida vira dano a mais; gastar é escolher entre golpe e fôlego |
| Sequência de golpes | Lutador | Corrente: golpes encadeados juntam Elos; o Golpe Final gasta todos |
| Inimigo | Assassino | Contrato: acertos de qualquer aliado no alvo viram Brechas; a Execução derruba |
| Posição | Caçador | Mira: parado, cresce; mover o token zera |
| Risco | Feiticeiro | Calor: cada feitiço esquenta e bate mais forte; no Teto, Erupção ou Sobrecarga (classe antiga: virou o Mago Negro, com a Magia Fogo) |
| Dados dos outros | Tecelão | Padrão: dois dados que somam o número dão Fios, que mudam dados nos cartões (classe antiga: virou o Mago Branco) |
| Seus dados | Estrategista | Leitura: 2d6 guardados na Manutenção trocam os dados de um teste (classe antiga desde a 0.22) |
| Maldição | Oráculo | Fardo: o milagre fica mais forte e a maldição pesa junto (classe antiga desde a 0.22) |
| PV dos aliados | Sacerdote | Graça: cada ferida de um aliado vira cura depois ou barreira antes (classe antiga desde a 0.22) |
| Forma | Druida | Formas: a Seiva paga a fera, e cada forma troca o menu (classe antiga desde a 0.22) |
| Criatura extra, com as Magias | Invocador | Pacto: PV pagos e Feitiços viram Laços de um espírito, gastos nos comandos |
| Elemento do dano | Matador de Dragões | Escamas: come o próprio elemento (e o ataque dele); no Teto, a Força do Dragão |
| Risco, com as Magias | Mago Negro | Pressão: cada feitiço, da classe ou das Magias, aumenta; no Teto, Liberação ou Sobrecarga |
| Itens, com as Magias | Mago Vermelho | Arsenal: a magia mora na peça da mão (Espada, Armadura, Foco); o Reequipar troca e solta a Descarga |
| Campo, com as Magias | Pictomante | Moldes: cada feitiço deixa uma construção no campo; quebrar vira dano (Estilhaçar) ou defesa (Escudo Esculpido) |
| Dados dos outros, com as Magias | Mago Branco | Lei: dois dados que somam o número acendem Runas (os feitiços também), que reescrevem dados nos cartões |
| Monstros vencidos, com as Magias | Mago Azul | Almas: absorve a alma dos monstros que derruba e veste a natureza e o elemento deles (Take Over); a Essência vira o Golpe da Alma |
| Aliados | Menestrel | Movimentos: a canção sobe a cada Manutenção; trocar volta ao I (classe antiga desde a 0.22) |
| Comando | Hierofante | Táticas: Ordens que dão a sua ação a um aliado |
| Itens | Ressonante | Centelha: o poder mora numa peça e salta para outra soltando o que juntou (classe antiga: virou o Mago Vermelho) |

A lista fechou em 16 classes, cruzando as classes do Pathfinder 2e e do Daggerheart com as partes da regra que
sobravam. O Duelista da primeira lista saiu (jogaria como o Monge e o Samurai), e entraram o Sacerdote (a cura que
faltava) e o Caçador (o ataque à distância). As que o cruzamento deixou de fora ou ficam para Dedicações
(Samurai + Feiticeiro faz o guerreiro arcano) ou batem com profissões (Alquimista, Engenheiro, Bardo).

Depois entrou o Matador de Dragões (2026-10-23), a primeira das classes de magia: o Motor dele mexe nos elementos do
dano, que nenhuma outra classe usa como recurso. Em seguida o Mago Negro, a primeira classe com [Magias](#as-magias):
ele herda o risco do Feiticeiro (a Pressão é o Calor feito motor das Magias); na 0.16, com as Magias elementais (o
Fogo faz o papel dos feitiços dele), o Feiticeiro saiu da lista de classes e das Dedicações. Depois veio o Mago Vermelho, que herda os
itens do Ressonante (a Carga é o Brilho feito motor das Magias, e a peça da mão troca com o Reequipar). Com ele, o
Ressonante saiu da lista de classes e das Dedicações (`flags.eternia.retired` no item de classe e na Dedicação); as
fichas que já o usam continuam funcionando. O Pictomante é a primeira classe de magia sem antecessora: o Motor dele mexe
no campo (as construções que cada feitiço deixa e que ficam lá até serem quebradas), que nenhuma outra classe usa.
Na 0.13 o Invocador virou classe de magia sem mudar de nome nem de habilidades: ganhou as vagas de Magia, e os Feitiços
das Magias passaram a dar Laços ao espírito presente. Na 0.14 veio o Mago Branco, que herda os dados do Tecelão (a Lei é
o Padrão feito motor das Magias: os Feitiços também acendem Runas, e o kit troca o Laço pela Cura); com ele, o Tecelão
saiu da lista de classes e das Dedicações, como o Ressonante. Na 0.15 chegou o Mago Azul, a última das sete classes de
magia: o Motor dele mexe nos monstros vencidos (a natureza da alma é o maior atributo do monstro derrubado, e o elemento
sai das tags dele), que nenhuma outra classe usa; as formas dele são as dos monstros, e não as fixas do Druida.

Na 0.22 a lista virou 14 classes, 7 físicas e 7 mágicas, e toda classe passou a ter Magias. As 7 físicas são as que
ficaram das 16 (o Monge, o Guardião e o Comandante com os nomes novos de Lutador, Centurião e Hierofante); o Druida, o
Sacerdote, o Oráculo, o Estrategista e o Menestrel saíram da lista e das Dedicações, como o Feiticeiro, o Tecelão e o
Ressonante, e os Motores e os talentos deles ficam como matéria-prima de Magias futuras (o Fardo do Oráculo para a
Magia dos Anjos, a Graça do Sacerdote e as canções do Menestrel para o Perfume, as formas e as raízes do Druida para o
Arco da Grande Árvore, a Leitura do Estrategista para uma Magia de previsão). Os ids, os identificadores e os emblemas
das classes renomeadas ficaram (`monge`, `guardiao`, `comandante`): a migração `kudenCleanup` 5 renomeia o item de
classe e a Dedicação nas fichas, porque o navegador de habilidades acha a classe pelo nome.

## O que saiu do sistema

Na mesma versão da classe piloto, para o sistema nunca ter os dois:

- **Kuden:** o código (`module/kuden/`), a configuração, as abas da ficha e da habilidade, o painel do HUD, o
  ambiente da cena, as 11 condições de efeito e `game.eternia.kuden`.
- **Arquétipos:** o campo `archetype` do item `class`, a lista `ARCHETYPES`, a fonte "arquétipo" do navegador de
  habilidades e o pacote `skills-archetype`. As Joias do Chamado da Vida olham a tag [Healing] (Cura) da classe.
- **Forja:** era o construtor das peças do Kuden e nunca chegou a ser feita.
- A migração `kudenCleanup` (`module/classes/migration.mjs`) tira dos mundos as condições dos tipos do Kuden, as flags
  das peças, a tag e o ambiente das cenas, e o `archetype` dos itens de classe. Na versão 2 ela troca a imagem dos
  itens que ainda apontam para um ícone de classe que saiu (o `samurai.svg`) pela imagem em branco. Na versão 3, o
  item de classe e a Dedicação das 16 classes que ainda têm a imagem em branco ganham o emblema da classe. Na versão
  4, o item de classe do Invocador nas fichas ganha as vagas de Magia (NP 1, 5 e 10, depois do kit).

## As classes

Cada seção diz o Motor da classe e o que ela tem; as regras como o jogador lê estão na página da classe no diário AS
REGRAS (XI.1 a XI.7 as físicas, XI.8 a XI.14 as mágicas, XI.15 a XI.22 as antigas) e na descrição de cada habilidade. A calibragem do dano é a primeira de cada classe: vale
conferir na mesa e ajustar os números (Teto, dados por ponto, o pagamento do Motor cheio).

### Assassino

O Motor **Contrato** mexe no inimigo: o Assassino firma o Contrato com um Alvo, e cada acerto de qualquer personagem
nele abre uma Brecha. A Execução, só no Alvo, gasta todas (cada uma soma 1d6 + NP) e, se o Alvo ficar com PV iguais ou
menores que [Brechas gastas × (NP+5)], ele cai (não vale contra [Chefe]). Trocar de Alvo perde as Brechas; o Alvo
caído cumpre o Contrato.

| Parte | O que tem |
|---|---|
| Base | FOR 2, DES 4, POD 1, INT 3; faixa Leve (40, +5/NP); papel Damage |
| Magias | uma no NP 1 e outra no NP 10; os feitiços abrem Brechas só pelos acertos no Alvo (o `plan` zera o ganho) |
| Kit | Contrato (Motor), Firmar Contrato (Menor), Punhalada (Maior, [2d6 + Poder de Ataque]; no Alvo +1 Brecha a mais), Execução (Maior, com 2 Brechas, gasta todas) |
| A Sombra | Golpe das Sombras*, Sumir*, Emboscada, Sombra Viva |
| O Veneno | Lâmina Envenenada*, Toxina Lenta, Dose Certa, Ferida que Não Fecha |
| A Lâmina | Corte de Tendão*, Golpe Duplo*, Na Garganta, Segunda Execução |
| A Rede | Marcar a Presa*, Sinal Silencioso, Cerco, Contrato Cumprido |
| Gerais | Estudar o Alvo, Passos Silenciosos, Disfarce, Mãos Leves |
| Caminhos (NP 3) | Fantasma (Passo Fantasma, Lâmina Invisível), Carrasco (Machado Erguido, Última Palavra), Teia (Presas Encadeadas, Rede Fechada) |
| Ápice (NP 10) | Mão da Morte |
| Dedicação (NP 5) | Dedicação: Assassino, que dá o Contrato Menor, Firmar Contrato e a Execução |

\* talentos [Dedicação].

Automação (`module/classes/assassino.mjs`): o Alvo (pelo token mirado ao Firmar Contrato; a nota "Alvo: …" na aba e no
HUD), as Brechas de qualquer acerto no Alvo (`onAnyHit`, com os extras da Punhalada, de Golpe das Sombras, Emboscada e
Cerco), a Execução (o custo "Hate 1+Brechas", o dano por `@spent` e a queda pelo `onAnyDamaged`, que zera os PV do
Alvo e avisa o `eternia.defeated`), o Contrato cumprido (`onAnyKill`, com as Brechas que passam adiante na Teia e em
Segunda Execução, Sombra Viva, Última Palavra e Contrato Cumprido), Toxina Lenta (`onCleanup`), Lâmina Envenenada e
Corte de Tendão (`onHit`), Dose Certa (`rollBonuses`), os acertos automáticos (o Contrato cheio, Na Garganta, Lâmina
Invisível e a linha do Fantasma no Ápice), o [Exposto] de Machado Erguido (`onHit`), Marcar a Presa e Rede Fechada ([Marcado] no Alvo), Ferida que Não Fecha
([Maldito]) e Estudar o Alvo (o Contrato já firmado no começo do combate seguinte).

### Berserker

O Motor **Ira** mexe nos PV baixos: cada ataque de um inimigo que tira PV do Berserker dá 1 Ira (2 com metade dos PV
ou menos), e com Ira os Ataques com Arma somam +[Ira] ao dano. O Golpe Selvagem gasta toda (+(1+Ira)d6 + Ira×NP),
o Fôlego de Sangue a troca por PV e Sangrar troca PV por Ira. Uma rodada sem atacar nem perder PV custa 1 Ira no
Encerramento.

| Parte | O que tem |
|---|---|
| Base | FOR 4, DES 3, POD 2, INT 1; faixa Robusta (50, +8/NP); papel Damage |
| Magias | uma no NP 1 e outra no NP 10; os feitiços somam Ira |
| Kit | Ira (Motor), Sangrar (Menor, −[NP+5] PV, +2), Golpe Selvagem (Maior, gasta toda), Fôlego de Sangue (Menor, gasta à escolha, cura) |
| O Sangue | Sede de Batalha*, Rugido, Ferida Aberta, Sangue Fervente |
| A Fúria | Explosão de Fúria*, Uivo de Guerra, Fúria Cega, Olhos Vermelhos |
| O Massacre | Arrancada*, Giro Selvagem, Esmagar*, Colheita Rubra |
| O Couro | Pele Grossa*, Cicatrizes de Guerra*, Recusar a Queda, Fôlego Bestial |
| Gerais | Força Bruta, Grito Intimidador, Sangue Quente, Couro Curtido |
| Caminhos (NP 3) | Gigante (Passo de Gigante, Terremoto), Dragão (Escamas de Dragão, Coração de Dragão), Ancestrais (Vigília dos Ancestrais, Fúria dos Ancestrais) |
| Ápice (NP 10) | Fúria Imortal |
| Dedicação (NP 5) | Dedicação: Berserker, que dá a Ira Menor, o Golpe Selvagem e Sangrar |

\* talentos [Dedicação].

Código: `module/classes/berserker.mjs` (`BERSERKER`): o Teto, o bônus de dano (`rollBonuses`, +1d6 por 2 de Ira no
Gigante), o custo em PV de Sangrar (`after`), a cura do Fôlego (`onUse`), o [Último Fôlego] de Recusar a Queda e do
Ápice (`statuses`; o `onDamaged` percebe quando ele salvou e cobra a Ira), os ganhos por dano sofrido, por acertos em
[Fúria], por inimigos derrubados e, nos Ancestrais, pelos aliados (`onAnyDamaged`, `onAnyKill`), e os estados dos
golpes (`onHit`: Arrancada, Esmagar, Terremoto, Coração de Dragão).

### Caçador

O Motor **Mira** mexe na posição: parado, o Caçador junta Mira (na Manutenção, se o token não se moveu na rodada
anterior, e com Firmar a Mira, que gasta a Ação de Movimento sem andar); mover o token perde tudo. O Tiro Certeiro
gasta toda a Mira (cada ponto soma 1d6 + NP) e, com a Mira cheia, deixa o alvo [Exposto]. Código em
`module/classes/cacador.mjs` (`onMove` zera, `onSetup` confere `moved`, passos livres em `free`).

| Parte | O que tem |
|---|---|
| Base | FOR 2, DES 4, POD 2, INT 2; faixa Firme (40, +6/NP); papéis Damage e Control |
| Magias | uma no NP 1 e outra no NP 10; os feitiços somam Mira (mover ainda zera) |
| Kit | Mira (Motor), Firmar a Mira (Movimento, +1), Disparo (Maior, [2d6 + Poder de Ataque], não gasta), Tiro Certeiro (Maior, gasta tudo) |
| O Olho | Paciência do Caçador*, Respiração Contida*, Concentração do Atirador, Olhar Frio |
| A Aljava | Flecha-Rede*, Flecha de Sinal*, Flecha Incendiária, Flecha Perfurante |
| O Rastro | Rastreador*, Paciência da Tocaia, Abate Limpo, Presa Ferida |
| O Vento | Tiro em Movimento*, Vento a Favor, Recuar e Atirar, Flecha Ligeira |
| Gerais | Primeira Flecha, Rastrear, Posto Alto, Viver da Terra |
| Caminhos (NP 3) | Falcão (Mergulho, Asa Quebrada), Chuva de Flechas (Saraivada, Céu Fechado), Olho de Águia (Respiração do Atirador, Tiro Impossível) |
| Ápice (NP 10) | Olho do Céu |
| Dedicação (NP 5) | Dedicação: Caçador, que dá a Mira Menor, Firmar a Mira e o Tiro Certeiro |

\* talentos [Dedicação].

### Centurião

O Motor **Baluarte** mexe no Ódio: cada ataque que um inimigo faz contra o Centurião assenta uma Camada, e cada Camada
é [Anulação: 1] contra todo dano (o efeito passivo `eternia.passive.cancel` = `@motor.value × @motor.layer`). O Golpe
do Baluarte gasta todas (+(1+Camadas)d6, sem somar o NP) e prende o alvo com [Provocado]. Uma rodada sem ser atacado
custa uma Camada no Encerramento.

| Parte | O que tem |
|---|---|
| Base | FOR 4, DES 2, POD 3, INT 1; faixa Colossal (55, +9/NP); papel Defense |
| Magias | uma no NP 1 e outra no NP 10; os feitiços assentam Camadas |
| Kit | Baluarte (Motor), Intercepção (Antes do Dano, +1), Brado do Baluarte (Menor, +1), Golpe do Baluarte (Maior, gasta todas) |
| A Muralha | Muralha Alta*, Pedra Angular, Muro de Ferro, Inabalável |
| O Desafio | Grito de Guerra*, Olhos em Mim, Atrair o Ódio*, Juramento de Proteção |
| O Martelo | Investida de Escudo, Onda de Choque, Contragolpe de Escudo*, Martelo do Bastião |
| A Guarda | Guarda Estendida*, Escudo Compartilhado*, Postura de Bastião, Último Baluarte |
| Gerais | Sentinela, Muralha Humana, Palavra de Centurião, Ombros de Ferro |
| Caminhos (NP 3) | Fortaleza (Pedra sobre Pedra, Fortaleza Viva), Escudo Erguido (Abrigo, Muro Vivo), Retaliação (Espinhos de Ferro, Ira do Bastião) |
| Ápice (NP 10) | Bastião Eterno |
| Dedicação (NP 5) | Dedicação: Centurião, que dá o Baluarte Menor, a Intercepção e o Golpe do Baluarte |

\* talentos [Dedicação].

Código: `module/classes/guardiao.mjs` (`GUARDIAO`): o Teto, `@motor.layer`, o Golpe na Fortaleza e com o Martelo do
Bastião (acerto automático), o Juramento (o Protegido em `ward`), os ataques sofridos (`onAttacked`, e quem atacou na
rodada para a Ira do Bastião), o Encerramento, a Retaliação e a Pedra sobre Pedra (`onDodged`), o Escudo Erguido e o
Protegido (`onAnyHit`/`onAnyMiss`), os Espinhos de Ferro ([Espelho] pelo `statuses`) e os estados dos golpes
(`onHit`).

### Druida

**Classe antiga.** Desde a 0.22 o Druida está fora da lista de classes e das Dedicações: a Eternia passou a ter 14
classes, 7 físicas e 7 mágicas. As fichas que já o usam continuam funcionando com as regras abaixo.

O Motor **Formas** mexe na forma: na forma Humana o Druida junta Seiva (+1 na Manutenção, +1 na Seiva da Terra) e
cura; o Chamado da Fera gasta 1 Seiva para virar Urso ([Anulação: 2 + Seiva] e [Barreira: NP+5] ao virar) ou Lobo
([Fortalecido: NP÷2 + 2]), e na fera cada Encerramento custa 1 Seiva (sem Seiva, volta a ser humano). Cada forma é um
menu: os golpes de fera pedem uma fera, as curas pedem a forma Humana. Teto: 3 + ⌊NP/5⌋.

| Parte | O que tem |
|---|---|
| Base | FOR 3, DES 2, POD 3, INT 2; faixa Firme (40, +6/NP); papéis Defense e Healing |
| Kit | Formas (Motor), Chamado da Fera (Menor), Garra e Presa (Maior, numa fera), Seiva da Terra (Maior, Humana, +1) |
| A Fera | Investida do Urso, Bote do Lobo, Garras Afiadas*, Fúria da Fera |
| A Raiz | Seiva Partilhada*, Raízes Fundas*, Brotos Curativos, Florescer |
| As Estações | Instinto Selvagem*, Fôlego da Mata*, Asas do Falcão, Transformação Instintiva |
| A Selva | Raízes que Prendem, Comunhão com a Mata*, Espinheiro, Fome da Selva |
| Gerais | Falar com as Feras, Andar na Mata, Ervas da Trilha, Forma de Viagem |
| Caminhos (NP 3) | Fera Primeva (Sangue Primevo, Rugido Ancestral), Bosque (Galhos Protetores, Raízes do Mundo), Enxame (Nuvem Voraz, Mil Ferroadas) |
| Ápice (NP 10) | Mil Formas |
| Dedicação (NP 5) | Dedicação: Druida, que dá as Formas Menores (só o Lobo), o Chamado da Fera e Garra e Presa |

\* talentos [Dedicação].

Os efeitos de cada forma são estados passivos do Motor (`statuses` em `module/classes/druida.mjs`): mudam sozinhos com a
forma e somem fora de combate. O alcance do Falcão e a Esquiva do Enxame são efeitos com a condição `motorState`.

### Estrategista

**Classe antiga.** Desde a 0.22 o Estrategista está fora da lista de classes e das Dedicações: a Eternia passou a ter 14
classes, 7 físicas e 7 mágicas. As fichas que já o usam continuam funcionando com as regras abaixo.

O Motor **Leitura** mexe nos próprios dados: na Manutenção, Estudar o Campo rola 2d6 e guarda os dois dados como uma
Leitura. Nos cartões de ataque, a Leitura toma o lugar dos dois dados mais baixos de um teste do Estrategista (e, com
talentos, dos aliados; ou dos dois mais altos de um inimigo), e o cartão julga o acerto de novo. Outras habilidades
gastam uma Leitura pela soma dela (2 a 12): uma marca, uma barreira, um golpe, uma ordem. Teto 1 + ⌊NP/5⌋ (passou,
escolhe qual descartar); zera no fim do combate.

| Parte | O que tem |
|---|---|
| Base | FOR 1, DES 3, POD 2, INT 4; faixa Leve (40, +5/NP); papéis Support e Control |
| Kit | Leitura (Motor), Estudar o Campo (Manutenção), Executar o Plano (os botões do cartão), Ponto Fraco (Maior, [Identificado]; gastando uma Leitura, [Marcado]) |
| O Plano | Plano B\*, Estudo Rápido, Revisar, Observação |
| A Previsão | Prever\*, Armadilha Mental, Desmontar a Guarda, Ler o Inimigo |
| A Lição | Lição Ensinada\*, Instrução\*, Antecipar o Golpe\*, Formação Ensaiada |
| O Tabuleiro | Golpe Calculado\*, Xeque, Mudar a Formação, Tempo Certo |
| Gerais | Plano Prévio, Ler a Cena, Mapa Mental, Negociador Frio |
| Caminhos (NP 3) | Xadrez (Roque, Xeque-Mate), Antevisão (Olhar Adiante, Ver Além), Detetive (Dedução Rápida, Caso Encerrado) |
| Ápice (NP 10) | Mente Mestra |
| Dedicação (NP 5) | Dedicação: Estrategista, que dá a Leitura Menor e Estudar o Campo |

\* talentos [Dedicação].

Automático (`module/classes/estrategista.mjs`): as rolagens das Leituras (Estudar o Campo, Estudo Rápido, Olhar
Adiante, Plano Prévio, com 3d6/4d6 e a escolha dos dois dados na Antevisão, duas com o Ápice) e o descarte acima do Teto;
os botões do cartão (`cardActions`, nos seus testes, nos dos aliados com Lição Ensinada ou Xadrez, nos dos inimigos com
Prever) que trocam os dados por `adjustCardRoll`; a escolha da Leitura nos gastos (a soma em `@use.reading` nas
fórmulas); o que vem depois (a Leitura que volta no Xadrez, Roque, Formação Ensaiada, Ler o Inimigo, Desmontar a
Guarda); a [Marcado] do Ponto Fraco, o [Fortalecido] da Instrução, a [Provocado] e a Barreira do Xeque; Observação,
Ler a Cena, Caso Encerrado, a Dedução Rápida (posta o total novo do último teste) e as Leituras que ficam no Detetive.
Ficam no texto: o movimento de Mudar a Formação e os talentos Gerais Mapa Mental e Negociador Frio.

### Feiticeiro

**Classe antiga.** Desde a 0.16 o Feiticeiro está fora da lista de classes e das Dedicações: o Mago Negro (a Pressão é o
Calor feito motor das Magias), com a Magia Fogo, tomou o lugar dele. As fichas que já o usam continuam funcionando com
as regras abaixo.

O Motor **Calor** mexe no risco: cada Feitiço da classe esquenta o feiticeiro (+1, os grandes +2), e o Calor soma
+[Calor × 2] ao dano dos Feitiços. No Teto (3 + ⌊NP/5⌋) ele fica Incandescente e, no Encerramento, sofre a Sobrecarga
([Calor × NP] de dano direto), a menos que solte o fogo antes: a Erupção (área, precisa de 2) gasta todo o Calor, com
1d6 + NP por ponto; Respirar a Chama tira 2 sem efeito.

| Parte | O que tem |
|---|---|
| Base | FOR 0, DES 2, POD 4, INT 4; faixa Frágil (35, +4/NP); papel Damage |
| Kit | Calor (Motor), Dardo Ígneo (Maior, +1), Respirar a Chama (Menor, −2), Erupção (Maior, gasta tudo) |
| A Chama | Bola de Fogo, Línguas de Fogo*, Marca de Brasa*, Combustão |
| O Fole | Fornalha Profunda*, Atiçar*, Febre Arcana, Chama Contida |
| A Fornalha | Manto de Brasas*, Pele de Lava, Aura Ardente, Cauterizar* |
| A Cinza | Lança de Magma, Pira, Explosão Controlada, Cinzas ao Vento |
| Gerais | Brasa Acesa, Fogueira, Olhar Ardente, Forja de Bolso |
| Caminhos (NP 3) | Vulcão (Câmara de Magma, Cataclismo), Geada (Inverno Precoce, Zero Absoluto), Estrela (Brilho Cadente, Estrela Fixa) |
| Ápice (NP 10) | Coração de Magma |
| Dedicação (NP 5) | Dedicação: Feiticeiro, que dá o Calor Menor, o Dardo Ígneo e a Erupção |

\* talentos [Dedicação].

Automação (`module/classes/feiticeiro.mjs`): o ganho pelos Feitiços (`motor.gain`), o estado Incandescente pelo valor,
o bônus de dano (`rollBonuses`, Feitiços com a tag Spell), a Sobrecarga e a Aura Ardente no Encerramento, Combustão
(`onCheck`), Cinzas ao Vento (`onKill`), os estados que os Feitiços dão no acerto (Geada, Cataclismo, Pira, Zero
Absoluto: `onHit`), Pele de Lava e o [Despertado] da Estrela (`statuses`), Brilho Cadente ao ficar Incandescente,
Explosão Controlada (diálogo), Estrela Fixa (`autoHit`) e o Ápice.

### Hierofante

O Motor **Táticas** mexe no comando: o Hierofante junta Ordens (+1 na Manutenção, +1 com Avaliar o Campo) e cada
Ordem gasta faz um aliado agir fora do turno dele. A Ordem: Atacar! dá [Concentrado] ao aliado e guarda quem foi mandado
atacar (`ordered`); quando o resultado do ataque básico dele sai (`onAnyHit`/`onAnyMiss`), a Ação Maior gasta volta,
na janela de quem rolou. Código em `module/classes/hierofante.mjs` (a aura do Caminho da Bandeira na Manutenção, pelo
Mestre, com `flags.eternia.commandAura`).

| Parte | O que tem |
|---|---|
| Base | FOR 3, DES 2, POD 2, INT 3; faixa Firme (40, +6/NP); papéis Support e Control |
| Magias | uma no NP 1 e outra no NP 10; os feitiços viram Ordens |
| Kit | Táticas (Motor), Avaliar o Campo (Menor, +1, [Identificado]), Ordem: Atacar! (Maior), Ordem: Avançar! (Menor) |
| A Vanguarda | Alvo Prioritário*, Comandar pelo Exemplo, Ponto de Ataque, Ordem: Carga! |
| A Formação | Ordem: Segurar!*, Formação Cerrada*, Recuar em Ordem, Ninguém Fica Para Trás |
| O Estandarte | Erguer o Estandarte*, Estandarte Inabalável, Clarim de Guerra, Glória do Batalhão |
| O Mapa | Plano de Batalha*, Reserva Tática*, Antecipar, Contra-ordem |
| Gerais | Inspirar Tropas, Ler o Mapa, Primeira Ordem, Vigília do Acampamento |
| Caminhos (NP 3) | Marechal (Comando em Cadeia, Linha de Comando), Capitão (Na Linha de Frente, Exemplo Vivo), Bandeira (Mastro Alto, Juramento da Bandeira) |
| Ápice (NP 10) | Comando Supremo |
| Dedicação (NP 5) | Dedicação: Hierofante, que dá as Táticas Menores, Avaliar o Campo e a Ordem: Atacar! |

\* talentos [Dedicação].

### Invocador

O Motor **Pacto** mexe numa criatura extra: um espírito (Lobo, Golem ou Fada) fica preso ao Invocador por Laços que
ele compra com os próprios PV ([NP÷2+2] cada), sem token: o espírito age pelas habilidades do Invocador. O Comando:
Ataque rola 1d6 a mais por Laço, os comandos especiais gastam Laços, e com 0 Laços o espírito se desfaz. Cada espírito tem
um traço (Lobo +1d6, Golem [Anulação: Laços], Fada [Regeneração: Laços × 2]). É uma **classe de magia** desde a
0.13: escolhe uma Magia no NP 1, outra no NP 5 e a terceira no NP 10. Com um espírito presente, os Feitiços das Magias
dão +1 Laço (os grandes, +2; sem espírito, nada), e os supremos pedem o Teto, gastam todos os Laços e só saem com um
espírito que chegou antes da rodada (senão, Chamado Rápido e Legião fariam um supremo por turno). Código em
`module/classes/invocador.mjs`.

| Parte | O que tem |
|---|---|
| Base | FOR 1, DES 2, POD 4, INT 3; faixa Leve (40, +5/NP); papéis Damage e Control |
| Kit | Pacto (Motor), Invocar Espírito (Maior), Comando: Ataque (Menor), Escudo Vivo (Antes do Dano, gasta 1); a primeira Magia |
| O Lobo | Investida do Lobo*, Uivo da Matilha*, Caçada*, Presas Fundas |
| O Golem | Muralha do Golem, Punho de Pedra, Corpo de Pedra, Fundação |
| A Fada | Pó de Fada, Luz Errante, Brilho Curativo, Ciclo da Fada |
| O Pacto | Laço de Sangue*, Chamado Rápido*, Troca de Espírito, Retorno ao Vazio* |
| Gerais | Conversar com Espíritos, Montaria Espiritual, Sentir o Além, Selo de Guarda |
| Caminhos (NP 3) | Legião (Muitas Vozes, Reforço Constante), Fusão (Golpe Fundido, Avatar), Titã (Passo do Titã, Fúria do Titã) |
| Ápice (NP 10) | Pacto Eterno |
| Dedicação (NP 5) | Dedicação: Invocador, que dá o Pacto Menor (só o Lobo), Invocar Espírito e o Comando: Ataque (sem Magias) |

\* talentos [Dedicação].

Estado em `flags.eternia.motor.invocador`: `state` (`vazio`, `lobo`, `golem`, `fada`), `value` (Laços), `since` (a rodada
em que o espírito chegou, para os supremos), `freeUsed` e `eternalUsed` (o Ápice, por combate) e as rodadas dos ganhos de uma vez por rodada. As habilidades que pedem um
espírito dizem qual em `flags.eternia.motor.spirit` (`"any"` ou o espírito). O PV pago sai direto da ficha (sem
Barreira) e o Desfazer do cartão não o devolve.

### Lutador

O Motor **Corrente** mexe na sequência de golpes: o Golpe de Entrada e o Elo Rápido somam Elos, e o Golpe Final gasta
todos ([(1 + Elos)d6 + Poder + Elos×NP]; com a Corrente cheia, o alvo fica [Atordoado]). Um turno sem habilidade da Corrente a
quebra, e cada ataque de um inimigo que tira PV do lutador tira 1 Elo. Os golpes pedem [Artes Marciais] ou as duas mãos
vazias.

| Parte | O que tem |
|---|---|
| Base | FOR 3, DES 4, POD 2, INT 1; faixa Firme (40, +6/NP); papéis Damage e Defense |
| Magias | uma no NP 1 e outra no NP 10; os feitiços somam Elos e contam como golpes da Corrente (`struck`) |
| Kit | Corrente (Motor), Golpe de Entrada (Maior, +1), Elo Rápido (Menor, com 1 Elo, [1d6 + NP], +1), Golpe Final (Maior, com 2 Elos, gasta todos) |
| O Punho | Palma Atordoante*, Chute Giratório, Punho que Atravessa, Último Elo |
| O Fluxo | Desviar e Seguir*, Postura do Grou*, Contra-golpe, Fluxo Ininterrupto |
| O Vento | Passo do Vento*, Investida do Tigre, Pés Leves, Vento Cortante |
| O Centro | Fôlego do Centro*, Corrente Longa*, Pele de Ferro, Coração Imóvel |
| Gerais | Primeiro Elo, Salto do Grou, Meditação, Ler o Golpe |
| Caminhos (NP 3) | Montanha (Raiz da Montanha, Avalanche), Rio (Remanso, Maré Viva), Tempestade (Trovoada, Ciclone) |
| Ápice (NP 10) | Corrente Infinita |
| Dedicação (NP 5) | Dedicação: Lutador, que dá a Corrente Menor, o Golpe de Entrada e o Golpe Final |

\* talentos [Dedicação].

Automação (`module/classes/lutador.mjs`): os Elos que cada golpe soma e o Golpe Final gasta (com o custo "Hate 1+Elos" e
o dano por `@use.base`, `@spent` e `@use.flat`), a quebra no fim do turno (`onTurnEnd`), o Elo perdido no dano
(`onDamaged`), a Corrente cheia ([Atordoado] pelo `onHit`; acerto automático com Punho que Atravessa), Desviar e
Seguir (`onDodged`), Último Elo (`onKill`), Maré Viva (`onCleanup`), Pele de Ferro (estado passivo), Pés Leves e Raiz
da Montanha (efeitos com `motorAtLeast`), Fluxo Ininterrupto (a segunda vez do Elo Rápido gasta o Movimento) e as
linhas do Ápice.

### Mago Azul

O Motor **Almas** mexe nos monstros vencidos e é o motor das Magias (Take Over). O Mago Azul guarda num grimório as
almas dos monstros que leva a 0 PV com o Absorver: o nome, o nível (o NP do monstro) e a natureza, que é o maior
atributo dele (Força é Fera, Destreza é Animal, Poder é Demônio, Inteligência é Espírito), e o elemento, a primeira tag
de elemento dele (Chama, Frio, Choque...). O grimório começa com a Primeira Alma (a natureza escolhida no primeiro Take
Over, o nível sempre o NP do mago) e guarda mais 3 + ⌊NP/5⌋, de um combate para o outro; cheio, sai a de menor nível
(a mais antiga no empate), que pode ser a nova. O Take Over (Menor) veste uma alma: em combate, a natureza vira um estado
passivo com o Valor ⌊min(nível, NP) ÷ 3⌋ + 2 (Fera [Fortalecido], Animal [Acelerado] e metade em [Fortalecido], Demônio
[Despertado], que deixa [Fadiga] ao sair, Espírito [Anulação]) e o elemento entra no dano dos Feitiços do mago. A
Essência vem dos Feitiços (+1, os grandes +2), da alma absorvida (+1) e de cada Manutenção na forma (+1); o Golpe da
Alma gasta toda e deixa a marca da natureza (Fera [Derrubado], Animal [Lento], Demônio [Medo], Espírito [Atordoado]).
Teto 3 + ⌊NP/5⌋; zera no fim do combate (a forma também). É uma **classe de magia**: escolhe uma Magia no NP 1, outra
no NP 5 e a terceira no NP 10. Código em `module/classes/magoazul.mjs`.

| Parte | O que tem |
|---|---|
| Base | FOR 2, DES 2, POD 4, INT 2; faixa Firme (40, +6/NP); papéis Damage e Defense |
| Kit | Almas (Motor), Take Over (Menor), Absorver (Maior, Feitiço, +1; guarda a alma do monstro que derruba), Golpe da Alma (Maior, gasta toda); a primeira Magia |
| O Grimório | Fome de Almas\*, Grimório Amplo\*, Grimório Cheio, Banquete de Almas |
| A Forma | Pele Emprestada\*, Alma Selvagem, Elemento da Alma, Forma Perfeita |
| A Garra | Garra Possuída\*, Marca da Alma, Fúria Possessa, Golpe Inescapável |
| A Guarda | Rugido da Alma\*, Couraça de Alma\*, Carne Nova, Alma Sacrificada |
| Gerais | Ler a Alma, Essência Guardada, Alma Viajante, Voz das Feras |
| Caminhos (NP 3) | Corpo Inteiro (Dor que Alimenta, Rugido Total), Metamorfose (Pele Trocada, Mil Peles), Grimório Azul (Lição Azul, Magia Azul) |
| Ápice (NP 10) | Alma Soberana |
| Dedicação (NP 5) | Dedicação: Mago Azul, que dá as Almas Menores, o Take Over e o Absorver (sem Magias) |

\* talentos [Dedicação].

Os Caminhos reescrevem uma regra cada: o Corpo Inteiro, o ganho (+2 em cada Manutenção na forma, mas a forma só sai no
meio do combate com a Essência no Teto, gastando toda); a Metamorfose, a troca (um Take Over por rodada sem ação, +1 por
natureza nova); o Grimório Azul, a absorção (a alma de todo monstro que cai a até 4 Qd entra no grimório). O Ápice, a
Alma Soberana, veste duas almas ao mesmo tempo.

Estado em `flags.eternia.motor.magoazul`: `state` (`humano`, `fera`, `animal`, `demonio`, `espirito`: a natureza
vestida), `value` (Essência), `first` (a natureza da Primeira Alma), `souls` (as almas absorvidas: `{ id, name, img,
rank, nature, element }`), `worn` e `second` (as almas vestidas; `primeira` é a Primeira Alma), `fresh` (as absorvidas no
combate, para a Lição Azul), `round` (as naturezas vestidas na rodada, para Mil Peles) e as marcas de uma vez por rodada
(`wild`, `barrier`, `hurt`, `swap`) e `inescapable` (o Golpe Inescapável, uma vez por cena).

Automação: a absorção (`onKill` do Absorver ou de qualquer golpe com Fome de Almas; `onAnyKill` no Grimório Azul, pela
distância dos tokens), a natureza e o elemento lidos do monstro (atributos e tags), o Take Over (`plan`: a Primeira Alma,
a alma, a segunda no Ápice; o Corpo Inteiro e a Metamorfose), os estados da forma (`statuses`), o elemento no dano
(`damageTags`), as marcas e os estados do elemento no acerto (`onHit`), os ganhos (`onSetup`, Alma Selvagem no
`onHitTarget`, Dor que Alimenta no `onDamaged`), a Pele Emprestada e a Pele Trocada (`onUse`), o Banquete e a Alma
Sacrificada (soltam a alma) e o Golpe Inescapável. Ficam no texto os talentos Gerais (os sentidos, a conversa com as
criaturas) e os alvos das áreas.

### Mago Branco

O Motor **Lei** mexe nos dados dos outros e é o motor das Magias: o Padrão do Tecelão com outra cara. O Mago Branco
escreve um número de 2 a 12, e cada teste de qualquer personagem no combate (Esquivas incluídas) com dois dados que
somam esse número acende Runas (1 para 6 a 8, 2 para 4, 5, 9 e 10, 3 para 2, 3, 11 e 12); cada Feitiço, da classe ou
das Magias, acende mais uma (os grandes, duas). Nos cartões de ataque, 2 Runas reescrevem um dado de um teste já
rolado: o menor sobe 1 ou o maior desce 1 (3 Runas quando isso cria ou desfaz um Crítico ou uma Falha Crítica; a Lei
acende no máximo 2 Runas por rodada); os
feitiços supremos das Magias pedem o Teto e gastam todas. Teto 3 + ⌊NP/5⌋; zera no fim do combate, e trocar a Lei no
meio do combate apaga as Runas. É uma **classe de magia**: escolhe uma Magia no NP 1, outra no NP 5 e a terceira no NP
10. Código em `module/classes/magobranco.mjs`.

| Parte | O que tem |
|---|---|
| Base | FOR 1, DES 2, POD 3, INT 4; faixa Leve (40, +5/NP); papéis Healing e Control |
| Kit | Lei (Motor), Escrever a Lei (Manutenção), Reescrever (os botões do cartão), Cura (Maior, Feitiço, [2d6 + Recuperação], +1); a primeira Magia |
| A Runa | Inscrever\*, Runa Gêmea, Círculo Rúnico\*, Segunda Lei |
| O Selo | Selo de Luz, Selo Cego\*, Selo de Marca, Grande Selo |
| A Barreira | Bênção Rúnica\*, Barreira Rúnica\*, Restauração, Runa Guia |
| O Julgamento | Runa Sagrada\*, Runa Partida, Duas Sentenças, Sentença Final |
| Gerais | Runas Gravadas, Ler as Runas, Runa de Retorno, Selo de Porta |
| Caminhos (NP 3) | Augúrio (Grande Augúrio, Roda do Céu), Lei Absoluta (Lei Dourada, Veredicto), Cerco (Runa do Cerco, Cerco Fechado) |
| Ápice (NP 10) | Lei Perfeita |
| Dedicação (NP 5) | Dedicação: Mago Branco, que dá a Lei Menor e Escrever a Lei (sem Magias) |

\* talentos [Dedicação].

O que mudou do Tecelão: o kit troca o Laço pela Cura (o Laço virou o Selo de Luz, no ramo O Selo, e o Laço Apertado
saiu), os Feitiços acendem Runas pelo `motor.gain`, a Runa Sagrada e as Duas Sentenças batem de [Radiância], a
Restauração é um Feitiço e o Geral Costurar Mentiras virou o Selo de Porta (Desarmar). Os Caminhos são os do Tecelão:
Augúrio (o Acaso), Lei Absoluta (o Destino) e Cerco (o Bordado).

Estado em `flags.eternia.motor.magobranco`: `state` (`escrita`, um só), `value` (Runas), `pattern` (a Lei), `second` (o
segundo número), `doubles` (a Runa Gêmea da rodada), `siege` (a Runa do Cerco da rodada), `pulled` (a correção mais
barata do Ápice na rodada), `fate` (o combate do Veredicto), `lit` (as Runas que a Lei acendeu na rodada, até 2),
`absolute` (a correção da Lei Absoluta na rodada) e `sentence` (a Sentença Final da cena).

Automação: o ganho em qualquer teste do combate (`onAnyCheck`, com a Runa Gêmea e a Runa a mais do Selo de Luz), os
Feitiços (`motor.gain`), os botões do cartão de ataque (`cardActions`: +1/−1, → 6/→ 1 na Lei Absoluta, Veredicto) que
mudam os dados por `adjustCardRoll` e cobram as Runas (2, 3 quando muda Crítico ou Falha Crítica, +1 na Lei Absoluta, uma vez por rodada; Runa Guia e a correção
mais barata do Ápice), o que a correção causa ([Marcado] do Selo de Marca, [Lento]/[Enraizado] do Cerco, o dano da
Runa Partida, o [Fortalecido] da Lei Dourada), a Lei rolada do Augúrio (`onSetup`) e a Roda do Céu, os estados no alvo
atingido (`onHit`), o acerto automático da Sentença Final (uma vez por cena) e a Runa do Cerco. Ficam no texto os talentos Gerais
(presságios, caminho de volta, selos de porta).

### Mago Negro

O Motor **Pressão** mexe no risco, como o Calor do Feiticeiro, e é o motor das Magias: cada Feitiço, da classe ou das
Magias, aumenta a Pressão (+1, os grandes +2), e a Pressão soma +[Pressão × 2] ao dano dos Feitiços. No Teto (3 +
⌊NP/5⌋) vem o Ponto Crítico e, no Encerramento, a Sobrecarga ([Pressão × NP] de dano direto), a menos que o mago solte
o poder antes: a Liberação (área, precisa de 2) gasta toda a Pressão, com 1d6 + NP por ponto; Conter a Magia tira 2; os
feitiços supremos das Magias pedem o Teto e gastam tudo. É uma **classe de magia**: escolhe uma Magia no NP 1, outra no
NP 5 e a terceira no NP 10. Código em `module/classes/magonegro.mjs`.

| Parte | O que tem |
|---|---|
| Base | FOR 0, DES 2, POD 4, INT 4; faixa Frágil (35, +4/NP); papel Damage |
| Kit | Pressão (Motor), Disparo Mágico (Maior, +1), Conter a Magia (Menor, −2), Liberação (Maior, gasta tudo); a primeira Magia |
| O Fluxo | Canalizar*, Ciclo de Ethernano*, Ressonância Emocional, Combustão Mágica |
| A Reserva | Reserva Profunda*, Transbordar, Liberação Controlada, Controle Fino |
| A Muralha | Barreira Mágica*, Aura de Pressão, Pressão Esmagadora, Transferência Mágica* |
| A Ruína | Rajada Arcana*, Lança Mágica, Nada Sobra, Colapso |
| Gerais | Sentir Magia, Repouso Arcano, Magia do Cotidiano, Leitura Arcana |
| Caminhos (NP 3) | Classe S (Prova da Classe S, Desastre Ambulante), Mago Santo (Julgamento, Selo Sagrado), Spriggan (Brilho de Spriggan, Poder Absoluto) |
| Ápice (NP 10) | Segunda Origem |
| Dedicação (NP 5) | Dedicação: Mago Negro, que dá a Pressão Menor, o Disparo Mágico e a Liberação (sem Magias) |

\* talentos [Dedicação].

Os Caminhos são os do Feiticeiro com outra cara: a Classe S reescreve o Teto (+1, e a Liberação no Teto soma +[NP×2+10]),
o Mago Santo reescreve o que a Pressão faz ([Lento] e [Enraizado] no lugar do dano) e Spriggan reescreve o risco
([Despertado] no lugar da Sobrecarga). O Ápice, a Segunda Origem, dá +1 no Teto e deixa metade da Pressão depois da
Liberação.

Estado em `flags.eternia.motor.magonegro`: `state` (`estavel`, `critico`), `value` (Pressão), `hotRound` (Prova da
Classe S), `ember` (Repouso Arcano) e `emotion` (Ressonância Emocional). A Pressão vale para qualquer habilidade com a
tag Spell: os feitiços das Magias também somam a Pressão ao dano e usam o Transbordar.

### Mago Vermelho

O Motor **Arsenal** mexe nos itens, como a Centelha do Ressonante, e é o motor das Magias: o mago guarda as peças num
espaço mágico e tem uma na mão, a Espada, a Armadura ou o Foco. A Carga cresce na Manutenção (+1) e com os Feitiços
(+1, os grandes +2) e dá o poder da peça: Espada +[Carga × 2] no dano dos Ataques com Arma, Armadura [Anulação: Carga ×
2], Foco +[Carga × 2] em Feitiços e curas. O Reequipar (Menor) troca a peça: a que sai solta a Descarga (Espada:
+[Carga × NP] no próximo Ataque com Arma; Armadura: [Barreira: Carga × (NP+5)]; Foco: +[Carga × NP] no próximo Feitiço
ou cura) e a nova começa com metade da Carga. Teto: 3 + ⌊NP/5⌋. A peça fica na mão de um combate para o outro. É uma
**classe de magia**: escolhe uma Magia no NP 1, outra no NP 5 e a terceira no NP 10. Código em
`module/classes/magovermelho.mjs`.

| Parte | O que tem |
|---|---|
| Base | FOR 3, DES 2, POD 3, INT 2; faixa Firme (40, +6/NP); papéis Damage e Defense |
| Kit | Arsenal (Motor), Reequipar (Menor), Lâmina Convocada (Maior, +1), Disparo do Foco (Maior, Feitiço, +1); a primeira Magia |
| A Espada | Fio Encantado, Aço que Responde*, Golpe da Descarga, Lâmina Longa |
| A Armadura | Couraça Encantada*, Golpe Aparado, Escudo Convocado*, Armadura Inabalável |
| O Foco | Rajada do Foco, Luz Restauradora, Foco Amplo, Bênção do Foco |
| O Reequipar | Reequipar Veloz*, Carga Contínua*, Arsenal Ampliado*, Peça Renovada |
| Gerais | Avaliar Equipamento, Espaço do Arsenal, Troca de Traje, Cuidar das Peças |
| Caminhos (NP 3) | Arma Selada (Peça Jurada, Selo Rompido), Panóplia (Peça Mestra, Arsenal Desperto), Troca Relâmpago (Escudo dos Companheiros, Recarga Veloz) |
| Ápice (NP 10) | Arsenal Infinito |
| Dedicação (NP 5) | Dedicação: Mago Vermelho, que dá o Arsenal Menor (só Espada e Armadura), o Reequipar e a Lâmina Convocada (sem Magias) |

\* talentos [Dedicação].

Os Caminhos são os do Ressonante com outra cara: a Arma Selada reescreve o Reequipar (não troca em combate, +2 no Teto),
a Panóplia reescreve o que a Carga faz (a peça na mão a meio valor, as outras duas a um terço) e a Troca Relâmpago reescreve o Reequipar de outro
jeito (a Descarga em dobro, a peça nova em 0). O Ápice, Arsenal Infinito, tira o custo do Reequipar e deixa a peça que
saiu valendo até o fim da rodada.

Estado em `flags.eternia.motor.magovermelho`: `state` (`espada`, `armadura`, `foco`), `value` (Carga), `release` (as
Descargas da Espada e do Foco esperando um ataque), `bound` (a Descarga que um uso tomou, para o dano dele), `prev` e
`prevRound` (o Ápice), `recharge` (Recarga Veloz), `answered` (Aço que Responde) e `ember` (Cuidar das Peças). Uma
Descarga espera a próxima habilidade que rola dano ou cura: um Ataque com Arma (a da Espada) ou um Feitiço ou cura (a
do Foco); os feitiços sem rolagem não a gastam.

### Matador de Dragões

O Motor **Escamas** mexe nos elementos do dano: o Matador come o próprio elemento (o Devorar: +1, ou +2 com uma fonte;
o Punho de Ferro do Dragão: +1; cada ataque do elemento que o atinge: +1, e o de um aliado não causa dano) e gasta as
Escamas nos golpes de dragão, magias ([Ataque Mágico]) que somam o Poder de Ataque e causam dano mágico do elemento. No
Teto (3 + ⌊NP/5⌋) vem a **Força do Dragão**: [Despertado: NP + 2×Semente] e −1 Escama no Encerramento, até zerar. Quando
ela acaba, o [Despertado] deixa a [Fadiga] dele e a **Semente do Dragão** (o Tabu, contada por cenário) cresce 1, o que
deixa a Força seguinte mais forte e mais cara. O elemento, escolhido no NP 1 num espaço de escolha do item de classe, dá
a tag e o estado dos golpes, a imunidade ([Anulação (tag): NP×2 + 10] e o estado), a fonte do Devorar e três talentos
próprios. Código em `module/classes/matador.mjs`.

| Parte | O que tem |
|---|---|
| Base | FOR 3, DES 3, POD 3, INT 1; faixa Firme (40, +6/NP); papel Damage |
| Magias | uma no NP 5 e outra no NP 10 (o elemento é a magia do NP 1); os feitiços somam Escamas |
| Kit | Escamas (Motor), Devorar (Menor, 1/rodada), Punho de Ferro do Dragão (Maior, +1), Rugido do Dragão (Maior, gasta à escolha) |
| Elementos (NP 1) | Dragão de Fogo (Chama Brilhante do Dragão de Fogo, Chama das Emoções, Lótus Carmesim), Dragão de Ferro (Escamas do Dragão de Ferro, Espada do Dragão de Ferro, Carma Demoníaco), Dragão do Céu (Sopro Curativo, Bênção do Dragão do Céu, Luz Despedaçadora), Dragão do Raio (Alabarda Celeste, Corpo de Raio, Trovão Rugente), Dragão Branco (Raio Sagrado do Dragão Branco, Impulso Branco, Nova Sagrada), Dragão das Sombras (Corte do Dragão das Sombras, Forma de Sombra, Abismo do Dragão das Sombras), Dragão do Veneno (Dente Duplo do Dragão do Veneno, Guarda do Dragão do Veneno, Mandíbula do Dragão do Veneno) |
| A Fome | Barriga Cheia*, Sabor da Vitória, Alimento do Dragão, Fome Insaciável |
| A Escama | Pele de Escamas*, Estômago de Dragão*, Instinto do Dragão, Semente Contida |
| A Garra | Garra do Dragão*, Cotovelo do Dragão*, Chifre de Espada do Dragão, Presa Esmagadora do Dragão |
| O Rugido | Asa do Dragão*, Rugido Prolongado, Rugido que Ecoa, Rugido Absoluto |
| Gerais | Faro de Dragão, Parceiro Alado, Banquete do Dragão, Engolir o Perigo |
| Caminhos (NP 3) | Primeira Geração (O Dragão Interior, Despertar do Dragão Interior), Segunda Geração (Lacrima Carregada, Lacrima Sem Freio), Terceira Geração (Dragões Gêmeos, Força Sem Limite) |
| Ápice (NP 10) | Modo Rei Dragão |
| Dedicação (NP 5) | Dedicação: Matador de Dragões, que dá as Escamas Menores, o Devorar, o Punho de Ferro do Dragão e um elemento à escolha |

\* talentos [Dedicação].

Os Caminhos são as gerações e cada um reescreve uma regra: a Primeira, o que se come (os outros elementos de dragão
também dão Escamas e põem o Matador no Modo Dragão Duplo, com a tag e o estado deles nos golpes); a Segunda, o ganho
(+1 na Manutenção pela lacrima, fora da Força; o elemento que atinge não dá); a Terceira, a entrada na Força (a habilidade do Caminho,
Menor, com metade do Teto). As Artes Secretas (os talentos de NP 7 de cada elemento) só saem na Força e gastam tudo: [(1 + Escamas)d6 +
Poder de Ataque + (Escamas×NP)÷2], de alvo único ou de área.

Estado em `flags.eternia.motor.matador`: `state` (`humano`, `forca`), `value` (Escamas), `dual` (o elemento do Modo
Dragão Duplo), `seed` (`{ n, scenario }`: a Semente e o cenário em que conta, pelo contador `flags.eternia.scenario`),
`awoken` (o cenário em que o Dragão Interior já acordou), `stored` (Lacrima Carregada), `twins` (Dragões Gêmeos) e
`emotion` (Chama das Emoções). A tabela `ELEMENTS` do arquivo diz a tag, o estado e a fonte de cada elemento; um
elemento novo é uma linha nela, uma habilidade com `flags.eternia.element` (passiva, com a [Anulação] e a imunidade num
efeito) e os talentos com `elementTalent`. As tags [Ferro] (`Iron`) e [Vento] (`Wind`) entraram no catálogo para o
Ferro e o Céu; o Branco, as Sombras e o Veneno (0.25) usam tags que já existiam: [Radiância], [Corrupção] e [Veneno].
Os elementos da 0.25 foram gerados à parte (`elementos.mjs` do gerador do Matador), e a migração `kudenCleanup` (versão
6) os põe na escolha do item de classe e da Dedicação das fichas que já tinham o Matador.

Automação: os ganhos e os gastos, a Força pelo valor (o [Despertado] é um estado passivo do Motor, e a [Fadiga] vem da
regra dele ao sair), o dreno no Encerramento, a Semente, a tag do elemento no dano dos golpes (`damageTags`), o estado
no acerto (`onHit`), o ataque de aliado comido (`absorbs`), ser atingido pelo elemento (`onStruck`), o Devorar (o estado
comido sai do alvo pelo Mestre quando o jogador não é dono; sem estado, o diálogo pergunta pela fonte), Alimento do
Dragão, Chama das Emoções, Dragões Gêmeos, o Dragão Interior ([Último Fôlego] uma vez por cenário), a lacrima, a Força
por vontade, a Semente Contida (metade da Força como [Despertado], a outra metade no dano) e o Ápice. Ficam com o
Mestre: o enjoo em veículos, as fontes da cena e o deslocamento do Cotovelo, do Chifre de Espada, do Corpo de Raio,
do Corte do Dragão das Sombras e da Forma de Sombra.

### Menestrel

**Classe antiga.** Desde a 0.22 o Menestrel está fora da lista de classes e das Dedicações: a Eternia passou a ter 14
classes, 7 físicas e 7 mágicas. As fichas que já o usam continuam funcionando com as regras abaixo.

O Motor **Movimentos** mexe nos aliados: o Menestrel canta uma canção de cada vez, e ela sobe um Movimento a cada
Manutenção (I, II, III; +1 no NP 10), valendo como aura para todos os aliados no combate (o Lamento, para os
inimigos). Trocar de canção volta ao I; o Finale gasta tudo numa explosão da canção até o fim da rodada. Código em
`module/classes/menestrel.mjs`.

| Parte | O que tem |
|---|---|
| Base | FOR 1, DES 3, POD 3, INT 3; faixa Leve (40, +5/NP); papel Support |
| Kit | Movimentos (Motor), Marcha de Guerra (Menor), Balada da Vida (Menor), Finale (Maior, gasta tudo) |
| O Repertório | Hino da Muralha*, Lamento dos Caídos, Dueto, Refrão |
| O Compasso | Tempo Forte*, Ritornelo*, Modulação, Crescendo |
| O Palco | Acorde Cortante, Nota Sustentada*, Dissonância, Solo |
| A Plateia | Aplausos*, Bis*, Canção de Ninar, Plateia Encantada |
| Gerais | Casa Cheia, Lendas e Canções, Voz Encantadora, Ouvido Absoluto |
| Caminhos (NP 3) | Maestro (Batuta, Regência), Trovador (Medley, Repertório sem Fim), Sereia (Canto da Sereia, Maré de Vozes; o Caminho dá o Lamento dos Caídos) |
| Ápice (NP 10) | Sinfonia Eterna |
| Dedicação (NP 5) | Dedicação: Menestrel, que dá os Movimentos Menores (Teto 2), a Marcha de Guerra e o Finale |

\* talentos [Dedicação].

As canções: Marcha [Fortalecido: Movimentos × 2], Balada [Regeneração: Movimentos × (2 + NP÷5)], Hino [Anulação:
Movimentos × 2], Lamento [Fraqueza: Movimentos × 2] nos inimigos. O Finale: Marcha [Fortalecido: Movimentos ×
(NP÷2+3)], Balada [Regeneração: Movimentos × (NP+5)], Hino [Barreira: Movimentos × (NP+5)], Lamento [Fraqueza:
Movimentos × (NP÷2+3)], até o fim da rodada.

Quem escreve as auras é o Mestre ativo: o módulo registra, ao carregar, o pedido `eterniaSong` do socket do sistema
(`piles/pile-socket.mjs`). Os efeitos levam `flags.eternia.minstrelAura = { caster, kind }` (`aura`, `extra` para o
[Concentrado] do Dueto e o [Lento] da Maré de Vozes, `burst` para o Finale) e são trocados a cada mudança; na
Manutenção, todos os do Menestrel saem e voltam no Movimento novo. As habilidades que pedem uma canção têm
`flags.eternia.motor.singing`. Estado em `flags.eternia.motor.menestrel`: `state` (`silencio` ou a canção), `value`
(Movimentos), `apexStart`, e as rodadas que os talentos guardam (`hurt`, `switched`, `regency`, `chord`, `applause`) e
`refrain`.

### Oráculo

**Classe antiga.** Desde a 0.22 o Oráculo está fora da lista de classes e das Dedicações: a Eternia passou a ter 14
classes, 7 físicas e 7 mágicas. As fichas que já o usam continuam funcionando com as regras abaixo.

O Motor **Fardo** mexe na maldição: cada milagre pesa (+1, os grandes +2), e o Fardo soma +[Fardo × 2] à cura ou
ao dano dos milagres. Com 3 de Fardo vem a maldição ([Fraqueza: Fardo × 2]); no Teto (4 + ⌊NP/5⌋), também
[Maldito], e o oráculo não pode mais ser curado. A Revelação (área, precisa de 2) solta todo o Fardo de uma vez numa
cura em área; a Penitência tira 1.

| Parte | O que tem |
|---|---|
| Base | FOR 1, DES 2, POD 4, INT 3; faixa Firme (40, +6/NP); papéis Healing e Damage |
| Kit | Fardo (Motor), Milagre de Cura (Maior, +1), Juízo (Maior, +1), Revelação (Maior, gasta tudo) |
| A Cura | Toque do Vidente*, Milagre Coletivo, Sopro de Vida, Milagre Maior |
| O Juízo | Lança Sagrada*, Selo do Julgamento*, Revelação Ardente, Ira Divina |
| O Presságio | Penitência*, Maldição Transferida*, Olhos do Oráculo, Limiar Sagrado |
| O Véu | Véu de Luz*, Santuário, Manto do Profeta, Visão do Golpe |
| Gerais | Visões, Ler Presságios, Palavras de Conforto, Tocar os Mortos |
| Mistérios (NP 3) | Vida (Transfusão, Milagre Partilhado), Chamas (Fogo Purificador, Coroa de Chamas), Ossos (Ceifa, Erguer os Caídos) |
| Ápice (NP 10) | Profeta |
| Dedicação (NP 5) | Dedicação: Oráculo, que dá o Fardo Menor, o Milagre de Cura e a Revelação |

\* talentos [Dedicação].

Automação (`module/classes/oraculo.mjs`): o ganho pelos milagres (`motor.gain`, `motor.miracle`), o bônus na cura e
no dano (`rollBonuses`), a maldição e as proteções no Teto (`statuses`: [Fraqueza], [Queimando] das Chamas,
[Maldito], [Anulação] do Manto do Profeta, [Espelho] da Coroa de Chamas), a nota da aba com a maldição atual, o custo
em PV do Mistério da Vida (`onUse`), Sopro de Vida, Erguer os Caídos e Milagre Partilhado (`onAnyHealed`), o Fardo
que os Ossos tiram e a Ceifa (`onAnyKill`), Fogo Purificador (`onHit`), Ira Divina (`autoHit`), as Visões e Tocar os
Mortos (o Fardo do próximo combate) e o Ápice.

### Pictomante

O Motor **Moldes** mexe no campo e é o motor das Magias: cada Feitiço, da classe ou das Magias, ergue Moldes (+1, os
grandes +2), construções que ficam em pé de uma rodada para a outra, sem prazo, até serem quebradas. Quebrar vira dano
ou defesa: o Estilhaçar (Maior) quebra quantos o mago quiser, com (1 + quebrados)d6 + quebrados×NP; o Escudo Esculpido
(Antes do Dano, sem ação) dá [Anulação: quebrados × (NP+5)] contra um golpe, nele ou num aliado engajado; os feitiços
supremos das Magias pedem o Teto e quebram todos. Teto: 3 + ⌊NP/5⌋; zera no fim do combate. É uma **classe de magia**:
escolhe uma Magia no NP 1, outra no NP 5 e a terceira no NP 10. Código em `module/classes/pictomante.mjs`.

| Parte | O que tem |
|---|---|
| Base | FOR 1, DES 3, POD 4, INT 2; faixa Leve (40, +5/NP); papéis Control e Defense |
| Kit | Moldes (Motor), Pincelada (Maior, Feitiço, +1), Escudo Esculpido (Antes do Dano, quebra à escolha), Estilhaçar (Maior, quebra à escolha); a primeira Magia |
| A Lâmina | Golpe Esculpido*, Estilhaços Cravados, Chuva de Estilhaços, Pedaços que Voltam |
| O Escudo | Guarda Atenta*, Escudo de Longe*, Couraça Moldada, Escudo que Corta |
| A Prisão | Moldura, Chão Esculpido, Obra Fechada, Natureza-Morta |
| O Gesto | Moldagem Rápida*, Esboço Prévio*, Ateliê Amplo*, Duas Mãos |
| Gerais | Retrato Falado, Obra Útil, Ateliê de Campo, Olho de Pintor |
| Caminhos (NP 3) | Arma (Peso da Obra, Mil Lâminas), Criatura (Instinto de Caça, Fera Colossal), Paisagem (Paisagem Inspiradora, Grande Mural) |
| Ápice (NP 10) | Obra-Prima |
| Dedicação (NP 5) | Dedicação: Pictomante, que dá os Moldes Menores, a Pincelada e o Escudo Esculpido (sem Magias) |

\* talentos [Dedicação].

Os Caminhos são os três jeitos de moldar: a Arma reescreve como os Moldes viram dano (qualquer Feitiço de dano quebra
Moldes junto, +2d6 + NP cada, e então não ergue nenhum), a Criatura reescreve o que eles fazem em pé (no Encerramento,
as feras atacam o inimigo mais perto, a até 3 Qd: [Moldes × (NP÷4 + 1)] de dano direto) e a Paisagem reescreve como
viram defesa (o Escudo Esculpido vira muralha: todos os aliados escolhidos num quadrado, até o fim da rodada, com
metade da Anulação). O Ápice, a Obra-Prima, refaz na Manutenção metade dos Moldes quebrados na rodada anterior.

Estado em `flags.eternia.motor.pictomante`: `state` (`erguido`, um só), `value` (Moldes), `broken` (`{ round, n }`: os
quebrados na rodada, para o Ápice), `wall` (a muralha que devolveu um Molde na rodada, no Ápice da Paisagem), `guard`
(Guarda Atenta), `hands` (Duas Mãos), `memory` (Olho de Pintor) e `ember` (Ateliê de Campo). A muralha da Paisagem é um
segundo efeito do Escudo Esculpido com a condição `hasSkill` do Caminho; o efeito comum leva `notSkill` (a condição que
vale para quem não tem a habilidade) e fica de fora. Paisagem Inspiradora e Escudo que Corta são efeitos do Escudo do
mesmo jeito.

Automação: os ganhos (os Feitiços pelo `motor.gain`, Guarda Atenta no `onDamaged`, Olho de Pintor no `onAttacked`,
Pedaços que Voltam no `onKill`, Instinto de Caça na Manutenção), a escolha de quantos Moldes um Feitiço quebra no
Caminho da Arma (o `plan` pergunta; o dano soma pelo `rollBonuses`), os estados no acerto (Estilhaços Cravados, Peso da
Obra: `onHit`), Obra Fechada (acerto automático com todos os alvos presos), Natureza-Morta (o aviso sem alvo
[Enraizado]), Couraça Moldada (estado passivo), Duas Mãos, o ataque das feras no Encerramento e o Ápice. Ficam no texto:
o alvo do Escudo Esculpido (você ou o aliado que você marcar), os alvos da muralha e de Mil Lâminas e os talentos Gerais
fora de combate.

### Ressonante

**Classe antiga.** Desde a 0.11 o Ressonante está fora da lista de classes e das Dedicações: o Mago Vermelho tomou o
lugar dele. As fichas que já o usam continuam funcionando com as regras abaixo.

O Motor **Centelha** mexe nos itens: a Centelha vive na Arma, na Armadura ou na Joia (um acessório) e junta Brilho (+1
na Manutenção, +1 no Golpe Ressonante com ela na Arma). Onde está, dá o poder da peça: Arma +[Brilho × 2] no dano dos
Ataques com Arma, Armadura [Anulação: Brilho × 2], Joia +[Brilho × 2] em ataques mágicos e curas. Saltar a Centelha
leva a Centelha para outra peça: a antiga solta o Despertar (Arma: +[Brilho × NP] no próximo Ataque com Arma;
Armadura: [Barreira: Brilho × (NP+5)]; Joia: +[Brilho × NP] no próximo ataque mágico ou cura) e a nova começa com
metade do Brilho. Teto: 3 + ⌊NP/5⌋.

| Parte | O que tem |
|---|---|
| Base | FOR 3, DES 2, POD 3, INT 2; faixa Firme (40, +6/NP); papéis Damage e Defense |
| Kit | Centelha (Motor), Saltar a Centelha (Menor), Golpe Ressonante (Maior, +1 na Arma), Pulso da Centelha (Menor, +1) |
| A Lâmina Viva | Gume Desperto, Lâmina que Canta*, Corte Ressoante, Arma Viva |
| A Égide | Couraça Viva*, Revide da Égide, Escudo de Luz*, Fortaleza de Aço |
| A Joia | Joia Cantante, Gema da Vida, Facetas, Brilho Partilhado |
| O Eco | Salto Leve*, Eco Duradouro*, Ressonância Crescente*, Faísca Residual |
| Gerais | Avaliar Relíquia, Sintonia, Luz da Centelha, Eco das Coisas |
| Caminhos (NP 3) | Ícone Único (Relíquia, Avatar da Peça), Tríade (Harmonia, Acorde Final), Supernova (Estilhaço de Luz, Colapso Estelar) |
| Ápice (NP 10) | Ressonância Total |
| Dedicação (NP 5) | Dedicação: Ressonante, que dá a Centelha Menor (só Arma e Armadura), Saltar a Centelha e o Golpe Ressonante |

\* talentos [Dedicação].

O Despertar da Arma e o da Joia ficam esperando no Motor (`release`) e são tomados pelo próximo uso que serve (um
Ataque com Arma; um ataque mágico ou cura), que guarda o valor (`bound`) para a rolagem de dano dele; o da Armadura é
uma [Barreira] na hora. A Anulação da Armadura é um estado passivo do Motor (`statuses` em
`module/classes/ressonante.mjs`); Arma Viva, Facetas e Fortaleza de Aço são efeitos com a condição `motorState`.

### Sacerdote

**Classe antiga.** Desde a 0.22 o Sacerdote está fora da lista de classes e das Dedicações: a Eternia passou a ter 14
classes, 7 físicas e 7 mágicas. As fichas que já o usam continuam funcionando com as regras abaixo.

O Motor **Graça** mexe nos PV dos aliados: cada ataque de um inimigo que tira PV de um aliado dá +1 Graça (+1 se ele
ficar com metade dos PV ou menos). A Oração de Cura ([(2+Graça)d6 + Recuperação + (Graça×NP)÷2]) e o Escudo de Fé
([Barreira: Graça × (NP+5)]) gastam quanta Graça o Sacerdote quiser: curar depois, ou proteger antes. Teto 3 + ⌊NP/5⌋;
zera no fim do combate.

| Parte | O que tem |
|---|---|
| Base | FOR 2, DES 1, POD 4, INT 3; faixa Firme (40, +6/NP); papéis Healing e Defense |
| Kit | Graça (Motor), Oração de Cura (Maior, gasta à escolha, de 0 a toda), Escudo de Fé (Antes do Dano, gasta à escolha), Bênção (Menor, [Concentrado], +1) |
| A Prece | Cura Reativa\*, Prece Contínua, Prece Coletiva, Toque Restaurador\* |
| O Escudo | Égide Duradoura\*, Escudo Partilhado, Muralha de Luz, Bênção Protetora |
| A Vigília | Olhar do Pastor\*, Vigília Constante, Coração Aberto\*, Prece Profunda |
| A Luz | Raio Sagrado, Luz que Cega\*, Julgamento da Luz, Fé Ardente |
| Gerais | Primeira Prece, Consolar, Ritos do Descanso, Água Benta |
| Caminhos (NP 3) | Misericórdia (Mãos Generosas, Graça Transbordante), Mártir (Corpo-Escudo, Sangue Sagrado), Aurora (Luz da Aurora, Sol a Pino) |
| Ápice (NP 10) | Santidade |
| Dedicação (NP 5) | Dedicação: Sacerdote, que dá a Graça Menor, a Oração de Cura e o Escudo de Fé |

\* talentos [Dedicação].

Automático (`module/classes/sacerdote.mjs`): os ganhos (`onAnyDamaged`, `onAnyHealed`, `onSetup`, `onUse`), a
escolha de quanta Graça gastar na Oração e no Raio Sagrado (de 0 até o limite; flag `motor.pick`, com `motor.max`), a
Oração em área sem a parte do NP no Caminho da Aurora (`@use.area`), a Fé Ardente (bônus de dano), o Sangue Sagrado
([Regeneração] em você) e a Santidade (o aliado que cairia fica com os PV, 1 ou 2 vezes por cena). Ficam no texto:
quantos alvos a Oração e o Escudo podem ter (Escudo Partilhado, Mãos Generosas, Aurora: marque os alvos), o
Corpo-Escudo (o dano vai para você pelo cartão) e os talentos Gerais.

### Samurai

O Motor **Bainha** mexe no tempo: a lâmina Embainhada junta Cortes na Manutenção, e o Iai, no Processo de
Iniciativa de qualquer personagem, saca gastando todos (cada um soma 1d6 + NP÷2; com a Bainha cheia, Corte Perfeito:
acerto sem Esquiva, e o primeiro da cena soma +[NP×2+10]).

| Parte | O que tem |
|---|---|
| Base | FOR 4, DES 2, POD 2, INT 2; faixa Robusta (50, +8/NP); papéis Damage e Defense |
| Magias | uma no NP 1 e outra no NP 10; os feitiços juntam Cortes só com a lâmina embainhada (o `plan` da classe) |
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

### Tecelão

**Classe antiga.** Desde a 0.14 o Tecelão está fora da lista de classes e das Dedicações: o Mago Branco tomou o lugar
dele. As fichas que já o usam continuam funcionando com as regras abaixo.

O Motor **Padrão** mexe nos dados dos outros: o Tecelão guarda um número de 2 a 12, e cada teste de qualquer
personagem no combate (Esquivas incluídas) com dois dados que somam esse número dá Fios (1 para 6 a 8, 2 para 4, 5, 9 e
10, 3 para 2, 3, 11 e 12). Nos cartões de ataque, cada Fio puxa um dado de um teste já rolado: o menor sobe 1 ou o
maior desce 1 (2 Fios quando isso cria ou desfaz um Crítico ou uma Falha Crítica). Teto 3 + ⌊NP/5⌋; zera no fim do
combate, e trocar de Padrão no meio do combate perde os Fios.

| Parte | O que tem |
|---|---|
| Base | FOR 1, DES 2, POD 3, INT 4; faixa Leve (40, +5/NP); papéis Control e Support |
| Kit | Padrão (Motor), Escolher o Padrão (Manutenção), Puxar o Fio (os botões do cartão), Laço (Maior, Feitiço, [Lento]; +1 Fio quando o teste mostra o Padrão) |
| O Tear | Fiar\*, Fio Solto, Fuso Largo\*, Segundo Fio |
| O Nó | Nó Cego\*, Laço Apertado, Nó de Marca, Grande Emaranhado |
| A Trama | Fio da Sorte\*, Fio de Proteção\*, Costurar a Ferida, Fio Guia |
| A Tesoura | Corte da Tesoura\*, Fio Rompido, Tesoura Dupla, Desenlace |
| Gerais | Linha da Sorte, Ler a Sorte, Fio de Retorno, Costurar Mentiras |
| Caminhos (NP 3) | Acaso (Sorte Grande, Roda da Fortuna), Destino (Fio Dourado, Sina), Bordado (Ponto Cruz, Tapeçaria) |
| Ápice (NP 10) | Mãos do Tear |
| Dedicação (NP 5) | Dedicação: Tecelão, que dá o Padrão Menor e Escolher o Padrão |

\* talentos [Dedicação].

Automático (`module/classes/tecelao.mjs`): o ganho em qualquer teste do combate (`onAnyCheck`, com o Fio Solto e o
Fio a mais do Laço), os botões do cartão de ataque (`cardActions`: +1/−1, → 6/→ 1 no Destino, Sina) que mudam os dados
por `adjustCardRoll` e cobram os Fios (2 quando muda Crítico ou Falha Crítica; Fio Guia e o puxão grátis do Ápice), o
que o puxão causa ([Marcado] do Nó de Marca, [Lento]/[Enraizado] do Bordado, o dano do Fio Rompido, o [Fortalecido] do
Fio Dourado), o Padrão rolado do Acaso (`onSetup`) e a Roda da Fortuna, o Laço Apertado (Fios gastos à escolha) e os
estados no alvo atingido (`onHit`), o acerto automático do Desenlace e o Ponto Cruz. Ficam no texto os talentos Gerais
(presságios, caminho de volta, mentiras).

## As Magias

A classe diz **como** se luta ou se conjura; a Magia diz **que magia** se usa. Toda classe tem Magias: as mágicas (o
Invocador, o Mago Azul, o Mago Branco, o Mago Negro, o Mago Vermelho e o Pictomante) escolhem uma no NP 1, outra no NP 5
e a terceira no NP 10; o Matador de Dragões, uma no NP 5 e outra no NP 10 (o elemento é a magia do NP 1); as físicas (o
Assassino, o Berserker, o Caçador, o Centurião, o Hierofante, o Lutador e o Samurai), uma no NP 1 e outra no NP 10. Os
feitiços entram nas escolhas de Combate e Geral, cada um com o seu NP mínimo. Os feitiços alimentam e gastam o Motor da classe de quem conjura: cada um +1 (os grandes, +2), e
os supremos (NP 7; NP 10 nas Ancestrais) pedem o Motor no Teto e gastam tudo. Nas físicas, três Motores leem o
feitiço do seu jeito (o `plan` da classe): o Samurai só junta Cortes com a lâmina embainhada, o Assassino abre Brechas
só pelos acertos no Alvo e o Lutador conta o feitiço como golpe da Corrente. As regras como o jogador lê estão em **XII. MAGIAS** no diário AS
REGRAS (a geral e uma página por Magia).

Desde a 0.51, quase toda Magia que não é Conjuração tem um **limite de portadores** no mundo
(`flags.eternia.magic.holders`: 1, 2 ou 3; sem a flag, sem limite), contado por `module/apps/magic-holders.mjs` (as fichas
do mundo, os tokens soltos das cenas e o Despertar ainda aberto que a sorteou): esgotada, ela não sai no sorteio e a
janela não a deixa escolher (o Mestre escolhe livre). A categoria **Absoluta** (`absolute`, com
`flags.eternia.magic.exclusive`) ocupa todas as vagas de Magia: as do NP 5 e 10 fecham (`exclusiveMagia`, lida pela aba
Magias, pela subida de NP e pela janela) e ela só entra numa ficha sem outra Magia. Os feitiços dela não levam as tags
Feitiço nem Ataque Mágico: o [Silenciado] não os impede, o [Apagado] impede (pela flag `magicSpell`). A régua das
categorias e da "apelação" está na seção 5 de `docs/matematica.md`.

| Magia | Categoria | Traço | Feitiços |
|---|---|---|---|
| Absorção | Maldição (Tabu: em combate, a Defesa Mágica cai [NP÷2] e −1d6 nas Resistências) | Fome de Almas | Conexão ([Enfraquecido]; [Fortalecido] em você), Absorver o Ataque, Revolução ([Despertado]), Roubar a Alma ([Selado], rouba os bônus), Ejeção, Festim de Almas (supremo, num alvo só) |
| Água | Conjuração | Alma de Água | Lâmina de Água, Prisão de Água, Corpo de Água, Nebulosa de Água, Sierra, Maremoto (supremo) |
| Alma Animal | Conjuração | Instinto | Alma Animal: Gato, Alma Animal: Pássaro, Alma Animal: Coelho, Alma Animal: Peixe, Alma Animal: Urso, Alma Animal: Estouro da Manada (supremo) |
| Alma de Fera | Conjuração | Couro de Fera | Braço de Fera: Pedra, Braço de Fera: Touro de Ferro, Braço de Fera: Touro Negro, Alma de Fera: Homem-Lagarto, Alma de Fera: Homem-Tigre, Alma de Fera: Corpo Inteiro (supremo) |
| Alma de Máquina | Conjuração (Take Over) | Metal | Alma de Máquina: Canhão, Alma de Máquina: Blindagem, Alma de Máquina: Propulsores, Alma de Máquina: Rajada, Alma de Máquina: Bombardeio, Alma de Máquina: Traje de Batalha (supremo) |
| Alma de Satã | Conjuração | Alma Demoníaca | Faísca Maligna, Fluxo das Trevas, Explosão Maligna, Alma de Satã: Halphas, Alma de Satã: Sitri, Extinção da Alma (supremo) |
| Alta Velocidade | Conjuração | Mais Rápido que o Olho | Golpe Veloz, Rajada de Golpes, Velocidade Máxima, Chute Supersônico, Cem Golpes, Tempestade de Golpes (supremo) |
| Amarras | Conjuração | Ninguém Foge | Chicote de Tubo, Tubo de Amarra, Arranhão Secreto, Rede de Tubos, Explosão Felina, Prisão de Mil Tubos (supremo) |
| Aposta Mortal | Maldição, 1 portador (os carretéis: cada feitiço gira três, e três iguais ou a [Sorte] no 3 é o [Jackpot]; Tabu: em combate, a Defesa Física cai [NP]) | Febre do Jogo | Golpe da Aposta, Portas do Jogo, Girar os Carretéis ([Sorte]), Pagar para Ver, Domínio da Aposta (gira em cada Manutenção e dobra os pares), Prêmio Máximo (supremo, + Jackpot × NP) |
| Aprimoramento | Maldição (Tabu: na primeira rodada do combate, as Defesas Física e Mágica caem [NP]) | Dor Amplificada | Garras-Chicote, Aprimorar o Corpo, Amplificação da Dor ([Fraqueza: NP]), Aprimoramento por Segundo ([Despertado]), Amplificação da Dor em Massa, Privação dos Sentidos (supremo, num alvo só) |
| Arca | Ancestral (o supremo no NP 10; a Execução) | Luz Sagrada | Faça-se a Luz ([Cego] em demônios e em quem usa Maldição), Revigorar (cura e tira um Estado Negativo), Manto Sagrado (imunes a [Maldito] e [Chama Negra], [Anulação (Corrupção)]), Purgar (Execução), Flecha da Salvação, Arca Ômega (supremo, NP 10; apaga [Chama Negra] e [Maldito] dos aliados) |
| Arco da Grande Árvore | Perdida (Tabu: em combate, −2 nas Esquivas) | Força da Terra | Explosões em Linha, Fusão com a Árvore ([Oculto], [Regeneração]), Lâminas de Folha, Bomba-Relógio de Raízes ([Pavio]), Estouro da Torre, Terra Clamare (supremo, num alvo só) |
| Arco da Materialização | Perdida (Tabu: em combate, a Iniciativa cai [NP] e a Defesa Física cai [NP÷2]) | Mundo Imaginado | Espada Negra, Escudo Dourado, Asas de Pégaso, Fantasmas de Brittia, Fera Sagrada: Belcusas do Trovão ([Servo]), Torre de Dingir (supremo) |
| Arco do Tempo | Perdida (Tabu: em combate, as Defesas Física e Mágica caem [NP÷2]) | Tempo Emprestado | Avanço Rápido, Tempo Lento, Restaurar, Acelerar, Arco do Tempo: Envelhecer, Última Era (supremo, cura os aliados e deixa [Fadiga] em quem conjura) |
| Areia | Conjuração | Deserto | Rebelião da Areia, Lufada de Areia, Corpo de Areia, Cova da Formiga-Leão, Areias da Morte, Mundo de Areia (supremo) |
| Armas Mágicas | Portadora (as armas) | Bala Certa | Tiro Mágico, Bala de Bolha, Bala Teleguiada (sem Teste de Precisão), Mira Travada, Bala Explosiva, Chuva de Balas (supremo) |
| Artes Brancas | Proibida (Tabu: em combate, a Recuperação cai [NP] e a Defesa Mágica cai [NP÷2], e o Prazer pega aliados na área) | Corpo sem Vontade | Lâminas de Luz, Alma Faminta, Descanse em Paz ([Adormecido]), Dois Dedos, Prazer, Êxtase (supremo) |
| Artes Negras | Proibida, 1 portador (a morte não leva quem a usa: uma vez por cena fica com 1 PV; Tabu: [Maldito] em combate; a Predação da Morte pega aliados, e a Contradição fere os aliados a até 2 Qd em cada Manutenção) | Morte em Volta | Toque da Morte, Esfera da Morte, Aura da Morte ([Maldito] nos engajados), Predação da Morte, Sentença Negra (supremo, [Sentença: 2]) |
| Bomba | Maldição (Tabu: em combate, a Defesa Física cai [NP]) | Tudo Explode | Explosão (detona o [Pavio]), Conversão em Bomba (Após o Dano), Mina Terrestre, Bomba de Captura, Espiral Explosiva, Detonação (supremo, a até 2 Qd de você; detona os [Pavio]) |
| Cabelo Carmesim | Conjuração | Cabelo Vivo | Cabelo que Prende, Cabelo Esponja (contra [Água]), Chuva de Cabelo: Mil Pássaros, Marca em Brasa, Chuva de Cabelo: Vaga-lumes, Chuva de Cabelo: Presa de Lobo (supremo, num alvo só) |
| Cajados Mágicos | Portadora | Sono Pesado | Raio do Cajado, Muro de Névoa, Sono, Arranha-Céu, Dança dos Cinco Cajados, Círculo de Cinco Camadas: Canto Sagrado (supremo) |
| Calamidade | Maldição (Tabu: em combate, a Defesa Física cai [NP÷2], e as Partículas Antimagia pegam aliados) | Olho da Tempestade | Tornado, Aguaceiro ([Encharcado] numa área), Impacto, Esfera do Trovão, Inferno, Partículas Antimagia (supremo) |
| Caos | Ancestral (o supremo no NP 10; escolher na hora) | Rei do Caos | Forma do Caos (lança, correntes ou muralha), Gato do Caos ([Servo] de três formas), Boca do Caos (Engolir ou Cuspir), Reino do Caos (uma área com a regra escolhida), Realidade Reescrita (estado sorteado), O Mundo Recriado (supremo, NP 10) |
| Cartas | Portadora | Baralho Marcado | Cartas Lançadas (estado ao acaso), Carta do Trovão, Leitura da Sorte (bônus ao acaso), Prisão de Cartas, Tempestade de Cartas (estado ao acaso), Os Vinte e Dois Arcanos (supremo) |
| Cataclismo | Absoluta, 1 portador (id `fruta-do-tremor`, o nome até a 0.51.0; o supremo no NP 10; o [Abalo] cresce a cada tremor e soma no dano; os tremores acham os alvos sozinhos e ignoram a Defesa; Tabu, Água que Cala: [Encharcado] ou [Nadando], sem feitiços, e o dano de [Água] em dobro) | Vibração | Soco do Tremor, Racha no Ar ([Cambaleante]), Chão que Treme ([Derrubado]), Bolha de Tremor ([Atordoado]), Mar que Sobe ([Derrubado], [Encharcado]), O Mundo Racha (supremo, NP 10; + Abalo × NP) |
| Chamas do Purgatório | Maldição (Tabu: em combate, [Fraqueza (Radiância): NP]) | Fogo que Não Apaga | Encantamento: Chama Infernal (a arma dá [Chama Negra: 2]), Pássaro Infernal, Onda Infernal, Cão Infernal ([Servo]), Dragão das Cinzas, Mil Cortes Divinos (supremo, num alvo só) |
| Cobiça | Maldição, 1 portador (a Fortuna: 1 por 5 comuns do NP na bolsa, até o NP, soma dados no dano; cada feitiço come Yuld; Tabu: quem cai perde metade da bolsa, e a Defesa Física cai [NP÷2]) | Mão que Atrai Ouro (+50% do Yuld deixado) | Moeda Pesada, Comprar a Guarda ([Anulação]), Suborno ([Encantado]), Cofre de Ouro ([Barreira]), Chuva de Ouro, Toda a Fortuna (supremo, gasta a bolsa inteira e bate pelo Yuld gasto) |
| Comando M | Conjuração | Escala Errada | Comando: Redução, Comando: Expansão, Comando: Encolher a Magia (em você ou num aliado), Qualidade do Poder Mágico, Comando: Terreno, Demolidora de Países (supremo) |
| Combo Estelar | Maldição (Tabu: em combate, a Defesa Física cai [NP]) | Sequência | Golpe Estelar (Combo +2), Passo Estelar ([Concentrado]), Guarda da Sequência (o dano não zera o Combo), Golpe em Dobro (Combo +3), Chuva Estelar (+1 por alvo), Estrela Final (supremo, o Combo dobrado) |
| Contra-ataque | Perdida, 1 portador (Tabu: em combate, −2 nas Esquivas e nas Resistências) | Mais que o Dobro (o [Contragolpe] devolve o triplo, +NP×2) | Contra-ataque Total e Contra-ataque Físico ([Contragolpe], só alvo único), Contra-ataque Evanescente ([Anulação] em você e nos aliados), Contra-ataque Vingativo ([Rancor]), Golpe do Rancor (gasta o Rancor), Contra-ataque Absoluto (supremo, Antes do Dano, devolve até área) |
| Cópia | Conjuração (o Copiar decora um feitiço; a Imitação repete a tag e o estado dele) | Memória Perfeita | Copiar, Ouvir a Alma (+1d6 nas Esquivas na cena), Imitação, Copiar e Anular, Derreter, Ars Magia (supremo) |
| Corpos Celestes | Conjuração | Rastro de Luz | Estrela Cadente, Meteoro, Velocidade da Luz, Altairis, Sete Estrelas do Julgamento: Grand Chariot, Sema (supremo) |
| Correntes | Proibida (Tabu: em combate, −1d6 nas Resistências) | Selos de Amaterasu | Corrente do Grimório, Balas Mágicas, Raio do Grimório, Amaterasu: Fórmula 28, Amaterasu: Fórmula 100, Lei do Grimório (supremo) |
| Criação | Ancestral (o supremo no NP 10; o [Ritmo]) | Areia Movediça | Dança do Rei Gigante (+1 [Ritmo], useAction `raise`), Martelo Duplo ([Agarrado]), Metal Pesado ([Anulação (Física)] e [Enraizado]), Abraço da Rainha, Gládio da Grande Terra, Criação da Grande Terra (supremo, NP 10; o Ritmo conta dobrado: `@status.rhythm` na fórmula) |
| Desastre | Ancestral (o supremo no NP 10; promover e rebaixar) | Autoridade sobre a Vida | Promoção de Estado (useAction `promote`), Gota Condensada, Boneca de Flores ([Servo], [Regeneração]), Murchar (useAction `demote`), Vinha Amaldiçoada ([Agarrado]), Floresta Desperta (supremo, NP 10; useAction `doubleStatuses`) |
| Elo dos Sentidos | Perdida (Tabu: em combate, a Defesa Física cai [NP]) | Sentidos Embaralhados | Lâminas Sensoriais, Elo Sensorial ([Vínculo] num aliado), Lâmina de Sodoma, Sentidos Trocados, Tempestade de Lâminas, Elo Final (supremo) |
| Encantamento | Conjuração | Desencantador | Encantamento: Força, Encantamento: Guarda, Encantamento: Pressa, Desencanto (dano por encanto; arranca os encantos), Grande Encantamento, Universo Um (supremo) |
| Escrita Rúnica | Conjuração | Regra Escrita | Runa da Prisão, Escrita Negra: Dor, Runa do Revide, Escrita Negra: Asas, Escrita Negra: Escuridão, Escrita Rúnica: Regra Absoluta (supremo) |
| Escrita Sólida | Conjuração | Palavra Pesada | Escrita Sólida: Fogo, Escrita Sólida: Guarda, Escrita Sólida: Silêncio, Escrita Sólida: Ferro, Escrita Sólida: Trovão, A Palavra Final (supremo) |
| Esmagamento | Conjuração | Desmonte | Toque Esmagador, Onda de Esmagamento, Desmontagem, Quebrar a Guarda, Ruptura, Esmagamento Absoluto (supremo) |
| Espadas Mágicas | Portadora (a espada) | Lâmina na Bainha | Kata do Corte, Kata Rasteira, Lampejo Vazio de Yasha, Kata do Voo, Chama de Garuda, Lâmina Desembainhada (supremo, num alvo só) |
| Espinhos | Maldição (Tabu: em combate, a Recuperação cai [NP] e −2 nas Esquivas) | Espinhos que Entram | Vinhas de Espinhos, Manto de Espinhos ([Espelho]), Jardim de Espinhos, Rosa Explosiva, Dea Yggdrasil, Memento Mori (supremo, [Sentença: 3]) |
| Espíritos Celestiais | Portadora (as chaves) | Chaves do Zodíaco | Portão do Touro ([Servo]), Portão do Carneiro, Portão do Sagitário, Portão do Aguadeiro (pega aliados também), Portão do Leão: Impacto de Régulo, Vestido Estelar, Urano Metria (supremo) |
| Fogo | Conjuração | Brasa Viva | Chama Laranja, Chama Roxa (dobra o [Queimando]), Chama Azul, Chama Amarela, Coluna de Fogo (consome o [Queimando]), Chama Arco-Íris (supremo) |
| Fonte da Juventude | Proibida (Tabu: em combate, a cura de feitiços e itens cura metade) | Imortal | Corpo Imortal (a Regeneração agora), Golpe sem Medo (custa PV), Dádiva (PV para um aliado), Escudo de Carne (o golpe do aliado em você), Vida sem Fim ([Exposto]), Gota da Fonte (supremo: cura e imortalidade) |
| Forma Indura | Proibida (Tabu: em combate, cada coração perdido dá +1 de [Fúria]) | Sete Corações (o Fôlego Extra, 6 por cena) | Garras da Escuridão, Asas Negras ([Voando]), Rugido Indura ([Medo]), Ressentimento ([Envenenado: NP]; +NP÷2 contra [Demônio]), Fera da Destruição, Transformação Indura (supremo: entrega os corações, [Ímpeto] e imune a controle; cai no fim da cena) |
| Fumaça | Portadora (o cachimbo) | Dentro da Névoa | Punho de Fumaça, Corda de Fumaça, Cortina de Fumaça, Nuvem Sufocante, Gigante de Fumaça, Mar de Fumaça (supremo) |
| Furtividade | Conjuração | Lâmina que Ninguém Vê | Apagar a Presença, Arma Invisível, Revelar (tira [Oculto] e [Intangível]), Tortura Invisível, Mil Lâminas Invisíveis, Assassinato Perfeito (supremo, num alvo só) |
| Gigante | Conjuração | Grande Demais | Golpe Gigante, Mão Gigante, Corpo Gigante, Pisada do Gigante, Punho do Titã, Queda do Titã (supremo) |
| Golias | Perdida, 1 portador (o limiar [Golias: n]: golpe abaixo de n não faz nada e nada move você, +NP nos ataques físicos; Tabu: com [Golias], −1d6 nas Esquivas, e [Fadiga: NP] quando acaba) | Corpo de Gigante | Despertar o Gigante ([Golias]; a couraça volta à [Barreira] em cada Manutenção), Soco de Golias, Peito de Aço (o [Golias] sobe NP), Pisão ([Derrubado]), Queda da Montanha ([Derrubado]), Punho que Racha o Céu (supremo, + Golias) |
| Gravidade | Conjuração | Peso Dobrado | Queda, Mudança de Gravidade, Campo Gravitacional, Gravidade Zero, Buraco Negro, Peso do Mundo (supremo) |
| Histórias dos Mortos | Conjuração | Passado que Assombra | Rajada de Energia, Ler o Coração, História dos Mortos, Redemoinho Cortante, Cidade dos Mortos, O Mais Forte dos Mortos (supremo, num alvo só; [Servo]) |
| Impecável | Absoluta, 1 portador (o supremo no NP 10; todo ataque de alvo único contra você erra, menos o de quem também vê o futuro; Tabu, o Voto: os seus golpes não matam, e −1d6 na Esquiva contra área) | Mira do Futuro (os feitiços acertam sem teste) | Saída do Futuro (nada de uma área chega), Tiro Previsto, Desarmar o Futuro ([Desarmado], [Fissurado: 1]), Chuva Prevista, Cinco Segundos de Vantagem (a ação a mais), O Futuro Fechado (supremo, NP 10; [Atordoado], [Medo]) |
| Infinito | Perdida (Tabu: em combate, a Defesa Física cai [NP]) | Tempo Parado (`infinite`) | Cubo Perfeito (escolha: [Barreira] ou a prisão [Enraizado] e [Silenciado]), Raio Exterminador, Cancelamento Absoluto (useAction `cancelSpells`), Amplificar Poder ([Fortalecido] nos aliados), Caixão do Tempo ([Paralisado]; `infinite: false`), Encanto: Infinito (supremo; [Deterioração] infinita) |
| Invasão | Perdida (Tabu: em combate, não mira quem está engajado e −1d6 nas Esquivas contra corpo a corpo) | Mente de Boneco | Luz Espiã ([Identificado], [Marcado]), Luz que Reescreve ([Confuso]), Contador de Pesadelos ([Pesadelo]), Amarra de Boneco ([Dominado]), Mundo Perdido ([Amnésia]), Apagão (supremo; [Adormecido] só em quem tem NP menor: `rankBelow`) |
| Lâmina Divisora | Portadora (a espada; os [Clones]) | Cópias Reais (uma reação por rodada é da cópia: não conta no limite) | Cópia Real (+1 [Clones]), Golpe das Cópias (+Clones×2), Troca com a Cópia (gasta 1 Clone: o golpe acerta a cópia), Cópias em Volta ([Cambaleante]), Seis Cópias ([Clones: 6]), Sete Golpes (supremo, num alvo só; os Clones viram dano) |
| Lampejo | Ancestral (o supremo no NP 10; agir fora do turno) | Rápido Demais | Lampejo Divino (Movimento e Menor fora do turno), Brilho Rubi ([Cego], Menor), Sopro da Bênção, Impulso Faiscante, Rajada de Luz, Brilho Dourado (supremo, NP 10; mais Movimento e Menor) |
| Lança Espiritual | Portadora (a lança; as Formas) | Árvore Sagrada (imune a [Desarmado]) | Forma Um: Lança, Forma Dois: Guardião ([Barreira]; provoca), Forma Três: Fossilização ([Petrificado]), Forma Cinco: Multiplicar, Forma Oito: Jardim de Pólen ([Barreira] nos aliados), Forma Quatro: Girassol (supremo; [Servo]); Mudança de Forma (vem com a Magia) |
| Macro | Maldição (Tabu: em combate, a Iniciativa cai [NP] e −1d6 nas Resistências, menos enquanto [Despertado]) | Ordens | Arremesso de Livros, Ordem ao Corpo ([Dominado]), Macro em Si Mesmo ([Despertado], tira o Tabu), Olhos Demoníacos, Avalanche da Biblioteca, Olho Demoníaco Liberto (supremo) |
| Magia das Fadas | Ancestral, 1 portador (o supremo no NP 10) | Luz que Protege | Luz das Fadas, Ilusão das Fadas, Bênção das Fadas, Esfera das Fadas ([Barreira], [Intocável]), Brilho das Fadas, Lei das Fadas (supremo, NP 10; acha os inimigos a até 8 Qd, acerta sem teste e derruba quem fica com pouca vida; metade do PV máximo, [Fadiga: NP×2], uma vez por cenário) |
| Magia dos Anjos | Conjuração (os anjos acertam sem teste e deixam [Fadiga] em quem conjura) | Preço Pago | Penas Angelicais, Mensageiros Angelicais, Anjo do Martelo, Shamsiel, Barakiel, Raguel (supremo) |
| Magia Seith | Conjuração | Almas Presas | Bonecos: Formação Linha, Possessão ([Dominado]), Bonecos de Almas ([Servo]), Olhos de Boneco, Bonecos: Formação Bárion, Ritual das Almas (supremo) |
| Magia Viva | Perdida (Tabu: em combate, a Recuperação e a Defesa Mágica caem [NP]) | Fonte de Vida | Centelha da Vida, Cria de Barro, Sangue Vivo, Corpo Refeito, Fera Criada ([Servo]), Gênese (supremo) |
| Maldição do Boneco | Perdida, no boneco (Tabu: em combate, a Recuperação cai [NP] e a Defesa Mágica cai [NP÷2]) | Corpo no Boneco | Fio no Boneco, Dodoskoi, Boneco de Ferro, Boneco de Névoa, Foguete Metálico, Dodoskoi Brilhante (supremo) |
| Mandamentos | Maldição (Tabu: o Decreto pega você e os aliados, em combate) | Marca do Rei Demônio | Revelar o Mandamento (alcance 6 Qd e dano em quem quebra), Espadas da Rebelião, Mandamento Materializado (a maldição no golpe), Forma de Assalto ([Despertado], alcance ×2), Absorver Mandamento (passivo, um segundo Decreto), Os Dez Mandamentos (supremo, os dez por uma rodada); e os 10 Decretos, só por escolha |
| Manto Devorador | Maldição, 1 portador (a fera do casaco morde sozinha quem ataca você a até 1 Qd; Tabu: a tosse, 1 em 1d6 a cada turno, tira a Ação Maior e fere, e a Defesa Física cai [NP÷2]) | Fome Negra | Corte do Espaço (os golpes de longe não chegam; [Enraizado]), Presa Negra (come [Barreira], [Anulação] e [Espelho]), Espinhos do Manto ([Espelho]; a mordida chega a 2 Qd), Mil Presas ([Agarrado]), Dragão Negro ([Derrubado]), Boca do Abismo (supremo, [Agarrado]) |
| Matador de Demônios | Perdida (Tabu: em combate, as Defesas Física e Mágica caem [NP÷2]) | Caça-Demônios | Fúria do Demônio de Gelo, Garra do Demônio de Gelo, Gelo do Demônio, Gelo que Cala, Arco da Destruição do Demônio de Gelo, Lâmina da Destruição do Demônio de Gelo (supremo) |
| Matador de Deuses do Céu | Perdida (Tabu: em combate, a Iniciativa cai [NP], a Velocidade cai 1 e a Defesa Física cai [NP÷2]) | Ar dos Deuses | Rugido do Deus do Céu, Sopro Curativo, Dança do Deus do Céu, Bênção do Deus do Céu, Bóreas do Deus do Céu, Arte Secreta: Lança Celestial (supremo) |
| Matador de Deuses do Fogo | Perdida (Tabu: em combate, a Recuperação cai [NP] e a Defesa Física cai [NP÷2]) | Chama que Devora | Rugido do Deus do Fogo, Devorar as Chamas (contra um ataque de [Chama]), Foice do Deus do Fogo, Chama Explosiva do Deus do Fogo, Kagutsuchi do Deus do Fogo, Ceia do Deus do Fogo (supremo, num alvo só) |
| Matador de Deuses do Raio | Perdida (Tabu: em combate, a Defesa Mágica cai [NP] e a Defesa Física cai [NP÷2]) | Raio que Apaga | Rugido do Deus do Raio, Devorar o Raio, Canhão de Raio Negro de 120 mm, Couraça de Raio Negro, Trovão Negro do Deus do Raio, Canhão de Partículas do Deus do Raio (supremo, em linha) |
| Moldagem de Gelo | Conjuração | Gelo que Não Derrete | Moldagem de Gelo: Lança, Moldagem de Gelo: Escudo, Moldagem de Gelo: Martelo, Moldagem de Gelo: Chão, Moldagem de Gelo: Águias, Lâmina de Gelo: Dança dos Sete Cortes, Impacto de Gelo (supremo) |
| Moldagem de Madeira | Conjuração | Tábuas e Pregos | Moldagem de Madeira: Aproximação Violenta, Moldagem de Madeira: Senso de Distância do Coração, Fusão com a Madeira, Moldagem de Madeira: Represa do Amor Tímido, Moldagem de Madeira: A Distância Entre Nós Dois É Eterna, Moldagem de Madeira: Soco Divino (supremo, num alvo só) |
| Moldagem de Memória | Conjuração | Lembrança Apagada | Memorizar, Moldagem de Memória: Feitiço Lembrado, Moldagem de Memória: Esquecimento, Moldagem de Memória: Fortaleza da Terra Ardente, Moldagem de Memória: Noite das Estrelas Cadentes, Moldagem de Memória: Lembrança Absoluta (supremo) |
| Nebulosa Sinistra | Maldição (Tabu: em combate, a Defesa Física cai [NP]) | Carrasco | Vórtice Sinistro (puxa), Amarra Sinistra ([Agarrado]), Deus ([Intocável] ou [Silenciado]), Chuva Impiedosa, Relâmpago Negro, Dies Irae (supremo, num alvo só) |
| Necromancia | Maldição (Tabu: [Maldito] em combate) | Corpo Morto | Mortos de Pé ([Servo]), Corpo de Partículas ([Intangível]), Primeiro Selo ([Silenciado]), Guarda dos Mortos (em você ou num aliado), Exército de Ossos, Julgamento da Estrela Maligna (supremo) |
| Neve | Conjuração | Mundo Branco | Fúria Branca, Cópia de Neve, Nevasca Branca, Vento de Nevasca, Avalanche de Neve, Branco Total (supremo) |
| O Soberano | Maldição (Tabu: em combate, a cura de feitiço dos aliados vira dano em você) | Rei dos Demônios | Inverter ([Inversão]), Morte Zero ([Derrubado]), Espada do Portão Infernal ([Maldito]), Transferir Poder ([Despertado] num aliado), Fera das Trevas ([Servo]), Reencarnação Eterna (supremo, num alvo só; [Sentença: 3]) |
| Olhar que Apaga | Absoluta, 1 portador (o supremo no NP 10; sem a faixa, [Olhar Aberto]: todo mundo a até 4 Qd, aliados também, fica [Apagado], sem feitiços nem Maldições e com os Traços parados; Tabu: com a faixa você está [Cego]; sem ela, [Fadiga] por rodada, e os olhos fecham em 3 rodadas) | Olhos Vermelhos | Faixa de Captura ([Agarrado]), Tirar a Faixa ([Olhar Aberto]), Olhar Fixo (um alvo [Apagado] a cena toda), Faixa em Rede ([Agarrado]), Olhar em Brasa (tira os efeitos de feitiço), O Fim da Magia (supremo, NP 10; [Agarrado], [Apagado]) |
| Olhos Mágicos | Conjuração | Olhar que Petrifica | Olhar de Pedra, Olho Clínico, Olhar Hipnótico, Olho do Demônio, Mil Olhos, Olhar Petrificante (supremo) |
| Onda | Conjuração | Vibração | Disparo de Onda, Escudo de Onda (contra ataques mágicos), Impulso de Onda, Anular Magia, Explosão de Onda, Mundo Sem Magia (supremo) |
| Perfume Mágico | Portadora (os frascos) | Nariz Treinado | Perfume do Trovão, Perfume da Força, Perfume Analgésico (cura o grupo), Perfume da Dor, Perfume Venenoso, Perfume da Força: Máximo (supremo, num alvo só) |
| Permeação | Perdida, 2 portadores ([Permeando]: nenhum ataque chega e quem atravessa não ataca; cada golpe que passa vira [Antecipação]; Tabu: [Fadiga: 1] quando o [Permeando] acaba, e −2 nas Esquivas) | Ler a Luta | Atravessar ([Permeando]), Golpe Antecipado (gasta a [Antecipação]), Contragolpe Fantasma, Mergulho no Chão ([Concentrado]), Saída por Baixo ([Derrubado]), Cem Ângulos (supremo, + Antecipação × NP) |
| Pintura Mágica | Portadora (pincéis e tintas) | Grade Pintada | Fera Pintada ([Servo]), Asas Pintadas, Jaula Pintada, Armadura Pintada, Dragão Pintado, Mural Vivo (supremo) |
| Plantas | Portadora (as sementes) | Jardineiro | Chicote de Cipó, Broto da Vida, Esporos Venenosos, Muralha de Raízes, Floresta Súbita, Jardim Carnívoro (supremo) |
| Portador de Bênçãos | Absoluta, 1 portador (o supremo no NP 10; a bênção que chega: imunidade ao Estado Negativo que pegou e metade do dano do elemento que feriu, até o fim da cena; a Fênix, uma vez por cenário, volta com todo o PV; as flechas não acertam; Tabu: os feitiços dos aliados a até 3 Qd rolam 1d6 a menos, e o Ódio começa o combate em NP) | O Amado do Mundo | Bênção do Vento ([Acelerado], [Concentrado]), Golpe do Escolhido ([Anulação]), Bênção do Primeiro Encontro (Iniciativa +NP×2), Corte que Ninguém Vê, Bênção da Fênix ([Regeneração], [Último Fôlego]), Espada do Dragão (supremo, NP 10; só contra um inimigo digno) |
| Portão do Inferno | Maldição (Tabu: em combate, a Recuperação cai [NP] e a Defesa Mágica cai [NP÷2]) | Banquete de Almas | Anel de Invocação ([Servo]), Chamado das Almas ([Atordoado]; [Paralisado] com pouco PV), Atravessar o Portão ([Concentrado]), Casulo das Trevas ([Agarrado], [Pesadelo]; alimenta o Motor), Veneno Mortal, Rito do Rancor dos Mortos (supremo; quem cai vira [Servo]) |
| Praga | Maldição (Tabu: em combate, o seu dano para em 1 PV) | A Hora Chega | Correntes do Rancor ([Agarrado], [Agonia]), Cinco Perdas ([Cego], [Silenciado], [Atordoado]), Enxame Descartável ([Envenenado], [Servo]), Rosto Emprestado ([Oculto]; o golpe deixa [Confuso]), Tempo Roubado ([Sentença: 4]), Grande Praga (supremo; [Sentença: 3], [Agonia: NP]) |
| Projeção de Pensamento | Conjuração | Mente Dividida | Eco de Pensamento, Voz do Pensamento, Projeção, Muitas Projeções, Exército de Pensamento, Projeção Astral (supremo) |
| Raio | Conjuração | Para-raios | Relâmpago, Corrente Elétrica, Passo do Relâmpago, Trovão, Tempestade de Raios, Palácio do Trovão (supremo) |
| Reequipar: O Cavaleiro | Portadora (os feitiços são Ataques com Arma) | Arsenal sem Fim | Roda Celeste: Círculo de Espadas, Asa Negra: Lampejo Lunar, Armadura Adamantina, Traje do Coração Puro, Roda Celeste: Pétalas de Aço, Armadura de Nakagami: Luz Estelar (supremo) |
| Reflexão | Conjuração | Golpe Torto | Torção, Reflexo, Miragem, Corpo Torcido, Mundo Torcido, Reflexão Total (supremo) |
| Retrocesso | Proibida, 1 portador (o retrato da rodada e a [Ampulheta]; Tabu: a [Ampulheta] cheia transborda, o tempo volta para todos a até 3 Qd, inimigos também, e você dorme; as Defesas caem [NP÷2]) | Corpo que Volta | Voltar a Ferida (um aliado volta ao começo da rodada e levanta se caiu nela), Voltar a Força (tira os bônus de um inimigo), Corpo de Criança ([Lento]), Rebobinar (o seu corpo, com uma Ação Menor), Retorno em Massa (os aliados a até 3 Qd), Antes de Existir (supremo, sempre transborda) |
| Roubo | Proibida (Tabu: em combate, a Defesa Mágica cai [NP], e o Festival pega aliados) | Mão Leve | Caça Física, Caça da Raposa ([Desarmado]), Sinal Zero ([Oculto]), Caçada de Assalto, Caçada Louca (Dreno), Festival da Caça (supremo, Dreno) |
| Ruptura Crítica | Maldição (Tabu: em combate, a Iniciativa cai [NP] e a Defesa Mágica [NP÷2]) | Armadura Viva | Romper o Limite ([Ímpeto]), Corte Certeiro, Estocadas do Céu, Vendaval de Cortes, Onda do Caos (metade da Defesa), Golpe que Parte Montanhas (supremo, o Ímpeto dobrado, sem Fadiga) |
| Sangue de Ferro | Perdida, 2 portadores ([Ferro no Sangue]: cada quadrado que o alvo anda custa o Valor; no 5, o ferro sai de uma vez; Tabu: cada feitiço custa 2 PV, e a Defesa Física cai [NP÷2]) | Magnetismo (os feitiços ignoram a Defesa Física de quem tem o ferro) | Navalhas ([Ferro no Sangue: 1]), Pregos (solta o ferro todo), Magnetismo: Desarme ([Desarmado]), Manto de Limalha ([Oculto]), Tesouras no Sangue ([Ferro no Sangue: 2]), Hipóxia (supremo, [Ferro no Sangue: 5], [Atordoado], [Lento]) |
| Sangue Demoníaco | Proibida (Tabu: em combate, a Recuperação cai [NP], a Defesa Mágica cai [NP÷2] e [Fraqueza (Radiância): NP÷2]) | Demônio Cinzento (o terceiro feitiço da cena: [Despertado] e [Voando]) | Ácido ([Deterioração], [Fissurado]), Neve Negra ([Pavio] em até 3), Beco sem Saída (detona os [Pavio], sem teste), Onda do Sangue Negro ([Chama Negra]), Despertar do Demônio (transforma na hora; [Medo]), Nebulosa Negra (supremo; [Cego]) |
| Santo da Espada | Perdida, 1 portador (o Corte Absoluto: os golpes atravessam [O Único], cópias, [Contragolpe], [Intangível], [Intocável], [Permeando] e o limiar; Tabu: nenhuma [Barreira] nem [Anulação] em combate, e a Defesa Mágica cai [NP]) | Qualquer Coisa Corta (+3 por NP do alvo acima do seu) | Cortar o Feitiço (corta feitiços no ar), Corte Simples, Cortar o Espírito (corta [Servo], [Clones] e as proteções), Corte no Espaço, Mil Cortes ([Fissurado: 1]), O Corte que Não Existe (supremo, sem Defesa) |
| Selo do Ceifador | Proibida, 1 portador (o selo: o PV máximo de quem os feitiços tocam fica selado para sempre, [Vida Selada], inimigos e jogadores; volta quando quem selou morre de vez; Tabu: cada feitiço que sela cobra 1 da sua vida, e a alma de um selado que cai devolve 1) | A Mão Atrás de Você | Mão do Ceifador, Braços Selados ([Desarmado], [Silenciado]), Corte da Alma, Guarda do Ceifador (sela quem bate), Colheita do Ceifador, Selamento do Ceifador (supremo; você morre no fim da cena) |
| Selo do Tempo | Perdida (Tabu: em combate, as Defesas Física e Mágica caem [NP÷2]) | O Tempo é Seu | Raio de Âge (sem teste), Selar o Tempo, Arranhão de Âge, Passo Fora do Tempo, Transbordamento, Alma Divina: Cronos (supremo, [Paralisado]) |
| Shikigami | Conjuração | Mil Papéis | Torrente de Shikigami ([Servo]), Véu de Ilusão ([Oculto] em você ou num aliado), Prisão de Papel, Bomba Negra de Shikigami, Revoada de Shikigami, Mil Bonecos de Papel (supremo) |
| Sol | Absoluta, 1 portador (o supremo no NP 10; o Relógio do Sol sobe 2 por rodada, cada ponto vale +2 de dano, o meio-dia dura duas rodadas; Tabu: com o Sol acima de 0 você nunca se esquiva; de noite o Sol não nasce e os feitiços rolam 2d6 a menos) | Orgulho do Leão | Sol Cruel ([Espelho] igual ao dobro do Sol), Punho de Hélio, Proeminência Louca, Chama do Orgulho, Espada Divina, Proeminência Final (supremo, NP 10; estende o [O Único]) |
| Sombras | Conjuração | Frio que Drena | Soldados de Sombra, Soldado de Guarda ([Servo]), Abraço das Sombras, Pulso Sombrio, Onda da Morte, Exército de Sombras (supremo) |
| Teatro de Bonecas | Conjuração | Fios | Boneca de Pedra ([Servo]), Boneca de Madeira, Marionete ([Dominado]), Boneca de Nuvem, Boneca da Terra, Grande Teatro (supremo) |
| Telepatia | Conjuração | Rede Mental | Sobrecarga, Leitura de Mente, Proteção, Ruído Mental, Transferência de Informação, Sobrecarga Total (supremo) |
| Teleporte | Conjuração | Sempre de Passagem | Linha Direta: Investida, Linha Direta, Linha Direta: Lançamento, Memória Falsa, Ponto Cego, Transporte (supremo) |
| Terra | Conjuração | Pés no Chão | Punho de Rocha, Muralha de Rocha (cobre os aliados), Avalanche de Rocha, Pele de Pedra, Chão Partido, Fúria da Montanha (supremo) |
| Território | Conjuração | Espaço Próprio | Calor Espacial, Território: Troca, Território: Prisão, Território: Domínio, Colapso Espacial, Território Absoluto (supremo) |
| Trevas | Conjuração | Olhos no Escuro | Capricho das Trevas, Agarrar das Trevas, Gravidade Sombria, Momento Sombrio, Rondó das Trevas, Gênese Zero (supremo) |
| Vento | Conjuração | Corrente de Ar | Lâmina de Vento, Rajada, Armadura de Tempestade, Redemoinho, Furacão, Espaço Aéreo: Zero (supremo) |
| Visão | Perdida (Tabu: em combate, a Iniciativa cai [NP]; o Presságio) | Olhos do Oráculo | Ver o Golpe, Profecia (um 6), Destino Fixo ([Marcado] e um 1), Caleidoscópio (dois dados), Futuro Visto, O Fim Já Escrito (supremo, sem teste, os dados viram dano) |

As categorias são as da série: Conjuração (a magia sai do corpo), Portadora (precisa de um objeto equipado), Perdida e
Proibida (mais fortes, com um Tabu), Ancestral (sem Tabu, 1d6 a mais nos feitiços de ataque e o supremo no NP 10) e Maldição (o poder dos
demônios, que não é magia: forte como as Perdidas, com um Tabu, e o [Silenciado] não impede os feitiços). O catálogo vai
crescer em lotes, até cobrir
a magia de cada personagem (as Trevas, a Areia, o Teleporte...). Com o Fogo, o Raio, a
Terra e o Vento (0.16), mais a Água e a Moldagem de Gelo, os seis elementos clássicos estão no catálogo.

Como se monta: a Magia é uma habilidade passiva com `flags.eternia.magic = { id, category }` (só dada pela vaga de
Magia da classe; o Tabu, quando há, mora nela, num efeito passivo) e os feitiços têm `flags.eternia.magicSpell = { id }`,
na pasta `Magias/<Magia>` de `skills-class`, com identificadores `<magia>-<nome>`. A parte do Motor de um feitiço tem
`id: "@class"`: o Motor da classe de quem conjura. Os estados que um feitiço dá no acerto ficam em
`flags.eternia.hitStatuses` (`[{ statusId, value }]`, o valor uma fórmula), sem código. As Maldições
(`category: "curse"`) têm a tag `Curse` em todos os feitiços, além de `Spell` e `Magic Attack` (que os Motores das
classes leem): o [Silenciado] não as impede (`module/conditions/actions.mjs`).

O Traço (0.26): cada Magia tem um efeito passivo próprio, `flags.eternia.trait = { magia, bonusVs, onHit, escalate,
strip, pierce, keepHidden, bonus, healBonus }` (com `immune`, `changes` e `conditions` quando há), que
`module/helpers/magic-traits.mjs` lê nos cartões de dano dos feitiços daquela Magia: dano a mais contra quem tem um
estado ou uma tag (`bonusVs`, com `perValue` e `consume`), estados no acerto (`onHit`), um estado que escala
(`escalate`), estados arrancados (`strip`), a Defesa pela metade e a Anulação ou a Barreira atravessadas (`pierce`),
o [Oculto] que não sai (`keepHidden`) e o bônus fixo de dano (`bonus`) ou de cura (`healBonus`). Desde a 0.27: o
Dreno (`drain`, a fração do PV tirado que volta para quem conjura), o roubo de um bônus a cada
acerto (`steal`), o dano a mais pelo Valor de um estado próprio, gasto ou não (`selfBonus`, nos feitiços: o Golpe do
Rancor), o bônus do [Contragolpe] (`counterBonus`) e o Relógio do Sol (`sunClock`: o [Sol] sobe para quem tem a Magia,
em `conditions/turns.mjs`). Desde a 0.28: o Infinito (`infinite`: os efeitos dos feitiços daquela Magia que acabariam
no turno ou na rodada duram a cena, em `conditions/lasting.mjs`) e o bônus contra qualquer Estado Negativo com Valor
(`bonusVs` com `ratedBad`); a Execução (`execute`, no feitiço: o Purgar), a [Sentença] que cai a cada acerto
(`lower`), os bônus virados do avesso (`convert`) e comer almas (`soulEater`), em `conditions/blows.mjs` e
`conditions/souls.mjs`; os Tabus que não matam (`noKill`) e que fazem a cura dos aliados ferir (`healingHurts`); a
reação feita por uma cópia (`cloneReaction`: a primeira reação da rodada com [Clones] é de uma cópia e não conta no
limite, em `conditions/copies.mjs`) e a transformação (`transform: { at, statuses }`: o n-ésimo feitiço da Magia na
cena transforma quem conjura, em `conditions/transformations.mjs`; um feitiço com `transformNow` transforma na hora);
o Presságio (`omen`, uma fórmula: os dados rolados no começo do combate, em `conditions/omen.mjs`; `omenFocus`:
[Concentrado] quando um dado muda o resultado de um ataque), o Imortal (`immortal: { regen }`, a [Regeneração] dada
na Manutenção, em `conditions/immortal.mjs`) e a imunidade aos Decretos (`decreeImmune`, lida pelo Decreto dos
Mandamentos: a Marca do Rei Demônio e o Rei do Caos). O efeito do Traço também pode levar flags próprias
(`TRAITS[x].flags` no gerador): o Fôlego Extra (`revive`) dos Sete Corações e o do Imortal. Os feitiços usam as
mesmas flags e mais `randomHit` e `randomEffect` (veja `docs/condicoes.md`). O texto do Traço fica na descrição da
Magia (a linha "Traço, nome:", que a janela de Magias mostra numa caixa própria). A migração `kudenCleanup` 7 refaz
as Magias e os feitiços das fichas pelo compêndio, guardando o NH e o uso.

Uma Magia pode pedir uma escolha ao entrar na ficha: `flags.eternia.choiceGrants` lista os identificadores das
habilidades oferecidas (com `choiceOnly`, na pasta da própria Magia), e o jogador escolhe uma que ainda não tem; ela
fica marcada como dada pela Magia (`grantedBy`) e sai junto. Um feitiço pode ter a mesma flag (Absorver Mandamento dá
um segundo Decreto). A janela de Magias não lista as habilidades `choiceOnly` como feitiços, e a aba Classe só as
mostra para quem as tem (`module/apps/choice-grants.mjs`). Uma Magia também pode dar habilidades junto com ela, sem
escolha (`dedicationGrants`, como uma Dedicação: a Mudança de Forma da Lança Espiritual, `choiceOnly`).

## Referência técnica

### Onde fica cada coisa

| Arquivo | O que faz |
|---|---|
| `module/classes/motor.mjs` | O Motor genérico: o registro (`registerMotor`), o estado no ator, o Teto, as habilidades de Motor e de Motor Menor, os requisitos (`motorUseIssues`), a ação que a habilidade gasta (`motorActionOf`), o plano antes do cartão (`planMotorUse`, que guarda `flags.eternia.motorUse`), a mudança depois (`commitMotorUse`, que avisa todos os Motores com `onUse`) e o Desfazer, os valores das fórmulas e do custo, os bônus de rolagem, os estados que o dano dá, os estados passivos (`syncMotorStatuses`), os eventos (em fila por ator) e os ajudantes das classes (lados, combate, escolha). |
| `module/classes/<classe>.mjs` | O Motor de cada classe (`ASSASSINO`, `BERSERKER`, `CACADOR`, `COMANDANTE`, `DRUIDA`, `ESTRATEGISTA`, `FEITICEIRO`, `GUARDIAO`, `INVOCADOR`, `MAGOAZUL`, `MAGOBRANCO`, `MAGONEGRO`, `MAGOVERMELHO`, `MATADOR`, `MENESTREL`, `MONGE`, `ORACULO`, `PICTOMANTE`, `RESSONANTE`, `SACERDOTE`, `SAMURAI`, `TECELAO`): o Teto, as regras do kit e dos talentos, os Caminhos, o Ápice e as reações aos eventos. O cabeçalho de cada arquivo diz a regra e o que fica guardado no ator. |
| `module/classes/index.mjs` | Registra os Motores, embrulha `EterniaCombat#_onPhaseStart` (Manutenção e Encerramento, uma vez, na janela do Mestre que mudou a fase), segue os turnos e o movimento dos tokens, ouve os eventos dos cartões (`eternia.attack`, `eternia.attackResult`, `eternia.dodge`, `eternia.damaged`, `eternia.healed`, `eternia.check`, `eternia.defeated`; um cartão de dano aplicado, com ou sem PV tirado, também vira `onStruck`), põe os botões das classes nos cartões de ataque e tem a API `game.eternia.motor`. |
| `module/classes/progression.mjs` | O NP mudado à mão oferece o que a classe dá no NP; a Dedicação dá as habilidades dela ao ser aprendida (e uma à escolha, `dedicationChoice`) e as tira junto. |
| `module/classes/sheet.mjs`, `data.mjs` | A aba Classe (`templates/character/class.hbs`, `css/classes.css`), feita para caber sem rolar: a faixa da classe, o Motor, a trilha do NP (`trail`: o que chega em cada NP; as escolhas em aberto brilham; a marca de uma vaga de Magia abre a aba Magias) e as seções em abas (grupo `lhcl` da ficha; a seção com uma escolha em aberto abre primeiro), com a dica de cada habilidade sob o ponteiro (`activateClassTab`, que vale também para a aba Magias); os dados das vagas de Magia (com o Traço e o Tabu de cada Magia) que a aba Magias mostra; e os dados de cada classe para a aba (família e função, com a cor; faixa, ramos, Caminhos, elementos e `magic` das classes com vagas de Magia). |
| `module/classes/migration.mjs` | A limpeza do Kuden e dos arquétipos e dos ícones antigos das classes; as vagas de Magia das classes que as ganharam depois (o Invocador na 0.13, as físicas e o Matador de Dragões na 0.22, `MAGIC_CLASSES`); os nomes novos do Lutador, do Centurião e do Hierofante (0.22). |

Também tocam nas classes: `automation/use.mjs` (requisitos, ação, plano, mudança e Desfazer do Motor; o custo
"Hate 1+Cortes"), `helpers/skill-rolls.mjs` (acerto automático, bônus do Motor, `damageText`, o evento dos testes),
`chat/cards.mjs` (bônus do Motor no Dano dos cartões), `helpers/combat-cards.mjs` (os eventos dos cartões, as tags
e os estados que o Motor dá ao dano e `adjustCardRoll`, que muda um teste do cartão depois da rolagem e julga o acerto
de novo), `helpers/effect-conditions.mjs` (as condições `motorState` e `motorAtLeast`), `hud/hud.mjs` e
`sheets/actor-sheet.mjs` (o evento dos testes de atributo), `helpers/effect-formulas.mjs` (as variáveis), `apps/option-grants.mjs` e `apps/rank-up.mjs`
(o que chega pelo NP, a escolha do elemento e as vagas de Magia), `apps/magic-picker.mjs` (a janela que escolhe a
Magia de uma vaga e o navegador de Magias que o assistente de criação também usa: os cartões, os filtros, a página de
cada Magia, desenhada quando aparece), `apps/magic-catalog.mjs` (o catálogo das Magias, lido do índice dos compêndios
uma vez por sessão; as funções vêm dos dados dos feitiços, e o Traço e o Tabu, das descrições), `apps/skill-browser.mjs`
(requisitos, Caminhos, elementos, a origem Magia, Dedicação, e as escolhas da criação, `creationCandidates`),
`apps/creation-wizard.mjs` (o assistente de criação: o kit, a escolha do NP 1 e a Magia do NP 1 entram com a marca da
classe, como no fluxo das caixas; a Magia de escolha pede o Decreto ali mesmo), `templates/character/magic.hbs` (a aba
Magias da ficha: as vagas e a página de cada Magia, com o Traço, o Tabu e os feitiços),
`conditions/damage.mjs` (o cartão que o Motor come), `helpers/text-chips.mjs` (as palavras do Motor nos colchetes),
`hud/` e `canvas/token-style.mjs` (o Motor no HUD e no token).

### A definição de um Motor

O cabeçalho de `module/classes/motor.mjs` tem a lista completa. Em resumo:

- **Dados:** `id`, `i18n` (o prefixo dos textos: `Name`, `Unit`, `State.<estado>`, `Card`), `states` (um só: sem chip
  de estado), `defaults`, `costKeyword` (a palavra do custo), `stateColors` (o disco do token), `max(actor, { lesser })`.
- **Uso de uma habilidade:** `issues`, `actionOf`, `plan` (pode perguntar; `plan.vars` vira `@use.<chave>` nas fórmulas,
  `plan.autoHit` acerta sem Esquiva, `plan.changes` guarda dados da classe), `after`, `normalize` (mantém os dados da
  classe coerentes a cada gravação).
- **Efeitos:** `rollBonuses` (dados e somas nas rolagens), `onHit` (estados no atingido), `statuses` (estados passivos
  no próprio ator, sincronizados a cada mudança do Motor), `formulaData` (`@motor.<chave>`), `display` (`ready`,
  `readyLabel`, `note`: a aba e o HUD), `cardActions` e `onCardAction` (botões nos cartões de ataque), `damageTags`
  (tags a mais no dano de uma habilidade: o elemento do Matador), `absorbs` (uma nota quando o cartão de dano não faz
  dano nenhum ao ator: o Matador come o ataque de um aliado), `chips` (palavras dos textos que leem uma chave de
  `formulaData`: a Semente nos colchetes) e `spentWords` (outras palavras que, depois da unidade, querem dizer os
  pontos gastos no uso, além de "gastos": os "Moldes quebrados" do Pictomante).
- **Eventos** (`fn(actor, { lesser }, ...)`, em fila por ator, na janela onde aconteceu): `onCombatStart`, `onSetup`,
  `onCleanup`, `onCombatEnd`, `onTurnStart`, `onTurnEnd`, `onUse`, `onWeaponAttack`, `onAttacked`, `onDodged`,
  `onHitTarget`, `onMissTarget`, `onDamaged`, `onHealed`, `onStruck` (um cartão de dano aplicado, com ou sem PV
  tirado), `onKill`, `onMove`, `onCheck`; e os vistos por todos com Motor
  no combate: `onAnyHit`, `onAnyMiss`, `onAnyDamaged`, `onAnyHealed`, `onAnyCheck`, `onAnyKill`.
- **Condições de efeito:** `motorState` (um Motor do ator nesse estado: uma forma, uma canção, uma peça) e `motorAtLeast`
  (o Motor da habilidade com pelo menos n pontos).
- **Ganchos para módulos:** `eternia.attackResult` (o acerto ou erro contra um alvo), `eternia.damaged` e `eternia.healed`
  (PV tirados ou devolvidos por um cartão), `eternia.check` (um teste rolado: de habilidade, de acerto, de esquiva ou de
  atributo), além de `eternia.attack`, `eternia.dodge` e `eternia.defeated`.

### As flags de uma habilidade de classe

| Flag (`flags.eternia.`) | O que faz |
|---|---|
| `identifier` | `<classe>-<nome>`; requisitos, regras do Motor e aba Classe acham a habilidade por ele |
| `kind` | `motor`, `feeds` (alimenta), `spends` (gasta) ou `bends` (dobra): o selo da aba |
| `branch` | o grupo da aba: `kit`, um ramo da classe, `general`, `path`, `pathTalent`, `element`, `elementTalent`, `magic`, `apex` ou `dedication` |
| `motor` | `{ id, role, needs: { state, min, full, weapon }, spend, max, gain, set, action, alsoSpends, draw, perfect, inCombat }` (e chaves da classe, como `art`, a Arte Secreta do Matador); `id: "@class"` é o Motor da classe de quem usa (os feitiços das Magias) |
| `requires` | identificadores dos talentos que vêm antes |
| `path` | `{ class, id }`: a habilidade do Caminho |
| `pathTalent` | `{ class, id }`: um talento do Caminho |
| `element` | `{ class, id }`: um elemento da classe (o do Matador), escolhido no NP 1 |
| `elementTalent` | `{ class, id }`: um talento do elemento; o navegador só o mostra para quem tem o elemento |
| `apex` | a classe de quem é o Ápice |
| `dedication` | `{ name, id }`: a Dedicação de uma classe |
| `dedicationGrants` | uuids das habilidades que a Dedicação dá |
| `dedicationChoice` | uuids entre os quais a Dedicação deixa escolher uma (o elemento do Matador) |
| `magic` | `{ id, category, tagline }`: uma Magia (só dada pela vaga de Magia da classe); `tagline` é a frase curta do cartão na escolha da Magia |
| `magicSpell` | `{ id }`: um feitiço da Magia; o navegador o mostra (origem Magia) só para quem tem a Magia |
| `hitStatuses` | `[{ statusId, value }]`: estados que o dano da habilidade dá em quem acerta (o valor é uma fórmula) |
| `damageText` | o texto do dano no lugar da fórmula (`(1+Cortes)d6 + [Poder de Ataque] + Cortes×NP÷2 Físico`), mostrado no campo Dano do HUD e da ficha; mudou a fórmula (os dados, o texto), muda este texto junto |
| `minRank`, `choiceOnly` | como nas raças: NP mínimo; listada só depois de dada (kit, Caminhos, Ápice, Motor Menor) |

O item `class` leva `identifier`, atributos, `hp`, `hpPerRank`, as tags de papel (`Damage`, `Defense`, `Healing`,
`Control`, `Support`) e `grants`: um espaço por habilidade do kit, um espaço de escolha quando a classe tem elementos
(`{ uuids: [os elementos] }`, no NP 1), as vagas de Magia (`{ rank, magic: true }`: NP 1, 5 e 10 nas mágicas, 1 e 10 nas
físicas, 5 e 10 no Matador de Dragões; a n-ésima fica aberta enquanto o personagem tem menos de n Magias), `{ rank: 3, uuids: [os três Caminhos] }` e
`{ rank: 10, auto: true, uuids: [o Ápice] }`. Uma classe que saiu da lista (o Ressonante, que virou o Mago Vermelho, o Tecelão, que virou o Mago Branco, o Feiticeiro, que virou o Mago Negro, e, na 0.22, o Druida, o Sacerdote, o Oráculo, o Estrategista e o Menestrel) leva
`flags.eternia.retired` (o id da classe que tomou o lugar) no item e na Dedicação: o navegador de classes e o de
habilidades só os mostram para quem já os tem.

### Criar uma classe nova

1. Um arquivo em `module/classes/` com a definição do Motor (veja [A definição de um Motor](#a-definição-de-um-motor)
   e qualquer classe pronta), registrada em `index.mjs`.
2. Os dados da aba em `data.mjs` (`CLASSES`, com `family`, `role` e `magic`) e os textos em `lang/pt-BR.json` e `lang/en.json` (`Motor.<Classe>`:
   `Name`, `Unit`, `State`, `Card` com `Gain`, `Spend`, `Cap` e `Reset`, e as versões `Lesser` da Dedicação;
   `Classes.<id>.Branch`).
3. O item de classe na pasta Classes de `races-classes` e as habilidades numa pasta com o nome da classe em
   `skills-class` (as classes foram geradas por scripts; a fonte é o JSON em `src/packs`). A classe tem 36 habilidades:
   o kit, 16 talentos (6 [Dedicação]), 4 Gerais, 3 Caminhos com 2 talentos, o Ápice, a Dedicação e o Motor Menor (o
   Matador de Dragões tem mais 16: quatro elementos com três talentos cada, na subpasta Elementos); cada
   habilidade com um ícone só seu e um nome que nenhuma outra usa. O emblema da classe sai de
   `tools/make-class-icons.mjs` (no jeito dos emblemas de Log Horizon: a família dá a moldura, a função no grupo dá as
   cores, `ROLE_COLORS`, e a classe dá o símbolo): `assets/icons/classes/<id>.svg` no item de classe e no medalhão da aba Classe, e `<id>-dedicacao.svg`
   (com o selo "+") na Dedicação. Uma classe nova ganha a moldura em `CLASS_FAMILY`, a função em `CLASS_ROLE` e o símbolo em `GLYPHS`; sem
   emblema, usa `blank.svg` (só o verde).
4. O kit recomendado no assistente de criação: os nomes dos itens de Nível 1 em `KITS`
   (`module/apps/starting-gear.mjs`), na ordem de compra (a primeira arma vai para a mão principal), somando no máximo
   350 de ouro, e o porquê em `Wizard.Items.Kit.<id>`. Sem kit próprio, a classe usa o da família.
5. A página da classe no diário AS REGRAS (e a linha dela em XI.b), o README e o CHANGELOG; `npm run packs:build` com o
   mundo fechado.

As cópias das habilidades nas fichas guardam as flags de quando foram ganhas: a ferramenta de atualizar habilidades
do Mestre só atualiza os campos do sistema, então flags novas pedem arrastar a habilidade de novo.
