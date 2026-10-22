# Classes: o esqueleto

As regras de construção das classes da Eternia, fechadas em 2026-10-21, as [16 classes](#as-classes) e a referência
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

O mapa da lista de classes: cada Motor mexe numa parte da regra que nenhuma outra classe usa do mesmo jeito.

| Parte da regra | Classe | Motor |
|---|---|---|
| Tempo | Samurai | Bainha: junta Cortes embainhado e saca no Processo de Iniciativa |
| Ser atacado (Ódio) | Guardião | Baluarte: cada ataque contra ele é uma Camada de Anulação |
| PV baixo | Berserker | Ira: cada ferida vira dano a mais; gastar é escolher entre golpe e fôlego |
| Sequência de golpes | Monge | Corrente: golpes encadeados juntam Elos; o Golpe Final gasta todos |
| Inimigo | Assassino | Contrato: acertos de qualquer aliado no alvo viram Brechas; a Execução derruba |
| Posição | Caçador | Mira: parado, cresce; mover o token zera |
| Risco | Feiticeiro | Calor: cada feitiço esquenta e bate mais forte; no Teto, Erupção ou Sobrecarga |
| Dados dos outros | Tecelão | Padrão: dois dados que somam o número dão Fios, que mudam dados nos cartões |
| Seus dados | Estrategista | Leitura: 2d6 guardados na Manutenção trocam os dados de um teste |
| Maldição | Oráculo | Fardo: o milagre fica mais forte e a maldição pesa junto |
| PV dos aliados | Sacerdote | Graça: cada ferida de um aliado vira cura depois ou barreira antes |
| Forma | Druida | Formas: a Seiva paga a fera, e cada forma troca o menu |
| Criatura extra | Invocador | Pacto: PV pagos viram Laços de um espírito, gastos nos comandos |
| Aliados | Menestrel | Movimentos: a canção sobe a cada Manutenção; trocar volta ao I |
| Comando | Comandante | Táticas: Ordens que dão a sua ação a um aliado |
| Itens | Ressonante | Centelha: o poder mora numa peça e salta para outra soltando o que juntou |

A lista fechou em 16 classes, cruzando as classes do Pathfinder 2e e do Daggerheart com as partes da regra que
sobravam. O Duelista da primeira lista saiu (jogaria como o Monge e o Samurai), e entraram o Sacerdote (a cura que
faltava) e o Caçador (o ataque à distância). As que o cruzamento deixou de fora ou ficam para Dedicações
(Samurai + Feiticeiro faz o guerreiro arcano) ou batem com profissões (Alquimista, Engenheiro, Bardo).

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
  item de classe e a Dedicação das 16 classes que ainda têm a imagem em branco ganham o emblema da classe.

## As classes

Cada seção diz o Motor da classe e o que ela tem; as regras como o jogador lê estão na página da classe no diário AS
REGRAS (XI.1 a XI.16) e na descrição de cada habilidade. A calibragem do dano é a primeira de cada classe: vale
conferir na mesa e ajustar os números (Teto, dados por ponto, o pagamento do Motor cheio).

### Assassino

O Motor **Contrato** mexe no inimigo: o Assassino firma o Contrato com um Alvo, e cada acerto de qualquer personagem
nele abre uma Brecha. A Execução, só no Alvo, gasta todas (cada uma soma 1d6 + NP) e, se o Alvo ficar com PV iguais ou
menores que [Brechas gastas × (NP+5)], ele cai (não vale contra [Chefe]). Trocar de Alvo perde as Brechas; o Alvo
caído cumpre o Contrato.

| Parte | O que tem |
|---|---|
| Base | FOR 2, DES 4, POD 1, INT 3; faixa Leve (40, +5/NP); papel Damage |
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
Corte de Tendão (`onHit`), Dose Certa (`rollBonuses`), os acertos automáticos (Na Garganta, Machado Erguido, Lâmina
Invisível e a linha do Fantasma no Ápice), Marcar a Presa e Rede Fechada ([Marcado] no Alvo), Ferida que Não Fecha
([Maldito]) e Estudar o Alvo (o Contrato já firmado no começo do combate seguinte).

### Berserker

O Motor **Ira** mexe nos PV baixos: cada ataque de um inimigo que tira PV do Berserker dá 1 Ira (2 com metade dos PV
ou menos), e com Ira os Ataques com Arma somam +[Ira × 2] ao dano. O Golpe Selvagem gasta toda (+(2+Ira)d6 + Ira×NP),
o Fôlego de Sangue a troca por PV e Sangrar troca PV por Ira. Uma rodada sem atacar nem perder PV custa 1 Ira no
Encerramento.

| Parte | O que tem |
|---|---|
| Base | FOR 4, DES 3, POD 2, INT 1; faixa Robusta (50, +8/NP); papel Damage |
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

### Comandante

O Motor **Táticas** mexe no comando: o Comandante junta Ordens (+1 na Manutenção, +1 com Avaliar o Campo) e cada
Ordem gasta faz um aliado agir fora do turno dele. A Ordem: Atacar! dá [Concentrado] ao aliado e guarda quem foi mandado
atacar (`ordered`); quando o resultado do ataque básico dele sai (`onAnyHit`/`onAnyMiss`), a Ação Maior gasta volta,
na janela de quem rolou. Código em `module/classes/comandante.mjs` (a aura do Caminho da Bandeira na Manutenção, pelo
Mestre, com `flags.eternia.commandAura`).

| Parte | O que tem |
|---|---|
| Base | FOR 3, DES 2, POD 2, INT 3; faixa Firme (40, +6/NP); papéis Support e Control |
| Kit | Táticas (Motor), Avaliar o Campo (Menor, +1, [Identificado]), Ordem: Atacar! (Maior), Ordem: Avançar! (Menor) |
| A Vanguarda | Alvo Prioritário*, Comandar pelo Exemplo, Ponto de Ataque, Ordem: Carga! |
| A Formação | Ordem: Segurar!*, Formação Cerrada*, Recuar em Ordem, Ninguém Fica Para Trás |
| O Estandarte | Erguer o Estandarte*, Estandarte Inabalável, Clarim de Guerra, Glória do Batalhão |
| O Mapa | Plano de Batalha*, Reserva Tática*, Antecipar, Contra-ordem |
| Gerais | Inspirar Tropas, Ler o Mapa, Primeira Ordem, Vigília do Acampamento |
| Caminhos (NP 3) | Marechal (Comando em Cadeia, Linha de Comando), Capitão (Na Linha de Frente, Exemplo Vivo), Bandeira (Mastro Alto, Juramento da Bandeira) |
| Ápice (NP 10) | Comando Supremo |
| Dedicação (NP 5) | Dedicação: Comandante, que dá as Táticas Menores, Avaliar o Campo e a Ordem: Atacar! |

\* talentos [Dedicação].

### Druida

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

### Guardião

O Motor **Baluarte** mexe no Ódio: cada ataque que um inimigo faz contra o Guardião assenta uma Camada, e cada Camada
é [Anulação: 2] contra todo dano (o efeito passivo `eternia.passive.cancel` = `@motor.value × @motor.layer`). O Golpe
do Baluarte gasta todas (+(1+Camadas)d6 + Camadas×NP) e prende o alvo com [Provocado]. Uma rodada sem ser atacado
custa uma Camada no Encerramento.

| Parte | O que tem |
|---|---|
| Base | FOR 4, DES 2, POD 3, INT 1; faixa Colossal (55, +9/NP); papel Defense |
| Kit | Baluarte (Motor), Intercepção (Antes do Dano, +1), Brado do Baluarte (Menor, +1), Golpe do Baluarte (Maior, gasta todas) |
| A Muralha | Muralha Alta*, Pedra Angular, Muro de Ferro, Inabalável |
| O Desafio | Grito de Guerra*, Olhos em Mim, Atrair o Ódio*, Juramento de Proteção |
| O Martelo | Investida de Escudo, Onda de Choque, Contragolpe de Escudo*, Martelo do Bastião |
| A Guarda | Guarda Estendida*, Escudo Compartilhado*, Postura de Bastião, Último Baluarte |
| Gerais | Sentinela, Muralha Humana, Palavra de Guardião, Ombros de Ferro |
| Caminhos (NP 3) | Fortaleza (Pedra sobre Pedra, Fortaleza Viva), Escudo Erguido (Abrigo, Muro Vivo), Retaliação (Espinhos de Ferro, Ira do Bastião) |
| Ápice (NP 10) | Bastião Eterno |
| Dedicação (NP 5) | Dedicação: Guardião, que dá o Baluarte Menor, a Intercepção e o Golpe do Baluarte |

\* talentos [Dedicação].

Código: `module/classes/guardiao.mjs` (`GUARDIAO`): o Teto, `@motor.layer`, o Golpe na Fortaleza e com o Martelo do
Bastião (acerto automático), o Juramento (o Protegido em `ward`), os ataques sofridos (`onAttacked`, e quem atacou na
rodada para a Ira do Bastião), o Encerramento, a Retaliação e a Pedra sobre Pedra (`onDodged`), o Escudo Erguido e o
Protegido (`onAnyHit`/`onAnyMiss`), os Espinhos de Ferro ([Espelho] pelo `statuses`) e os estados dos golpes
(`onHit`).

### Invocador

O Motor **Pacto** mexe numa criatura extra: um espírito (Lobo, Golem ou Fada) fica preso ao Invocador por Laços que
ele compra com os próprios PV ([NP+3] cada), sem token: o espírito age pelas habilidades do Invocador. O Comando:
Ataque soma os Laços ao dano, os comandos especiais gastam Laços, e com 0 Laços o espírito se desfaz. Cada espírito tem
um traço (Lobo +1d6, Golem [Anulação: Laços], Fada [Regeneração: Laços × 2]). Código em `module/classes/invocador.mjs`.

| Parte | O que tem |
|---|---|
| Base | FOR 1, DES 2, POD 4, INT 3; faixa Leve (40, +5/NP); papéis Damage e Control |
| Kit | Pacto (Motor), Invocar Espírito (Maior), Comando: Ataque (Menor), Escudo Vivo (Antes do Dano, gasta 1) |
| O Lobo | Investida do Lobo*, Uivo da Matilha*, Caçada*, Presas Fundas |
| O Golem | Muralha do Golem, Punho de Pedra, Corpo de Pedra, Fundação |
| A Fada | Pó de Fada, Luz Errante, Brilho Curativo, Ciclo da Fada |
| O Pacto | Laço de Sangue*, Chamado Rápido*, Troca de Espírito, Retorno ao Vazio* |
| Gerais | Conversar com Espíritos, Montaria Espiritual, Sentir o Além, Selo de Guarda |
| Caminhos (NP 3) | Legião (Muitas Vozes, Reforço Constante), Fusão (Golpe Fundido, Avatar), Titã (Passo do Titã, Fúria do Titã) |
| Ápice (NP 10) | Pacto Eterno |
| Dedicação (NP 5) | Dedicação: Invocador, que dá o Pacto Menor (só o Lobo), Invocar Espírito e o Comando: Ataque |

\* talentos [Dedicação].

Estado em `flags.eternia.motor.invocador`: `state` (`vazio`, `lobo`, `golem`, `fada`), `value` (Laços), `freeUsed` e
`eternalUsed` (o Ápice, por combate) e as rodadas dos ganhos de uma vez por rodada. As habilidades que pedem um
espírito dizem qual em `flags.eternia.motor.spirit` (`"any"` ou o espírito). O PV pago sai direto da ficha (sem
Barreira) e o Desfazer do cartão não o devolve.

### Menestrel

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

### Monge

O Motor **Corrente** mexe na sequência de golpes: o Golpe de Entrada e o Elo Rápido somam Elos, e o Golpe Final gasta
todos (cada um soma 2d6 + NP; com a Corrente cheia, o alvo fica [Atordoado]). Um turno sem habilidade da Corrente a
quebra, e cada ataque de um inimigo que tira PV do monge tira 1 Elo. Os golpes pedem [Artes Marciais] ou as duas mãos
vazias.

| Parte | O que tem |
|---|---|
| Base | FOR 3, DES 4, POD 2, INT 1; faixa Firme (40, +6/NP); papéis Damage e Defense |
| Kit | Corrente (Motor), Golpe de Entrada (Maior, +1), Elo Rápido (Menor, com 1 Elo, [1d6 + NP], +1), Golpe Final (Maior, com 2 Elos, gasta todos) |
| O Punho | Palma Atordoante*, Chute Giratório, Punho que Atravessa, Último Elo |
| O Fluxo | Desviar e Seguir*, Postura do Grou*, Contra-golpe, Fluxo Ininterrupto |
| O Vento | Passo do Vento*, Investida do Tigre, Pés Leves, Vento Cortante |
| O Centro | Fôlego do Centro*, Corrente Longa*, Pele de Ferro, Coração Imóvel |
| Gerais | Primeiro Elo, Salto do Grou, Meditação, Ler o Golpe |
| Caminhos (NP 3) | Montanha (Raiz da Montanha, Avalanche), Rio (Remanso, Maré Viva), Tempestade (Trovoada, Ciclone) |
| Ápice (NP 10) | Corrente Infinita |
| Dedicação (NP 5) | Dedicação: Monge, que dá a Corrente Menor, o Golpe de Entrada e o Golpe Final |

\* talentos [Dedicação].

Automação (`module/classes/monge.mjs`): os Elos que cada golpe soma e o Golpe Final gasta (com o custo "Hate 1+Elos" e
o dano por `@per`, `@spent` e `@use.flat`), a quebra no fim do turno (`onTurnEnd`), o Elo perdido no dano
(`onDamaged`), a Corrente cheia ([Atordoado] pelo `onHit`; acerto automático com Punho que Atravessa), Desviar e
Seguir (`onDodged`), Último Elo (`onKill`), Maré Viva (`onCleanup`), Pele de Ferro (estado passivo), Pés Leves e Raiz
da Montanha (efeitos com `motorAtLeast`), Fluxo Ininterrupto (a segunda vez do Elo Rápido gasta o Movimento) e as
linhas do Ápice.

### Oráculo

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

### Ressonante

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
Iniciativa de qualquer personagem, saca gastando todos (cada um soma 2d6 + NP; com a Bainha cheia, Corte Perfeito:
acerto sem Esquiva e +[NP×2+10]).

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

### Tecelão

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

## Referência técnica

### Onde fica cada coisa

| Arquivo | O que faz |
|---|---|
| `module/classes/motor.mjs` | O Motor genérico: o registro (`registerMotor`), o estado no ator, o Teto, as habilidades de Motor e de Motor Menor, os requisitos (`motorUseIssues`), a ação que a habilidade gasta (`motorActionOf`), o plano antes do cartão (`planMotorUse`, que guarda `flags.eternia.motorUse`), a mudança depois (`commitMotorUse`, que avisa todos os Motores com `onUse`) e o Desfazer, os valores das fórmulas e do custo, os bônus de rolagem, os estados que o dano dá, os estados passivos (`syncMotorStatuses`), os eventos (em fila por ator) e os ajudantes das classes (lados, combate, escolha). |
| `module/classes/<classe>.mjs` | O Motor de cada classe (`ASSASSINO`, `BERSERKER`, `CACADOR`, `COMANDANTE`, `DRUIDA`, `ESTRATEGISTA`, `FEITICEIRO`, `GUARDIAO`, `INVOCADOR`, `MENESTREL`, `MONGE`, `ORACULO`, `RESSONANTE`, `SACERDOTE`, `SAMURAI`, `TECELAO`): o Teto, as regras do kit e dos talentos, os Caminhos, o Ápice e as reações aos eventos. O cabeçalho de cada arquivo diz a regra e o que fica guardado no ator. |
| `module/classes/index.mjs` | Registra os Motores, embrulha `EterniaCombat#_onPhaseStart` (Manutenção e Encerramento, uma vez, na janela do Mestre que mudou a fase), segue os turnos e o movimento dos tokens, ouve os eventos dos cartões (`eternia.attack`, `eternia.attackResult`, `eternia.dodge`, `eternia.damaged`, `eternia.healed`, `eternia.check`, `eternia.defeated`), põe os botões das classes nos cartões de ataque e tem a API `game.eternia.motor`. |
| `module/classes/progression.mjs` | O NP mudado à mão oferece o que a classe dá no NP; a Dedicação dá as habilidades dela ao ser aprendida e as tira junto. |
| `module/classes/sheet.mjs`, `data.mjs` | A aba Classe (`templates/character/class.hbs`, `css/classes.css`) e os dados de cada classe para a aba (cor, faixa, ramos, Caminhos). |
| `module/classes/migration.mjs` | A limpeza do Kuden e dos arquétipos, e dos ícones antigos das classes. |

Também tocam nas classes: `automation/use.mjs` (requisitos, ação, plano, mudança e Desfazer do Motor; o custo
"Hate 1+Cortes"), `helpers/skill-rolls.mjs` (acerto automático, bônus do Motor, `damageText`, o evento dos testes),
`chat/cards.mjs` (bônus do Motor no Dano dos cartões), `helpers/combat-cards.mjs` (os eventos dos cartões, os
estados que o Motor dá no acerto e `adjustCardRoll`, que muda um teste do cartão depois da rolagem e julga o acerto
de novo), `helpers/effect-conditions.mjs` (as condições `motorState` e `motorAtLeast`), `hud/hud.mjs` e
`sheets/actor-sheet.mjs` (o evento dos testes de atributo), `helpers/effect-formulas.mjs` (as variáveis), `apps/option-grants.mjs` e `apps/rank-up.mjs`
(o que chega pelo NP), `apps/skill-browser.mjs` (requisitos, Caminhos, Dedicação), `hud/` e `canvas/token-style.mjs`
(o Motor no HUD e no token).

### A definição de um Motor

O cabeçalho de `module/classes/motor.mjs` tem a lista completa. Em resumo:

- **Dados:** `id`, `i18n` (o prefixo dos textos: `Name`, `Unit`, `State.<estado>`, `Card`), `states` (um só: sem chip
  de estado), `defaults`, `costKeyword` (a palavra do custo), `stateColors` (o disco do token), `max(actor, { lesser })`.
- **Uso de uma habilidade:** `issues`, `actionOf`, `plan` (pode perguntar; `plan.vars` vira `@use.<chave>` nas fórmulas,
  `plan.autoHit` acerta sem Esquiva, `plan.changes` guarda dados da classe), `after`, `normalize` (mantém os dados da
  classe coerentes a cada gravação).
- **Efeitos:** `rollBonuses` (dados e somas nas rolagens), `onHit` (estados no atingido), `statuses` (estados passivos
  no próprio ator, sincronizados a cada mudança do Motor), `formulaData` (`@motor.<chave>`), `display` (`ready`,
  `readyLabel`, `note`: a aba e o HUD), `cardActions` e `onCardAction` (botões nos cartões de ataque).
- **Eventos** (`fn(actor, { lesser }, ...)`, em fila por ator, na janela onde aconteceu): `onCombatStart`, `onSetup`,
  `onCleanup`, `onCombatEnd`, `onTurnStart`, `onTurnEnd`, `onUse`, `onWeaponAttack`, `onAttacked`, `onDodged`,
  `onHitTarget`, `onMissTarget`, `onDamaged`, `onHealed`, `onKill`, `onMove`, `onCheck`; e os vistos por todos com Motor
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
| `branch` | o grupo da aba: `kit`, um ramo da classe, `general`, `path`, `pathTalent`, `apex` ou `dedication` |
| `motor` | `{ id, role, needs: { state, min, full, weapon }, spend, max, gain, set, action, alsoSpends, draw, perfect, inCombat }` |
| `requires` | identificadores dos talentos que vêm antes |
| `path` | `{ class, id }`: a habilidade do Caminho |
| `pathTalent` | `{ class, id }`: um talento do Caminho |
| `apex` | a classe de quem é o Ápice |
| `dedication` | `{ name, id }`: a Dedicação de uma classe |
| `dedicationGrants` | uuids das habilidades que a Dedicação dá |
| `damageText` | o texto do dano no lugar da fórmula (`[Poder de Ataque] + (1+2×Cortes)d6 + Cortes×NP Físico`) |
| `minRank`, `choiceOnly` | como nas raças: NP mínimo; listada só depois de dada (kit, Caminhos, Ápice, Motor Menor) |

O item `class` leva `identifier`, atributos, `hp`, `hpPerRank`, as tags de papel (`Damage`, `Defense`, `Healing`,
`Control`, `Support`) e `grants`: um espaço por habilidade do kit, `{ rank: 3, uuids: [os três Caminhos] }` e
`{ rank: 10, auto: true, uuids: [o Ápice] }`.

### Criar uma classe nova

1. Um arquivo em `module/classes/` com a definição do Motor (veja [A definição de um Motor](#a-definição-de-um-motor)
   e qualquer classe pronta), registrada em `index.mjs`.
2. Os dados da aba em `data.mjs` (`CLASSES`) e os textos em `lang/pt-BR.json` e `lang/en.json` (`Motor.<Classe>`:
   `Name`, `Unit`, `State`, `Card` com `Gain`, `Spend`, `Cap` e `Reset`, e as versões `Lesser` da Dedicação;
   `Classes.<id>.Branch`).
3. O item de classe na pasta Classes de `races-classes` e as habilidades numa pasta com o nome da classe em
   `skills-class` (as classes foram geradas por scripts; a fonte é o JSON em `src/packs`). A classe tem 36 habilidades:
   o kit, 16 talentos (6 [Dedicação]), 4 Gerais, 3 Caminhos com 2 talentos, o Ápice, a Dedicação e o Motor Menor; cada
   habilidade com um ícone só seu e um nome que nenhuma outra usa. O emblema da classe sai de
   `tools/make-class-icons.mjs` (no jeito dos emblemas de Log Horizon: a família dá a moldura e as cores, losango verde
   para guerreiro, quadrado creme para ataque com arma, círculo rosa para cura e hexágono turquesa para magia, e a classe
   dá o símbolo): `assets/icons/classes/<id>.svg` no item de classe e no medalhão da aba Classe, e `<id>-dedicacao.svg`
   (com o selo "+") na Dedicação. Uma classe nova ganha a família em `CLASS_FAMILY` e o símbolo em `GLYPHS`; sem
   emblema, usa `blank.svg` (só o verde).
4. A página da classe no diário AS REGRAS (e a linha dela em XI.b), o README e o CHANGELOG; `npm run packs:build` com o
   mundo fechado.

As cópias das habilidades nas fichas guardam as flags de quando foram ganhas: a ferramenta de atualizar habilidades
do Mestre só atualiza os campos do sistema, então flags novas pedem arrastar a habilidade de novo.
