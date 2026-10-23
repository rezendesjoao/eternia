# Eternia

Sistema de RPG de mesa para o **Foundry VTT v14**. As regras de base são as de Log Horizon TRPG (ficha, habilidades
por NH, combate por Processos, Ódio, Destino, estados e durações); as classes, as raças e as habilidades são as da
Eternia. A ficha em pergaminho, o HUD de ações, o chat, os tokens e a automação de mesa fazem parte do próprio
sistema, feitos para mesas com muitos jogadores e vários combates ao mesmo tempo.

## Versão 0.9.0

- **Novo na 0.9.0: o Matador de Dragões**, a primeira das classes de magia. Ele come o próprio elemento (Fogo,
  Ferro, Céu ou Raio, escolhido junto com a classe) e o transforma em Escamas, que os golpes de dragão gastam; no
  Teto vem a Força do Dragão, e quem abusa dela vê a Semente do Dragão crescer. As gerações são os Caminhos, e o
  Ápice é o Modo Rei Dragão (veja [As classes](#as-classes)).
- **Desde a 0.8.5: a aba Detalhes na ficha de habilidade.** NH, Momento, Teste, Alvo, Alcance, Custo, Limite, Dano e
  Macro ficam nela, entre Descrição e Efeitos; a Descrição mostra só o texto.
- **Desde a 0.8.4: os emblemas das 16 classes**, no jeito dos de Log Horizon: a moldura e as cores dizem a família
  e o símbolo diz a classe. Aparecem na aba Classe, no item da classe e, com um selo "+", na Dedicação (veja
  [As classes](#as-classes)).
- **Desde a 0.8.3: os dados se escrevem 2d6, na frente da fórmula.** "[Poder de Ataque + 2D]" virou
  "[2d6 + Poder de Ataque]" e "+1D no teste" virou "+1d6 no teste", em todos os textos, nas fichas e nos
  cartões; os textos antigos dos mundos aparecem no padrão novo sozinhos.
- **Desde a 0.8.2: o Switch.** Uma habilidade básica nova para todo personagem: você e um aliado a até 2 Qd trocam
  de lugar e de Ódio, e o aliado fica [Concentrado] (veja [Combate](#combate)). O Momento Constante passou a se
  chamar **Passiva**, e cada Anima-mundi mostra a cor do seu nível nos Materiais da profissão.
- **Desde a 0.8.1: caixas de mensagem e colchetes.** Todos os avisos, confirmações e escolhas seguem um padrão só,
  e os "[...]" dos textos viram etiquetas coloridas pela função, com o valor do personagem nas fórmulas e uma
  explicação ao passar o mouse (veja [As outras janelas](#as-outras-janelas) e
  [Os colchetes dos textos](#os-colchetes-dos-textos)).
- **Desde a 0.8.0: as 16 classes.** Junto com o Samurai chegam o Assassino, o Berserker, o Caçador, o Comandante, o
  Druida, o Estrategista, o Feiticeiro, o Guardião, o Invocador, o Menestrel, o Monge, o Oráculo, o Ressonante, o
  Sacerdote e o Tecelão, cada um com o seu **Motor** (a regra que só a classe tem), 16 talentos, 4 Gerais, três
  Caminhos, o Ápice e a Dedicação para outras classes, tudo automatizado, com a aba **Classe** na ficha e uma página
  por classe no diário AS REGRAS (veja [As classes](#as-classes)).
- **Desde a 0.7.0: o sistema de classes**, com o Motor, os Caminhos, o Ápice e a Dedicação; o Kuden e os arquétipos de
  Log Horizon saíram do sistema. Desde a 0.7.1 as fases do combate se chamam Preparação, Manutenção, Turno e
  Encerramento.
- **Desde a 0.6.0: 108 itens de Sword Art Online** no compêndio de Itens (Aincrad, Alfheim e Submundo), com
  habilidades automatizadas e ícones pintados; os lendários são fortes de propósito (veja
  [Os itens de Sword Art Online](#os-itens-de-sword-art-online)).
- **Desde a 0.5.0: um ícone para cada item**, sem repetir, com molduras pelo grau mágico e efeitos nas armas de nível
  alto (veja [Os ícones dos itens](#os-ícones-dos-itens)).
- **Desde a 0.4.0: as 10 profissões** (as subclasses), com a aba Profissão na ficha, a Oficina, a Fusão, os
  talentos e itens novos (veja [As profissões](#as-profissões)).
- **Desde a 0.3.0: as 8 raças da Eternia**, com 32 habilidades raciais automatizadas (veja [As raças](#as-raças)).
- **Desde a 0.2.0: 31 condições** somadas aos 23 estados de base, todas automatizadas (veja
  [As condições](#as-condições)).
- **Já vem pronto:** a ficha de personagem e a de monstro, o HUD de ações, o chat, os tokens e as outras janelas no
  mesmo visual; toda a automação de combate e de uso de habilidades; a interface em português do Brasil.
- **Compêndios com conteúdo:** Habilidades Básicas, Habilidades de Montaria, Poderes EX do Mestre, Itens, Bestiário
  e Regras, em português.
- **Compêndios da Eternia:** Raças e Classes (as 8 raças, as 10 profissões e as 17 classes), Habilidades Raciais e
  Habilidades de Classe (36 por classe, 52 no Matador de Dragões: 628 ao todo); no compêndio de Itens, as Engenhocas, as Canções e os 108 itens de Sword
  Art Online (veja [Os itens de Sword Art Online](#os-itens-de-sword-art-online)). Ainda vazio: Habilidades Comuns. As
  raças, classes e habilidades gerais e de combate de Log Horizon foram tiradas do sistema.

## A ficha de personagem

Do tamanho e com a organização da ficha de Pathfinder 2e (750×750): um estandarte verde à esquerda com o que se usa
em jogo, o nome numa faixa escura, ícones redondos para as abas e o conteúdo em pergaminho, com molduras finas e
rótulos em versalete. Fontes Eczar e Gelasio.

- **Estandarte:** PV atual e máximo com a Barreira ao lado e uma barra vermelha do que resta; Ódio numa caixa laranja
  (com a coroa quando está no Topo) e Fadiga numa caixa azul, que enchem conforme o valor; Defesa Física e Mágica em
  escudos, Iniciativa e Velocidade; Poder de Ataque, Mágico e de Recuperação; Precisão, Esquiva e Resistência com o
  número de dados, roláveis com um clique; e os estados ativos, com o botão de remover um Estado Negativo gastando
  Destino.
- **Cabeçalho:** nome, Destino em estrelas (clique soma 1, botão direito tira 1) e o NP num brasão, com o botão de
  subir de NP.
- **Personagem:** retrato com Raça, Classe e Subclasse ao lado; as tags; Conexões e Uniões; e os quatro atributos em
  molduras, com o botão de distribuir pontos.
- **Testes:** os oito testes de atributo e os três de combate, cada um com o modificador e os dados.
- **Habilidades:** Básicas, Gerais e de Combate, agrupadas pelo Momento (Ação Maior, Menor, Movimento, Instantânea,
  Reações, Manutenção, Encerramento, Passivas…), com NH, custo e limite. Clique na imagem para usar e no nome para
  abrir os detalhes ali mesmo; o botão Explorar abre o navegador de habilidades.
- **Inventário:** a riqueza (receber e gastar ouro fica registrado no chat), o boneco de equipamento (sete espaços
  ligados por linhas às partes do corpo), o que se carrega, os tíquetes e o espaço da bolsa.
- **Classe:** o brasão da classe com a base (atributos e PV); o Motor, com o estado e os pontos (no Samurai, a katana
  sai da bainha quando a lâmina é sacada e os Cortes brilham quando o próximo Iai é um Corte Perfeito); o kit, os
  talentos por ramo com o que cada um faz no Motor, o Caminho, o Ápice, os talentos Gerais, as Dedicações e os
  marcos da classe. Sem classe, o botão de escolher uma.
- **Profissão:** o brasão da profissão com o Rank, a EXP e as tentativas do cenário, os botões da bancada (Oficina,
  Fusão, talentos), as chances, os materiais, o talento, as obras e os Ranks; sem profissão, as dez para escolher.
- **Efeitos e estados** e a **Biografia**.

## A ficha de monstro

A mesma organização num tamanho pequeno (580×610): PV, Barreira, Destino e multiplicador de Ódio no estandarte,
defesas, Esquiva e Resistência roláveis; habilidades agrupadas pelo Momento, com o teste, o dano e o limite à
vista; efeitos, estados e descrição. Todo campo é editável na própria ficha.

## O chat

- **Rolagens** numa faixa com os dados como faces, o modificador e o total num selo; testes mostram **Crítico** e
  **Desastre**.
- **Cartões de habilidade e de item:** Momento, Alvo e Alcance sob o nome, Teste e Dano em duas linhas, NH, Custo e
  Limite em etiquetas, a descrição dobrada.
- **Ataque e dano:** alvos numa linha cada, com distância, esquiva e resultado; o dano aplicado numa linha.
- **Com o TBG** (balões de fala, Modo Narrador e as abas ON, OFF e ROLL do Custom Chat Tabs), as falas, os balões e
  as abas ganham o mesmo pergaminho: o grito com filete carmim, o sussurro tracejado, o pensamento com a nuvem, a
  ação sem moldura, o OFF cinza e a narração na faixa verde.

## As outras janelas

Fichas de item (os 14 tipos), editor de efeitos, navegadores de habilidades e de raça e classe, diálogos, baús,
saques, lojas e as Ferramentas do Mestre seguem o visual da ficha. Num compêndio trancado os valores aparecem como
texto.

As **caixas de mensagem** (avisos, confirmações e escolhas) seguem um padrão só: a barra verde com borda dourada, o
pergaminho e dois botões do mesmo tamanho, a ação em verde e Cancelar em pergaminho (quando a ação vai contra um
aviso, ela fica vermelho-tijolo). O aviso antes de usar uma habilidade mostra a imagem e o nome dela e cada motivo com
o ícone do seu tipo (Momento, Motor, limite, condição); subir NP mostra o retrato e o que o personagem ganha; vender e
converter itens mostram o item ou o personagem.

## Os colchetes dos textos

Os "[...]" das descrições de habilidades e itens, dos cartões do chat, do diário AS REGRAS, do cartão do Motor e dos
avisos de uso viram etiquetas pela função: **fórmulas** em verde, **estados** em vermelho, **tags** em pergaminho,
**valores do personagem** em azul, **Momentos** em dourado e os outros termos em cor neutra. Quando o texto é de um
personagem, a fórmula mostra o valor ao lado ([NP+3] de um personagem de NP 10 aparece como "NP+3 | 13";
[2d6 + Poder Mágico], como "… | 2d6 + 12"). Passar o mouse explica a etiqueta: o que é NP ou NH e quanto vale agora, a
regra do estado ou da tag. Rolagens embutidas ([[/r 2d6]]) e links (@UUID[…]) ficam como estão.

## Os ícones dos itens

Cada um dos 975 itens do compêndio tem o seu próprio ícone, sem repetir: os ícones pintados que vêm com o Foundry
(o sistema aponta para eles, sem copiá-los) e, nas katanas, nos chicotes e nos itens de Sword Art Online, arte
própria da Eternia (`assets/icons/items/`). Itens de uma mesma família mudam de forma a cada grau (I, II, III) e de cor a cada tipo.
Por cima do ícone, o sistema desenha:

- **a moldura do grau mágico:** de [M1] a [M3], uma linha na cor da qualidade (verde, azul e roxo); de [M4] a [M6]
  (Artefatos), moldura dourada com uma gema nos cantos; [M7], moldura espectral;
- **o movimento do nível** (armas, armaduras, escudos e acessórios): do nível 11, um reflexo que passa pelo ícone; do
  21 ao 30, também um brilho atrás do item, uma borda de luz e partículas do tema dele (brasas, gelo, faíscas, luz,
  pétalas, notas, névoa…), mais fortes a cada nível.

Vale na ficha, na janela do item, nos compêndios, na barra lateral, no chat, no HUD e na bancada. Só os ícones que
aparecem na tela são desenhados. A configuração **Ícones animados** (de cada jogador) deixa só as molduras.

## Os tokens

A barra de PV (com a Fadiga hachurada e a Barreira num filete azul-aço), o Destino em losangos dourados, o Motor da
classe numa fileira de losangos logo acima da barra de PV (com um disco do estado: verde Embainhada, carmim
Desembainhada) e o nome em versalete numa faixa na cor da disposição. Uma configuração escolhe quem vê a barra de PV: todos; todos, mas os
jogadores só veem a de um inimigo [Identificado]; ou cada token por conta própria.

## O HUD de ações

Com um token selecionado (ou, para um jogador, o personagem atribuído a ele), uma barra de pergaminho fica no pé da
tela, no lugar da barra de macros do Foundry:

- **Recursos:** PV, Barreira, Destino, Ódio, Fadiga e o Motor da classe (o estado e os pontos; um clique num losango
  marca os pontos à mão).
- **Turno:** a rodada e o Processo, as ações que restam no seu turno, Espera e **Encerrar**; **Entrar**
  coloca o token num combate em que ele ainda não está.
- **Esquivas pendentes:** quando um ataque mira o seu personagem, **Esquivar** rola pelo próprio cartão.
- **Painéis:** Testes, Habilidades (as que não dá para usar agora ficam esmaecidas, com o motivo), Itens (com
  os poderes de gatilho) e Estados. **Shift + clique** usa e já rola o Teste.
- **Atalhos fixos** pelo alfinete, **Esc** fecha o painel, e o HUD se ajusta às telas menores, ao chat flutuante, à
  lista de jogadores e à barra lateral aberta.
- A barra de macros fica escondida, mas as teclas 1 a 0 continuam executando as macros. Cada jogador escolhe entre
  esconder, trocar ou mostrar.

## As classes

Cada classe da Eternia tem um **Motor**, uma regra que só ela tem e que muda o que se decide na rodada; tudo o mais
gira em volta dele (veja `docs/classes.md` e as páginas **XI. CLASSES** do diário AS REGRAS, uma por classe):

- **Base:** atributos (10 pontos) e PV numa das cinco faixas, que a própria classe define. Não há arquétipos.
- **Kit do NP 1:** o Motor e as habilidades de entrada, oferecidos ao escolher a classe.
- **Talentos:** 16 de Combate em quatro ramos e 4 Gerais por classe; todos mexem no Motor (alimentam, gastam ou dobram
  uma regra dele). Os ramos pedem talentos anteriores, e o navegador de habilidades mostra o que falta.
- **Caminho (NP 3):** um de três, oferecido na subida de NP; cada um reescreve uma regra do Motor e traz dois
  talentos próprios.
- **Dedicação (NP 5):** a multiclasse. Um personagem de outra classe ganha o Motor Menor (Teto pela metade) e abre os
  talentos [Dedicação], dois NP depois.
- **Ápice (NP 10):** dado sem pedir, transforma o Motor.
- **Elemento (NP 1):** no Matador de Dragões, um elemento escolhido junto com a classe (Fogo, Ferro, Céu ou Raio) dá
  a tag e o estado dos golpes, a imunidade e três talentos próprios; o navegador de habilidades só mostra os do
  elemento escolhido, e a Dedicação também deixa escolher um.
- **Emblema:** cada classe tem o seu, no jeito dos emblemas de Log Horizon: a moldura e as cores dizem a família
  (losango verde para quem segura a linha de frente, quadrado creme para quem ataca com arma, círculo rosa para quem
  cura, hexágono turquesa para a magia) e o símbolo diz a classe. Aparece na aba Classe, no item da classe e, com um
  selo "+", na Dedicação.

| Classe | Papéis | Motor |
|---|---|---|
| Assassino | Dano | **Contrato**: escolhe um alvo, e cada acerto de qualquer aliado nele abre uma Brecha; a Execução gasta as Brechas e derruba quem ficou fraco demais. |
| Berserker | Dano | **Ira**: cada ferida sofrida vira Ira, que soma dano a todo golpe; gastar a Ira é escolher entre um golpe brutal e o fôlego para continuar de pé. |
| Caçador | Dano, Controle | **Mira**: parado, a Mira cresce a cada rodada; o Tiro Certeiro gasta tudo, e mover o token zera. |
| Comandante | Suporte, Controle | **Táticas**: junta Ordens e gasta a própria ação para um aliado agir fora do turno dele. |
| Druida | Defesa, Cura | **Formas**: a Seiva paga a transformação em fera, e cada forma troca o que ele pode fazer. |
| Estrategista | Suporte, Controle | **Leitura**: na Manutenção rola 2d6 e guarda os dados, para trocar depois os de um teste pelo que leu. |
| Feiticeiro | Dano | **Calor**: cada feitiço esquenta e bate mais forte; no Teto, a Erupção solta tudo ou a Sobrecarga queima o próprio feiticeiro. |
| Guardião | Defesa | **Baluarte**: cada ataque contra ele vira uma Camada da muralha (Anulação), que o Golpe do Baluarte transforma em dano e provocação. |
| Invocador | Dano, Controle | **Pacto**: paga PV para dar Laços a um espírito (lobo, golem ou fada), que luta, protege ou cura gastando os Laços. |
| Matador de Dragões | Dano | **Escamas**: come o próprio elemento (Fogo, Ferro, Céu ou Raio) e o transforma em Escamas, que os golpes de dragão gastam; no Teto vem a Força do Dragão, e cada vez que ela acaba a Semente do Dragão cresce. |
| Menestrel | Suporte | **Movimentos**: a canção sobe a cada Manutenção e reforça os aliados; trocar de canção volta ao começo, e o Finale gasta tudo. |
| Monge | Dano, Defesa | **Corrente**: golpes encadeados juntam Elos, e o Golpe Final gasta a corrente inteira; apanhar ou parar quebra os Elos. |
| Oráculo | Cura, Dano | **Fardo**: cada milagre fica mais forte e pesa mais; com Fardo alto vem a maldição, e a Revelação descarrega tudo de uma vez. |
| Ressonante | Dano, Defesa | **Centelha**: o poder mora numa peça do equipamento (arma, armadura ou joia) e cresce ali; saltar para outra peça solta o que juntou. |
| Sacerdote | Cura, Defesa | **Graça**: cada ferida de um aliado vira Graça, gasta em curas depois ou em barreiras antes do golpe. |
| Samurai | Dano, Defesa | **Bainha**: embainhada, a lâmina junta Cortes; o Iai, na Iniciativa, saca e gasta todos, e com a Bainha cheia é um Corte Perfeito. |
| Tecelão | Controle, Suporte | **Padrão**: escolhe um número de 2 a 12; quando dois dados de qualquer teste o formam, ganha Fios, que mudam os dados dos outros. |

**Automação:** o Motor fica na aba Classe (o estado, os pontos e uma nota quando a classe guarda algo além deles: o
alvo do Contrato, o Padrão, as Leituras), no HUD e no token. Os ganhos e os gastos seguem o combate sozinhos: a
Manutenção e o Encerramento, o começo e o fim de cada turno, o movimento do token, os ataques declarados, os acertos e
as esquivas, o dano e a cura aplicados pelos cartões, os testes rolados e os inimigos derrubados. O Tecelão e o
Estrategista ganham botões nos cartões de ataque, que mudam os dados de um teste já rolado e refazem o acerto. O
elemento do Matador de Dragões entra sozinho no dano dos golpes (a tag e o estado no acerto), e um ataque do elemento
vindo de um aliado não causa dano: o Matador come o ataque. O
Desfazer do cartão devolve o Motor junto com o Ódio e a ação. O que não dá para automatizar (escolher alvos de área,
mover tokens) fica no texto da habilidade.

## As raças

Oito raças, cada uma com +2 em atributos, PV e Destino, **duas habilidades inatas** (uma Geral e uma de Combate,
que entram ao escolher a raça) e **duas desbloqueáveis** pela subida de nível: a Geral a partir do NP 3 e a de
Combate a partir do NP 5, pagas com as escolhas normais de habilidade.

| Raça | Atributos | PV | Destino | Inatas | Desbloqueáveis |
|---|---|---|---|---|---|
| Humanos | +1 em dois à escolha | 8 | 1 | Bênção (uma de oito), Força dos Laços | Coleção de Bênçãos, Segunda Origem |
| Elfos | DES +1, POD +1 | 8 | 1 | Olhos de Mana, Pacto Espiritual (Gelo, Vento, Luz ou Terra) | Canção dos Quase-Espíritos, Grande Espírito |
| Flügel | POD +1, INT +1 | 8 | 1 | Asas de Luz, Graça do Astro (seis Astros) | Biblioteca Viva, Golpe Celeste |
| Etherious | FOR +1, INT +1 | 8 | 1 | O Livro, Maldição | Voz do Purgatório, Forma Etherious |
| Oni | FOR +2 | 16 | 0 | Clarividência, Chifre | Elo de Sangue, Oni Desperto |
| Exceed | DES +2 | 0 | 2 | Aera, Parceiro | Premonição, Velocidade Máxima |
| Vargr | FOR +1, DES +1 | 16 | 0 | Faro de Lobo, Matilha | Caçador da Estepe, Forma da Lua |
| Kitsune | POD +2 | 0 | 2 | Mil Faces, Caudas | Encanto da Raposa, Fogo-Raposa |

Escolher a raça na ficha abre a escolha das habilidades inatas (a Bênção do Humano, o elemento do Pacto do Elfo e o
Astro do Flügel) e, no Humano, dos dois atributos. O navegador de habilidades mostra as desbloqueáveis com o NP em
que liberam. Cada habilidade traz o efeito direto e, embaixo, como ele aparece em cena; a automação aplica os
estados, os bônus, as escolhas (como gastar uma Cauda num Truque ou numa Ilusão) e os custos.

## As profissões

A subclasse da Eternia é uma **profissão**: um ofício fora de combate que faz itens com aprimoramentos, sobe de
Rank com EXP e tem um talento próprio. Escolha a profissão na aba **Profissão** da ficha (ou no campo Subclasse);
trocar de profissão guarda a EXP de cada uma. As regras completas estão em **X. PROFISSÕES**, no diário AS REGRAS.

| Profissão | Faz | Talento |
|---|---|---|
| Ferreiro | armas, armaduras pesadas e médias, escudos | Afiar: +2 de Poder de Ataque numa arma do grupo até o fim do cenário |
| Alfaiate | armaduras leves, roupas, bolsas | Remendo: até 3 aliados tiram Rank × 3 de Fadiga |
| Artesão | acessórios, amuletos, gemas | Lapidação: um aprimoramento de cada acessório vale o dobro |
| Alquimista | poções, toxinas | Lote: 2 cópias no Rank 3, 3 no Rank 5 |
| Cozinheiro | comidas | Banquete: 2 comidas iguais viram uma porção para o grupo |
| Escriba | pergaminhos | Cópia: uma habilidade sua num pergaminho de uso único |
| Engenheiro | bombas, redes, pedras de faísca | Armadilha: bombas e redes armadas num quadrado da cena |
| Bardo | canções gravadas em cristal | Obra-prima: com dois 6, a canção sai em massa ou instantânea |
| Coletor | (Coleta) | Coleta: Anima-mundi e, com dois 6, Quintessência |
| Mercador | (Retoque e venda) | Retoque: troca um aprimoramento; vende tudo pelo valor cheio |

- **Rank 1 a 5** (EXP 20, 40, 80 e 160): +Rank na rolagem, Rank + 1 tentativas por cenário e itens até o nível
  Rank × 6. O fim do cenário (Ferramentas do Mestre) devolve as tentativas.
- **A Oficina:** escolha a base (da mochila, que vira a obra, ou do catálogo, que você paga), gaste 1
  Anima-mundi do nível dela e role 2d6 + Rank: Falha, Aproveitamento (o material volta), Incomum [M1], Raro [M2] ou
  Perfeito [M3], com 1 a 3 aprimoramentos à escolha. Dois 6 sobem um degrau.
- **Fusão:** dois itens feitos iguais viram um do grau acima, com mais um aprimoramento; dois Perfeitos e uma
  Quintessência viram um **Lendário [M4]**, com o aprimoramento lendário da lista (Fio do Destino, Égide,
  Coração Estelar).
- **Aprimoramentos:** 6 por tipo de item (armas, proteções, acessórios, consumíveis) e o Espaçosa das bolsas. Os
  números dobram do nível 11 e triplicam do 21; entram nos números do item ou em efeitos que valem com ele equipado.
- **A aba Profissão** mostra o brasão com o Rank, a EXP e as tentativas, os botões da bancada, as chances, os
  materiais, o talento, as obras na mochila e os Ranks. A **bancada** faz cada ação passo a passo, com a rolagem na
  tela, e posta um cartão no chat.
- **Itens novos:** Engenhocas (Bomba Incendiária, Bomba de Gelo, Rede, Pedra de Faísca) e Canções (Hino de Coragem,
  Marcha de Guerra, Balada do Pavor, Canção de Ninar), em três graus; a Quintessência.

## Os itens de Sword Art Online

No compêndio de Itens, três pastas trazem **108 itens** inspirados em Sword Art Online, do nível 1 ao 30: Aincrad
(83), Alfheim (10) e Submundo (15). São 59 armas (espadas, rapieiras, adagas, katanas, machados, martelo, lança,
arcos, chicote, cajado e armas de arremesso) e 49 proteções e acessórios (casacos, peitorais, capas, calças, botas,
luvas, cinto, anéis e brincos), cada um com o seu ícone pintado.

- **Graus:** os itens comuns estão à venda. Os raros são Artefatos de [M4] a [M7], fora de venda, com o preço pelo
  nível e pelo grau.
- **Habilidades próprias:** cada item raro tem um bônus fixo, um estado em todo combate, um poder de gatilho ou mais
  de um, já automatizados. Os poderes viram habilidades de quem carrega o item, com Momento, alvo, alcance, limite,
  dano e estados.
- **Fortes de propósito:** as armas lendárias [M7] passam do que as regras de base dariam a um item do nível delas.
  São recompensas de fim de campanha.

| Item | Nível | Destaque |
|---|---|---|
| Elucidator e Dark Repulser | 27 [M6] | Explosão Estelar, só com as duas equipadas: [8d6 + Ataque] e Fadiga 10 em quem usa |
| Mate Chopper | 24 [M6] | todo dano que causa deixa Deterioração 10 |
| Liberator | 30 [M7] | espada e escudo num item só: +10 nas Defesas e Último Fôlego em todo combate |
| Espada Sagrada Excalibur | 30 [M7] | dano de [Radiância], Anulação 15 em todo combate e [8d6 + Ataque] em área, com Atordoado |
| Radiant Light | 30 [M7] | Barreira 60 nos aliados e Enraizado nos inimigos, numa área de 20 quadrados |
| Espada Perfura-Tempo | 30 [M7] | anula todo o dano de um ataque, uma vez por cenário |

Dois recursos novos servem para qualquer item: o poder que só funciona com outro item equipado junto (`withItem`) e
os efeitos que vão só para os aliados ou só para os inimigos entre os alvos (`recipients`: `allies`, `enemies`), em
`docs/condicoes.md`.

## As condições

Os 23 estados das regras de base e mais 31 condições da Eternia, feitas para emular poderes de anime. A regra de
cada uma aparece ao passar o mouse (na ficha, no HUD e nos estados clicáveis do chat), e a página
**IX. CONDIÇÕES DA ETERNIA** do diário AS REGRAS traz todas por extenso.

| Família | Condições |
|---|---|
| Controle | Paralisado, Adormecido, Enraizado, Derrubado, Lento, Agarrado |
| Bloqueio | Silenciado, Desarmado, Cego, Selado (Habilidade) |
| Mente | Medo, Encantado, Provocado, Fúria: n |
| Elementais | Queimando: n, Envenenado: n, Congelando: n (acumula até 3), Eletrificado: n, Maldito |
| Quebra de guarda | Exposto, Fissurado: n (acumula até 3), Marcado: n, Sentença: n |
| Estados de Combate | Acelerado, Fortalecido: n, Concentrado, Espelho: n, Intangível, Último Fôlego, Despertado: n |
| Outros | Vínculo |

O que o sistema faz sozinho:

- **Dados:** −1d6 e +1d6 nos testes e nas Esquivas (Confuso, Cego, Medo contra quem o causou, Derrubado, Marcado,
  Envenenado, Encantado, Concentrado, Despertado…) e o dano a mais de Fortalecido, Fúria e Despertado, com o motivo
  no cartão. Adormecido falha na Esquiva.
- **Dano aplicado:** Exposto fica sem Defesa e sem Anulação, Intangível não sofre dano físico, Marcado soma o seu
  Valor quando a Esquiva falha, Último Fôlego segura em 1 PV, Vínculo divide o dano, Espelho devolve, Maldito não
  recupera PV, [Chama] derrete o Congelando e o Adormecido acorda.
- **Turnos:** Envenenado no início do turno, Eletrificado a cada Ação Maior, Queimando e Sentença no
  Encerramento; Lento age depois dos outros, Acelerado tem duas Ações Menores, Paralisado e Adormecido perdem a vez.
- **Acúmulos:** o terceiro Congelando paralisa; o terceiro Fissurado quebra a guarda (a Barreira some e vem Exposto).
- **Ficha:** Exposto e Fissurado baixam as defesas; Congelando, a Velocidade e a Iniciativa; Enraizado, Agarrado,
  Paralisado e Adormecido zeram a Velocidade.
- **Proibições:** as ações, os alvos e o movimento que as condições impedem (Silenciado, Desarmado, Selado,
  Agarrado, Provocado, Encantado, Cego, Fúria, Enraizado, Medo…) avisam ou bloqueiam, como os limites de uso.
- **Fim:** cada condição acaba quando a regra manda (fim do turno, Encerramento, fim da cena) e
  respeita o Aflito; Agarrado e Vínculo acabam quando quem os causou fica Incapacitado; Despertado deixa Fadiga.
- **Livrar-se com uma ação:** no HUD, o ícone de corrida ao lado da condição gasta a ação da regra (Ação Menor para
  Queimando, de Movimento para Derrubado, Maior para Envenenado…).
- **Origem:** Medo, Encantado, Provocado, Agarrado e Vínculo lembram quem os causou (quem usou a habilidade ou o
  estado clicável).
- Duas tags novas para as habilidades: [Feitiço] e [Canção]. Silenciado impede as duas e o [Ataque Mágico].

## A automação

### Uso de habilidades
- **Custos de Ódio e Destino** pagos ao usar (o Ódio só conta em combate iniciado).
- **Limites de uso** (1/Cena, (NH)/Cenário, 1/Rodada…) contados por personagem.
- **Momento e economia de ações:** cada ação no seu Processo, a Manutenção na Manutenção, o Encerramento no
  Encerramento, a Ação Maior, a Menor e a de Movimento uma vez por turno.
- **Habilidades de itens:** o item equipado, a trava de NP, o Ódio mínimo e a Pré-Ação.
- **Avisar ou bloquear:** cada conferência pergunta se é para usar mesmo assim ou bloqueia o jogador (o Mestre
  sempre pode forçar).
- **Registro no cartão** com o que foi gasto e o botão **Desfazer uso**.

### Combate
- **Topo e Abaixo no Ódio por combate**, certos mesmo com vários combates ao mesmo tempo.
- **Encerramento:** a Regeneração cura e depois a Deterioração causa dano, com um resumo no chat.
- **Atordoado, Cambaleante, Paralisado, Silenciado e Provocado** acabam no fim do turno de quem os
  recebeu.
- **Incapacitado** com PV 0; Incapacitados, Mortos e Ausentes passam a vez.
- **Fim de cena ao encerrar o combate:** Aventureiros Incapacitados voltam, Mortos revivem com Fadiga, inimigos
  Incapacitados morrem, Estados Negativos e de Combate acabam.
- **Cartões de ataque e dano:** o dano fica ligado ao ataque certo, não aplica em quem ainda precisa esquivar nem em
  quem esquivou, pergunta antes de aplicar de novo, e cartões privados aparecem para os donos dos alvos.
- **Corpo a corpo encostado** (regra da casa): um token encostado, de lado ou na diagonal, conta como Corpo a corpo.
- **Destino:** +1d6 no Teste, rerrolar o acerto, a esquiva ou qualquer 2d6, e remover um Estado Negativo.
- **Switch** (habilidade básica): você e um aliado a até 2 Qd trocam de lugar e de Ódio, e o aliado fica
  [Concentrado]; os tokens e o Ódio trocam sozinhos.

### Turno (cada jogador escolhe)
Aviso com som quando começa a sua vez, selecionar o token na sua vez, levar a tela até quem age e limpar os alvos no
fim da sua vez.

### Estados e efeitos a partir do chat
- **Estados clicáveis:** os estados escritos nos cartões ([Atordoado], [Deterioração: 10], [Fraqueza (Chama): 5]…)
  viram etiquetas que aplicam o estado nos seus alvos com um clique, até o fim da cena.
- **Criar efeito nos alvos:** botão direito num cartão de habilidade ou item.

### Conteúdo dos itens e monstros
Os itens e os monstros dos compêndios já trazem os dados que antes só existiam no texto: o dano dos ataques de
monstro e dos consumíveis, os estados, os bônus fixos, os estados de início de cena, a Fadiga que a comida tira, a
cura das poções e joias, a trava de NP e os **poderes de gatilho dos itens**, que viram habilidades de quem carrega
o item (usadas pelo ícone do item, com Momento, limite, custo e Desfazer). Monstros feitos à mão têm o dano dos
ataques lido do texto, em português ou inglês.

### Ferramentas do Mestre
Em **Configurar Opções → Eternia → Ferramentas do Mestre**: encerrar a cena ou o cenário dos tokens selecionados ou
de todos os personagens e completar o que falta no mundo (dano de monstros feitos à mão e habilidades dos poderes de
itens).

## Configurações

Em **Configurar Opções → Eternia**, separadas por seção. As do mundo (só o Mestre muda) valem na hora, menos as
janelas em pergaminho, que pedem para recarregar.

| Configuração | Padrão |
|---|---|
| Cobrar custos de Ódio e Destino | ligado |
| Limites de uso | avisar |
| Momento e economia de ações | avisar |
| Topo e Abaixo no Ódio por combate | ligado |
| Regeneração e Deterioração no Encerramento | ligado |
| Estados que acabam no fim do turno | ligado |
| Incapacitado automático | ligado |
| Fim de cena ao encerrar o combate | ligado |
| Aventureiros mortos revivem no fim da cena | ligado |
| Corpo a corpo alcança os quadrados vizinhos | ligado |
| Efeitos automáticos das condições | ligado |
| O que as condições proíbem | avisar |
| Correções nos cartões de ataque e dano | ligado |
| Botões de Destino | ligado |
| Estados clicáveis no chat | ligado |
| Criar efeito a partir de um cartão | ligado |
| Conteúdo dos itens e monstros | ligado |
| Tema pergaminho no chat | ligado |
| Janelas do sistema em pergaminho | ligado |
| Barras e nomes dos tokens no estilo da ficha | ligado |
| Quem vê a barra de PV dos tokens | todos, sempre |

Cada jogador escolhe as suas: HUD de ações (ligado), HUD sem token selecionado (ligado), barra de macros do Foundry
(esconder), aviso da sua vez (ligado), selecionar o token na sua vez (desligado), levar a tela até quem age
(desligado), limpar os alvos no fim da sua vez (ligado) e ícones animados (ligado).

## Instalação

No Foundry: **Sistemas de Jogo → Instalar Sistema**, e cole no campo **URL do Manifesto**:

```
https://github.com/rezendesjoao/eternia/releases/latest/download/system.json
```

Esse endereço aponta para a versão mais recente publicada nas
[releases](https://github.com/rezendesjoao/eternia/releases), então o Foundry também avisa quando houver
atualização. Requer o Foundry VTT v14.

## Para macros

```js
const eternia = game.eternia;
eternia.endScene(actors);             // encerra a cena desses atores
eternia.endScenario(actors);          // encerra o cenário (e a cena)
eternia.rollCheck(item, useMessage);  // Teste de uma habilidade, ligado ao cartão de uso
eternia.rollDamage(item, attackMsg);  // Dano contra um cartão de ataque específico
eternia.rollActorCheck(actor, token, "athletics", { ask: true }); // teste de perícia, como na ficha
eternia.spendFate(actor);             // gasta 1 Destino
eternia.removeBadStatus(actor);       // remover um Estado Negativo com Destino
eternia.applyStatus(actor, "decay", { value: 10 }); // aplica um estado como os efeitos de habilidade
eternia.applyStatus(actor, "frightened", { from: boss }); // condição com origem (Medo de boss)
eternia.conditions.recover(actor, "burning");          // livra-se gastando a ação da regra
eternia.conditions.damage(actor, 5, { reason: "burning" }); // dano de condição, com Barreira e linha no chat
eternia.fillWorld({ dryRun: true });  // conta (ou completa) o que falta no mundo
eternia.syncItemSkills(actor);        // habilidades dos poderes dos itens do personagem
eternia.parseMonsterDamage(html);     // lê o dano de um ataque de monstro escrito em texto
eternia.hud();                        // o HUD de ações desta tela
eternia.motor.get(actor, "samurai");  // o Motor da classe: estado, pontos e o resto da regra
eternia.motor.add(actor, "samurai", 1); // +1 Corte (dentro do Teto)
eternia.motor.change(actor, "samurai", { state: "drawn" }); // muda o estado
eternia.motor.max(actor, "samurai");  // o Teto
eternia.professions.open(actor, "craft"); // a bancada da profissão num modo (craft, fusion, gather, retouch…)
eternia.professions.of(actor);        // profissão, Rank, EXP, tentativas e nível máximo
eternia.professions.addExp(actor, 10); // EXP da profissão (anuncia o Rank novo)
eternia.icons.styleOf(item);          // como o ícone do item é desenhado (moldura, nível, tema, cor)
eternia.icons.refresh();              // desenha de novo os ícones da tela
```

## Limites conhecidos

- **Reações** (Antes/Após o Teste, Antes/Após o Dano, Rolagem de Dano) ainda não são oferecidas na hora certa.
- **Desfazer uso** devolve custos e contagens, mas não apaga os efeitos que a habilidade aplicou.
- **Poderes de itens** que dependem de uma escolha, de um resultado ou de outra habilidade ficam só com os campos, o
  texto e a contagem de usos; o efeito deles é feito à mão.
- **Os estados das habilidades** entram pelo botão **Aplicar efeitos**, depois do acerto.
- **Desfazer o dano** não devolve o dano que o Espelho e o Vínculo mandaram para outro personagem.
- **Acordar quem está Adormecido** (outro personagem gasta uma Ação Menor) é feito à mão, tirando o estado.
- **Raças:** o que acontece fora das regras fica na mão do grupo: a conversa com espíritos (Olhos de Mana), a
  visão de outra criatura (Clarividência), o elo mental (Elo de Sangue), a visão do Mestre (Premonição), o
  disfarce (Mil Faces), carregar alguém voando (Aera, Parceiro) e atingir um segundo alvo com uma Cauda
  (Fogo-Raposa).
- **Erro do core 14.367 no console** com combates simultâneos (`Cannot use 'in' operator to search for 'turn'`): vem
  do rastreador de combate do Foundry e é inofensivo.

## Desenvolvimento

- `module/` é o código (entrada em `module/eternia.mjs`): `documents/`, `sheets/` (as fichas de pergaminho estendem as
  classes base), `helpers/`, `apps/`, `piles/`, `automation/`, `chat/`, `content/`, `hud/`, `canvas/`, `classes/`
  (os Motores das classes e a aba Classe), `professions/`, `conditions/` (as condições da Eternia) e `i18n/` (os termos
  em português). `templates/`, `css/` e `lang/` seguem a
  mesma divisão.
- O visual de pergaminho (`css/automation.css`, `sheet.css`, `chat.css`, `windows.css`, `hud.css` e `tbg.css`) entra
  na camada de CSS `modules` (veja `styles` no `system.json`), acima do CSS base do sistema e do Foundry.
- Os compêndios são versionados em `src/packs/<pacote>/*.json`, em português. Os campos que a automação lê (tags,
  Momento, alcance, alvo, custo, limite, tipos) ficam em inglês e aparecem traduzidos na tela.
  - `npm install` e depois `npm run packs:build` compila `src/packs` → `packs` (com o mundo fechado).
  - `npm run packs:unpack` faz o caminho de volta, depois de editar os compêndios dentro do Foundry.
- `npm run package` monta `dist/eternia.zip` e `dist/system.json` para a release.
- `tools/make-textures.py` gera as texturas da ficha e `tools/make-logo.py` o logo, sem arte de terceiros.
- `tools/make-status-icons.mjs` gera os ícones dos estados a partir dos ícones do game-icons.net.
- `docs/condicoes.md` explica onde cada regra das condições está no código e como criar uma condição nova.
- `docs/classes.md` tem as regras de construção das classes e a referência técnica dos Motores.

## Créditos

- **Kyane (Tenyryas):** criador do sistema original de Log Horizon TRPG para o Foundry
  ([repositório](https://github.com/Tenyryas/lhtrpg)).
- **DeadlyPoisonK:** mantenedor do [LHTTRPG](https://github.com/DeadlyPoisonK/LHTTRPG), a base desta versão (2.1.1), e
  tradutor dos compêndios para o inglês.
- **Asacolips Projects / Foundry Mods:** autores do modelo Boilerplate de onde o sistema original nasceu.
- **Mamare Touno / Kadokawa:** criadores de Log Horizon e de Log Horizon TRPG (ログ・ホライズンTRPG), de onde vêm as
  regras de base e o conteúdo dos compêndios (itens, bestiário, habilidades básicas e de montaria, poderes EX do
  Mestre e o diário de regras), adaptado do banco de dados oficial e gratuito ([lhrpg.com](https://lhrpg.com/lhz/top)).
  A Eternia não é oficial nem tem vínculo com eles.
- **Fontes** (SIL Open Font License 1.1, `OFL.txt` em cada pasta de `assets/fonts/`): Noto Serif JP, Edu SA Beginner,
  Eczar e Gelasio.
- **Arte da interface** (`assets/ui/**`): do sistema original de Kyane. As texturas da ficha e o logo são gerados
  por `tools/`.
- **Ícones dos itens:** os do Foundry VTT (arte de Rexard, licenciada para uso dentro do Foundry; o sistema só aponta
  para eles). As katanas, os chicotes e os itens de Sword Art Online (`assets/icons/items/`) são arte própria da
  Eternia.
- **Reki Kawahara / Kadokawa:** criadores de Sword Art Online, de onde vêm os nomes e a inspiração dos itens das pastas
  Aincrad, Alfheim e Submundo. A Eternia não é oficial nem tem vínculo com eles.
- **Ícones** de [game-icons.net](https://game-icons.net) sob [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
  (fundos dos estados recoloridos). Autores: Lorc, Delapouite, Skoll, Sbed, Zeromancer e
  Carl Olsen.

<details>
<summary>Ícones dos estados e do compêndio (game-icons.net)</summary>

| Uso | Ícone | Autor |
| :--- | :--- | :--- |
| fatigue | tired-eye | Delapouite |
| weakness | cracked-shield | Lorc |
| incapacitated | knockout | Skoll |
| dead | tombstone | Lorc |
| staggered | foot-trip | Lorc |
| dazed | knocked-out-stars | Delapouite |
| rigor | frozen-body | Delapouite |
| confused | brainstorm | Lorc |
| decay | bleeding-wound | Lorc |
| pursuit | footprint | Lorc |
| afflicted | broken-heart | Lorc |
| overconfident | laurel-crown | Lorc |
| regen | heart-plus | Zeromancer |
| cancel | cancel | Sbed |
| barrier | magic-shield | Lorc |
| hidden | hidden | Lorc |
| swimming | swimfins | Delapouite |
| flying | feathered-wing | Lorc |
| identified | magnifying-glass | Lorc |
| standby | hourglass | Lorc |
| hateTop | angry-eyes | Delapouite |
| hateUnder | target-arrows | Lorc |
| absent | exit-door | Delapouite |
| paralyzed | spider-web | Lorc |
| asleep | night-sleep | Delapouite |
| rooted | tree-roots | Delapouite |
| prone | falling | Sbed |
| slowed | snail | Lorc |
| grappled | grab | Lorc |
| silenced | silenced | Delapouite |
| disarmed | drop-weapon | Skoll |
| blinded | blindfold | Delapouite |
| sealed | padlock | Lorc |
| frightened | terror | Lorc |
| charmed | smitten | Lorc |
| taunted | shouting | Lorc |
| berserk | enrage | Delapouite |
| burning | flame | Carl Olsen |
| poisoned | poison-bottle | Lorc |
| freezing | snowflake-2 | Lorc |
| shocked | electric | Sbed |
| cursed | cursed-star | Lorc |
| exposed | shield-disabled | Skoll |
| fissured | cracked-helm | Lorc |
| marked | human-target | Delapouite |
| doom | grim-reaper | Lorc |
| hasted | sprint | Lorc |
| empowered | muscle-up | Lorc |
| focused | meditation | Lorc |
| mirror | mirror-mirror | Lorc |
| intangible | ghost | Lorc |
| lastStand | half-heart | Lorc |
| awakened | aura | Lorc |
| bond | linked-rings | Lorc |
| Habilidades de Montaria | horse-head | Delapouite |

</details>

## Licença

O código (scripts, templates, estilos e arquivos de idioma) é distribuído sob a **licença MIT**, veja
[LICENSE.txt](LICENSE.txt). Ela não cobre as regras, o cenário nem o conteúdo de Log Horizon TRPG, que pertencem a
Mamare Touno e Kadokawa, nem os nomes de Sword Art Online, de Reki Kawahara e Kadokawa.
