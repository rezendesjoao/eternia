# Eternia

Sistema de RPG de mesa para o **Foundry VTT v14**. As regras de base são as de Log Horizon TRPG (ficha, habilidades
por NH, combate por Processos, Ódio, Destino, estados e durações); as classes, as raças e as habilidades são as da
Eternia. A ficha em pergaminho, o HUD de ações, o chat, os tokens e a automação de mesa fazem parte do próprio
sistema, feitos para mesas com muitos jogadores e vários combates ao mesmo tempo.

## Versão 0.45.0

- **Novo na 0.45.0: o Mercado e as lojas.** O botão Mercado (na barra dos tokens) abre todos os itens dos compêndios
  numa janela grande, com o preço, o que cada um dá e a descrição, filtros por tipo, Nível, preço, venda, grau, pasta e
  tags, e a busca. Só o Mestre compra para um personagem, dá de graça ou arrasta para uma ficha; os jogadores só olham.
  O Mestre marca itens e cria uma loja, que vira um token na cena: com dois cliques nele, o jogador vê só os itens
  daquela loja, compra e vende (veja [O Mercado e as lojas](#o-mercado-e-as-lojas)).
- **Desde a 0.44.0: menos cliques no combate.** O dano, a cura e os efeitos da habilidade entram sozinhos em quem o
  golpe atingiu, com um cartão de resultado por golpe e o Desfazer tudo. O monstro mira o Topo de Ódio, ataca em um
  clique no HUD e rola o dano quando acerta; o (Menor) e o Destino dos chefes também. A Ação Instantânea conta, as
  poções gastam a ação, o turno acaba quando as ações acabam e a Manutenção e o Encerramento passam sozinhos, cada
  automação com a sua configuração (veja [A automação](#a-automação)).
- **Desde a 0.43.0: os consertos.** O dano pelo botão Dano soma os estados de quem ataca ([Fortalecido], [Combo], a
  Matilha) e gasta o "próximo ataque"; o golpe que a Defesa, a Anulação ou a Barreira zeraram não dá os estados do
  acerto; o Topo de Ódio é o da hora do ataque; quem caiu não esquiva; voltar no rastreador não repete o Encerramento
  nem o começo dos turnos. Um NPC num token hostil luta como inimigo. A Fadiga baixa o PV atual, as bolsas dão o
  espaço que dizem, os graus dos consumíveis têm os efeitos, e o Proteger desvia o dano sozinho. O Bestiário fica só
  com as 52 criaturas da Eternia: os monstros antigos de Log Horizon saíram (veja [O bestiário](#o-bestiário)).
- **Desde a 0.42.0: o balanço.** As 14 classes ficam na mesma faixa de força (cada Motor faz o que fazia, com números
  novos), as Magias Ancestrais rolam 1d6 a mais nos feitiços de ataque, os Tabus pesam parecido, seis raças foram
  ajustadas e o Poder Mágico do equipamento vem de uma fonte só (o Cajado ou a melhor Pedra Mágica). Os inimigos batem
  mais, sem ganhar PV: um encontro padrão custa ao grupo pelo menos 65% dos PV no NP 1, e mais a cada NP. O Guia de
  Criação de Inimigos está com o dano novo, e AS REGRAS dizem quantas de cada criatura usar (XIV.g. O PESO DOS
  ENCONTROS). As fichas e as criaturas que o mundo já tem são atualizadas sozinhas (veja [As classes](#as-classes) e
  [As Magias](#as-magias)).
- **Desde a 0.41.0: 18 personagens maiores novos.** O compêndio Personagens Maiores (só do Mestre) ganha a pasta v2,
  com mais 18 personagens de grande relevância na história, entre eles Bercouli, Chudelkin e Deusolbert com os nomes da
  obra: agora são 140. Como os outros, cada um vem com nome, raça e token e retrato no traço de anime, e a ficha em
  branco para o Mestre montar (veja [O bestiário](#o-bestiário)).
- **Desde a 0.40.2: o retrato que é token aparece como o token na ficha.** Sem o quadrado escuro nem a moldura
  quadrada atrás, e do tamanho do lugar do retrato, na aba Personagem, na Biografia e na ficha de monstro; um token
  novo feito no mesmo padrão entra sozinho (veja [A ficha de personagem](#a-ficha-de-personagem)).
- **Desde a 0.40.1: a barra de PV em arco.** A barra de PV dos tokens virou um arco com borda dourada sobre o aro de
  cima, e nada sai do token para o vizinho cobrir; o nome continua igual, logo abaixo da borda. Os losangos do Destino
  foram para a borda de baixo, e os ícones de estado começam abaixo da ponta do arco (veja [Os tokens](#os-tokens)).
- **Desde a 0.40.0: NPCs e Personagens Maiores em compêndios próprios e número romano no mapa.** O Bestiário fica só
  com as criaturas, e os NPCs e os Personagens Maiores ganham um compêndio cada: quem importa uma categoria não traz as
  outras. No mapa, cada criatura do Bestiário ganha um número romano depois do nome (Kobold I, Kobold II, Kobold III),
  também nos chamados e nas levas das Fendas. A luz das feras e divindades absolutas ficou fraca e própria de cada uma, e
  os demônios trazem uma névoa escura em volta do token (veja [O bestiário](#o-bestiário)).
- **Desde a 0.39.0: 122 personagens maiores.** O compêndio Personagens Maiores (só do Mestre) traz os personagens de
  grande relevância na história, em 14 pastas, cada um com nome, raça e token e retrato no traço de anime. A ficha vem em
  branco para o Mestre montar: o assistente de criação abre com a raça já marcada. As feras e divindades absolutas têm um
  token de outro formato, com raios de ouro e um céu da noite, em 2×2.
- **Desde a 0.38.0: 126 NPCs prontos.** O compêndio NPCs (só do Mestre) traz gente de todo canto do mundo, do
  camponês ao alto sacerdote, das casas nobres às guildas, dos elfos das vilas de cristal ao Território Negro e a
  Aincrad, em nove pastas. Cada um tem nome, raça, profissão com o Rank, NP, token e retrato no traço de anime e um
  gancho na biografia; os guerreiros têm classe, e ninguém tem Magia (veja [O bestiário](#o-bestiário)).
- **Desde a 0.37.0: 24 criaturas novas no bestiário do Império.** Gosmas e armadilhas vivas, olhares que petrificam,
  mortos que levantam, gente da fronteira, o estranho das Fendas e chefes que pedem estratégia, do NP 1 ao 7, cada uma
  com uma regra automatizada que muda o jeito de lutar (o disfarce, o engolir, o grudar, o olhar, o levantar, a Fúria
  Sanguinária, o teleporte, a fase, as cabeças e outras) e com token e retrato. Os 22 monstros antigos ganharam nomes no
  estilo dos bestiários de RPG de mesa, e a pasta O Império se divide por NP; os monstros que o mundo já tinha ganham os
  nomes e a arte novos sozinhos (veja [O bestiário](#o-bestiário)).
- **Desde a 0.36.0: a arte do bestiário do Império.** Os 28 monstros do Império têm retrato e token próprios, no traço
  de anime, com a moldura da Eternia (aro de ouro, fio carmesim e fundo branco); as três Fendas têm um token hexagonal de
  fundo roxo com brilhos e uma luz violeta animada (veja [O bestiário](#o-bestiário)).
- **Desde a 0.35.0: o bestiário do Império completo.** Os goblins de incursão, que temem a luz (a Tropa que o dano em
  área acerta em dobro, o Fumaceiro e o Chefe que foge com o saque se não estiver preso), o Oco, os monstros das Quedas
  de Aincrad, a Fenda Grande e a Fenda-mãe, e os seis **Desgarrados**, que podem ser salvos: com 1/4 dos PV, o botão
  **Salvar** no chat, a Negociação contra a Resistência e a Conexão de quem o salvou (veja [O bestiário](#o-bestiário)).
- **Desde a 0.34.0: o bestiário do Império e os itens deixados automáticos.** Quando um monstro cai, o 1d6 dos itens
  deixados rola sozinho e quem o derrubou leva os itens e o ouro, com um cartão no chat e o Desfazer do Mestre; a ficha de
  monstro ganhou a aba **Itens Deixados**. Os primeiros monstros do Império chegam com regras próprias automatizadas (os
  kobolds das galerias, as feras do Peso, os contrabandistas e a Fenda Pequena), e a coroa **Dar Nome** faz de qualquer
  fera uma fera com nome (veja [O bestiário](#o-bestiário)).
- **Desde a 0.33.0: a aba Raça na ficha.** Os cinco estágios da forma da raça do personagem numa trilha, cada um com o
  que muda no corpo, o rito, o que o mundo vê e o que ele dá; o estágio que já pode despertar brilha e tem o botão
  **Evoluir**, e a aba ganha um número (veja [A ficha de personagem](#a-ficha-de-personagem)).
- **Desde a 0.32.0: as seis raças do mundo, a evolução da forma e O Mundo de Eternia.** Humanos, Elfos, Dracônicos,
  Demônios, Celestiais e Bestiais (Felinos, Lupinos ou Vulpinos), cada raça com cinco estágios da forma, cada um mais
  bestial e mais forte, com um rito e habilidades novas: o selo **Forma** no cartão da raça abre a evolução, e o Mestre
  aprova no chat. O compêndio **O Mundo de Eternia**, só do Mestre, traz o mundo de jogo em 18 diários (veja
  [As raças](#as-raças) e [O Mundo de Eternia](#o-mundo-de-eternia)).
- **Desde a 0.31.0: a Biografia, os tokens prontos e o assistente de criação refeito.** A aba **Biografia** tem o
  Perfil (dados pessoais, aparência, personalidade e as Origens que a raça, a classe e as Magias contam), a História, os
  Laços e as Anotações. O token de um personagem já vem enxergando e vinculado à ficha, o nome fica pequeno e sempre à
  vista, a barra de PV só aparece em combate e os personagens esquivam sozinhos. No assistente de criação, os feitiços
  mostram o que fazem ao passar o mouse, os Atributos viraram uma tabela, os Itens mostram o kit equipado num corpo e o
  Resumo virou a página do personagem (veja [A ficha de personagem](#a-ficha-de-personagem), [Os tokens](#os-tokens) e
  [A criação de personagem](#a-criação-de-personagem)).
- **Desde a 0.30.1: o cartão de NP e a animação dos estados.** Subir ou descer de NP manda para o chat um cartão com o
  retrato numa faixa na cor da classe, o NP num selo, os Atributos Base, os PV e o que a classe dá pelo caminho. E um
  estado posto num token gira até o lugar dele entre os ícones, no lugar do texto com o nome (veja [O chat](#o-chat) e
  [Os tokens](#os-tokens)).
- **Desde a 0.30.0: os itens iniciais e a sugestão de atributos.** O assistente de criação ganhou o passo **Itens**:
  a Mochila, o Kit de Aventureiro e o Sanduíche vêm de graça, e os 350 de ouro compram o resto numa loja com os itens
  de Nível 1. Cada classe tem um kit recomendado que um clique compra, e a bolsa ao lado mostra onde cada peça vai e os
  números que o equipamento dá; ao criar, tudo entra equipado. O passo Atributos sugere os cinco pontos para a classe
  (veja [A criação de personagem](#a-criação-de-personagem)).
- **Desde a 0.29.1: as habilidades do HUD em três painéis.** O botão Habilidades do HUD de ações virou **Gerais** (as
  básicas e as da raça), **Magias** (os feitiços agrupados por Magia, cada um com o seu Momento) e **Classe** (as da
  classe e as de uma Dedicação). E as caixas de mensagem mais altas que a tela, como a de subir vários NP de uma vez,
  não perdem mais os botões: o texto rola acima deles (veja [O HUD de ações](#o-hud-de-ações)).
- **Desde a 0.29.0: a ficha nova e o assistente de criação.** A ficha ficou mais larga (940×780), com o nome de cada
  aba ao lado do ícone e um número dourado quando há algo esperando nela; a aba Personagem traz a raça, a classe e a
  profissão em cartões e os atributos com os seus testes, e a aba **Magias** mostra as vagas da classe e todos os
  feitiços de cada Magia, com o Traço e o Tabu, sem nomes cortados. O **assistente de criação** monta o personagem em
  sete passos (Raça, Classe, Magia, Profissão, Atributos, Habilidades e Resumo), explicando cada opção, com a ficha
  montando ao lado; ele abre sozinho quando um personagem novo é criado. A janela de Magias e os navegadores abrem na
  hora (veja [A ficha de personagem](#a-ficha-de-personagem) e [A criação de personagem](#a-criação-de-personagem)).
- **Desde a 0.28.0: vinte Magias das categorias altas e onze condições.** Os **Mandamentos** dão um Decreto, uma lei
  em volta de você que amaldiçoa na hora quem a quebra; a **Ruptura Crítica** liga o [Ímpeto], o **Combo Estelar** soma
  o [Combo] a cada acerto e a **Nebulosa Sinistra** puxa os inimigos. O **Infinito** faz os feitiços durarem a cena, a
  **Invasão** prende a mente ([Pesadelo], [Amnésia]), a **Criação** dança com o [Ritmo] e o **Desastre** promove e
  rebaixa estados. A **Arca** executa demônios, **O Soberano** vira tudo do avesso ([Inversão]), o **Portão do Inferno**
  come almas e a **Praga** não mata. A **Lâmina Divisora** luta com [Clones], a **Lança Espiritual** troca de Forma, a
  **Forma Indura** tem sete corações e o **Sangue Demoníaco** transforma no terceiro feitiço. O **Caos** cria na hora,
  o **Lampejo** age fora do turno, a **Visão** guarda o Presságio e a **Fonte da Juventude** é imortal (veja
  [As Magias](#as-magias) e [As condições](#as-condições)).
- **Desde a 0.27.0: quatro Magias das categorias altas e cinco condições.** O **Sol** (Ancestral) traz o Relógio do
  Sol: o [Sol] sobe a cada rodada e a cada feitiço até o meio-dia, quando você vira [O Único], e depois desce. O
  **Contra-ataque** (Perdida) devolve o golpe em dobro com o [Contragolpe] e guarda o dano no [Rancor]. As **Chamas do
  Purgatório** (Maldição) acendem a [Chama Negra], que não apaga e não deixa ninguém se curar. O **Roubo** (Proibida)
  tira um bônus do alvo a cada acerto e cura você com o dano (veja [As Magias](#as-magias) e
  [As condições](#as-condições)).
- **Desde a 0.26.0: a revisão das Magias.** Cada uma das 73 Magias ganhou um **Traço**, uma regra passiva própria que
  vale para os feitiços dela: o Fogo bate mais em quem já queima, os Olhos Mágicos petrificam quem já está com
  Rigidez, a Água não queima, o Esmagamento atravessa a Barreira, o Encantamento fere mais quanto mais encantos o alvo
  tem. 47 feitiços mudaram para que as Magias parecidas fiquem diferentes, e cinco condições novas (Encharcado,
  Enfraquecido, Pavio, Servo e Dominado; veja [As condições](#as-condições)) dão regra às invocações que ficam na luta,
  às bombas que explodem depois e aos corpos controlados. As fichas recebem tudo sozinhas (veja
  [As Magias](#as-magias)).
- **Desde a 0.25.0: os Matadores, as Maldições e mais dezesseis Magias.** Três elementos novos para o Matador de
  Dragões, o Branco, as Sombras e o Veneno, cada um com três talentos e uma Arte Secreta (veja
  [As classes](#as-classes)); dezesseis Magias: as Perdidas Matador de Deuses do Raio, Matador de Deuses do Fogo, Arco
  da Grande Árvore, Arco da Materialização, Maldição do Boneco e Selo do Tempo, as Proibidas Correntes e Artes Brancas,
  Shikigami, Cabelo Carmesim, Sombras, Cópia, Comando M, Histórias dos Mortos, Furtividade e a Portadora Espadas
  Mágicas; e uma categoria nova, a Maldição, o poder dos demônios (o [Silenciado] não impede), com sete: Absorção,
  Aprimoramento, Bomba, Calamidade, Espinhos, Macro e Necromancia (veja [As Magias](#as-magias)). O Matador de Deuses
  agora se chama Matador de Deuses do Céu. O catálogo chega a 73 Magias.
- **Desde a 0.24.0: mais quatro Magias.** Elo dos Sentidos, Magia dos Anjos, Trevas e Amarras, para qualquer classe
  (veja [As Magias](#as-magias)): os sentidos ligados que dividem a dor (uma Magia Perdida, com Tabu), os anjos que
  acertam sem teste e cobram Fadiga de quem conjura, as trevas que agarram e amaldiçoam e os tubos que prendem e calam.
  O catálogo chega a 50 Magias.
- **Desde a 0.23.0: mais quatro Magias.** Neve, Perfume Mágico, Alma de Máquina e Onda, para qualquer classe (veja
  [As Magias](#as-magias)): a neve que congela e cega, os frascos que curam e fortalecem o grupo, o Take Over de
  máquinas e a onda que anula a magia dos outros. O catálogo chega a 46 Magias.
- **Desde a 0.22.0: 14 classes, 7 físicas e 7 mágicas, todas com Magias.** As físicas (Assassino, Berserker, Caçador,
  Centurião, Hierofante, Lutador e Samurai) escolhem uma Magia no NP 1 e outra no NP 10, e os feitiços alimentam o
  Motor delas; o Matador de Dragões ganha duas, no NP 5 e no NP 10. O Monge, o Guardião e o Comandante agora se chamam
  Lutador, Centurião e Hierofante; o Druida, o Sacerdote, o Oráculo, o Estrategista e o Menestrel saíram da lista (as
  fichas antigas continuam funcionando). Os emblemas e a aba Classe ganharam cores por família e função (veja
  [As classes](#as-classes)).
- **Desde a 0.21.0: mais quatro Magias.** Moldagem de Madeira, Areia, Telepatia e Teleporte, para qualquer classe de
  magia (veja [As Magias](#as-magias)): a madeira moldada em armas e punhos gigantes, a areia que cega e engole, a
  mente ligada ao grupo e o salto que leva um aliado junto. O catálogo chega a 42 Magias.
- **Desde a 0.20.0: quatro Magias Portadoras.** Armas Mágicas, Plantas, Fumaça e Pintura Mágica, para qualquer classe
  de magia (veja [As Magias](#as-magias)): a magia mora nas armas, nas sementes, no cachimbo e nos pincéis. O catálogo
  chega a 38 Magias.
- **Desde a 0.19.0: mais quatro Magias.** Gigante, Encantamento, Olhos Mágicos e Alta Velocidade, para qualquer classe
  de magia (veja [As Magias](#as-magias)): o corpo que cresce, os encantos nos aliados, o olhar que petrifica e a
  pressa. O catálogo chega a 34 Magias.
- **Desde a 0.18.0: a escolha da Magia e a aba Classe refeitas, e mais três Magias.** A Magia agora se escolhe numa
  janela grande, com um cartão por Magia, filtros por categoria e por função e, ao passar o mouse, os feitiços por NP e
  o Tabu (veja [As Magias](#as-magias)). A aba Classe cabe na ficha sem rolar, com a trilha do NP e as seções em abas.
  As Magias novas são Projeção de Pensamento, Território e Reflexão.
- **Desde a 0.17.0: três Magias Perdidas.** Matador de Deuses, Magia Viva e Arco do Tempo, para qualquer classe de
  magia (veja [As Magias](#as-magias)): os feitiços batem mais forte que os das outras Magias do mesmo NP, e cada uma
  tem o seu Tabu, o preço que cobra do corpo em combate.
- **Desde a 0.16.0: as Magias elementais.** Fogo, Raio, Terra e Vento, para qualquer classe de magia (veja
  [As Magias](#as-magias)); com a Água e a Moldagem de Gelo, os seis elementos clássicos estão no catálogo. O
  Feiticeiro saiu da lista de classes, e o Mago Negro, com a Magia Fogo, tomou o lugar dele; as fichas que já o usam
  continuam funcionando.
- **Desde a 0.15.0: o Mago Azul e as Magias de Take Over.** O Mago Azul absorve a alma dos monstros que derruba e a
  guarda num grimório; com o Take Over, veste uma delas e luta com a natureza (Fera, Animal, Demônio ou Espírito) e o
  elemento do monstro (veja [As classes](#as-classes)). É a última das sete classes de magia. As Magias novas servem a
  qualquer classe de magia: Alma de Satã, Alma de Fera e Alma Animal (veja [As Magias](#as-magias)).
- **Desde a 0.14.0: o Mago Branco e mais três Magias.** O Mago Branco escreve em runas uma Lei, um número de 2 a 12:
  quando dois dados de qualquer teste da luta somam a Lei, acendem Runas, que reescrevem os dados dos testes (o do
  aliado sobe, o do inimigo desce; veja [As classes](#as-classes)). O Tecelão saiu da lista de classes, e o Mago
  Branco tomou o lugar dele; as fichas que já o usam continuam funcionando. As Magias novas servem a qualquer classe
  de magia: Escrita Rúnica, Escrita Sólida e Magia das Fadas, a primeira Magia Ancestral (veja
  [As Magias](#as-magias)).
- **Desde a 0.13.0: o Invocador vira classe de magia, e mais três Magias.** O Invocador continua com o Lobo, o Golem e
  a Fada, e agora escolhe Magias no NP 1, 5 e 10: com um espírito presente, os feitiços delas dão Laços a ele (veja
  [As classes](#as-classes)). As fichas que já têm o Invocador ganham as vagas de Magia sozinhas. As Magias novas
  servem a qualquer classe de magia: Espíritos Celestiais, Magia Seith e Teatro de Bonecas (veja
  [As Magias](#as-magias)).
- **Desde a 0.12.0: o Pictomante e mais três Magias.** A magia do Pictomante é construída no campo: cada feitiço deixa
  um Molde, que fica lá até ser quebrado, e quebrar vira dano (o Estilhaçar) ou defesa (o Escudo Esculpido) (veja
  [As classes](#as-classes)). As Magias novas servem a qualquer classe de magia: Moldagem de Gelo, Moldagem de Memória
  e Matador de Demônios, a primeira Magia Perdida (veja [As Magias](#as-magias)).
- **Desde a 0.11.0: o Mago Vermelho e mais quatro Magias.** A magia do Mago Vermelho mora na peça que está na mão (a
  Espada, a Armadura ou o Foco): a Carga cresce a cada rodada e a cada feitiço, e o Reequipar troca de peça e solta a
  Descarga da antiga (veja [As classes](#as-classes)). As Magias novas servem a qualquer classe de magia: Reequipar: O
  Cavaleiro, Cartas, Gravidade e Cajados Mágicos (veja [As Magias](#as-magias)). O Ressonante saiu da lista de classes,
  e o Mago Vermelho tomou o lugar dele; as fichas que já o usam continuam funcionando.
- **Desde a 0.10.1: vários NH de uma vez no navegador de habilidades.** Depois de escolher, o botão de subir fica no
  lugar: cada clique põe mais um NH na seleção (adquirir e subir, ou subir duas vezes), até o NH Máximo e o NP, e um
  talento pode ser escolhido junto com o que ele pede.
- **Desde a 0.10.0: o Mago Negro e as Magias.** A classe diz como você conjura e a Magia diz o que você conjura: o
  Mago Negro escolhe uma Magia no NP 1, outra no NP 5 e a terceira no NP 10, entre Água, Artes Negras, Corpos Celestes
  e Esmagamento, e a Pressão sobe a cada feitiço até a Liberação (veja [As Magias](#as-magias)). Também novo: o resumo
  ao mudar o NP (pelo botão ou digitando), com os atributos, os PV, as escolhas e o que a classe dá, e o navegador de
  habilidades abrindo só com o que dá para escolher agora.
- **Desde a 0.9.0: o Matador de Dragões**, a primeira das classes de magia. Ele come o próprio elemento (Fogo,
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
- **Compêndios com conteúdo:** Guia do Jogador, Habilidades Básicas, Habilidades de Montaria, Poderes EX do Mestre,
  Itens, Bestiário, Regras e O Mundo de Eternia (o mundo de jogo, só do Mestre), em português.
- **Compêndios da Eternia:** Raças e Classes (as 6 raças em 8 itens, com os Bestiais em três linhagens, e as 6 antigas; as 10 profissões; as 22 classes, 14 na lista e 8 antigas), Habilidades Raciais e
  Habilidades de Classe (36 por classe, 64 no Matador de Dragões, e as 97 Magias com os feitiços: 1511 ao todo); no compêndio de Itens, as Engenhocas, as Canções e os 108 itens de Sword
  Art Online (veja [Os itens de Sword Art Online](#os-itens-de-sword-art-online)). Ainda vazio: Habilidades Comuns. As
  raças, classes e habilidades gerais e de combate de Log Horizon foram tiradas do sistema.

## A ficha de personagem

Com a organização da ficha de Pathfinder 2e, num tamanho que cabe as três vagas de Magia lado a lado (940×780): um
estandarte verde à esquerda com o que se usa em jogo, o nome numa faixa escura e o conteúdo em pergaminho, com
molduras finas e rótulos em versalete. Cada aba tem o ícone e o nome, e um número dourado quando há algo esperando nela
(escolhas de habilidade, uma vaga de Magia, o Caminho). Fontes Eczar e Gelasio.

- **Estandarte:** PV atual e máximo com a Barreira ao lado e uma barra vermelha do que resta; Ódio numa caixa laranja
  (com a coroa quando está no Topo) e Fadiga numa caixa azul, que enchem conforme o valor; Defesa Física e Mágica em
  escudos, Iniciativa e Velocidade; Poder de Ataque, Mágico e de Recuperação; Precisão, Esquiva e Resistência com o
  número de dados, roláveis com um clique; e os estados ativos, com o botão de remover um Estado Negativo gastando
  Destino.
- **Cabeçalho:** nome, raça · classe · profissão (cada uma abre o seu item), Destino em estrelas (clique soma 1, botão
  direito tira 1) e o NP num brasão, com o botão de subir de NP (e, no NP 1, o da pena, que abre o assistente de
  criação). Subir pelo botão ou digitando outro NP no brasão (vários de uma vez, ou para baixo) abre o mesmo resumo
  antes de mudar: os Atributos Base antes e depois (com os modificadores que mudam), os PV, as escolhas de habilidade,
  os talentos que liberam e o que a classe dá em cada NP (o Caminho, as Magias, a Dedicação, o Ápice). Confirmado, o
  chat registra, vêm as escolhas da classe e o navegador abre com as escolhas contadas; descendo, dá para desfazer as
  escolhas feitas acima do NP novo. Cancelar deixa o NP como estava.
- **Personagem:** o retrato com a raça, a classe e a profissão em cartões, cada um com uma linha do que dá (os
  atributos e PV da raça, a família, a função e o Motor da classe, o Rank e o talento da profissão); os quatro
  atributos, cada um com o modificador e os dois testes que ele dá (um clique rola), com o botão de distribuir pontos;
  e as tags. Um personagem ainda em branco mostra o convite para o assistente de criação. Quando o retrato é um token
  (o aro dourado com o fundo transparente, os raios das divindades, o hexágono das Fendas), ele aparece como o token,
  sem o quadro escuro atrás e do tamanho do lugar, também na Biografia e na ficha de monstro.
- **Habilidades:** de Combate, Gerais e Básicas, agrupadas pelo Momento (Ação Maior, Menor, Movimento, Instantânea,
  Reações, Manutenção, Encerramento, Passivas…), com NH, custo e limite, e uma busca pelo nome. Clique na imagem para
  usar e no nome para abrir os detalhes ali mesmo; o botão Explorar abre o navegador de habilidades.
- **Raça:** cabe na ficha sem rolar. No alto, a faixa da raça na cor dela (o emblema, a linhagem dos Bestiais, a frase
  da raça, os atributos, os PV e o Destino, com o +1 dos estágios em dourado) e o selo **Forma**; embaixo, os cinco
  estágios numa trilha, cada um com o nome, o que muda no corpo, o rito, o que o mundo vê e o que ele dá (as
  habilidades, que o ponteiro explica e o nome abre, e o +1 do IV). Os estágios alcançados, o atual, o que já pode
  despertar (com Evoluir e um número na aba) e os fechados (as habilidades com cadeado e o NP em que abrem) têm cada um
  o seu visual; o Mestre também adianta um estágio e volta um dali. Sem raça, o botão de escolher uma.
- **Classe:** cabe na ficha sem rolar. No alto, a faixa da classe (o emblema, os papéis, os atributos e os PV) e o
  Motor, com o estado e os pontos (no Samurai, a katana sai da bainha quando a lâmina é sacada e os Cortes brilham
  quando o próximo Iai é um Corte Perfeito); depois, a trilha do NP, com o que a classe dá em cada NP (o kit, as Magias,
  o Caminho, a Dedicação, o Ápice e quantos talentos chegam), em que as escolhas em aberto brilham; e as seções, uma
  de cada vez: o kit com as regras do Motor, o elemento (no Matador de Dragões), os talentos por ramo, o Caminho com o
  Ápice, os talentos Gerais e as Dedicações. A seção com uma escolha em aberto abre primeiro, e o ponteiro sobre uma
  habilidade mostra o que ela faz. Sem classe, o botão de escolher uma.
- **Magias:** as vagas da classe (NP 1, 5 e 10 nas mágicas; 1 e 10 nas físicas) à esquerda, com a Magia de cada uma e
  quantos feitiços dela o personagem já tem, e a página da vaga aberta: a categoria, a frase da Magia, o Traço e o Tabu
  e todos os feitiços em blocos, com o nome inteiro (a imagem usa os que o personagem tem, o nome abre, o ponteiro
  mostra o que fazem; os do NP acima ficam apagados com o NP em que chegam). Uma vaga aberta brilha e tem o botão de
  escolher a Magia.
- **Inventário:** o boneco de equipamento (sete espaços ligados por linhas às partes do corpo) e, ao lado, a riqueza
  (receber e gastar ouro fica registrado no chat), o espaço da bolsa e os tíquetes; embaixo, o que se carrega.
- **Profissão:** o brasão da profissão com o Rank, a EXP e as tentativas do cenário, os botões da bancada (Oficina,
  Fusão, talentos), as chances, os materiais, o talento, as obras e os Ranks; sem profissão, as dez para escolher.
- **Efeitos e estados** (os efeitos dos itens dizem "Passivo" na duração).
- **Biografia**, em quatro partes. **Perfil:** um cartão com o retrato, o nome, a alcunha, a raça · classe · profissão
  e o NP, o bordão e quem joga com o personagem; os dados pessoais (idade, gênero, altura, peso, olhos, cabelo, terra
  natal e guilda); a aparência; a personalidade (temperamento, ideais, objetivo, medo, do que gosta e o que detesta); e
  as **Origens**, o que a raça, a classe, a profissão e cada Magia dizem do personagem (o texto de ambientação de cada
  uma, que vem do item). **História:** o texto livre da história. **Laços:** as Conexões e as Uniões. **Anotações:**
  pistas, nomes e promessas da campanha. Os campos do Perfil ficam em `flags.eternia.bio` (a guilda é o campo do
  sistema).

## A criação de personagem

Um assistente de oito passos numa janela grande, com a ficha montando numa faixa verde à esquerda (o retrato, o nome,
o que foi escolhido, os itens e o ouro, os atributos, os PV, o Destino e as defesas). Ele abre sozinho quando um
usuário cria um personagem (a configuração "Assistente de criação" desliga), pelo convite da aba Personagem, pelos
campos vazios de raça, classe e profissão e pelo botão da pena no cabeçalho de um personagem de NP 1.

1. **Raça:** os cartões das raças com a frase de cada uma e o bônus de atributos. A página da que está sob o ponteiro
   (ou escolhida) conta a história, mostra os atributos, os PV e o Destino, as duas habilidades inatas (uma escolha
   entre várias, como o elemento do Pacto Espiritual dos Elfos ou a Bênção do Humano, é feita ali mesmo; o Humano marca
   os dois atributos do +1) e os cinco estágios da forma, com o NP, as habilidades e o rito de cada um. Os Bestiais são
   um cartão só: a linhagem (Felino, Lupino ou Vulpino) é escolhida na página.
2. **Classe:** as 14 classes, com o filtro de físicas e mágicas. A página mostra a base de atributos, os PV, o Motor
   com o que ele ganha, gasta, o teto e o que o zera, o kit do NP 1, a escolha do NP 1 (o elemento do Matador de
   Dragões) e o caminho do NP 1 ao 10 (as vagas de Magia, os três Caminhos, a Dedicação e o Ápice).
3. **Magia:** a janela de Magias dentro do passo, para a vaga do NP 1; uma Magia que pede uma escolha (o Decreto dos
   Mandamentos) pede ali embaixo. Uma classe cuja primeira vaga vem depois (o Matador de Dragões, no NP 5) só avisa. Na
   página da Magia, o ponteiro sobre um feitiço mostra o que ele faz, e um clique abre o texto inteiro ali mesmo.
4. **Profissão:** as dez profissões, com o que cada uma faz, o talento, a Oficina e como sobe de Rank, ou "Decidir
   depois".
5. **Atributos:** os cinco pontos bônus sobre a classe e a raça (nenhum atributo acima de 7), numa tabela com uma
   linha por atributo: o que vem da classe e da raça, os pontos (− e +), o valor (com losangos marcando quanto falta
   para o próximo modificador), o modificador e os testes dele. Embaixo, os números de jogo em três grupos (Vida: PV e
   Destino; Defesas: Física e Mágica; Em combate: Iniciativa, Precisão, Esquiva e Resistência), mudando na hora. No
   alto, os pontos que faltam e a **sugestão para a classe** (um clique usa): os pontos vão para onde a base da classe
   é alta, até o próximo modificador; cada atributo mostra quanto a sugestão põe nele.
6. **Habilidades:** as três de Combate e a Geral da criação (no máximo duas de [Treino]), entre os talentos da classe
   e os feitiços da Magia do NP 1, cada uma com as primeiras linhas; as regras são as do navegador de habilidades (um
   talento aparece com o que ele pede, e entra junto). No alto, o que a raça, a classe e a Magia já dão.
7. **Itens:** a Mochila, o Kit de Aventureiro e o Sanduíche vêm de graça, e o ouro do personagem (350) compra o resto
   numa loja com os itens de Nível 1 dos compêndios do sistema e do mundo (sem os [Invendáveis], os [Intransferíveis]
   e os mágicos [M1]–[M7]; um [Raro] aparece com uma gema, para combinar com o mestre). O **kit recomendado para a
   classe** já vem equipado ao chegar no passo; no alto ficam o porquê, o preço e um botão que o equipa de novo, e os
   itens dele têm uma estrela na loja. Uma classe que luta com arma e tem uma Magia que ataca ganha a sugestão do Anel
   Cinzento (+4 no Poder Mágico, com um chapéu de mago). No centro, o **corpo**: cada peça no seu lugar ao redor de uma
   silhueta (a mão principal, a outra mão, que uma arma de duas mãos ocupa, a armadura, a bolsa e os três acessórios,
   cada um onde é usado: o anel na mão, o amuleto no pescoço, o brinco na orelha, a capa nos ombros, as botas nos pés),
   com os números que o equipamento dá nos cantos (Poder de Ataque e Mágico, Precisão, Defesas e Iniciativa) e, embaixo,
   o que vai na bolsa, com o espaço (2, mais o da bolsa equipada). Clicar num lugar filtra a loja para ele, e o **×**
   devolve a peça. À direita, a loja: o ouro que sobra, a busca e os filtros por tipo; um clique compra (uma arma,
   armadura ou escudo novo vai para o corpo, e o que estava lá passa para a bolsa), o **−** devolve, e o ponteiro mostra
   o que o item faz.
8. **Resumo:** a página do personagem. No alto, o retrato (o token pega o retrato), o nome, a raça · classe · Magia ·
   profissão, o NP, os PV, o Destino e o ouro; embaixo, as **Origens** (a raça, a classe com o Motor, a Magia com a
   categoria e a frase dela e a profissão), os **Atributos e números**, as **Habilidades** que vão entrar (da raça, da
   classe, da Magia e as escolhidas, cada uma com o que faz ao passar o mouse, e a opção de dar as 16 habilidades
   básicas) e o **Equipamento** (o corpo, a bolsa e o ouro).

Nada muda na ficha até **Criar personagem**: aí vêm, de uma vez, a raça (com o +1 do Humano), a classe, a profissão, o
kit, a escolha do NP 1, a Magia (com o Decreto), as escolhas da criação marcadas como escolhas (o navegador de
habilidades as conta como feitas, e descer de NP as desfaz como antes), as habilidades básicas e os itens iniciais,
equipados onde a bolsa mostrou, com o ouro que sobrou, PV e Destino cheios e um cartão no chat com a raça, a classe, a
Magia, a profissão e o equipamento (a configuração "Cartão de personagem novo" desliga). Abrir o assistente num
personagem de NP 1 já criado começa das escolhas dele; criar de novo troca o que veio da raça, da classe, das escolhas
e dos itens iniciais (o ouro deles volta), e o resto da ficha fica.

## A ficha de monstro

A mesma organização num tamanho pequeno (580×610): PV, Barreira, Destino e multiplicador de Ódio no estandarte,
defesas, Esquiva e Resistência roláveis; habilidades agrupadas pelo Momento, com o teste, o dano e o limite à
vista; os itens deixados (veja [O bestiário](#o-bestiário)); efeitos, estados e descrição. Todo campo é editável na
própria ficha.

## O chat

- **Rolagens** numa faixa com os dados como faces, o modificador e o total num selo; testes mostram **Crítico** e
  **Desastre**.
- **Cartões de habilidade e de item:** Momento, Alvo e Alcance sob o nome, Teste e Dano em duas linhas, NH, Custo e
  Limite em etiquetas, a descrição dobrada.
- **Ataque e dano:** alvos numa linha cada, com distância, esquiva e resultado; o dano aplicado numa linha.
- **Subir e descer de NP:** um cartão com o retrato numa faixa na cor da classe, o NP num selo dourado (de cobre ao
  descer), os Atributos Base em quatro células com os modificadores que mudam, os PV, as escolhas e o que libera, e o
  que a classe dá pelo caminho, com o NP de cada marco. O cartão tem o próprio pergaminho: fica igual com o tema do
  chat ligado ou não.
- **Com o TBG** (balões de fala, Modo Narrador e as abas ON, OFF e ROLL do Custom Chat Tabs), as falas, os balões e
  as abas ganham o mesmo pergaminho: o grito com filete carmim, o sussurro tracejado, o pensamento com a nuvem, a
  ação sem moldura, o OFF cinza e a narração na faixa verde.

## As outras janelas

Fichas de item (os 14 tipos), editor de efeitos, navegadores de habilidades e de raça e classe, diálogos, baús,
saques, lojas e as Ferramentas do Mestre seguem o visual da ficha. Num compêndio trancado os valores aparecem como
texto.

Os índices dos compêndios de itens são pedidos uma vez com todos os campos que o sistema lê, e o que as janelas usam
(o catálogo de Magias, as habilidades de classe, as raças, as classes e as profissões) é preparado enquanto o jogo está
ocioso: a janela de Magias, o navegador de habilidades e a aba Classe abrem na hora.

O **navegador de habilidades** abre mostrando só o que o personagem pode escolher agora: as habilidades de NP acima
do dele, as que pedem outra antes e as que já estão no NH máximo ficam escondidas, com uma nota de quantas são. A
caixa "Só o que posso escolher" (ou o link "Mostrar todas") mostra a lista inteira, com o motivo de cada bloqueio.
Clicar de novo no botão de subir põe mais um NH da mesma habilidade na seleção (adquirir e subir, ou subir duas vezes),
até o NH Máximo e o NP do personagem, e um talento pode ser escolhido junto com o que ele pede.

As **caixas de mensagem** (avisos, confirmações e escolhas) seguem um padrão só: a barra verde com borda dourada, o
pergaminho e dois botões do mesmo tamanho, a ação em verde e Cancelar em pergaminho (quando a ação vai contra um
aviso, ela fica vermelho-tijolo). O aviso antes de usar uma habilidade mostra a imagem e o nome dela e cada motivo com
o ícone do seu tipo (Momento, Motor, limite, condição); mudar o NP mostra o retrato e o que o personagem ganha; vender e
converter itens mostram o item ou o personagem.

## O Mercado e as lojas

O botão **Mercado** (a lojinha, o último da barra dos tokens) abre uma janela grande, no visual do assistente de criação,
com **todos os itens** dos compêndios do sistema e do mundo e os itens do próprio mundo: cada um com o ícone, o grau, o
que dá (Ataque, Defesas, Precisão…), o começo da descrição, o Nível e o preço. Clicar num item abre a página dele ao
lado: a descrição inteira, as tags com a regra de cada uma e de onde ele vem.

- **Filtros**, na faixa verde: o tipo, o Nível (de/até, e faixas de 5), o preço máximo (e "só o que o personagem pode
  pagar"), à venda ou fora de venda, o grau (Comum, Raro, M1–M7), a pasta e as tags (elas somam: [Lâmina] e [Duas
  Mãos] mostram o que tem as duas). Cada botão diz quantos itens mostraria com os outros filtros ligados. A busca
  procura no nome, no efeito e nas tags, sem precisar de acento. A ordem: tipo e nível, nome, preço ou nível.
- **Só o Mestre compra e dá.** No rodapé, o Mestre escolhe o personagem (o do token selecionado vem primeiro); na página
  do item, **Comprar para** (o ouro sai do personagem, e o espaço do inventário é conferido) e **Dar a** (de graça),
  com a quantidade (um tíquete soma na pilha que o personagem já tem). Arrastar uma linha para uma ficha também dá o
  item. Os jogadores só olham; a configuração "O que os jogadores veem no Mercado" escolhe entre todos os itens, só o
  que se vende em lojas ou nada (o botão some para eles).
- **Criar uma loja:** o Mestre marca itens (a caixinha de cada linha, ou "Marcar os mostrados" depois de filtrar) e
  clica em **Criar loja**. A caixa pede o nome, o retrato (arrastar um NPC para a caixa usa o nome e o retrato dele), a
  fala do vendedor, o preço (% do preço do item), se a loja compra dos jogadores (e por quanto), o estoque de cada item
  (vazio: sem fim), o alcance (qualquer lugar da cena, ao lado do token ou até 3 quadrados) e se o token já vai para o
  meio da cena que o Mestre está vendo. A loja fica na pasta Lojas dos atores, com o token vinculado.
- **Na loja:** com dois cliques no token, o jogador abre a mesma janela só com os itens daquela loja, com o preço e o
  estoque dela. Compra quantos o estoque, o ouro e o espaço deixam (o Mestre confere tudo pela tela dele, e o chat
  registra a compra) e, se a loja compra, vende na aba Vender o que carrega e não está equipado. Longe demais, a loja
  não abre; fechada, mostra só o aviso.
- **O Mestre na loja:** os dois cliques no token abrem a mesma vitrine, com o estoque de cada item para mudar, Tirar da
  loja, o botão Aberta/Fechada, a porcentagem do preço, **Pôr itens do Mercado** (o Mercado abre pondo nesta loja) e
  Configurar (a ficha da loja, com o resto: o alcance, o ouro, a revenda). Itens arrastados para a janela (do Mercado,
  de um compêndio ou da barra lateral) entram na loja. Um mercador feito antes (as pilhas) abre do mesmo jeito, e a
  ficha dele ganhou o botão "Abrir a loja".

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

A barra de PV é um arco com borda dourada que acompanha o aro de cima do token e enche da esquerda para a direita
(com a Fadiga hachurada no fim e a Barreira num filete azul-aço por fora): nada sai do token para o vizinho cobrir. O
Destino fica em losangos dourados na borda de baixo; o Motor da classe, numa fileira de losangos perto da base do token
(com um disco do estado: verde Embainhada, carmim Desembainhada); os ícones de estado, na lateral esquerda, abaixo da
ponta do arco; e o nome, pequeno e claro, logo abaixo da borda, com um contorno suave que se lê em qualquer mapa. Fora
de combate o token mostra só o nome: a barra de PV e o Motor aparecem quando ele entra num combate e somem quando sai (configuração
**Barra de PV só em combate**). Outra configuração escolhe quem vê a barra de PV: todos; todos, mas os jogadores só
veem a de um inimigo [Identificado]; ou cada token por conta própria.

Os tokens já vêm configurados:

- **Personagem:** enxerga (visão ligada e sem limite de alcance: a escuridão na Eternia é regra de cena, [Escuridão] e
  [Visão Noturna], então só as paredes escondem o mapa) e é **vinculado à ficha**, sempre: o PV perdido continua quando
  o token é apagado e posto de novo. Um personagem novo fica do lado dos aliados.
- **Monstro:** sem vínculo, então cada token na cena é uma cópia com o próprio PV.
- **Todos:** o nome sempre à vista (a não ser que alguém escolha outro modo no token).
- **Retrato:** trocar o retrato na ficha troca o do token (o modelo e os já postos na cena) enquanto ele ainda usa a
  imagem padrão ou o retrato antigo; um token com imagem própria fica como está.

O marcador do Foundry que girava em volta do token da vez fica desligado (no rastreador de combate, a configuração do
marcador de turno liga de volta). Os mundos que já existiam recebem tudo isso numa migração, uma vez: um token de
personagem que estava sem vínculo passa para a ficha o PV, o Destino, o Ódio e a Fadiga que tinha.

Um estado posto num token aparece sobre ele num medalhão (com anel carmim nos estados ruins, dourado nos de combate e
verde nos outros), dá uma volta e encolhe até o lugar dele entre os ícones do token, onde o ícone aparece quando ele
pousa; um estado tirado sai do lugar girando e some. É no lugar do texto com o nome que o Foundry mostrava; a
configuração **Animação dos estados nos tokens** (de cada jogador) traz o texto de volta.

## O HUD de ações

Com um token selecionado (ou, para um jogador, o personagem atribuído a ele), uma barra de pergaminho fica no pé da
tela, no lugar da barra de macros do Foundry:

- **Recursos:** PV, Barreira, Destino, Ódio, Fadiga e o Motor da classe (o estado e os pontos; um clique num losango
  marca os pontos à mão).
- **Turno:** a rodada e o Processo, as ações que restam no seu turno, Espera e **Encerrar**; **Entrar**
  coloca o token num combate em que ele ainda não está.
- **Esquivas pendentes:** com a esquiva automática desligada, quando um ataque mira o seu personagem, **Esquivar** rola
  pelo próprio cartão.
- **Painéis:** Testes; as habilidades em três, **Gerais** (as básicas, as da raça e as outras), **Magias** (os
  feitiços de cada Magia sob o nome dela, na cor da categoria, cada um com o seu Momento; o texto da Magia aparece ao
  passar o mouse) e **Classe** (as da classe e as de uma Dedicação); Itens (com os poderes de gatilho) e Estados. As
  habilidades que não dá para usar agora ficam esmaecidas, com o motivo, e um monstro tem um painel só, Habilidades.
  **Shift + clique** usa e já rola o Teste.
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
- **Elemento (NP 1):** no Matador de Dragões, um elemento escolhido junto com a classe (Fogo, Ferro, Céu, Raio,
  Branco, Sombras ou Veneno) dá a tag e o estado dos golpes, a imunidade e três talentos próprios; o navegador de
  habilidades só mostra os do elemento escolhido, e a Dedicação também deixa escolher um.
- **Família e função:** 7 classes físicas e 7 mágicas, cada uma com uma função no grupo (Tanque, Dano, Precisão ou
  Suporte nas físicas; Dano, Híbrida, Controle ou Suporte nas mágicas).
- **Magias:** toda classe tem (veja [As Magias](#as-magias)): as mágicas no NP 1, 5 e 10, o Matador de Dragões no NP 5
  e 10 (o elemento é a magia do NP 1) e as físicas no NP 1 e 10. Nas físicas, a Magia se mistura ao jeito de lutar: os
  feitiços alimentam o Motor da classe.
- **Emblema:** cada classe tem o seu, no jeito dos emblemas de Log Horizon: o símbolo diz a classe e a cor diz a
  família e a função (tons quentes nas físicas: Tanque bronze, Dano carmesim, Precisão laranja, Suporte ouro; tons frios
  nas mágicas: Dano violeta, Híbrida azul, Controle turquesa, Suporte prata). A faixa da aba Classe usa a mesma cor.
  Aparece na aba Classe, no item da classe e, com um selo "+", na Dedicação.

| Classe | Família e função | Motor |
|---|---|---|
| Assassino | Física · Precisão | **Contrato**: escolhe um alvo, e cada acerto de qualquer aliado nele abre uma Brecha; a Execução gasta as Brechas e derruba quem ficou fraco demais. Escolhe uma Magia no NP 1 e 10. |
| Berserker | Física · Dano | **Ira**: cada ferida sofrida vira Ira, que soma dano a todo golpe; gastar a Ira é escolher entre um golpe brutal e o fôlego para continuar de pé. Escolhe uma Magia no NP 1 e 10. |
| Caçador | Física · Precisão | **Mira**: parado, a Mira cresce a cada rodada; o Tiro Certeiro gasta tudo, e mover o token zera. Escolhe uma Magia no NP 1 e 10. |
| Centurião | Física · Tanque | **Baluarte**: cada ataque contra ele vira uma Camada da muralha (Anulação), que o Golpe do Baluarte transforma em dano e provocação. Escolhe uma Magia no NP 1 e 10. |
| Hierofante | Física · Suporte | **Táticas**: junta Ordens e gasta a própria ação para um aliado agir fora do turno dele. Escolhe uma Magia no NP 1 e 10. |
| Lutador | Física · Dano | **Corrente**: golpes encadeados juntam Elos, e o Golpe Final gasta a corrente inteira; apanhar ou parar quebra os Elos. Escolhe uma Magia no NP 1 e 10. |
| Samurai | Física · Dano | **Bainha**: embainhada, a lâmina junta Cortes; o Iai, na Iniciativa, saca e gasta todos, e com a Bainha cheia é um Corte Perfeito. Escolhe uma Magia no NP 1 e 10. |
| Invocador | Mágica · Controle | **Pacto**: paga PV para dar Laços a um espírito (lobo, golem ou fada), que luta, protege ou cura gastando os Laços; com o espírito presente, os Feitiços das Magias também dão Laços. Escolhe uma Magia no NP 1, 5 e 10. |
| Mago Azul | Mágica · Híbrida | **Almas**: absorve a alma dos monstros que derruba e a guarda num grimório; com o Take Over, veste uma delas e luta com a natureza (Fera, Animal, Demônio ou Espírito) e o elemento do monstro, e a Essência que junta vira o Golpe da Alma. Escolhe uma Magia no NP 1, 5 e 10. |
| Mago Branco | Mágica · Suporte | **Lei**: escreve em runas um número de 2 a 12; quando dois dados de qualquer teste o formam, acende Runas (os Feitiços também acendem), que reescrevem os dados dos testes: o do aliado sobe, o do inimigo desce. Escolhe uma Magia no NP 1, 5 e 10. |
| Mago Negro | Mágica · Dano | **Pressão**: cada feitiço, da classe ou das Magias, puxa mais poder e bate mais forte; no Teto, a Liberação solta tudo ou a Sobrecarga cobra do próprio mago. Escolhe uma Magia no NP 1, 5 e 10. |
| Mago Vermelho | Mágica · Híbrida | **Arsenal**: a magia mora na peça que está na mão (Espada, Armadura ou Foco) e cresce ali; o Reequipar troca de peça e solta a Descarga da antiga. Escolhe uma Magia no NP 1, 5 e 10. |
| Matador de Dragões | Mágica · Dano | **Escamas**: come o próprio elemento (Fogo, Ferro, Céu, Raio, Branco, Sombras ou Veneno) e o transforma em Escamas, que os golpes de dragão gastam; no Teto vem a Força do Dragão, e cada vez que ela acaba a Semente do Dragão cresce. Escolhe uma Magia no NP 5 e 10. |
| Pictomante | Mágica · Controle | **Moldes**: cada feitiço deixa uma construção no campo (uma lança, um muro, uma fera), que fica lá até ser quebrada; quebrar vira dano (o Estilhaçar) ou defesa (o Escudo Esculpido). Escolhe uma Magia no NP 1, 5 e 10. |

**Classes antigas** (fora da lista e das Dedicações; as fichas que já as usam continuam funcionando):

| Classe | Papéis | Motor |
|---|---|---|
| Druida | Defesa, Cura | **Formas**: a Seiva paga a transformação em fera, e cada forma troca o que ele pode fazer. *Classe antiga: saiu da lista na 0.22; as fichas que já a usam continuam funcionando.* |
| Estrategista | Suporte, Controle | **Leitura**: na Manutenção rola 2d6 e guarda os dados, para trocar depois os de um teste pelo que leu. *Classe antiga: saiu da lista na 0.22; as fichas que já a usam continuam funcionando.* |
| Feiticeiro | Dano | **Calor**: cada feitiço esquenta e bate mais forte; no Teto, a Erupção solta tudo ou a Sobrecarga queima o próprio feiticeiro. *Classe antiga: saiu da lista na 0.16, e o Mago Negro, com a Magia Fogo, tomou o lugar dela; as fichas que já a usam continuam funcionando.* |
| Menestrel | Suporte | **Movimentos**: a canção sobe a cada Manutenção e reforça os aliados; trocar de canção volta ao começo, e o Finale gasta tudo. *Classe antiga: saiu da lista na 0.22; as fichas que já a usam continuam funcionando.* |
| Oráculo | Cura, Dano | **Fardo**: cada milagre fica mais forte e pesa mais; com Fardo alto vem a maldição, e a Revelação descarrega tudo de uma vez. *Classe antiga: saiu da lista na 0.22; as fichas que já a usam continuam funcionando.* |
| Ressonante | Dano, Defesa | **Centelha**: o poder mora numa peça do equipamento (arma, armadura ou joia) e cresce ali; saltar para outra peça solta o que juntou. *Classe antiga: saiu da lista na 0.11, e o Mago Vermelho tomou o lugar dela; as fichas que já a usam continuam funcionando.* |
| Sacerdote | Cura, Defesa | **Graça**: cada ferida de um aliado vira Graça, gasta em curas depois ou em barreiras antes do golpe. *Classe antiga: saiu da lista na 0.22; as fichas que já a usam continuam funcionando.* |
| Tecelão | Controle, Suporte | **Padrão**: escolhe um número de 2 a 12; quando dois dados de qualquer teste o formam, ganha Fios, que mudam os dados dos outros. *Classe antiga: saiu da lista na 0.14, e o Mago Branco tomou o lugar dela; as fichas que já a usam continuam funcionando.* |

**Automação:** o Motor fica na aba Classe (o estado, os pontos e uma nota quando a classe guarda algo além deles: o
alvo do Contrato, a Lei), no HUD e no token. Os ganhos e os gastos seguem o combate sozinhos: a
Manutenção e o Encerramento, o começo e o fim de cada turno, o movimento do token, os ataques declarados, os acertos e
as esquivas, o dano e a cura aplicados pelos cartões, os testes rolados e os inimigos derrubados. O Mago Branco ganha
botões nos cartões de ataque, que mudam os dados de um teste já rolado e refazem o acerto. O
elemento do Matador de Dragões entra sozinho no dano dos golpes (a tag e o estado no acerto), e um ataque do elemento
vindo de um aliado não causa dano: o Matador come o ataque. O
Desfazer do cartão devolve o Motor junto com o Ódio e a ação. O que não dá para automatizar (escolher alvos de área,
mover tokens) fica no texto da habilidade.

## As Magias

Toda classe tem Magias. Nas mágicas (o Invocador, o Mago Azul, o Mago Branco, o Mago Negro, o Mago Vermelho, o
Pictomante e o Matador de Dragões), a classe diz **como** você conjura e a **Magia** diz **o que** você conjura; nas
físicas (o Assassino, o Berserker, o Caçador, o Centurião, o Hierofante, o Lutador e o Samurai), a Magia se mistura ao
jeito de lutar da classe. As mágicas escolhem a primeira Magia com a classe, a segunda no NP 5 e a terceira no NP 10
(o Matador de Dragões, uma no NP 5 e outra no NP 10); as físicas, a primeira com a classe e a segunda no NP 10. Cada
uma é escolhida numa janela própria: um cartão por Magia (a categoria, uma frase curta e o que os feitiços fazem), filtros por categoria e por
função, busca por Magia ou feitiço e, ao passar o mouse, a página da Magia com o Tabu e os feitiços por NP; o ponteiro
sobre um feitiço mostra o que ele faz, e um clique abre o texto inteiro ali mesmo. A aba Classe
mostra as Magias com os feitiços de cada uma, e o navegador de habilidades mostra os feitiços das suas Magias (a origem "Magia") nas
escolhas de Combate e Geral. Os feitiços alimentam o Motor da sua classe (+1; os grandes, +2), e o feitiço supremo de
cada Magia (NP 7; NP 10 nas Ancestrais) pede o Motor no Teto e gasta tudo. Nas físicas, o Samurai só junta Cortes com
a lâmina embainhada, o Assassino abre Brechas pelos acertos no Alvo e o Lutador conta o feitiço como golpe da Corrente. Cada Magia tem um **Traço**, uma regra passiva própria que vale para os feitiços dela: dano a mais contra quem já tem um estado (o Fogo em quem queima), um estado que escala (os Olhos Mágicos petrificam quem já está com Rigidez), uma imunidade ou um golpe que atravessa a Barreira ou a Anulação. As regras estão em **XII. MAGIAS**, no diário AS REGRAS.

| Magia | Categoria | O que faz |
|---|---|---|
| Absorção | Maldição | As almas: a conexão que drena ([Enfraquecido]) e bebe a força ([Fortalecido]), o ataque engolido ([Anulação], [Fortalecido]), a revolução que veste outra alma ([Despertado]), a alma roubada ([Selado], e os bônus do alvo passam para você), a ejeção ([Medo]) e o Festim de Almas ([Maldito], [Atordoado]). Tabu: em combate, a Defesa Mágica cai [NP÷2] e −1d6 nas Resistências. Traço: Fome de Almas. |
| Água | Conjuração | Prende, corta e escorre: [Água], [Lento], [Enraizado] e o Corpo de Água ([Intangível]); o supremo é o Maremoto. Traço: Alma de Água. |
| Alma Animal | Conjuração | Os bichos: o gato que some ([Oculto]), o pássaro que mergulha ([Voando]), o coelho que salta ([Acelerado]), o peixe ([Água], [Lento]), o urso ([Derrubado]) e o Estouro da Manada. Traço: Instinto. |
| Alma de Fera | Conjuração | As feras: o braço de pedra ([Anulação] e o contra-golpe), os touros ([Derrubado], [Fissurado]), as escamas do lagarto ([Espelho]), o tigre que ataca dois e o Corpo Inteiro, que deixa [Fúria]. Traço: Couro de Fera. |
| Alma de Máquina | Conjuração | Take Over de máquinas: o canhão de lacrima, a blindagem que não tomba ([Anulação]), os propulsores ([Voando]), a rajada que deixa [Cambaleante], o bombardeio que deixa [Derrubado] e o Traje de Batalha ([Atordoado]). Traço: Metal. |
| Alma de Satã | Conjuração | Os demônios: o raio que deixa [Eletrificado], as mãos de trevas ([Enraizado]), a explosão de [Corrupção] que dá [Medo], a armadura viva ([Fortalecido]), o fogo de Sitri ([Queimando]) e a Extinção da Alma ([Maldito]). Traço: Alma Demoníaca. |
| Alta Velocidade | Conjuração | A pressa: o golpe que deixa [Perseguição], a rajada em dois alvos, a velocidade que deixa [Acelerado] a cena inteira, o chute que atravessa e derruba ([Derrubado]), os Cem Golpes e a Tempestade de Golpes ([Cambaleante]). Traço: Mais Rápido que o Olho. |
| Amarras | Conjuração | Os tubos: o chicote, a amarra que deixa [Agarrado] e [Silenciado], o arranhão que deixa [Marcado], a rede que deixa [Enraizado], a explosão felina que deixa [Lento] e a Prisão de Mil Tubos ([Agarrado]). Traço: Ninguém Foge. |
| Aprimoramento | Maldição | O aprimoramento: as garras-chicote, o corpo aprimorado de um aliado ([Fortalecido]), a dor amplificada ([Fraqueza]), o aprimoramento por segundo ([Despertado]), a dor em massa e a Privação dos Sentidos ([Cego], [Atordoado]). Tabu: na primeira rodada do combate, as Defesas caem [NP]. Traço: Dor Amplificada. |
| Arca | Ancestral | A luz das deusas contra as trevas: a estrela de [Radiância] (cega quem é demônio ou usa Maldição), a cura que tira o pior Estado Negativo, o Manto Sagrado (imunes a [Maldito] e [Chama Negra], [Anulação (Corrupção)]), o Purgar, que derruba na hora o demônio com pouco PV (a Execução), a Flecha da Salvação (atravessa [Anulação] e [Barreira]) e a Arca Ômega, o supremo do NP 10, que apaga [Chama Negra] e [Maldito] dos aliados. Traço: Luz Sagrada (+NP contra demônios e quem usa Maldição). |
| Arco da Grande Árvore | Perdida | A árvore e a força da terra: as explosões em linha de [Chama], o esconderijo no tronco ([Oculto], [Regeneração]), as folhas que caçam três alvos, a bomba-relógio de raízes ([Enraizado], [Pavio]), o estouro da torre ([Derrubado]) e o Terra Clamare ([Atordoado]). Tabu: em combate, −2 nas Esquivas. Traço: Força da Terra. |
| Arco da Materialização | Perdida | A imaginação feita real: a espada negra, o escudo dourado ([Anulação]), as asas de pégaso ([Voando]), os fantasmas que deixam [Enraizado], a fera sagrada do trovão ([Atordoado], e ela fica como [Servo]) e a Torre de Dingir ([Enraizado], [Derrubado]). Tabu: em combate, a Iniciativa cai [NP] e a Defesa Física cai [NP÷2]. Traço: Mundo Imaginado. |
| Arco do Tempo | Perdida | O tempo nas mãos: as esferas que pulam o tempo, o tempo lento ([Lento], [Atordoado]), a cura que desfaz o golpe, a pressa ([Acelerado]), os anos que racham armaduras e cansam o corpo ([Fissurado], [Enfraquecido]) e a Última Era, que cura os aliados. Tabu: em combate, as Defesas caem [NP÷2]. Traço: Tempo Emprestado. |
| Areia | Conjuração | A areia: o redemoinho que explode, a lufada que deixa [Cego], o corpo que fica [Intangível], a areia movediça que deixa [Rigidez], a onda que deixa [Deterioração] e o Mundo de Areia ([Lento]). Traço: Deserto. |
| Armas Mágicas | Portadora | As balas: o tiro mágico, a bolha que deixa [Silenciado], a teleguiada que não erra e marca ([Marcado]), a mira que deixa [Concentrado], a explosiva ([Chama], [Derrubado]) e a Chuva de Balas ([Atordoado]). Traço: Bala Certa. |
| Artes Brancas | Proibida | As necessidades do corpo: as lâminas de luz, a fome que deixa [Confuso], o sono que deixa [Adormecido], os dois dedos que seguram a lâmina, o Prazer ([Atordoado], que pega aliados) e o Êxtase ([Adormecido]). Tabu: em combate, a Recuperação cai [NP] e a Defesa Mágica cai [NP÷2]. Traço: Corpo sem Vontade. |
| Artes Negras | Proibida | A magia da morte: [Corrupção], [Maldito] (até a aura em volta de você), [Deterioração] e [Sentença]. Tabu: em combate você fica [Maldito], e a Predação da Morte pega aliados. Traço: Morte em Volta. |
| Bomba | Maldição | As explosões de [Chama]: a explosão que detona o [Pavio], a insígnia em quem toca em você ([Pavio]), a mina ([Enraizado], [Pavio]), a esfera de captura ([Agarrado]), a espiral ([Derrubado]) e a Detonação ([Derrubado], [Fissurado], detona os Pavios). Tabu: em combate, a Defesa Física cai [NP]. Traço: Tudo Explode. |
| Cabelo Carmesim | Conjuração | O cabelo: o que agarra ([Agarrado]), o que bebe a água ([Anulação], [Regeneração]), as mechas que disparam em três alvos, a marca em brasa ([Marcado]), os vaga-lumes que deixam [Queimando] e a Presa de Lobo ([Agarrado]). Traço: Cabelo Vivo. |
| Cajados Mágicos | Portadora | Cinco cajados: o raio de [Choque], a névoa que protege, o [Adormecido], o [Medo] da ilusão e a luz do Canto Sagrado, que deixa [Cego]. Traço: Sono Pesado. |
| Calamidade | Maldição | As calamidades: o tornado de [Vento], o aguaceiro que apaga o fogo ([Encharcado]), o terremoto ([Atordoado]), a esfera do trovão ([Eletrificado]), o inferno ([Queimando]) e as Partículas Antimagia ([Silenciado], [Maldito]), que pegam aliados. Tabu: em combate, a Defesa Física cai [NP÷2]. Traço: Olho da Tempestade. |
| Caos | Ancestral | Criar do nada: em cada feitiço você escolhe na hora o que nasce. A forma que vira lança ([Deterioração]), correntes ([Agarrado]) ou muralha ([Barreira]), o gato que muda de forma ([Servo] de [Chama], [Frio] ou [Choque]), a boca que engole ([Anulação]) ou cospe ([Espelho]) o golpe, o Reino do Caos (por uma cena, uma área em volta de você segue a regra que você escolhe: [Enraizado] e [Lento], [Silenciado], [Cego] ou [Regeneração]), a Realidade Reescrita (um estado sorteado) e O Mundo Recriado ([Petrificado], [Adormecido] ou [Dominado]). Traço: Rei do Caos (imune a [Dominado] e aos Decretos). |
| Cartas | Portadora | O baralho: cartas que cortam e deixam um estado tirado ao acaso, o raio de [Choque], a sorte que dá um bônus ao acaso, a gaiola que deixa [Enraizado] e [Silenciado], a tempestade de cartas e Os Vinte e Dois Arcanos ([Atordoado]). Traço: Baralho Marcado. |
| Chamas do Purgatório | Maldição | O fogo negro dos demônios: [Chama] e [Chama Negra], que não apaga e não deixa ninguém se curar; a lâmina encantada, o pássaro, a onda em linha, o cão que fica ([Servo]), o dragão das cinzas e os Mil Cortes Divinos ([Chama Negra: NP]). Tabu: em combate, [Fraqueza (Radiância): NP]. Traço: Fogo que Não Apaga (arranca a [Regeneração]). |
| Comando M | Conjuração | O tamanho das coisas: a redução que deixa [Lento] e [Enfraquecido], a expansão ([Fortalecido]), o feitiço encolhido ([Anulação]), o golpe de terra ([Derrubado]), o terreno que deixa [Enraizado] e a Demolidora de Países ([Fissurado: 3]). Traço: Escala Errada. |
| Combo Estelar | Maldição | A sequência: cada acerto soma [Combo] (+1 de dano por ponto, zera com um erro), golpes que somam mais (2, 3), o passo até o inimigo ([Concentrado]), a guarda que segura o Combo ([Anulação] igual ao Combo), a chuva em todos os engajados e a Estrela Final (o Combo dobrado). Tabu: em combate, a Defesa Física cai [NP]. Traço: Sequência (imune a [Cambaleante] e [Atordoado]). |
| Contra-ataque | Perdida | Devolver o golpe: o [Contragolpe] contra um ataque mágico ou físico de alvo único (o dobro de volta), o feitiço desfeito no ar ([Anulação] em você e nos aliados), o [Rancor] que guarda o dano, o golpe que solta tudo ([Atordoado]) e o Contra-ataque Absoluto, que devolve até área. Tabu: em combate, −2 nas Esquivas. Traço: Mais que o Dobro. |
| Cópia | Conjuração | A cópia: o Copiar e a Imitação, que repete a tag e o estado do feitiço copiado; ouvir a alma (+1d6 nas Esquivas), copiar e anular ([Anulação], [Concentrado]), o Derreter ([Queimando]) e a Ars Magia ([Selado]). Traço: Memória Perfeita. |
| Corpos Celestes | Conjuração | As estrelas: [Radiância] de longe, o Meteoro, a gravidade de Altairis, Grand Chariot e o meteoro gigante de Sema. Traço: Rastro de Luz. |
| Correntes | Proibida | O grimório das trevas: a corrente com gancho ([Agarrado]), as balas dos dedos em dois alvos, o raio que explode ([Derrubado]), as Fórmulas 28 ([Atordoado]) e 100 ([Fissurado]) de Amaterasu e a Lei do Grimório ([Medo]). Tabu: em combate, −1d6 nas Resistências. Traço: Selos de Amaterasu. |
| Criação | Ancestral | A terra e o [Ritmo]: a dança do Rei Gigante, que soma +1d6 por ponto no próximo feitiço de dano ([Concentrado]), os punhos de rocha ([Agarrado]), o corpo de metal ([Anulação (Física)], mas [Enraizado]), a lama ([Enraizado]), a lâmina de pedra ([Derrubado]) e a Criação da Grande Terra, o supremo do NP 10, em que o Ritmo conta dobrado. Traço: Areia Movediça (quem já está Enraizado cai Derrubado). |
| Desastre | Ancestral | Promover e rebaixar: a Promoção de Estado sobe de uma vez todos os Estados Negativos do alvo (os sem Valor duram mais um turno), a gota que conta metade da Defesa, a boneca de flores ([Servo] e [Regeneração]), o Murchar (tira todos os bônus), as vinhas ([Agarrado]) e a Floresta Desperta, o supremo do NP 10, que dobra os Estados Negativos. Traço: Autoridade sobre a Vida. |
| Elo dos Sentidos | Perdida | Os sentidos ligados: as lâminas de [Psíquico], o elo que dá [Vínculo] a um aliado, a Lâmina de Sodoma ([Cambaleante]), os sentidos trocados que deixam [Confuso], a tempestade de lâminas ([Atordoado]) e o Elo Final ([Marcado]). Tabu: em combate, a Defesa Física cai [NP]. Traço: Sentidos Embaralhados. |
| Encantamento | Conjuração | Os encantos: a força ([Fortalecido]), a guarda ([Anulação]) e a pressa ([Acelerado]) nos aliados, o Desencanto que fere e arranca os encantos do inimigo, o Grande Encantamento no grupo e o Universo Um ([Lento]). Traço: Desencantador. |
| Escrita Rúnica | Conjuração | As regras escritas: o círculo que prende ([Enraizado]), a palavra DOR ([Deterioração]), a runa que devolve o golpe ([Espelho]), as asas negras, a escuridão que transforma ([Despertado]) e a Regra Absoluta. Traço: Regra Escrita. |
| Escrita Sólida | Conjuração | As palavras que ficam de pé: FOGO ([Queimando]), GUARDA ([Anulação]), SILÊNCIO ([Silenciado]), FERRO ([Derrubado]), TROVÃO ([Eletrificado]) e A Palavra Final ([Atordoado]). Traço: Palavra Pesada. |
| Esmagamento | Conjuração | Quebra tudo: [Fissurado] e [Exposto] de perto, e a Desmontagem, que desfaz o golpe que vem. Traço: Desmonte. |
| Espadas Mágicas | Portadora | A espada: o corte que deixa [Fissurado], a corrida rente ao chão ([Concentrado]), o lampejo que parte armaduras a distância, o salto que corta em volta ([Derrubado]), a Chama de Garuda e a Lâmina Desembainhada ([Exposto]). Traço: Lâmina na Bainha. |
| Espinhos | Maldição | Os espinhos do submundo: as vinhas ([Agarrado]), o manto ([Espelho]), o jardim ([Enraizado]), a rosa explosiva ([Derrubado]), a Dea Yggdrasil ([Atordoado]) e o Memento Mori ([Sentença: 3]). Tabu: em combate, a Recuperação cai [NP] e −2 nas Esquivas. Traço: Espinhos que Entram. |
| Espíritos Celestiais | Portadora | As chaves dos portões: o touro que fica do seu lado ([Servo]), a lã do carneiro ([Barreira]), as flechas do sagitário, a onda do aguadeiro ([Encharcado], que pega aliados também), o punho do leão, o Vestido Estelar e Urano Metria. Traço: Chaves do Zodíaco. |
| Fogo | Conjuração | As cores do fogo: a laranja que deixa [Queimando], a roxa que dobra o fogo, a azul de [Frio] ([Congelando]), a amarela que deixa [Confuso], a Coluna de Fogo, que consome o Queimando, e a Chama Arco-Íris ([Exposto] em quem já queimava). Traço: Brasa Viva. |
| Fonte da Juventude | Proibida | Imortal: [Regeneração] em combate e um Fôlego Extra por rodada. A vida como moeda: o golpe pago com PV, a Dádiva (os seus PV para um aliado), o Escudo de Carne (o golpe de um aliado em você), a Vida sem Fim (área, e você [Exposto]), o corpo que se refaz na hora e a Gota da Fonte (cura e imortalidade por uma cena). Tabu: em combate, a cura de feitiços e itens cura metade em você. Traço: Imortal. |
| Forma Indura | Proibida | Sete Corações: seis vezes por cena você fica com 1 PV em vez de cair (o Fôlego Extra); as garras ([Fissurado]), as asas ([Voando]), o rugido ([Medo]), o veneno do ressentimento ([Envenenado: NP], pega até demônio), a fera ([Derrubado]) e a Transformação Indura, que entrega os corações que restam ([Ímpeto] e imunidade a controle até o fim da cena; depois a fera cai e o fim da cena não a levanta). Tabu: em combate, cada coração perdido dá +1 de [Fúria]. Traço: Sete Corações. |
| Fumaça | Portadora | A fumaça do cachimbo: o punho, a corda que deixa [Lento], a cortina que deixa [Oculto], a nuvem que deixa [Cego], o gigante que deixa [Confuso] e o Mar de Fumaça ([Silenciado]). Traço: Dentro da Névoa. |
| Furtividade | Conjuração | O assassino invisível: apagar a presença ([Oculto], e o primeiro golpe [Fortalecido]), a arma invisível ([Cambaleante]), revelar o escondido, a tortura ([Medo]), as mil lâminas ([Marcado]) e o Assassinato Perfeito ([Exposto]). Traço: Lâmina que Ninguém Vê. |
| Gigante | Conjuração | O tamanho: o golpe gigante, a mão que deixa [Agarrado], o corpo [Fortalecido] e com [Anulação], a pisada que deixa [Cambaleante], o Punho do Titã ([Atordoado]) e a Queda do Titã ([Derrubado]). Traço: Grande Demais. |
| Gravidade | Conjuração | O peso das coisas: [Lento], [Derrubado] e [Enraizado], o golpe [Fortalecido] e o voo da Gravidade Zero. Traço: Peso Dobrado. |
| Histórias dos Mortos | Conjuração | Os mortos do passado: a rajada, ler o coração ([Marcado]), a história que deixa [Confuso], o redemoinho ([Derrubado]), a cidade dos mortos ([Medo]) e O Mais Forte dos Mortos ([Atordoado], e ele fica como [Servo]). Traço: Passado que Assombra. |
| Infinito | Perdida | O Infinito: os efeitos dos feitiços que acabariam no turno ou na rodada duram a cena, e quem está preso num deles se livra com uma Ação Maior. O cubo que protege ([Barreira]) ou prende ([Enraizado] e [Silenciado]), o raio que conta metade da Defesa, o Cancelamento Absoluto (desfaz a magia sobre um alvo), o [Fortalecido] que não passa, o Caixão do Tempo ([Paralisado], que não dura) e o Encanto: Infinito ([Deterioração] que não acaba). Tabu: em combate, a Defesa Física cai [NP]. Traço: Tempo Parado. |
| Invasão | Perdida | A mente: a luz que acha e marca ([Identificado], [Marcado]), as flechas que reescrevem ([Confuso]), o pesadelo ([Pesadelo]), o boneco ([Dominado]), a névoa do esquecimento ([Amnésia]) e o Apagão ([Adormecido] em quem tem NP menor que o seu). Tabu: em combate, os feitiços não miram quem está engajado, e −1d6 nas Esquivas contra golpes corpo a corpo. Traço: Mente de Boneco (atravessa [Anulação] e [Barreira]). |
| Lâmina Divisora | Portadora | As cópias de verdade: os [Clones] (um por rodada, ou seis de uma vez), o golpe das cópias (+Clones×2), a troca com a cópia (o golpe acerta a cópia), as cópias em volta ([Cambaleante]) e os Sete Golpes (os Clones viram dano e zeram). Traço: Cópias Reais (uma vez por rodada, uma cópia usa um feitiço de reação seu sem gastar o uso). |
| Lampejo | Ancestral | Agir fora do turno: o Lampejo Divino dá uma Ação de Movimento e uma Ação Menor no fim do turno de outra criatura. O clarão que cega ([Cego], uma Ação Menor), o sopro que abençoa ([Concentrado] e [Barreira]), o rastro de faíscas em linha ([Queimando]), a rajada em até 5 alvos e o Brilho Dourado ([Cego], e mais uma Ação de Movimento e uma Ação Menor). Traço: Rápido Demais. |
| Lança Espiritual | Portadora | As Formas da lança, uma por vez, cada uma com a sua ação e o seu efeito enquanto dura: a lança (+NP÷2 de dano), o urso ([Barreira]; quem bate fica [Provocado]), a pedra ([Petrificado]; [Rigidez]), as lâminas (até 5 alvos; [Espelho]), o jardim ([Barreira] nos aliados; [Regeneração]) e o girassol (supremo; [Servo] de [Radiância]). A Mudança de Forma vem com a Magia. Traço: Árvore Sagrada (imune a [Desarmado]; trocar de forma é uma Ação Menor). |
| Macro | Maldição | As ordens: os livros em dois alvos, a ordem ao corpo ([Dominado]), o macro em si mesmo ([Despertado], [Voando]), os olhos demoníacos ([Cambaleante]), a avalanche da biblioteca ([Derrubado]) e o Olho Demoníaco Liberto ([Atordoado]). Tabu: em combate, a Iniciativa cai [NP] e −1d6 nas Resistências, menos enquanto [Despertado]. Traço: Ordens. |
| Magia das Fadas | Ancestral | A luz das fadas: [Radiância], a ilusão que dá [Medo], a [Regeneração], a esfera que protege os aliados ([Barreira]), o brilho que deixa [Cego] e a Lei das Fadas, o supremo do NP 10, que só fere os inimigos. Traço: Luz que Protege. |
| Magia dos Anjos | Conjuração | Os anjos, pagos com a sua vida: as penas de [Radiância], os mensageiros que deixam [Enraizado], o anjo do martelo ([Derrubado]), Shamsiel ([Cego]), Barakiel ([Atordoado]) e Raguel ([Medo]). Os anjos acertam sem teste e deixam [Fadiga] em você. Traço: Preço Pago. |
| Magia Seith | Conjuração | As almas nos bonecos: raios em linha e em estrela, os bonecos que ficam do seu lado ([Servo]), a Possessão ([Dominado]), os Olhos de Boneco ([Confuso]) e o Ritual das Almas. Traço: Almas Presas. |
| Magia Viva | Perdida | A vida criada: a centelha que cura sem a Recuperação ([Regeneração]), a cria de barro ([Lento]), o sangue que apodrece ([Deterioração]), o corpo refeito (tira os estados), a fera criada, que fica ([Servo]) e a Gênese ([Medo]). Tabu: em combate, a Recuperação e a Defesa Mágica caem [NP]. Traço: Fonte de Vida. |
| Maldição do Boneco | Perdida | A maldição no boneco: o fio que deixa o corpo do outro [Agarrado], o Dodoskoi ([Derrubado]), o boneco de ferro ([Fortalecido], [Anulação]), o de névoa ([Intangível]), o foguete metálico e o Dodoskoi Brilhante ([Cego]). Tabu: em combate, a Recuperação cai [NP] e a Defesa Mágica cai [NP÷2]. Traço: Corpo no Boneco. |
| Mandamentos | Maldição | O Decreto: uma lei a até 4 Qd (um dos dez Mandamentos, escolhido ao receber a Magia) que amaldiçoa na hora quem a quebra ([Pacificado], [Petrificado], [Dominado], [Sentença], [Agonia], [Selado], [Silenciado], [Envenenado], [Amnésia], [Cego] e [Queimando]); a marca que aumenta o alcance e fere, as espadas negras, a maldição no golpe (Mandamento Materializado), a Forma de Assalto ([Despertado], alcance em dobro), um segundo Mandamento e os dez de uma vez no supremo. Tabu: em combate, o Decreto pega você e os aliados. Traço: Marca do Rei Demônio (imune aos Decretos dos outros). |
| Matador de Demônios | Perdida | O gelo negro feito para matar demônios: [Frio], [Congelando] e [Fissurado], o golpe congelado no ar e a magia calada ([Silenciado]). Tabu: em combate, as Defesas Física e Mágica caem [NP÷2]. Traço: Caça-Demônios. |
| Matador de Deuses do Céu | Perdida | O vento negro dos deuses: o rugido que derruba, o sopro que cura, a dança que deixa [Atordoado], a bênção ([Fortalecido], [Acelerado]), o Bóreas ([Lento]) e a Lança Celestial ([Exposto]). Tabu: em combate, a Iniciativa cai [NP], a Velocidade cai 1 e a Defesa Física cai [NP÷2]. Traço: Ar dos Deuses. |
| Matador de Deuses do Fogo | Perdida | As chamas negras que racham em vez de queimar: o rugido e a foice que deixam [Fissurado], o fogo comido ([Anulação], [Fortalecido]), a chama explosiva ([Derrubado]), o Kagutsuchi ([Atordoado]) e a Ceia do Deus do Fogo ([Exposto], [Enraizado]). Tabu: em combate, a Recuperação cai [NP] e a Defesa Física cai [NP÷2]. Traço: Chama que Devora. |
| Matador de Deuses do Raio | Perdida | O raio negro: o rugido que deixa [Eletrificado], o raio comido (tira [Fadiga], dá [Fortalecido]), o canhão de 120 mm ([Cambaleante]), a couraça ([Espelho]), o trovão negro ([Atordoado]) e o Canhão de Partículas ([Eletrificado: NP]). Tabu: em combate, a Defesa Mágica cai [NP] e a Defesa Física cai [NP÷2]. Traço: Raio que Apaga. |
| Moldagem de Gelo | Conjuração | O gelo moldado com as mãos: lanças e o martelo de [Frio] ([Congelando]), o escudo em forma de flor, o chão que derruba, as águias de gelo e a Dança dos Sete Cortes. Traço: Gelo que Não Derrete. |
| Moldagem de Madeira | Conjuração | A madeira moldada: a bola de espinhos ([Cambaleante]), as armas em volta que dão [Espelho], a fusão que deixa [Oculto], a represa que deixa [Enraizado], os pés e as mãos gigantes que deixam [Cambaleante] e o Soco Divino ([Derrubado]). Traço: Tábuas e Pregos. |
| Moldagem de Memória | Conjuração | A memória das magias vistas: Memorizar ([Concentrado]), o feitiço lembrado, o Esquecimento ([Selado]), a terra em chamas ([Queimando]) e a noite das estrelas cadentes. Traço: Lembrança Apagada. |
| Nebulosa Sinistra | Maldição | O vórtice: puxa os alvos para o seu quadrado e os corta de [Corrupção], os fios que prendem ([Agarrado]), Deus ([Intocável] em você ou [Silenciado] num alvo), a chuva de esferas, o relâmpago negro ([Atordoado]) e o Dies Irae ([Eletrificado: NP]). Tabu: em combate, a Defesa Física cai [NP]. Traço: Carrasco (+NP em quem está [Agarrado] ou [Enraizado]). |
| Necromancia | Maldição | Os mortos, de [Corrupção]: as mãos da cova ([Enraizado], e um morto fica como [Servo]), o corpo de partículas ([Intangível]), o Primeiro Selo ([Silenciado]), a guarda dos mortos ([Anulação]), o exército de ossos ([Agarrado]) e o Julgamento da Estrela Maligna ([Medo], [Maldito]). Tabu: [Maldito] em combate. Traço: Corpo Morto. |
| Neve | Conjuração | A neve: a fúria branca ([Congelando]), a nevasca que deixa [Cego], a cópia de neve que toma o golpe, o vento que deixa [Derrubado], a avalanche que deixa [Enraizado] e o Branco Total ([Cego]). Traço: Mundo Branco. |
| O Soberano | Maldição | O avesso: o Inverter ([Inversão]: o dano mágico vira cura), as trevas que esmagam ([Derrubado]), o portão em linha ([Maldito]), o poder emprestado a um aliado ([Despertado]), a fera que fica ([Servo]) e a Reencarnação Eterna ([Sentença: 3]). Tabu: em combate, a cura de feitiço dos aliados vira dano em você. Traço: Rei dos Demônios (vira do avesso os bônus de quem acerta). |
| Olhos Mágicos | Conjuração | O olhar: o que deixa [Rigidez], o que deixa [Marcado], o que deixa [Encantado], o olho do demônio ([Despertado]), os Mil Olhos ([Medo]) e o Olhar Petrificante ([Paralisado]). Traço: Olhar que Petrifica. |
| Onda | Conjuração | A onda que anula a magia: o disparo, o escudo contra ataques mágicos, o impulso que deixa [Silenciado], a anulação que arranca os encantos, a explosão que deixa [Cambaleante] e o Mundo Sem Magia ([Selado]). Traço: Vibração. |
| Perfume Mágico | Portadora | Os frascos: o trovão de [Choque], a força que deixa [Fortalecido], o analgésico que cura o grupo, a dor que deixa [Medo] e [Envenenado], o veneno que deixa [Envenenado] e o Perfume da Força: Máximo ([Derrubado]). Traço: Nariz Treinado. |
| Pintura Mágica | Portadora | A tinta que vive: a fera pintada, que fica ([Servo]), as asas que deixam [Voando], a jaula que deixa [Enraizado] e [Selado], a armadura ([Anulação]), o dragão ([Queimando]) e o Mural Vivo ([Medo]). Traço: Grade Pintada. |
| Plantas | Portadora | As sementes: o cipó que deixa [Enraizado], o broto que dá [Regeneração], os esporos que deixam [Envenenado], a muralha de raízes ([Barreira]), a floresta que deixa [Lento] e o Jardim Carnívoro. Traço: Jardineiro. |
| Portão do Inferno | Maldição | Comer almas: quem cai perto de você alimenta o seu Motor e cura você; os demônios menores ([Servo]), a alma puxada para fora ([Atordoado]; [Paralisado] com pouco PV), o portal que leva você ou um aliado, o casulo ([Agarrado] e [Pesadelo], que alimentam o seu Motor a cada Encerramento), o veneno em linha e o Rito do Rancor dos Mortos ([Medo]; quem cai vira o seu [Servo]). Tabu: em combate, a Recuperação cai [NP] e a Defesa Mágica cai [NP÷2]. Traço: Banquete de Almas. |
| Praga | Maldição | Sem matar: as correntes ([Agarrado] e [Agonia]), os sentidos apagados ([Cego], [Silenciado] e [Atordoado]), o enxame ([Envenenado] e [Servo] de [Veneno]), o rosto emprestado ([Oculto]; o primeiro golpe deixa [Confuso]), o tempo roubado ([Sentença: 4]) e a Grande Praga ([Sentença: 3] e [Agonia: NP]). Tabu: em combate, o seu golpe para em 1 PV; só as condições derrubam. Traço: A Hora Chega (a [Sentença] de quem você acerta cai 1). |
| Projeção de Pensamento | Conjuração | As cópias de pensamento: o eco [Psíquico], a voz que tira o [Medo] e deixa [Concentrado], a projeção que deixa [Intangível], as cópias que deixam os inimigos [Provocado], o exército em três alvos e a Projeção Astral ([Medo]). Traço: Mente Dividida. |
| Raio | Conjuração | O raio: o relâmpago ([Eletrificado]), a corrente que deixa [Eletrificado], o passo que deixa [Acelerado], o trovão que deixa [Atordoado], a tempestade em três alvos e o Palácio do Trovão. Traço: Para-raios. |
| Reequipar: O Cavaleiro | Portadora | As armaduras de batalha: os feitiços são Ataques com Arma (espadas em área, o golpe da asa negra), a defesa adamantina, o traje sem armadura e a armadura que corta a magia ([Selado]). Traço: Arsenal sem Fim. |
| Reflexão | Conjuração | Tudo torcido: o corpo que fica com [Rigidez], o golpe que volta ([Espelho]), a luz que deixa [Oculto], o corpo [Cambaleante], o mundo que deixa [Atordoado] e a Reflexão Total ([Confuso]). Traço: Golpe Torto. |
| Roubo | Proibida | O que eles perdem, você ganha: a força ([Enfraquecido] nele, [Fortalecido] em você), a arma ([Desarmado]), sumir ([Oculto]), atravessar cortando, os órgãos ([Fissurado], Dreno) e o Festival da Caça ([Enfraquecido: NP] em todos em volta, aliados também, com Dreno). Tabu: em combate, a Defesa Mágica cai [NP]. Traço: Mão Leve (rouba um bônus a cada acerto). |
| Ruptura Crítica | Maldição | O [Ímpeto]: a força que sobe a cada turno (dano e Defesas), o corte que racha ([Fissurado]), o salto que derruba ([Derrubado]), o giro em todos os engajados ([Cambaleante]), a onda em linha que conta metade da Defesa e o golpe que solta o Ímpeto dobrado, sem Fadiga. Tabu: em combate, a Iniciativa cai [NP] e a Defesa Mágica [NP÷2]. Traço: Armadura Viva (com Ímpeto, imune a [Fissurado] e [Derrubado]). |
| Sangue Demoníaco | Proibida | O sangue que ferve: o terceiro feitiço da cena transforma você em demônio ([Despertado] e [Voando]); o ácido ([Deterioração], [Fissurado]), as esferas negras ([Pavio]) que o Beco sem Saída detona juntas, sem teste, a onda de fogo negro ([Chama Negra]), o despertar que transforma na hora ([Medo]) e a Nebulosa Negra ([Cego]). Tabu: em combate, a Recuperação cai [NP], a Defesa Mágica cai [NP÷2] e [Fraqueza (Radiância): NP÷2]. Traço: Demônio Cinzento. |
| Selo do Tempo | Perdida | O tempo parado: o raio sem teste, o selo que dá [Acelerado], os ponteiros que deixam [Marcado], o passo fora do tempo, o transbordamento ([Derrubado]) e a Alma Divina: Cronos ([Paralisado]). Tabu: em combate, as Defesas caem [NP÷2]. Traço: O Tempo é Seu. |
| Shikigami | Conjuração | Os bonecos de papel: a torrente, que fica ([Servo]), o véu de ilusão ([Oculto]), a prisão de papel ([Enraizado], [Silenciado]), a bomba negra ([Atordoado]), a revoada ([Enraizado]) e os Mil Bonecos de Papel ([Selado]). Traço: Mil Papéis. |
| Sol | Ancestral | O Relógio do Sol: o [Sol] sobe a cada rodada e a cada feitiço até o meio-dia, que dá [O Único], e depois desce; de noite, não passa de 2. O sol pequeno que gira ([Espelho]), o punho de fogo ([Derrubado]), os sóis em três alvos, a explosão que derrete armadura ([Fissurado]), a Espada Divina (atravessa [Anulação] e [Barreira]) e a Proeminência Final, o supremo do NP 10, que estende o meio-dia. Traço: Orgulho do Leão. |
| Sombras | Conjuração | Os fantasmas, tudo de [Corrupção]: os soldados em dois alvos, o soldado de guarda ([Servo]), o abraço que deixa [Agarrado] e [Deterioração], o pulso ([Atordoado]), a Onda da Morte ([Fissurado: 2]) e o Exército de Sombras ([Medo]). Traço: Frio que Drena. |
| Teatro de Bonecas | Conjuração | As coisas que ganham vida: a rocha que soca e fica ([Servo]), a árvore que agarra ([Enraizado]), os fios da Marionete ([Dominado]), a nuvem que voa e o chão que derruba. Traço: Fios. |
| Telepatia | Conjuração | A mente ligada: as telas que explodem, a leitura que deixa [Concentrado], o escudo de [Barreira] do grupo, o ruído que deixa [Confuso], a transferência que deixa o grupo [Concentrado] e [Acelerado] e a Sobrecarga Total ([Atordoado]). Traço: Rede Mental. |
| Teleporte | Conjuração | O salto no espaço: a investida, a linha direta que leva um aliado junto, o lançamento que deixa [Derrubado], a memória falsa que deixa [Encantado], o ponto cego em três alvos ([Marcado]) e o Transporte ([Confuso]). Traço: Sempre de Passagem. |
| Terra | Conjuração | O chão que luta: o punho de rocha, a muralha que cobre os aliados ([Anulação]), a avalanche que deixa [Enraizado], a pele de pedra, o chão que derruba ([Derrubado]) e a Fúria da Montanha ([Fissurado]). Traço: Pés no Chão. |
| Território | Conjuração | O espaço é seu: o calor que explode de [Chama], a troca de lugar com um aliado ([Anulação]), a prisão de ar ([Enraizado]), o domínio que deixa [Marcado], o colapso ([Derrubado]) e o Território Absoluto ([Marcado]). Traço: Espaço Próprio. |
| Trevas | Conjuração | As trevas, tudo de [Corrupção]: o raio que perfura, a mão que deixa [Agarrado], a gravidade que deixa [Derrubado], o escuro que deixa [Cego], o rondó que deixa [Medo] e a Gênese Zero ([Maldito]). Traço: Olhos no Escuro. |
| Vento | Conjuração | O vento: a lâmina de [Vento], a rajada que derruba, a armadura de tempestade ([Voando], [Anulação]), o redemoinho que deixa [Atordoado], o furacão ([Lento]) e o Espaço Aéreo: Zero ([Silenciado]). Traço: Corrente de Ar. |
| Visão | Perdida | O Presságio: dados rolados no começo do combate e guardados, cada um troca um dado de qualquer teste de um cartão de ataque (o seu, o de um aliado ou o de um inimigo). Ver o Golpe, a Profecia (um 6), o Destino Fixo ([Marcado] e um 1), o Caleidoscópio (dois dados), o Futuro Visto ([Concentrado] e +1d6 na Esquiva para os aliados) e O Fim Já Escrito (acerta sem teste, e os dados que sobram viram dano). Tabu: em combate, a Iniciativa cai [NP]. Traço: Olhos do Oráculo. |

## As raças

Seis raças, pensadas pelo que se vê nelas: **Humanos**, **Elfos**, **Dracônicos**, **Demônios**, **Celestiais** e
**Bestiais** (em três linhagens, cada uma um item de raça: **Felinos**, **Lupinos** e **Vulpinos**). Cada uma dá +2 em
atributos, PV, Destino e **duas habilidades inatas** (uma Geral e uma de Combate, que entram ao escolher a raça). Por
baixo da forma de cada raça dorme uma criatura, e a raça evolui em **cinco estágios** da forma, cada um mais bestial e
mais forte; o quinto é a Fera. Os Humanos não têm o que despir: a forma deles vai para o outro lado, a Ascensão.

| Raça | Atributos | PV | Destino | Inatas (Estágio I) |
|---|---|---|---|---|
| Humanos | +1 em dois à escolha | 8 | 1 | Bênção (uma de oito), Força dos Laços |
| Elfos | DES +1, POD +1 | 8 | 1 | Olhos de Mana, Pacto Espiritual (Gelo, Vento, Luz ou Terra) |
| Dracônicos | FOR +1, POD +1 | 16 | 0 | Sangue de Brasa (sete linhagens de dragão), Sopro |
| Demônios | FOR +1, INT +1 | 8 | 1 | A Marca, Maldição |
| Celestiais | POD +1, INT +1 | 8 | 1 | Graça do Astro (seis Astros), O Símbolo |
| Bestiais Felinos | DES +2 | 0 | 2 | Reflexo Felino, Parceiro |
| Bestiais Lupinos | FOR +1, DES +1 | 16 | 0 | Faro de Lobo, Matilha |
| Bestiais Vulpinos | POD +2 | 0 | 2 | Mil Faces, Caudas |

**Os estágios da forma.** O II abre no NP 3, o III no 7, o IV no 12 e o V no 16. Cada um dá habilidades da raça sem
gastar escolhas: no II uma Geral, no III uma de Combate, no IV uma nova e +1 num atributo da raça, no V a forma da Fera
(a criatura por uma cena; o Humano escolhe entre o Eleito e o Transcendente). Quem já tinha aprendido uma delas com uma
escolha recebe a escolha de volta. Cada estágio tem um rito, cumprido em jogo, e não evoluir é sempre uma escolha.

| Raça | II | III | IV | V |
|---|---|---|---|---|
| Humanos | Coleção de Bênçãos | Segunda Origem | Unção | Eleito ou Transcendente |
| Elfos | Canção dos Quase-Espíritos | Grande Espírito | Meio-Espírito | A Fera do Fim |
| Dracônicos | Comer o Elemento | Chifres e Cauda | Asas | O Dragão |
| Demônios | Voz do Purgatório | Chamas Negras | Asas da Treva | O Demônio do Abaixo |
| Celestiais | Biblioteca Viva | Asas de Luz | Golpe Celeste | O Serafim |
| Bestiais Felinos | Premonição | Velocidade Máxima | Garras do Tigre | O Tigre Branco |
| Bestiais Lupinos | Caçador da Estepe | Uivo | Forma da Lua | O Lobo da Lua Violeta |
| Bestiais Vulpinos | Encanto da Raposa | Fogo-Raposa | Sete Caudas | As Nove Caudas |

**Na ficha.** A aba **Raça** mostra os cinco estágios da raça do personagem, com o que cada um muda no corpo, o rito, o
que o mundo vê e o que dá (veja [A ficha de personagem](#a-ficha-de-personagem)). O cartão da raça, na aba Personagem,
tem o selo **Forma** com o estágio. Quando o NP do próximo chega, o selo brilha com uma pata (e a aba Raça ganha um
número), e o clique (ou Evoluir, na aba Raça) abre a evolução: o que o estágio dá, as escolhas (a habilidade, o +1) e o rito.
Com a configuração "Evolução da forma com o Mestre" (ligada), o pedido do jogador vai ao Mestre num cartão sussurrado,
com Aprovar e Recusar; desligada, o jogador evolui sozinho. O Mestre evolui na hora, pode adiantar um estágio e pode
voltar um (as habilidades que ele deu saem, e o +1 também). Cada evolução deixa um cartão no chat, e a caixa e o cartão
de NP avisam quando um estágio abre.

Escolher a raça na ficha abre a escolha das habilidades inatas (a Bênção do Humano, o Pacto do Elfo, a linhagem do
Dracônico e o Astro do Celestial) e, no Humano, dos dois atributos. Cada habilidade traz o efeito direto e, embaixo, como
ele aparece em cena; a automação aplica os estados, os bônus, as escolhas (como gastar uma Cauda num Truque ou numa
Ilusão) e os custos. As raças antigas (Oni, Flügel, Etherious, Vargr, Kitsune e Exceed) saíram da lista; as fichas que
as usam continuam funcionando, sem os estágios. A página **XIII. AS RAÇAS E A FORMA** do diário AS REGRAS tem tudo, com
os ritos.

## O Guia do Jogador

O compêndio **Guia do Jogador** (o primeiro da pasta Eternia, legível pelos jogadores) explica o sistema como um livro
de RPG, em 21 páginas: o jogo e os testes, o personagem, a criação, as raças e a forma, as classes e o Motor, as
Magias, as habilidades, a evolução, as sessões e cenas, o combate, o ataque e o dano, o Ódio, o Destino, os estados e
condições, o equipamento e a riqueza, as profissões, fora de combate e a mesa virtual, mais um glossário e uma
referência rápida. As listas de raças, classes, Magias e habilidades ficam nos compêndios e em AS REGRAS: o guia diz
como cada peça funciona, com caixas de Regra, Exemplo, Dica, Atenção, Na mesa virtual, Em resumo e Com o Mestre.

Com a configuração **Guia do Jogador no Diário** (ligada), o primeiro Mestre conectado põe o guia no Diário do mundo,
para todos lerem, e o reescreve sozinho quando uma versão nova do sistema muda o guia (a pasta, as permissões e a
ordem que o Mestre escolheu ficam; as páginas voltam a ser as do compêndio). As páginas saem dos capítulos em
`src/guide/` (veja [Desenvolvimento](#desenvolvimento)).

## Os diários e a interface

- **Diários como livro da Eternia** (configuração de cada jogador, ligada): todo diário em pergaminho, com o sumário
  no estandarte verde, o nome do diário no alto da página, títulos em Eczar com o losango dourado, texto em Gelasio
  numa coluna de leitura, regras douradas, tabelas com a faixa verde e links em etiqueta. A página sendo escrita tem o
  mesmo visual, e a imagem mostrada aos jogadores ganha uma moldura.
- **O menu Eternia do editor:** ao escrever uma página de diário, o menu Eternia põe as caixas do guia (Regra,
  Exemplo, Dica, Atenção, Na mesa virtual, Em resumo e Com o Mestre), o parágrafo de abertura com a letra grande e a
  regra em uma linha. A caixa sem título usa o nome do tipo; um título em Cabeçalho 4 na primeira linha troca o nome.
- **Interface no visual da Eternia** (configuração de cada jogador, ligada): os botões da barra lateral e os controles
  da cena em medalhões com aro dourado (o ativo em ouro), as listas de Atores, Itens, Diário e Compêndios com as pastas
  em faixa verde, os jogadores, a navegação das cenas, a caixa do chat, a pausa, os avisos, os menus de contexto, as
  dicas e a barra de toda janela no verde e dourado da Eternia. Fichas, cartões do chat e o diário têm o visual próprio.

## O Mundo de Eternia

O compêndio **O Mundo de Eternia** (só do Mestre) traz o mundo de jogo: a criação e os deuses, a história, os lugares,
o sistema que os personagens enxergam (a ficha é a Janela de cada um), a Igreja e os Cavaleiros, as academias e o
torneio, as guildas, o Anima-mundi e as Fendas, o Território Negro, os dragões, o castelo do céu, as raças e a evolução
da forma, a Kaimei, as classes como Vias, as Magias, as Tarefas Sagradas e a mesa (a sessão zero, os arcos, os relógios
do Mestre e as primeiras sessões). Cada capítulo é um diário, e cada parte, uma página; os capítulos se ligam entre si.
Para mostrar uma página aos jogadores, importe o diário para o mundo e dê a eles a página.

## O bestiário

**Os itens deixados rolam sozinhos.** Cada monstro tem a sua tabela na aba **Itens Deixados** da ficha: cada linha é um
item com as faces do 1d6 que o dão (1–3, 6) ou **Fixo**, e quantas cópias, e uma linha pode ser de ouro (2d6×3). Quando
o monstro cai, o Mestre principal rola o 1d6 e um cartão no chat mostra o dado, o que veio, o ouro e para onde foi:
**quem derrubou o monstro leva todos os itens e todo o ouro** (o atacante do cartão de dano que o levou a 0 PV, ou quem
deu o veneno ou o fogo que o feriu), e o que não cabe no inventário fica numa pilha de saque no quadrado dele. O cartão
tem o **Desfazer** do Mestre. Seguem as regras do Log Horizon: o Fixo cai sempre, e quem entrou no combate depois do
começo (os chamados, as levas, um token posto no meio da luta) não deixa nada. A configuração **Itens deixados: quando
rolar** troca a queda pelo fim do combate ou pela rolagem à mão (o botão Rolar da aba, que também escolhe quem recebe).
Um monstro do mundo com a tabela escrita no texto rola por ela mesmo, e a aba tem o **Virar dados**. O Bestiário traz
só as criaturas da Eternia (os monstros antigos de Log Horizon saíram na 0.43). Arrastar um item para a ficha de um monstro cria uma linha, nas faces livres, e a
aba compara a média da tabela com a do Guia de Criação de Inimigos.

**O bestiário do Império** (pasta O Império do compêndio Bestiário, uma pasta por NP, do 1 ao 9) traz 52 monstros com
regras automatizadas:

| NP | Monstro | O que faz |
|---|---|---|
| 1 | **Kobold Batedor** | Lacaio: o Bando da Galeria dá +2 de dano por kobold engajado com o alvo, e o Some na Parede o deixa [Oculto] com +1d6 no próximo dano. |
| 1 | **Estirge** | Lacaio, em bandos: o ferrão a gruda em quem ela fere, e ela suga 5 PV dele em cada Manutenção e vai junto quando ele anda, até alguém arrancá-la com uma Ação Menor no botão **Arrancar** do cartão. |
| 1 | **Zumbi Cambaleante** | Lacaio: quando cai a 0 PV, rola 1d6 e com 4 ou mais fica com 1 PV, sem limite, menos contra a [Radiância] e o acerto crítico. |
| 2 | **Kobold Glutão** | Roer o Veio o faz crescer, [Fortalecido] que soma e um token 2×2 no terceiro cristal, e cada cristal roído vai para os itens deixados dele. |
| 2 | **Lobo Atroz** | +3 de dano por outro [Lobo] engajado com o alvo, e o pelo de faísca deixa [Eletrificado] quem o fere. |
| 2 | **Geleia Ocre** | O golpe físico a divide em duas, cada uma com metade dos PV que sobravam, até 4 pedaços; fogo e Artes não a dividem. Não fica [Derrubado] nem [Agarrado]. |
| 2 | **Cocatriz** | A bicada petrifica aos poucos: [Lento] até o fim da cena, depois [Paralisado] e [Enraizado], depois [Petrificado], que sai quando ela cai. |
| 2 | **Carniçal** | A garra deixa [Paralisado] até o fim do próximo turno do alvo e recarrega; a mordida fere +10 quem está [Paralisado]. |
| 2 | **Gnoll Saqueador** | A Fúria Sanguinária: quando derruba alguém, ganha na hora uma Ação Menor, corre até 2 Qd e morde de novo, e cada queda dá mais uma. |
| 2 | **Fenda Pequena** | Perigo de cena (veja as Fendas, abaixo). |
| 3 | **Senhor Kobold** | Chefe: a aura de [Fortalecido] dos kobolds à volta, a couraça que tira um Estado Negativo no Encerramento, [Fúria] e [Acelerado] na metade dos PV, o chamado de 1d3 Kobolds Batedores e a explosão que acerta quem estiver a 1 Qd quando ele cai. |
| 3 | **Javali Atroz** | A investida empurra 2 Qd e derruba, a Ferocidade o deixa com 1 PV uma vez por cena, e o couro de cristal anula 5 de dano até o fogo rachá-lo ([Fissurado] a cada golpe de [Chama]). |
| 3 | **Contrabandista** | O Selo não o deixa matar, o golpe para em 1 PV; a lâmina envenena; a bomba de fumaça esconde o grupo dele. |
| 3 | **Mímico** | O token é um baú até alguém tocá-lo ou até ele agir; quem pisa nele ou o golpeia corpo a corpo fica [Agarrado], e a mordida fere mais quem está preso. |
| 3 | **Monstro da Ferrugem** | As antenas enferrujam a armadura de metal, [Fissurado] que soma até quebrar a guarda; quem o fere com uma arma de metal fica [Enfraquecido: 4] até limpar a arma. |
| 3 | **Harpia** | Voa; o canto deixa [Encantado] em área, e quem ela encanta anda até ela no começo de cada turno, até sofrer dano de qualquer um. |
| 3 | **Sombra** | Sempre [Intangível]: só as Artes e o dano direto a ferem; o toque deixa [Enfraquecido] que soma e não passa sozinho; quem ela derruba levanta como Sombra na Manutenção seguinte, a menos que volte a ter PV antes. |
| 3 | **Orc Guerreiro** | Agressivo: uma vez por rodada corre até a Velocidade na direção de um inimigo e fica engajado com ele, sem gastar ação; a Persistência o deixa com 1 PV uma vez por cena. |
| 3 | **Cão Intermitente** | Em matilha: o Piscar o leva, com a Ação Menor, às costas de alguém a até 6 Qd, no quadrado do alvo, e a Matilha Intermitente dá +3 de dano por outro inimigo engajado com o alvo. |
| 4 | **Aranha-Alçapão** | 2×2: o fio de teia puxa e prende, a picada envenena e sobe para [Lento] e [Paralisado], e ela começa [Oculta] no teto. |
| 4 | **Velha Cicatriz** | A fera com nome feita do Lobo Atroz. |
| 4 | **Cubo Gelatinoso** | 2×2, começa [Oculto]; o Engolfar passa por cima de quem está no caminho e o engole: [Agarrado] dentro dele, ácido em cada Manutenção, e só sai vencendo Atletismo contra 10. Bater no cubo pode acertar quem está dentro. |
| 4 | **Bugbear Emboscador** | Começa [Oculto]; +2d6 de dano contra quem ainda não agiu na rodada; a maça alcança a 2 Qd. |
| 4 | **Doppelganger** | Tomar o Rosto: o token dele vira o de quem ele toca, com a imagem, o nome, o tamanho e a borda, até de um personagem, e o rosto dele volta quando ele cai ou fica [Identificado]. |
| 4 | **Gárgula** | O token é uma estátua até ela se mexer, a Pose de Pedra a deixa estátua de novo uma vez por cena, e a Pele de Pedra corta pela metade o dano físico sem magia. |
| 5 | **Lagarto-Lanterna** | A [Radiância] o cura, quem fica perto fica [Cego] em cada Manutenção, e o Vômito de Luz recarrega com 5 ou 6 no 1d6. |
| 5 | **Capitão Contrabandista** | Chefe de grupo: [Clones: 3] dos sósias; a Mão Leve rouba ouro de quem ele fere, e o ouro volta nos itens deixados; **A Proposta** põe no chat um cartão com o ouro que ele oferece para ir embora, com Aceitar e Recusar. |
| 5 | **Goblin Saqueador** | Lacaio, com a Mão Leve. |
| 5 | **Javali Gigante** | Marca a presa na Manutenção, a investida fere mais a presa marcada e a empurra, e depois ele fica [Exposto]. |
| 5 | **Basilisco** | 2×2: no começo do turno de quem está a até 3 Qd dele, o cartão **Olhar de Pedra** pergunta se encara, rolando Resistência contra o olhar ([Lento], depois [Petrificado]), ou desvia os olhos, com −1d6 nos ataques até o fim do turno. |
| 5 | **Necromante Renegado** | Chefe de grupo: Erguer os Mortos levanta como Zumbi dele cada criatura caída a até 4 Qd, de qualquer lado, e os mortos dele caem quando ele cai; a Névoa de Cinza deixa [Silenciado], e as Maldições dele o [Silenciado] não para. |
| 5 | **Aranha de Fase** | No fim do turno some e nada a alcança; no começo do próximo, volta às costas de quem tem mais Ódio a até 6 Qd, picando com +1d6. Quem está em Espera pega a volta com a Ação Maior do turno. |
| 5 | **Fenda Grande** | Perigo de cena. |
| 6 | **Tropa Goblin** | Quatro goblins num token 2×2: o dano em área a acerta em dobro, e com 2/3 e 1/3 dos PV ela perde um goblin e acerta um alvo a menos. |
| 6 | **Goblin Piromaníaco** | A tocha que queima e a bomba que cega, prende um [Pavio] e esconde os goblins na fumaça. |
| 6 | **Revenante** | Não fica com [Medo] nem [Confuso], dá dois golpes de Cavaleiro e fica parado depois, e volta uma vez com metade dos PV, esquecendo uma Arte; deixa um Cristal de Memória. |
| 6 | **Worg** | O salto anunciado com [Marcado: 8] e o uivo que chama mais um lobo na metade dos PV. |
| 6 | **Ogro de Cabeça de Lobo** | Chefe de grupo: arremessa um personagem engajado até 4 Qd, contra outra criatura ou em linha reta, e quem é atingido sofre o impacto; o Uivo de Guerra deixa os aliados [Fortalecido: 5] e dá [Medo] a quem falha na Resistência; no Encerramento se livra de um Estado Negativo. |
| 6 | **Arbusto Errante** | Chefe de grupo 2×2: o cipó que puxa e o abraço que engole, e o raio que o cura e o deixa [Acelerado]. |
| 6 | **Golem de Carne** | Chefe sozinho 2×2: na metade dos PV entra em [Fúria] e ataca a criatura mais perto, aliada ou inimiga; o raio também o cura. |
| 7 | **Chefe Goblin** | Chefe de grupo: a corrente que arrasta e agarra, o grito que fortalece o bando e a fuga com o saque com 1/4 dos PV, a menos que esteja preso. |
| 7 | **Kobold Sentinela** | Um kobold de alabarda que leva no lugar o golpe num kobold ao lado, e gira a alabarda em todos os engajados. |
| 7 | **Santo Partido** | A luz que vaza da marca fere todos a 2 Qd no Encerramento, ele também. |
| 7 | **Espectro do Inverno** | Um ataque físico por rodada passa através dele, e o frio dele congela quem chega perto. |
| 7 | **Fantasma** | Chefe sozinho: é névoa que o golpe físico atravessa até ele agir, e a possessão o esconde dentro de um personagem, [Dominado], que divide o dano com ele até a [Radiância] ou a Resistência o expulsarem. |
| 7 | **Hidra do Pântano** | Chefe sozinha 3×3: uma Ação Maior por cabeça; cada quinto dos PV corta uma, e cada toco nasce em duas na Manutenção, a menos que leve [Chama]. |
| 8 | **Meio-Dragão Ardente** | Voa, sopra fogo com Recarga e queima quem fica a 1 Qd. |
| 8 | **Demônio das Sombras** | As asas de sombra se abrem na primeira rodada, a garra deixa [Chama Negra] e a maldição que o [Silenciado] não para apaga o nome do alvo. |
| 8 | **Uivo Violeta** | A fera com nome da Fenda-mãe. |
| 9 | **Serafim Errante** | Voa, a voz de sino atordoa e o canto cura. |
| 9 | **Homem-Tigre** | [Regeneração: 15] que o fogo desliga e [Fúria] na metade dos PV. |
| 9 | **Fenda-mãe** | Perigo de cena. |

Algumas regras valem para um grupo inteiro:

- **As gosmas e as armadilhas vivas das minas** (a Geleia Ocre, o Cubo Gelatinoso, o Mímico e o Monstro da Ferrugem)
  pedem outro jeito de lutar: fogo e magia na geleia, tirar o amigo de dentro do cubo antes de bater forte, desconfiar dos
  baús e deixar a espada de metal longe do bicho da ferrugem.
- **Os mortos levantam:** a Sombra transforma em Sombra quem ela derruba, e o Necromante Renegado ergue os caídos em
  volta como Zumbis. Quem levanta tem o token escondido e o monstro no quadrado dele; um personagem fica [Morto] e
  volta no fim da cena pelo Retorno. Curar o caído antes (PV acima de 0) impede. Quando o monstro que levantou cai, o
  corpo volta ao chão.
- **Os que vêm de fora do muro** (o Gnoll Saqueador, o Orc Guerreiro, o Bugbear Emboscador e o Ogro de Cabeça de Lobo):
  gente do Território Negro que cruza a serra. Cada um muda o ritmo da luta: o gnoll pune quem cai, o orc não deixa
  ninguém longe dele, o bugbear pune quem age tarde e o ogro joga um herói em cima do outro.
- **Os goblins temem a luz:** a [Radiância] fere mais e dá [Medo].
- **Os monstros das Quedas de Aincrad anunciam o golpe** (o Javali Gigante, o Worg e o Kobold Sentinela).
- **A fera com nome:** a coroa **Dar Nome** no cabeçalho da ficha de monstro (Mestre) faz, de qualquer fera, a que uma
  guilda inteira caça: Nível +2, chefe, PV ×2 com o bando ou ×4 sozinha, 3 de Destino, ataques mais fortes, os itens
  deixados ×4 com um Anima-mundi e um troféu, e uma das seis **Marcas do Peso** (Pele de Anima, Olhos da Fenda, Fúria do
  Peso, Sangue de Faísca, Regeneração do Peso, Sopro do Peso). A Velha Cicatriz e o Uivo Violeta já vêm prontos.
- **Os Desgarrados** (o Santo Partido, o Espectro do Inverno, o Meio-Dragão Ardente, o Demônio das Sombras, o Serafim
  Errante e o Homem-Tigre): um por raça, presos no estágio IV da forma, chefes que lutam sozinhos. **Todos podem ser
  salvos:** com 1/4 dos PV ou menos, um cartão no chat traz o botão **Salvar**; quem está engajado gasta a Ação Maior e
  rola Negociação contra a Resistência dele, e vencendo ele fica [Pacificado] até o fim da cena e sai da luta, sem deixar
  itens, e o Mestre pode fazê-lo virar uma **Conexão** de quem o salvou.
- **As Fendas** são perigos de cena. O relógio de escritas é o Destino delas (os losangos do token); em cada Manutenção
  a Fenda solta a leva; quem está a até 1 Qd gasta a Ação Maior e rola 2d6 + POD no botão **Escrever** do cartão dela
  (contra 9 na Pequena, 11 na Grande e 13 na Fenda-mãe). Na Pequena, quem escreveu e é ferido antes do fim da rodada a
  faz crescer; na Grande e na Fenda-mãe, quem escreveu e cai (2 e 3 escritas a mais). Fechada, quem escreveu a última
  linha leva o que ela deixa. A Grande solta 2 feras sorteadas em cada Manutenção; a Fenda-mãe solta na primeira rodada o
  Uivo Violeta (que deixa os itens dele) e depois 2 ou 3 feras sorteadas a cada Manutenção.

**A arte.** Os 52 monstros do Império têm retrato e token próprios, no traço de anime: o token redondo com a moldura da
Eternia (aro de ouro, fio carmesim e um losango de cada lado, sobre fundo branco) e, nas Fendas, um hexágono de fundo
roxo com brilhos e uma luz violeta animada (estrelas na Pequena, um campo de energia na Grande e um vórtice na
Fenda-mãe). Os monstros que um mundo já tinha trazido do compêndio (arrastados, chamados, soltos por uma Fenda)
ganham os nomes de hoje e a arte na migração da 0.37; o que o Mestre mudou neles fica.

**No mapa**, cada criatura do Bestiário ganha um número romano depois do nome: Kobold I, Kobold II, Kobold III. Vale
para as que o Mestre arrasta e para as que entram no meio da luta (os chamados, as levas das Fendas); o número é o menor
que nenhuma outra da cena com o mesmo nome tem.

**Os NPCs** e **os personagens maiores** ficam em compêndios próprios, fora do Bestiário: quem importa uma categoria
não traz as outras. O compêndio **NPCs** traz 126 personagens prontos, em nove pastas: Campo e Aldeias,
Cidades e Ofícios, Igreja Axiom, Nobreza e Governo, Guardas e Cavaleiros, Academias e Saber, Guildas e Aventureiros,
Povos da Forma e Além do Muro. São fichas de personagem com raça, profissão (com o Rank), NP e, nos guerreiros, classe
com o kit, o Caminho e o Ápice; ninguém tem Magia. Cada um tem alcunha, idade, terra natal e um gancho na biografia, e
um token neutro e vinculado, com a moldura da Eternia e um fio verde-azulado. Sem classe, a ficha soma só os números da
raça, como o sistema calcula: o povo comum é frágil numa luta.

**Os personagens maiores.** O compêndio **Personagens Maiores** traz 140 personagens de grande relevância na
história, em 15 pastas, dos espadachins aos anciãos, das damas e sacerdotisas aos meio-feras e às feras
e divindades; os 18 mais novos ficam na pasta v2. Cada um vem com o nome, a raça e um token e retrato no traço de anime; o resto da ficha (a classe, a
Magia, a profissão, os atributos, o NP) fica para o Mestre: o botão da pena abre o assistente de criação com a raça já
marcada. As feras e divindades absolutas têm o token Astro, o círculo de ouro com raios em cada canto e um céu da noite
atrás, em 2×2, com uma luz leve na cor de cada uma; os demônios trazem uma névoa escura em volta.

A página **XIV. O BESTIÁRIO** do diário AS REGRAS explica tudo para o Mestre.

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

Os 23 estados das regras de base e mais 52 condições da Eternia, feitas para emular poderes de anime. A regra de
cada uma aparece ao passar o mouse (na ficha, no HUD e nos estados clicáveis do chat), e a página
**IX. CONDIÇÕES DA ETERNIA** do diário AS REGRAS traz todas por extenso.

| Família | Condições |
|---|---|
| Controle | Paralisado, Adormecido, Enraizado, Derrubado, Lento, Agarrado, Petrificado |
| Bloqueio | Silenciado, Desarmado, Cego, Selado (Habilidade), Enfraquecido: n, Amnésia |
| Mente | Medo, Encantado, Provocado, Fúria: n, Dominado, Pacificado, Agonia: n, Pesadelo: n |
| Elementais | Queimando: n, Envenenado: n, Congelando: n (acumula até 3), Eletrificado: n, Maldito, Encharcado: n, Pavio: n (soma), Chama Negra: n |
| Quebra de guarda | Exposto, Fissurado: n (acumula até 3), Marcado: n, Sentença: n |
| Estados de Combate | Acelerado, Fortalecido: n, Concentrado, Espelho: n, Intangível, Último Fôlego, Despertado: n, Servo: n, Sol: n, O Único, Contragolpe, Rancor: n, Ímpeto: n (soma), Combo: n (soma), Intocável, Inversão, Ritmo: n (até 3), Clones: n (até 6) |
| Outros | Vínculo |

O que o sistema faz sozinho:

- **Dados:** −1d6 e +1d6 nos testes e nas Esquivas (Confuso, Cego, Medo contra quem o causou, Derrubado, Marcado,
  Envenenado, Encantado, Concentrado, Despertado…) e o dano a mais de Fortalecido, Fúria, Despertado, Ímpeto, Combo e
  Clones (no corpo a corpo), os d6 do Ritmo no próximo feitiço (e o a menos do Enfraquecido), com o motivo no cartão.
  Adormecido, Petrificado e Pesadelo falham na Esquiva.
- **Dano aplicado:** Exposto fica sem Defesa e sem Anulação, Intangível não sofre dano físico, Marcado soma o seu
  Valor quando a Esquiva falha, Último Fôlego segura em 1 PV, Vínculo divide o dano, Espelho devolve, Maldito não
  recupera PV, [Chama] derrete o Congelando e seca o Encharcado, Encharcado soma o seu Valor ao dano de [Choque] e de
  [Frio] (e apaga o Queimando), e o Adormecido acorda. O Contragolpe devolve ao atacante o dobro do dano que o golpe
  causaria, O Único não sofre nada de ataques, o Rancor guarda o PV perdido e a Chama Negra não deixa ninguém se curar
  (nem com Regeneração) e não apaga com água. Intocável não sofre dano mágico, Petrificado sofre metade, os Clones
  podem levar o golpe (1d6 até o Valor), a Inversão faz o dano mágico curar e a cura ferir, o golpe de quem está
  Pacificado não fere, a Agonia dói a cada cura e a cada Estado Negativo tirado, e o Fôlego Extra (Sete Corações,
  Imortal) segura em alguns PV. Uma Execução (o Purgar da Arca) derruba na hora quem é demônio ou usa
  Maldição e fica com pouco PV; o golpe de quem tem o Tabu da Praga para em 1 PV (só as condições derrubam); e a cura
  de feitiço de um aliado fere quem tem o Tabu d'O Soberano.
- **Turnos:** o Sol sobe na Manutenção (até o meio-dia, que dá O Único, e depois desce; de noite, não passa de 2),
  Envenenado no início do turno, Eletrificado a cada Ação Maior, Queimando, Chama Negra, Sentença e Pavio (que explode
  de uma vez) no Encerramento, quando o Servo golpeia o inimigo mais perto e o Casulo das Trevas alimenta o Motor de
  quem o lançou, e o Pesadelo fere; o Ímpeto sobe no fim de cada turno (passou do NP, vem a Fúria) e o Combo zera num
  turno sem ataque; Lento age depois dos outros, Acelerado tem duas Ações Menores, Paralisado, Adormecido, Petrificado
  e Pesadelo perdem a vez.
- **Acúmulos:** o terceiro Congelando paralisa; o terceiro Fissurado quebra a guarda (a Barreira some e vem Exposto).
- **Ficha:** Exposto e Fissurado baixam as defesas, Sol e Ímpeto as sobem; Congelando, a Velocidade e a Iniciativa;
  Enraizado, Agarrado, Paralisado, Adormecido, Petrificado e Pesadelo zeram a Velocidade.
- **Proibições:** as ações, os alvos e o movimento que as condições impedem (Silenciado, Desarmado, Selado, Agarrado,
  Provocado, Encantado, Dominado, Cego, Fúria, Enraizado, Medo…) avisam ou bloqueiam, como os limites de uso. Um Tabu
  pode proibir mirar quem está engajado (a Distância, da Invasão).
- **Fim:** cada condição acaba quando a regra manda (fim do turno, Encerramento, fim da cena) e respeita o Aflito; os
  efeitos infinitos (a Magia Infinito) não acabam assim, e duram a cena; um estado renovado (a Promoção de Estado) pula
  o próximo fim (nos dois casos, menos os estados que tiram o turno); Petrificado, Amnésia e Pesadelo dados no
  próprio turno duram até o fim do seguinte; Agarrado, Vínculo, Chama Negra e Petrificado acabam quando quem os causou
  fica Incapacitado; Despertado e Ímpeto deixam Fadiga.
- **Quedas:** quem tem o Traço do Portão do Inferno come a alma de quem cai a até 4 Qd (+1 no Motor da classe e NP
  de PV, uma vez por rodada), e o Rito do Rancor dos Mortos transforma em [Servo] os inimigos que caem na rodada.
- **Livrar-se com uma ação:** no HUD, o ícone de corrida ao lado da condição gasta a ação da regra (Ação Menor para
  Queimando, de Movimento para Derrubado, Maior para Envenenado e o Pavio…). Um Estado Negativo de um efeito infinito
  sai com uma Ação Maior (o efeito inteiro sai).
- **Origem:** Medo, Encantado, Dominado, Provocado, Agarrado e Vínculo lembram quem os causou (quem usou a habilidade
  ou o estado clicável).
- **Presságio, fora do turno, Imortal e Reino:** quem tem a Magia Visão rola dados no começo do combate e os guarda;
  botões nos cartões de ataque trocam um dado do Teste de Acerto ou da Esquiva por eles. O Lampejo Divino abre uma
  janela de ações fora do turno (uma Ação de Movimento e uma Ação Menor, contadas à parte). O Imortal ganha
  [Regeneração] na Manutenção e um Fôlego Extra por rodada; o Escudo de Carne recebe no lugar de um aliado o golpe que
  o acertou; o Reino do Caos dá a regra escolhida a quem está perto de quem conjura, a cada Manutenção.
- Duas tags novas para as habilidades: [Feitiço] e [Canção]. Silenciado impede as duas e o [Ataque Mágico].

## A automação

### Uso de habilidades
- **Custos de Ódio e Destino** pagos ao usar (o Ódio só conta em combate iniciado).
- **Limites de uso** (1/Cena, (NH)/Cenário, 1/Rodada…) contados por personagem.
- **Momento e economia de ações:** cada ação no seu Processo, a Manutenção na Manutenção, o Encerramento no
  Encerramento, a Ação Maior, a Menor, a de Movimento e a Instantânea uma vez por turno (a reação fora da vez não
  conta). Disparada e Deslocar-se gastam também a Ação Menor. Os itens usáveis (poções, comidas, pergaminhos) gastam a
  ação do Momento deles, com o mesmo registro e o Desfazer.
- **Habilidades de itens:** o item equipado, a trava de NP, o Ódio mínimo e a Pré-Ação.
- **Avisar ou bloquear:** cada conferência pergunta se é para usar mesmo assim ou bloqueia o jogador (o Mestre
  sempre pode forçar).
- **Registro no cartão** com o que foi gasto e o botão **Desfazer uso**, que devolve os custos, as contagens e as
  ações e tira os efeitos que a habilidade deu, em quem estiverem.
- **Fim do turno:** gastas as Ações Maior, Menor e de Movimento, o sistema pergunta se o turno acaba (ou acaba
  sozinho, pela configuração); quem cai na própria vez tem o turno encerrado.

### Combate
- **Topo e Abaixo no Ódio por combate**, certos mesmo com vários combates ao mesmo tempo.
- **Encerramento:** a Regeneração cura e depois a Deterioração causa dano, com um resumo no chat.
- **Manutenção e Encerramento sozinhos:** a rodada passa por essas fases sem clique quando ninguém que ainda luta
  tem uma habilidade delas para usar.
- **Atordoado, Cambaleante, Paralisado, Silenciado e Provocado** acabam no fim do turno de quem os
  recebeu.
- **Incapacitado** com PV 0; Incapacitados, Mortos e Ausentes passam a vez.
- **Fim de cena ao encerrar o combate:** Aventureiros Incapacitados voltam, Mortos revivem com Fadiga, inimigos
  Incapacitados morrem, Estados Negativos e de Combate acabam.
- **Cartões de ataque e dano:** o dano fica ligado ao ataque certo, não aplica em quem ainda precisa esquivar nem em
  quem esquivou, pergunta antes de aplicar de novo, e cartões privados aparecem para os donos dos alvos.
- **Esquiva automática:** inimigos e personagens rolam o Teste de Esquiva assim que o ataque é declarado, e o cartão já
  sai com quem esquivou e quem foi atingido (o Destino ainda rerrola a esquiva). Desligada, o dono do personagem rola
  pelo botão Esquivar do cartão ou pelo HUD.
- **Dano, cura e efeitos sozinhos:** a tela do Mestre aplica o cartão de dano em quem o golpe atingiu e os efeitos da
  habilidade em quem ele alcançou; quem ainda pode usar uma reação Antes do Dano espera o dono. Um cartão de resultado
  por golpe, com o Desfazer de cada alvo e o Desfazer tudo. Um ataque sem dano faz um cartão de 0, que leva o Dano de
  Ódio, a Perseguição, a Fraqueza, o [Marcado] e o −1 de Ódio da esquiva falha.
- **O turno do monstro:** no começo dele, a tela do Mestre marca o Topo de Ódio que o monstro alcança (senão, o
  Aventureiro mais perto); no HUD, um clique no ataque usa a habilidade e rola o Teste, e o dano sai sozinho quando
  acerta. O "(Menor)" do ataque gasta a Ação Menor livre e soma o bônus; o [Destino 1] dos chefes é perguntado no
  uso (todos os engajados, a área, o estado) e gasta o Destino deles.
- **Corpo a corpo encostado** (regra da casa): um token encostado, de lado ou na diagonal, conta como Corpo a corpo.
- **Destino:** +1d6 no Teste, rerrolar o acerto, a esquiva ou qualquer 2d6, e remover um Estado Negativo; os chefes
  também, pela tela do Mestre (a Fenda não: o Destino dela é o relógio).
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
| O que os jogadores veem no Mercado | todos os itens |
| Limites de uso | avisar |
| Momento e economia de ações | avisar |
| Topo e Abaixo no Ódio por combate | ligado |
| Regeneração e Deterioração no Encerramento | ligado |
| Estados que acabam no fim do turno | ligado |
| Incapacitado automático | ligado |
| Fim do turno com as ações gastas | perguntar |
| Manutenção e Encerramento sozinhos | ligado |
| Fim de cena ao encerrar o combate | ligado |
| Aventureiros mortos revivem no fim da cena | ligado |
| Evolução da forma com o Mestre | ligado |
| Corpo a corpo alcança os quadrados vizinhos | ligado |
| Efeitos automáticos das condições | ligado |
| O que as condições proíbem | avisar |
| Correções nos cartões de ataque e dano | ligado |
| Esquiva automática dos personagens | ligado |
| Aplicar dano, cura e efeitos sozinho | sozinho em todos |
| Ataque do monstro em um clique | ligado |
| Monstro mira o Topo de Ódio | ligado |
| O (Menor) do monstro sozinho | ligado |
| Botões de Destino | ligado |
| Estados clicáveis no chat | ligado |
| Criar efeito a partir de um cartão | ligado |
| Conteúdo dos itens e monstros | ligado |
| Guia do Jogador no Diário | ligado |
| Itens deixados: quando rolar | quando o monstro cai |
| Tema pergaminho no chat | ligado |
| Janelas do sistema em pergaminho | ligado |
| Barras e nomes dos tokens no estilo da ficha | ligado |
| Quem vê a barra de PV dos tokens | todos, sempre |
| Barra de PV só em combate | ligado |

Cada jogador escolhe as suas: HUD de ações (ligado), HUD sem token selecionado (ligado), barra de macros do Foundry
(esconder), aviso da sua vez (ligado), selecionar o token na sua vez (desligado), levar a tela até quem age
(desligado), limpar os alvos no fim da sua vez (ligado), ícones animados (ligado), interface no visual da Eternia
(ligado) e diários como livro da Eternia (ligado).

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
eternia.bestiary.rollDrops(actor, { force: true, receiver: hero }); // os itens deixados de um monstro (null: o chão)
eternia.bestiary.convertTable(actor); // a tabela de itens deixados escrita na descrição vira dados
eternia.bestiary.spawnNear(token, [{ uuid, count: "1d3" }]); // monstros ao lado de um token, no combate, sem itens
eternia.bestiary.writeRift(fendaToken); // escreve na Fenda com o token selecionado
eternia.bestiary.nameMonster(actor); // a janela Dar Nome: uma fera com nome feita desse monstro (Mestre)
eternia.market.open();                // o Mercado
eternia.market.openShop(actor);       // a vitrine de uma loja (um mercador)
eternia.market.createShopDialog(entries); // a caixa de loja nova, com entradas do catálogo (Mestre)
eternia.market.createShop({ name, img, entries, stock: 3, buyPercent: 110 }); // uma loja direto (Mestre)
eternia.market.purchase(actor, entry, { quantity: 2, free: false }); // o Mestre compra (ou dá) um item do catálogo
(await eternia.market.catalog()).entries; // todos os itens do Mercado, como a janela os lê
eternia.syncGuide();                  // o Guia do Jogador no Diário, como o compêndio o tem (Mestre)
```

## Limites conhecidos

- **Reações** (Antes/Após o Teste, Antes/Após o Dano, Rolagem de Dano) ainda não são oferecidas na hora certa; o dano
  automático só espera quem tem uma reação Antes do Dano para usar.
- **Poderes de itens** que dependem de uma escolha, de um resultado ou de outra habilidade ficam só com os campos, o
  texto e a contagem de usos; o efeito deles é feito à mão.
- **Os estados das habilidades** com uma escolha entre opções, ou sustentados, ainda entram pelo botão **Aplicar
  efeitos**, depois do acerto; os outros vão sozinhos em quem foi atingido.
- **Desfazer o dano** não devolve o dano que o Espelho e o Vínculo mandaram para outro personagem.
- **Acordar quem está Adormecido** (outro personagem gasta uma Ação Menor) é feito à mão, tirando o estado.
- **Raças:** o que acontece fora das regras fica na mão do grupo: a conversa com espíritos (Olhos de Mana), a
  visão do Mestre (Premonição), o disfarce (Mil Faces), carregar alguém (Parceiro), atingir um segundo alvo com uma
  Cauda (Fogo-Raposa), comer o elemento ao alcance (Comer o Elemento) e o rito de cada estágio da forma.
- **Erro do core 14.367 no console** com combates simultâneos (`Cannot use 'in' operator to search for 'turn'`): vem
  do rastreador de combate do Foundry e é inofensivo.

## Desenvolvimento

- `module/` é o código (entrada em `module/eternia.mjs`): `documents/`, `sheets/` (as fichas de pergaminho estendem as
  classes base), `helpers/`, `apps/`, `piles/`, `automation/`, `chat/`, `content/`, `hud/`, `canvas/`, `classes/`
  (os Motores das classes e a aba Classe), `races/` (os estágios da forma e a aba Raça), `professions/`, `conditions/`
  (as condições da Eternia) e `i18n/` (os termos
  em português). `templates/`, `css/` e `lang/` seguem a
  mesma divisão.
- O visual de pergaminho (`css/automation.css`, `sheet.css`, `chat.css`, `windows.css`, `hud.css` e `tbg.css`) entra
  na camada de CSS `modules` (veja `styles` no `system.json`), acima do CSS base do sistema e do Foundry. A interface do
  Foundry fica em `css/interface.css` e o diário como livro em `css/journal.css`, ligados pelas classes `et-ui` e
  `et-journal` do `body` (`module/journal/index.mjs`).
- **O Guia do Jogador** é escrito em `src/guide/*.html`, um capítulo por arquivo, com o id, o nome curto e o título da
  página na primeira linha. `node tools/build-guide.mjs` monta o compêndio `guide` em `src/packs/guide` (links entre os
  capítulos com `@Guia[nome]{texto}`, para AS REGRAS com `@Regras[XI]{texto}`) e a versão que faz os mundos
  reescreverem a cópia do Diário. Toda mudança de regra, de mecânica ou da ficha vem com a mudança no guia.
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
  (fundos dos estados recoloridos; Encharcado, Enfraquecido, Pavio, Servo, Dominado, Chama Negra, Sol, O Único,
  Contragolpe, Rancor, Petrificado, Pacificado, Agonia, Amnésia, Pesadelo, Ímpeto, Combo, Intocável, Inversão, Ritmo e
  Clones são arte própria). Autores: Lorc, Delapouite, Skoll, Sbed, Zeromancer e
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
