# Changelog

## 0.32.0 — 2026-10-25

### Adicionado
- **As seis raças do mundo e os cinco estágios da forma.** Entram os **Dracônicos**, os **Demônios**, os
  **Celestiais** e os **Bestiais** em três linhagens (**Felinos**, **Lupinos** e **Vulpinos**, cada uma um item de
  raça); os **Humanos** e os **Elfos** ficam. Cada raça tem cinco estágios: o II abre no NP 3, o III no 7, o IV no 12 e o
  V no 16, e cada um dá habilidades da raça sem gastar escolhas (no IV, também +1 num atributo da raça; no V, a forma da
  Fera). São 29 habilidades novas, automatizadas: Unção, Eleito e Transcendente (Humanos); Meio-Espírito e A Fera do Fim
  (Elfos); Sangue de Brasa em sete linhagens, Sopro, Comer o Elemento, Chifres e Cauda, Asas e O Dragão (Dracônicos); A
  Marca, Chamas Negras e O Demônio do Abaixo (Demônios); O Símbolo e O Serafim (Celestiais); Reflexo Felino, Garras do
  Tigre e O Tigre Branco; Uivo e O Lobo da Lua Violeta; Sete Caudas e As Nove Caudas (Bestiais).
- **O selo Forma e a evolução** (`module/races/evolution.mjs`): o cartão da raça na ficha mostra o estágio e, quando o NP
  do próximo chega, brilha; o clique abre a caixa com o que o estágio dá, as escolhas e o rito. Com a configuração
  nova **Evolução da forma com o Mestre** (ligada), o pedido do jogador vai ao Mestre num cartão sussurrado, com Aprovar
  e Recusar. O Mestre evolui na hora, pode adiantar e pode voltar um estágio. Cada evolução deixa um cartão no chat, e a
  caixa e o cartão de NP avisam quando um estágio abre.
- **O compêndio O Mundo de Eternia** (só do Mestre): o mundo de jogo em 18 diários, um por capítulo, com uma página por
  parte e os capítulos ligados entre si.
- **A página XIII. AS RAÇAS E A FORMA** no diário AS REGRAS, com as raças, os estágios e os ritos.

### Alterado
- **O passo Raça do assistente** mostra os cinco estágios de cada raça (o NP, as habilidades e o rito), no lugar das
  desbloqueáveis; os Bestiais são um cartão só, com a linhagem escolhida na página, e as raças seguem a ordem do mundo.
- **As habilidades desbloqueáveis das raças viraram estágios da forma**: não aparecem mais no navegador de habilidades,
  vêm com a evolução, e as do NP 5 passaram para o 7 ou o 12 (as Asas de Luz, do NP 1 para o 7). Quem já tem uma delas
  fica com ela; quando o estágio a dá, a escolha gasta nela volta. As habilidades que mudaram de raça ganharam o texto
  da raça nova (as asas do Parceiro e da Velocidade Máxima, a auréola da Graça do Astro), e a Forma Etherious virou as
  **Asas da Treva**.
- **O estado que um efeito dá ao acertar** (`onHit`) aceita fórmula no Valor, resolvida ao usar a habilidade.
- **O cartão da raça na ficha** tem a cor da raça.
- O aviso de novidades fala da 0.32.

### Removido
- **As raças Oni, Flügel, Etherious, Vargr, Kitsune e Exceed** saíram da lista (`flags.eternia.retired`), com as
  habilidades que não passaram para as raças novas (Aera, O Livro, Clarividência, Chifre, Elo de Sangue e Oni Desperto).
  As fichas que as usam continuam funcionando, sem os estágios.

## 0.31.0 — 2026-10-25

### Adicionado
- **A aba Biografia refeita** (`templates/character/biography.hbs`), em quatro partes. **Perfil:** um cartão com o
  retrato, o nome, a alcunha, a raça · classe · profissão e o NP, o bordão e quem joga com o personagem; os dados
  pessoais (idade, gênero, altura, peso, olhos, cabelo, terra natal e guilda); a aparência; a personalidade
  (temperamento, ideais, objetivo, medo, do que gosta e o que detesta); e as **Origens**, o que a raça, a classe, a
  profissão e cada Magia dizem do personagem (o texto de ambientação que fecha a descrição de cada item, com a frase da
  Magia e a cor da categoria). **História** (o texto que já existia), **Laços** (as Conexões e as Uniões juntas, com o
  número delas na aba) e **Anotações** (pistas, nomes e promessas da campanha, num editor). Os campos novos ficam em
  `flags.eternia.bio`; a guilda é o campo que o sistema já tinha.
- **Esquiva automática dos personagens** (configuração, ligada): os personagens rolam o Teste de Esquiva assim que o
  ataque é declarado, como os inimigos, e o cartão já sai com o resultado; os Motores das classes ouvem a esquiva como
  quando ela vinha do botão. Desligada, volta o botão Esquivar.
- **Barra de PV só em combate** (configuração, ligada): fora de combate o token mostra só o nome; a barra de PV e o
  Motor da classe aparecem quando ele entra num combate e somem quando ele sai ou o combate acaba.
- **Os tokens já vêm configurados** (`canvas/token-defaults.mjs`): o de um personagem enxerga (visão ligada e sem
  limite de alcance: a escuridão na Eternia é regra de cena, [Escuridão] e [Visão Noturna], então só as paredes
  escondem o mapa), é vinculado à ficha (o PV perdido continua quando o token é apagado e posto de novo) e um personagem
  novo fica do lado dos aliados; o de um monstro continua sem vínculo, uma cópia por token. Todo token mostra o nome
  sempre. Um token de personagem posto na cena é vinculado mesmo que o modelo dele diga outra coisa.
- **Os feitiços contam o que fazem** na janela de Magias (a da ficha e a do passo Magia do assistente): o ponteiro sobre
  um feitiço mostra o começo do texto dele, com os colchetes em destaque e os estados que ele põe, e um clique abre o
  texto inteiro ali mesmo, com o custo e a frase de ambientação (outro clique fecha; Enter também abre). Os textos de
  uma Magia são lidos juntos, uma vez (`spellTexts` em `apps/magic-catalog.mjs`).

### Alterado
- **O passo Atributos do assistente** virou uma tabela: uma linha por atributo com o que vem da classe e da raça, os
  pontos (− e +, com o quanto a sugestão põe), o valor com losangos até o próximo modificador, o modificador e os
  testes. No alto, os pontos que faltam e a sugestão da classe; embaixo, os números de jogo em três grupos (Vida,
  Defesas e Em combate).
- **O passo Itens** ganhou o corpo: o kit da classe já vem equipado ao chegar no passo, e cada peça aparece no seu lugar
  ao redor de uma silhueta (as duas mãos, a armadura, a bolsa e os três acessórios, cada um onde é usado: o anel na
  mão, o amuleto no pescoço, as botas nos pés), com os números do equipamento nos cantos e a bolsa embaixo. Clicar num
  lugar filtra a loja para ele e o × devolve a peça; uma arma, armadura ou escudo comprado vai para o corpo, e o que
  estava lá passa para a bolsa. A loja ficou numa coluna própria, com o ouro, a busca e os filtros em ícones.
- **O passo Resumo** virou a página do personagem: uma faixa com o retrato, o nome, a raça · classe · Magia ·
  profissão, o NP, os PV, o Destino e o ouro, e quatro quadros: Origens (a classe com o Motor, a Magia com a categoria
  e a frase), Atributos e números, Habilidades (separadas pela origem, com o que cada uma faz ao passar o mouse) e
  Equipamento.
- **O nome dos tokens** ficou pequeno e limpo: letra clara com um contorno suave, logo abaixo do token (ou da barra de
  PV), sem a faixa colorida e os losangos. A dica da elevação tem o mesmo visual.
- **Trocar o retrato na ficha troca a imagem do token** (o modelo e os tokens já postos na cena) enquanto ele ainda usa
  a imagem padrão ou o retrato antigo; um token com imagem própria fica como está. Um ator novo já nasce com o token
  na imagem do tipo, a mesma da ficha.
- **O marcador do Foundry que girava em volta do token da vez** foi desligado (a configuração do marcador de turno, no
  rastreador de combate, liga de volta).
- Uma migração dá aos mundos que já existem o mesmo: os personagens e os tokens deles enxergam e ficam vinculados (um
  token que estava sem vínculo passa para a ficha o PV, o Destino, o Ódio e a Fadiga que tinha), todo token mostra o
  nome e o marcador de turno sai.
- O aviso de novidades fala da 0.31.

### Corrigido
- Um Teste de Esquiva rolado por quem não é dono do alvo (um jogador atacando um monstro) não tirava o que a esquiva
  gasta ([Concentrado] e os efeitos que valem para uma esquiva só): agora o Mestre tira.
- Um passo do assistente de criação abria rolado até onde estava o anterior; agora cada passo abre no topo.

## 0.30.1 — 2026-10-24

### Adicionado
- **Animação dos estados nos tokens** (`canvas/status-animation.mjs`): no lugar do texto "+(Nome)" do Foundry, o ícone
  do estado aparece sobre o token num medalhão, com um anel na cor do estado (carmim nos ruins, dourado nos de combate,
  verde nos outros), dá uma volta e encolhe até o lugar dele entre os ícones do token, que só aparece quando ele pousa;
  tirado, o estado sai do lugar girando e some. Cada jogador vê no próprio canvas; a configuração "Animação dos estados
  nos tokens" traz o texto de volta, e com "reduzir movimento" no sistema operacional fica só um brilho rápido.

### Alterado
- **O cartão de subir e descer de NP no chat** (`templates/chat/rank-up-card.hbs`): o retrato numa faixa na cor da
  classe, o NP num selo dourado (de cobre ao descer), os Atributos Base em quatro células, os PV, as escolhas e o que
  libera em linhas com ícone, e o que a classe dá pelo caminho, cada marco com o seu NP. O cartão tem o próprio
  pergaminho, então fica igual com o tema do chat ligado ou desligado.

## 0.30.0 — 2026-10-24

### Adicionado
- **Itens iniciais no assistente de criação** (`apps/starting-gear.mjs`): um passo novo, Itens, entre Habilidades e
  Resumo. A Mochila, o Kit de Aventureiro e o Sanduíche vêm de graça (a regra de AS REGRAS, II. PERSONAGENS) e o ouro
  do personagem (350) compra o resto numa loja com os itens de Nível 1 dos compêndios do sistema e do mundo, sem os
  [Invendáveis], os [Intransferíveis] e os mágicos [M1]–[M7] (um [Raro] vem marcado, para combinar com o mestre).
  Cada classe tem um **kit recomendado** que cabe em 350, com o porquê e um botão que compra tudo; os itens dele levam
  uma estrela na loja. Uma classe que luta com arma e tem uma Magia que ataca ganha a sugestão do Anel Cinzento (+4 no
  Poder Mágico). Filtros por tipo, busca, a dica de cada item sob o ponteiro, e a bolsa ao lado: o ouro, onde cada
  peça vai (as mãos, a armadura, três acessórios, a bolsa), o espaço do inventário e os números que o equipamento dá.
  Ao criar, os itens entram equipados onde a bolsa mostrou, e o ouro fica com o que sobrou; criar de novo troca os
  itens iniciais e devolve o ouro deles. O cartão do chat mostra o equipamento.
- **Sugestão de atributos** no passo Atributos: os cinco pontos para a classe (para onde a base dela é alta, até o
  próximo modificador), com um botão que usa a sugestão e uma marca em cada atributo.

### Alterado
- Os números de jogo do assistente (a faixa, os Atributos e o Resumo) contam o equipamento, e os testes somam o que os
  acessórios dão.
- Refazer no assistente um personagem de NP 1 com classe e sem profissão lembra o "Decidir depois".
- O aviso de novidades fala da 0.30.

### Corrigido
- Criar um personagem pelo assistente com a ficha fechada mostrava "Não foi possível criar o personagem" (a ficha
  trocava de aba antes de abrir); o personagem era criado, mas o aviso assustava.

## 0.29.1 — 2026-10-24

### Alterado
- **HUD de ações:** o painel Habilidades virou três, **Gerais** (as básicas, as da raça e as outras), **Magias** (os
  feitiços agrupados por Magia, cada uma com o retrato e a categoria na cor dela e o seu texto ao passar o mouse, e cada
  feitiço com o seu Momento) e **Classe** (as da classe e as de uma Dedicação, com o nome da classe no título), cada um
  com a sua tecla em Configurar Teclas. Um monstro continua com um painel só, Habilidades. Em telas estreitas os botões
  ficam mais justos antes de mostrar só os ícones.
- A caixa de subir e descer NP ficou mais larga (500 px), para quebrar menos as linhas.

### Corrigido
- **Caixas de mensagem mais altas que a tela** (subir vários NP de uma vez): os botões sumiam, cortados no pé da
  janela. Agora eles ficam sempre à vista e o texto acima deles rola, esmaecendo na borda de baixo enquanto há mais
  para ler.

## 0.29.0 — 2026-10-24

### Adicionado
- **Assistente de criação de personagem** (`apps/creation-wizard.mjs`): sete passos numa janela só (Raça, Classe,
  Magia, Profissão, Atributos, Habilidades e Resumo), com a ficha montando ao lado. Cada raça, classe e profissão é um
  cartão, e a página da que está sob o ponteiro explica tudo: a história, os números, as habilidades inatas (a
  escolha entre várias é feita ali, e o Humano marca os dois atributos do +1), o que libera no NP 3 e 5; na classe, a
  base, o Motor e como ele funciona, o kit, a escolha do NP 1 (o elemento do Matador de Dragões) e o caminho do NP 1
  ao 10. A Magia usa a mesma janela de Magias (com a escolha do Decreto nos Mandamentos); os atributos mostram os
  modificadores, os testes e os números de jogo enquanto os pontos são distribuídos; as habilidades de Combate e Geral
  seguem as regras do navegador de habilidades. Nada muda na ficha até "Criar personagem": aí vêm a raça, a classe, a
  profissão, o kit, a Magia, as escolhas (marcadas como escolhas da criação) e, se marcadas, as 16 habilidades
  básicas, com PV e Destino cheios e um cartão no chat. Abre sozinho quando um usuário cria um personagem (a
  configuração "Assistente de criação" desliga) e pelo botão da pena na ficha de um personagem de NP 1; refazer um
  personagem de NP 1 troca o que veio da raça, da classe e das escolhas.
- Aba **Magias** na ficha: as vagas da classe à esquerda e, ao lado, a Magia de cada uma com o Traço, o Tabu e todos
  os feitiços (os que o personagem tem, os que ainda pode aprender e os do NP acima), sem nomes cortados.
- Configurações "Assistente de criação" (do jogador) e "Cartão de personagem novo" (do mundo).

### Alterado
- **A ficha de personagem foi reorganizada**: mais larga (940×780), com o nome de cada aba ao lado do ícone e um
  número na aba quando há algo esperando (escolhas de habilidade, vaga de Magia aberta, Caminho). O cabeçalho mostra
  raça, classe e profissão sob o nome. A aba Personagem traz a raça, a classe e a profissão em cartões, cada um com
  uma linha do que dá, e os atributos com os seus testes ao lado (a aba Testes saiu: os testes de combate continuam no
  estandarte); as Conexões e Uniões ficam só na Biografia. As Habilidades abrem em Combate e ganharam uma busca. A
  aba Classe ficou sem a seção de Magias. O Inventário põe a riqueza, o espaço e os tíquetes ao lado do boneco de
  equipamento. Os efeitos sem duração dizem "Passivo" ou "Sem prazo" (antes "None").
- **A janela de Magias abre na hora** (de 0,5–0,8 s para menos de 0,1 s): o catálogo de Magias é lido do índice dos
  compêndios uma vez por sessão (`apps/magic-catalog.mjs`), a página de cada Magia só é desenhada quando aparece, e
  tudo é preparado enquanto o jogo está ocioso.
- Os índices dos compêndios de itens pedem todos os campos que o sistema lê
  (`CONFIG.Item.compendiumIndexFields`, `helpers/pack-index.mjs`): cada janela pedia campos diferentes e o Foundry
  buscava o índice inteiro de novo a cada uma. O navegador de habilidades, o de raças e classes e a aba Classe abrem
  sem esperar.
- O aviso de novidades fala da 0.29.

### Removido
- A aba Testes da ficha de personagem (os testes estão na aba Personagem).

## 0.28.0 — 2026-10-24

### Adicionado
- Vinte Magias das categorias altas, cada uma com Traço e página no diário AS REGRAS (as Perdidas, as Proibidas e as
  Maldições também com Tabu). 97 Magias, 1511 habilidades de classe.
  - Ancestrais: **Criação** (a dança do Rei Gigante dá [Ritmo]), **Desastre** (promover e rebaixar estados: os
    Estados Negativos sobem ou dobram de uma vez, os bônus murcham), **Arca** (a luz contra as trevas e a Execução do
    Purgar, que derruba na hora o demônio com pouco PV), **Caos** (cada feitiço pede uma escolha, a forma que nasce, e
    o Reino do Caos dá a regra escolhida a uma área em volta de você) e **Lampejo** (agir fora do turno: o Lampejo
    Divino dá uma Ação de Movimento e uma Ação Menor no fim do turno de outra criatura).
  - Perdidas: **Invasão** (a mente: [Pesadelo], [Amnésia], [Dominado], flechas de luz que atravessam [Anulação] e
    [Barreira]; Tabu: não mira quem está engajado e −1d6 nas Esquivas contra corpo a corpo), **Infinito** (os efeitos
    dos feitiços duram a cena, e quem está preso se livra com uma Ação Maior; o Cubo Perfeito, o Cancelamento
    Absoluto, o Caixão do Tempo) e **Visão** (o Presságio: dados guardados no começo do combate que trocam um dado de
    qualquer teste de um cartão de ataque).
  - Proibidas: **Forma Indura** (os Sete Corações e a transformação que entrega os que restam), **Sangue Demoníaco**
    (o terceiro feitiço da cena transforma, e as esferas negras explodem juntas) e **Fonte da Juventude** (Imortal:
    [Regeneração] em combate e um Fôlego Extra por rodada, a vida como moeda).
  - Maldições: **Mandamentos** (o Decreto: uma lei em volta de você, um dos dez Mandamentos escolhido ao receber a
    Magia, que amaldiçoa na hora quem a quebra, aliados e você também; Absorver Mandamento dá um segundo, e Os Dez
    Mandamentos põem os dez por uma rodada), **Ruptura Crítica** (o [Ímpeto], a força que sobe a cada turno até passar
    do limite), **Combo Estelar** (o [Combo], que soma a cada acerto), **Nebulosa Sinistra** (puxa os inimigos para a
    sua lâmina e, com Deus, fica [Intocável]), **O Soberano** (a [Inversão] e os bônus virados do avesso), **Portão do
    Inferno** (comer almas: quem cai perto alimenta o Motor e cura) e **Praga** (o golpe que não mata e a [Sentença]
    que chega mais cedo).
  - Portadoras: **Lâmina Divisora** (as cópias de verdade, com os [Clones]) e **Lança Espiritual** (as Formas da
    lança, uma por vez, cada uma com a sua ação e o seu efeito enquanto dura, e a Mudança de Forma, que vem com a
    Magia).
- Onze condições para as Magias das categorias altas, com ícones próprios (52 no total): [Petrificado] (perde o
  turno, falha nas Esquivas, metade do dano), [Pacificado] (os golpes não ferem), [Agonia: n] (curar-se ou
  livrar-se de um Estado Negativo dói), [Amnésia] (só as habilidades básicas), [Pesadelo: n] (perde o turno, dano
  no Encerramento, o dano não acorda), [Ímpeto: n] (sobe a cada turno; passou do NP, Fúria; deixa Fadiga),
  [Combo: n] (cada acerto soma, errar ou apanhar zera), [Intocável] (sem dano mágico), [Inversão] (o dano mágico
  cura e a cura fere), [Ritmo: n] (+n d6 no próximo feitiço) e [Clones: n] (uma cópia toma o golpe).
- O Fôlego Extra (`flags.eternia.revive`): ao chegar a 0 PV, fica com alguns PV e gasta um uso, por rodada ou por
  cena; o gancho `eternia.revived`.
- Petrificado, Amnésia e Pesadelo que chegam no próprio turno de quem os recebe duram até o fim do próximo turno
  dele; a flag `nextTurn` faz o mesmo com os outros estados que acabam no fim do turno.
- Flags: `keepCombo`, `comboGain`, `comboPerTarget`, o Traço `combo` e `selfBonus.spend: "free"`; a fórmula
  `@hpLost`; os estados de contagem (`tally`).
- Ganchos `eternia.recovered`, `eternia.freed`, `eternia.attacked`, `eternia.processEnd` e `eternia.skillUsed` (uma
  habilidade foi usada, com os alvos); o registro dos ataques de cada ator (`flags.eternia.attacked`); `breathsLeft` e
  `giveUpBreaths` para o Fôlego Extra.
- Os Decretos (`conditions/decree.mjs`), com as flags `decree`, `decreeTabu`, `decreeReach`, `decreeReachMult`,
  `decreeDamage`, `decreeSelfImmune`, `decreeRounds`, `decreeCurse` e o Traço `decreeImmune`.
- Escolha dentro de uma Magia: `choiceGrants` (a Magia ou o feitiço pede uma das habilidades da lista ao entrar na
  ficha).
- Ações de uso `pull` (puxar até ficar engajado) e `push` (empurrar n Qd), e `onUse` numa ação de uso (vem no uso,
  antes do teste).
- `bonusVs` com `decreeOf`, feitiço com `decreeCurse` e entradas de `onHit` com dados extras do efeito.
- Efeitos infinitos (o Traço `infinite`, `conditions/lasting.mjs`) e estados renovados (`renew`); as ações de uso
  `promote`, `doubleStatuses`, `demote`, `raise` e `cancelSpells` (`conditions/status-actions.mjs`); o Tabu que não
  mira quem está engajado (`noEngaged`) e a Esquiva contra corpo a corpo (`eternia.passive.closeDodge`,
  `conditions/distance.mjs`); o estado do acerto só em quem tem NP menor (`rankBelow`) e o bônus contra qualquer
  Estado Negativo com Valor (`bonusVs` com `ratedBad`).
- A Execução, o golpe que não mata e as almas (`conditions/blows.mjs`, `conditions/souls.mjs`): `execute` (Execução),
  `noKill` (o dano para em 1 PV), `lower` (o Valor de um estado cai a cada acerto), `convert` (um estado vira outro
  com o mesmo Valor), `soulEater` (comer almas), `harvest` (os inimigos que caem viram [Servo]), `feedSource` (o efeito
  alimenta o Motor de quem o deu no Encerramento), `cleanse` (tira estados dos aliados em volta), `healingHurts` (a
  cura de feitiço de um aliado fere), e `targetTags` / `belowHp` nos estados de acerto dos feitiços.
- As Formas (`form`), o estado em quem bate (`struckStatus`), a cópia que leva o golpe (`decoy`), a reação feita por
  uma cópia (`cloneReaction`), a habilidade que precisa de um estado (`needsStatus`), o n-ésimo feitiço da cena que
  transforma (`transform`, `transformNow`), os corações (`reviveStatus`, `surrender`) e a queda quando o efeito acaba
  (`fallOnEnd`), em `conditions/forms.mjs`, `conditions/copies.mjs` e `conditions/transformations.mjs`; a ação de uso
  `addStatus`.
- O Presságio (`conditions/omen.mjs`): dados rolados no começo de cada combate e botões nos cartões de ataque; a
  fórmula `@omen`.
- Agir fora do turno (`conditions/window.mjs`): uma janela de ações fora do turno, contada à parte das do turno.
- O Imortal (`conditions/immortal.mjs`): a [Regeneração] na Manutenção, a cura pela metade (`healTaken`), o golpe
  recebido no lugar de um aliado (`cover`), o custo em PV (`hpCost`) e as ações de uso `regenNow` e `giveHp`.
- O Reino (`conditions/realm.mjs`): uma área em volta de quem conjura que segue uma regra a cada Manutenção.
- Ações de uso de outros módulos (`registerUseAction`, com o campo `data` da ação).

### Alterado
- Os dados de dano que uma condição dá (o Ritmo) entram na rolagem de dano.
- A Deterioração do Encerramento respeita o Último Fôlego e o Fôlego Extra.
- O Despertado só deixa Fadiga na atualização que o tira (antes, duas atualizações ao mesmo tempo podiam cobrar
  duas vezes).
- O Teste de Acerto chega como Rolagem aos Motores das classes (antes ia como texto: a Combustão Mágica do Mago Negro
  dava erro a cada ataque de feitiço, e os Motores que leem o Acerto não o contavam).
- O Switch troca os tokens como movimento forçado.
- A janela de Magias não lista como feitiços as habilidades `choiceOnly` (os Decretos, a Mudança de Forma), e a aba
  Classe só mostra as que o personagem tem.
- Os estados que acabam no fim do turno e no Encerramento passam por um filtro (os infinitos e os renovados ficam).
- O Livrar-se do HUD aceita os Estados Negativos de efeitos infinitos (Ação Maior), com o aviso "Infinito" no botão.
- Os estados que o acerto de um feitiço dá ficam marcados como de feitiço (`fromSpell`).
- A ação `removeStatus` aceita `value`: tira no máximo esse tanto de estados, na ordem da lista.
- O Encerramento roda os efeitos que alimentam o Motor de quem os deu (o Casulo das Trevas).
- A escolha entre efeitos alternativos (`chooseEffect`) mostra só as alternativas cujas condições quem usa cumpre.
- Uma Magia pode dar habilidades junto com ela (`dedicationGrants`), como uma Dedicação.
- O uso de uma habilidade em combate consulta a janela fora do turno (uma Ação de Movimento ou Menor fora do turno não
  é mais um problema enquanto a janela a tiver) e paga o custo em PV; o Desfazer devolve os dois.
- A cura dos cartões e o `takeHealing` passam pelo `healTaken` do alvo (o `takeHealing` ganhou a opção `natural`, a
  cura do próprio corpo), e o dano dos cartões pelo `cover` (antes do Contragolpe).
- A Iniciativa é recalculada logo depois de o combate começar: os efeitos que só valem em combate (os Tabus que baixam
  a Iniciativa) já contam na ordem da primeira rodada.
- O aviso de novidades fala da 0.28.

## 0.27.0 — 2026-10-24

### Adicionado
- Quatro Magias das categorias altas: **Sol** (Ancestral; o Relógio do Sol, que sobe a cada rodada e a cada feitiço
  até o meio-dia, dá [O Único] e depois desce; de noite não passa de 2), **Contra-ataque** (Perdida; devolve o golpe
  dobrado e guarda o dano no [Rancor]), **Chamas do Purgatório** (Maldição; o fogo negro que não apaga e não deixa
  curar) e **Roubo** (Proibida; o que o alvo perde vai para você, com Dreno). 77 Magias, 1360 habilidades de classe.
- Cinco condições, com ícones próprios: [Chama Negra: n], [Sol: n], [O Único], [Contragolpe] e [Rancor: n] (41 no
  total).
- Flags dos feitiços e dos Traços: `drain` (Dreno), `steal` (rouba um bônus a cada acerto), `selfBonus` (dano pelo Valor
  de um estado de quem ataca, gasto ou não), `counterBonus` e `sunClock`; a fórmula `@status.<id>`; a Fraqueza passiva
  (`eternia.passive.weakness`); a cura de condição `takeHealing`.

### Alterado
- A Chama Negra bloqueia a cura como o Maldito (cartões de cura, Regeneração no Encerramento e efeitos de
  Regeneração); a linha do chat diz qual estado bloqueou.
- A Manutenção de cada rodada agora roda as condições (o Sol), com um resumo no chat quando algo muda.
- O aviso de novidades fala da 0.27.

## 0.26.0 — 2026-10-24

### Adicionado
- **O Traço das Magias:** cada uma das 73 Magias ganhou uma regra passiva própria, que vale para os feitiços dela e
  aparece na descrição da Magia, na página dela no diário AS REGRAS (e na lista da XII.b) e numa caixa da janela de
  Magias. São bônus de dano contra quem já tem um estado (o Fogo em quem queima, as Armas Mágicas em quem está
  [Marcado], o Encantamento por encanto que o alvo tem), estados que escalam (os Olhos Mágicos petrificam quem já está
  com [Rigidez], a Magia das Fadas cega quem tem [Medo]), imunidades (a Água não queima, o Gigante não é agarrado, o
  Comando M não é [Enfraquecido]), golpes que atravessam a [Barreira] (Esmagamento), a [Anulação] (Onda) ou metade da
  Defesa (Matador de Deuses do Raio), estados arrancados no golpe (Gravidade, Matador de Deuses do Fogo), o [Oculto] que
  não sai no ataque (Fumaça) e bônus de cura (Arco do Tempo, Magia Viva, Matador de Deuses do Céu).
- **Cinco condições:** [Encharcado: n] (soma o Valor ao dano de [Choque] e de [Frio], apaga e impede o [Queimando], a
  [Chama] seca; acaba no Encerramento), [Enfraquecido: n] (−n no dano; acaba no fim do próprio turno), [Pavio: n] (soma
  a cada aplicação e explode no Encerramento como dano de [Chama]; uma Ação Maior o tira), [Servo: n] (a criatura que
  fica do seu lado: no Encerramento golpeia o inimigo mais perto a até 4 Qd com n de dano direto; acaba no fim da cena)
  e [Dominado] (não mira em quem o domina nem nos aliados dele; acaba no fim do próprio turno). Ícones próprios; a
  página IX do diário AS REGRAS tem as 36.
- **Mecânicas novas de feitiço:** estado sorteado no acerto (Cartas Lançadas, Tempestade de Cartas), efeito sorteado
  (Leitura da Sorte), roubar os bônus do alvo (Roubar a Alma), dobrar o [Queimando] (Chama Roxa), dano que consome um
  estado (Coluna de Fogo no [Queimando]; Explosão e Detonação no [Pavio]) e criaturas que ficam do seu lado como [Servo]
  (Portão do Touro, Boneca de Pedra, Fera Criada, Fera Pintada, Torrente de Shikigami, Mortos de Pé, Fera Sagrada:
  Belcusas do Trovão, O Mais Forte dos Mortos, Bonecos de Almas e Soldado de Guarda).
- A tag de criatura [Demônio]: o Traço do Matador de Demônios causa +NP de dano em Demônios e em quem tem habilidades de
  [Maldição].

### Alterado
- **A revisão das Magias:** 47 feitiços de 33 Magias mudaram para que as Magias parecidas fiquem diferentes e as simples
  ganhem uma mecânica. Absorção (Conexão [Enfraquecido]; Absorver o Ataque [Fortalecido]; Roubar a Alma rouba os bônus),
  Alma de Fera (Braço de Fera: Pedra [Fortalecido]), Alma de Máquina (a Blindagem não tomba), Alma de Satã (Explosão
  Maligna [Medo]), Arco do Tempo (Envelhecer [Enfraquecido]), Arco da Grande Árvore (Bomba-Relógio de Raízes [Pavio]),
  Arco da Materialização (Belcusas [Servo]), Armas Mágicas (Bala Teleguiada [Marcado]), Bomba (o [Pavio] em tudo),
  Calamidade (Aguaceiro: [Encharcado] numa área), Cabelo Carmesim (Cabelo Esponja [Regeneração]), Cartas (estados e
  bônus ao acaso), Comando M (Redução [Enfraquecido]), Cópia (Copiar e Anular [Concentrado]), Encantamento (o Desencanto
  causa dano e atravessa a [Anulação] e a [Barreira]), Espíritos Celestiais (Touro [Servo], Aguadeiro [Encharcado]),
  Fogo (Laranja [Queimando], Roxa, Coluna, Arco-Íris [Exposto] em quem queimava), Histórias dos Mortos ([Servo] no
  supremo), Macro (Ordem ao Corpo [Dominado]), Magia Viva (Centelha [Regeneração], Fera [Servo]), Moldagem de Madeira
  (Aproximação Violenta [Cambaleante]), Necromancia (Mortos de Pé [Servo]), Neve (Nevasca Branca [Cego]), Perfume Mágico
  (Perfume da Dor [Envenenado]), Pintura Mágica (Fera Pintada [Servo]), Raio (Relâmpago [Eletrificado]), Magia Seith
  (Possessão [Dominado]), Shikigami (Torrente [Servo]), Teatro de Bonecas (Marionete [Dominado], Boneca de Pedra
  [Servo]), Terra (a Muralha de Rocha cobre os aliados) e Furtividade (Apagar a Presença: o primeiro golpe
  [Fortalecido]).
- Três feitiços mudaram de nome e de regra: Véu das Trevas virou **Aura da Morte** (Artes Negras: [Maldito] nos inimigos
  engajados), Bonecos: Formação X virou **Bonecos de Almas** (Magia Seith: [Servo]) e Guarda de Sombras virou **Soldado
  de Guarda** (Sombras: [Servo]).
- As fichas recebem as Magias e os feitiços revistos sozinhas: a migração (versão 7) refaz cada Magia e cada feitiço
  pelo compêndio, guardando o NH e o uso.
- Diário AS REGRAS: a página IX (as cinco condições) e o capítulo XII inteiro (o Traço em cada página, na XII.a e na
  lista da XII.b). A janela de Magias mostra o Traço numa caixa própria, e os filtros de função contam as condições
  novas.
- O aviso de novidades fala da 0.26.

## 0.25.0 — 2026-10-24

### Adicionado
- **Três elementos do Matador de Dragões:** Branco (a luz: [Radiância] e [Marcado]; Raio Sagrado do Dragão Branco,
  Impulso Branco e a Arte Secreta Nova Sagrada), Sombras ([Corrupção] e [Cego]; Corte do Dragão das Sombras, Forma de
  Sombra e a Arte Secreta Abismo do Dragão das Sombras) e Veneno ([Veneno] e [Envenenado]; Dente Duplo do Dragão do
  Veneno, Guarda do Dragão do Veneno e a Arte Secreta Mandíbula do Dragão do Veneno). A Dedicação também deixa
  escolher os três, e o Modo Dragão Duplo da Primeira Geração come os elementos novos.
- **Duas Magias Perdidas:** Matador de Deuses do Raio (Tabu: Defesa Mágica −NP; Rugido do Deus do Raio, Devorar o
  Raio, Canhão de Raio Negro de 120 mm, Couraça de Raio Negro, Trovão Negro do Deus do Raio e o supremo Canhão de
  Partículas do Deus do Raio) e Matador de Deuses do Fogo (chamas negras que racham em vez de queimar; Tabu:
  Recuperação −NP e Defesa Física −NP÷2; Rugido do Deus do Fogo, Devorar as Chamas, Foice do Deus do Fogo, Chama
  Explosiva do Deus do Fogo, Kagutsuchi do Deus do Fogo e o supremo Ceia do Deus do Fogo).
- **Mais quatro Magias**, cada uma com o seu Tabu: **Correntes** (Proibida; Tabu: −1d6 nas Resistências; Corrente do
  Grimório, Balas Mágicas, Raio do Grimório, Amaterasu: Fórmula 28, Amaterasu: Fórmula 100 e o supremo Lei do Grimório),
  **Arco da Grande Árvore** (Perdida; Tabu: −1d6 nas Esquivas; Explosões em Linha, Fusão com a Árvore, Lâminas de Folha,
  Bomba-Relógio de Raízes, Estouro da Torre e o supremo Terra Clamare), **Arco da Materialização** (Perdida; Tabu:
  Iniciativa −NP e Defesa Física −NP÷2; Espada Negra, Escudo Dourado, Asas de Pégaso, Fantasmas de Brittia, Fera
  Sagrada: Belcusas do Trovão e o supremo Torre de Dingir) e **Maldição do Boneco** (Perdida, no boneco; Tabu:
  Recuperação −NP e Defesa Mágica −NP÷2; Fio no Boneco, Dodoskoi, Boneco de Ferro, Boneco de Névoa, Foguete Metálico e o
  supremo Dodoskoi Brilhante).
- **Mais quatro Magias:** **Shikigami** (Torrente de Shikigami, Véu de Ilusão, Prisão de Papel, Bomba Negra de
  Shikigami, Revoada de Shikigami e o supremo Mil Bonecos de Papel, que deixa [Selado]), **Cabelo Carmesim** (Cabelo que
  Prende, Cabelo Esponja, Chuva de Cabelo: Mil Pássaros, Marca em Brasa, Chuva de Cabelo: Vaga-lumes e o supremo Chuva
  de Cabelo: Presa de Lobo), **Sombras** (Soldados de Sombra, Guarda de Sombras, Abraço das Sombras, Pulso Sombrio, Onda
  da Morte e o supremo Exército de Sombras) e a Portadora **Espadas Mágicas** (Kata do Corte, Kata Rasteira, Lampejo
  Vazio de Yasha, Kata do Voo, Chama de Garuda e o supremo Lâmina Desembainhada).
- **Mais seis Magias:** **Cópia** (Copiar, Ouvir a Alma, Imitação, que repete a tag e o estado do feitiço copiado,
  Copiar e Anular, Derreter e o supremo Ars Magia), **Comando M** (Comando: Redução, Comando: Expansão, Comando:
  Encolher a Magia, Qualidade do Poder Mágico, Comando: Terreno e o supremo Demolidora de Países), **Histórias dos
  Mortos** (Rajada de Energia, Ler o Coração, História dos Mortos, Redemoinho Cortante, Cidade dos Mortos e o supremo O
  Mais Forte dos Mortos), **Furtividade** (Apagar a Presença, Arma Invisível, Revelar, Tortura Invisível, Mil Lâminas
  Invisíveis e o supremo Assassinato Perfeito), a Perdida **Selo do Tempo** (Tabu: Defesas Física e Mágica −NP÷2; Raio
  de Âge, Selar o Tempo, Arranhão de Âge, Passo Fora do Tempo, Transbordamento e o supremo Alma Divina: Cronos) e a
  Proibida **Artes Brancas** (Tabu: Recuperação −NP, e o Prazer pega aliados; Lâminas de Luz, Alma Faminta, Descanse em
  Paz, Dois Dedos, Prazer e o supremo Êxtase).
- **As Maldições, uma categoria nova de Magia:** o poder dos demônios, que não é magia. Batem como as Perdidas, cada uma
  tem um Tabu, e o [Silenciado] não impede os feitiços (todos têm a tag nova [Maldição]). Sete: **Absorção** (Tabu:
  Defesa Mágica −NP÷2 e −1d6 nas Resistências; Conexão, Absorver o Ataque, Revolução, Roubar a Alma, Ejeção e o supremo
  Festim de Almas), **Aprimoramento** (Tabu: as Defesas −NP na primeira rodada do combate; Garras-Chicote, Aprimorar o
  Corpo, Amplificação da Dor, Aprimoramento por Segundo, Amplificação da Dor em Massa e o supremo Privação dos
  Sentidos), **Bomba** (Tabu: Defesa Física −NP; Explosão, Conversão em Bomba, Mina Terrestre, Bomba de Captura, Espiral
  Explosiva e o supremo Detonação), **Calamidade** (Tabu: Defesa Física −NP÷2, e as Partículas Antimagia pegam aliados;
  Tornado, Aguaceiro, Impacto, Esfera do Trovão, Inferno e o supremo Partículas Antimagia), **Espinhos** (Tabu:
  Recuperação −NP e −1d6 nas Esquivas; Vinhas de Espinhos, Manto de Espinhos, Jardim de Espinhos, Rosa Explosiva, Dea
  Yggdrasil e o supremo Memento Mori), **Macro** (Tabu: Iniciativa −NP e −1d6 nas Resistências, menos enquanto
  [Despertado]; Arremesso de Livros, Ordem ao Corpo, Macro em Si Mesmo, Olhos Demoníacos, Avalanche da Biblioteca e o
  supremo Olho Demoníaco Liberto) e **Necromancia** (Tabu: [Maldito] em combate; Mortos de Pé, Corpo de Partículas,
  Primeiro Selo, Guarda dos Mortos, Exército de Ossos e o supremo Julgamento da Estrela Maligna). A janela de Magias
  ganhou o filtro Maldição. O catálogo chega a 73 Magias.
- Páginas XII.1 (Absorção), XII.9 (Aprimoramento), XII.10 (Arco da Grande Árvore), XII.11 (Arco da Materialização),
  XII.15 (Artes Brancas), XII.17 (Bomba), XII.18 (Cabelo Carmesim), XII.20 (Calamidade), XII.22 (Comando M), XII.23
  (Cópia), XII.25 (Correntes), XII.31 (Espadas Mágicas), XII.32 (Espinhos), XII.36 (Furtividade), XII.39 (Histórias dos
  Mortos), XII.40 (Macro), XII.45 (Maldição do Boneco), XII.48 (Matador de Deuses do Fogo), XII.49 (Matador de Deuses do
  Raio), XII.53 (Necromancia), XII.64 (Selo do Tempo), XII.65 (Shikigami) e XII.66 (Sombras) do capítulo XII. MAGIAS do
  diário AS REGRAS, e as Maldições na XII.a; a página XI.13 ganhou os três elementos novos.

### Alterado
- O Matador de Deuses agora se chama **Matador de Deuses do Céu** (a migração troca o nome nas fichas).
- As fichas que já têm o Matador de Dragões (e a Dedicação dele) ganham os três elementos novos na escolha do elemento.
- O [Silenciado] não impede as habilidades com a tag [Maldição] (o poder dos demônios não é magia).
- As páginas do capítulo XII foram renumeradas em ordem alfabética (Artes Negras é a XII.16, Vento a XII.73).
- O aviso de novidades fala da 0.25.

## 0.24.0 — 2026-10-24

### Adicionado
- **Quatro Magias**, para qualquer classe: **Elo dos Sentidos** (Perdida, com o Tabu da Dor Partilhada: Lâminas
  Sensoriais de [Psíquico], Elo Sensorial, que dá [Vínculo] a um aliado, Lâmina de Sodoma, Sentidos Trocados, Tempestade
  de Lâminas e o supremo Elo Final), **Magia dos Anjos** (os anjos acertam sem teste e deixam [Fadiga] em quem conjura:
  Penas Angelicais, Mensageiros Angelicais, Anjo do Martelo, Shamsiel, Barakiel e o supremo Raguel), **Trevas**
  (Capricho das Trevas, Agarrar das Trevas, Gravidade Sombria, Momento Sombrio, Rondó das Trevas e o supremo Gênese
  Zero, que deixa [Maldito]) e **Amarras** (Chicote de Tubo, Tubo de Amarra, que deixa [Agarrado] e [Silenciado],
  Arranhão Secreto, Rede de Tubos, Explosão Felina e o supremo Prisão de Mil Tubos). O catálogo chega a 50 Magias.
- Páginas XII.7 (Amarras), XII.15 (Elo dos Sentidos), XII.26 (Magia dos Anjos) e XII.49 (Trevas) do capítulo XII.
  MAGIAS do diário AS REGRAS.

### Alterado
- As páginas do capítulo XII foram renumeradas em ordem alfabética (Artes Negras é a XII.11, Vento a XII.50).
- O aviso de novidades fala da 0.24.

## 0.23.0 — 2026-10-24

### Adicionado
- **Quatro Magias**, para qualquer classe: **Neve** (Fúria Branca e Nevasca Branca, que deixam [Congelando], Cópia de
  Neve, Vento de Nevasca, Avalanche de Neve e o supremo Branco Total), **Perfume Mágico** (Portadora: Perfume do
  Trovão, Perfume da Força, Perfume Analgésico, que cura o grupo, Perfume da Dor, Perfume Venenoso e o supremo Perfume
  da Força: Máximo, num alvo só), **Alma de Máquina** (Take Over: Canhão, Blindagem, Propulsores, Rajada, Bombardeio e
  o supremo Traje de Batalha) e **Onda** (a magia que anula magia: Disparo de Onda, Escudo de Onda contra ataques
  mágicos, Impulso de Onda, Anular Magia, Explosão de Onda e o supremo Mundo Sem Magia). O catálogo chega a 46 Magias.
- Páginas XII.4 (Alma de Máquina), XII.31 (Neve), XII.33 (Onda) e XII.34 (Perfume Mágico) do capítulo XII. MAGIAS do
  diário AS REGRAS.

### Alterado
- As páginas do capítulo XII foram renumeradas em ordem alfabética (Artes Negras é a XII.10, Vento a XII.46).
- O aviso de novidades fala da 0.23.

## 0.22.0 — 2026-10-24

### Adicionado
- **As 14 classes: 7 físicas e 7 mágicas, todas com Magias.** As físicas (Assassino, Berserker, Caçador, Centurião,
  Hierofante, Lutador e Samurai) escolhem uma Magia no NP 1 e outra no NP 10, e os feitiços alimentam o Motor da
  classe: a Bainha do Samurai (só com a lâmina embainhada), a Corrente do Lutador (o feitiço conta como golpe e a
  Corrente não quebra), a Ira do Berserker, o Contrato do Assassino (as Brechas vêm dos acertos no Alvo), a Mira do
  Caçador, o Baluarte do Centurião e as Táticas do Hierofante. O Matador de Dragões ganha duas Magias, no NP 5 e no
  NP 10 (o elemento é a magia dele no NP 1). As fichas que já existem ganham as vagas pela migração.
- **Família e função de cada classe:** a aba Classe diz "Classe física · Tanque", "Classe mágica · Suporte" e assim
  por diante (uma classe antiga diz "Classe antiga").

### Alterado
- Monge, Guardião e Comandante agora se chamam **Lutador**, **Centurião** e **Hierofante** (nomes, textos, Dedicações e
  a Palavra de Centurião). Os ids ficaram, e a migração renomeia o item de classe e a Dedicação nas fichas.
- **Emblemas e cores:** a cor diz a família e a função no grupo. Físicas em tons quentes (Tanque bronze, Dano
  carmesim, Precisão laranja, Suporte ouro), mágicas em tons frios (Dano violeta, Híbrida azul, Controle turquesa,
  Suporte prata); a faixa da aba Classe usa a mesma cor. As classes antigas ficam com as cores de antes.
- As Magias dizem "o Motor da sua classe", não mais "da sua classe de magia". A janela de escolha da Magia diz as
  vagas da sua classe (no NP 1 e no NP 10, por exemplo).
- Diário AS REGRAS: o capítulo XI reorganizado (XI.1 a XI.7 as físicas, XI.8 a XI.14 as mágicas, XI.15 a XI.22 as
  antigas); XI.a explica a família, a função e as Magias; as páginas das físicas e a do Matador de Dragões dizem como
  os feitiços entram no Motor; XII.a diz quem tem Magias.
- O aviso de novidades fala da 0.22.

### Removido
- Druida, Sacerdote, Oráculo, Estrategista e Menestrel saíram da lista de classes e das Dedicações, como o Feiticeiro,
  o Tecelão e o Ressonante; as fichas que já os usam continuam funcionando.

## 0.21.0 — 2026-10-24

### Adicionado
- **Quatro Magias de Conjuração**, para qualquer classe de magia: **Moldagem de Madeira** (Aproximação Violenta,
  Senso de Distância do Coração, que dá [Espelho], Fusão com a Madeira, que esconde você e um aliado, Represa do Amor
  Tímido, A Distância Entre Nós Dois É Eterna e o supremo Soco Divino, num alvo só), **Areia** (Rebelião da Areia,
  Lufada de Areia, Corpo de Areia, Cova da Formiga-Leão, Areias da Morte e o supremo Mundo de Areia), **Telepatia**
  (Sobrecarga, Leitura de Mente, Proteção, Ruído Mental, Transferência de Informação e o supremo Sobrecarga Total) e
  **Teleporte** (Linha Direta: Investida, Linha Direta, que leva um aliado junto, Linha Direta: Lançamento, Memória
  Falsa, Ponto Cego e o supremo Transporte). O catálogo chega a 42 Magias.
- Páginas XII.7 (Areia), XII.28 (Moldagem de Madeira), XII.38 (Telepatia) e XII.39 (Teleporte) do capítulo XII. MAGIAS
  do diário AS REGRAS.

### Alterado
- As páginas do capítulo XII foram renumeradas em ordem alfabética (Armas Mágicas é a XII.8, Vento a XII.42).
- O aviso de novidades fala da 0.21.

## 0.20.0 — 2026-10-23

### Adicionado
- **Quatro Magias Portadoras**, para qualquer classe de magia, cada uma com o objeto em que a magia mora: **Armas
  Mágicas** (Tiro Mágico, Bala de Bolha, Bala Teleguiada, que não pede Teste de Precisão, Mira Travada, Bala Explosiva e
  o supremo Chuva de Balas), **Plantas** (Chicote de Cipó, Broto da Vida, Esporos Venenosos, Muralha de Raízes,
  Floresta Súbita e o supremo Jardim Carnívoro), **Fumaça** (Punho, Corda e Cortina de Fumaça, Nuvem Sufocante,
  Gigante de Fumaça e o supremo Mar de Fumaça) e **Pintura Mágica** (Fera Pintada, Asas Pintadas, Jaula Pintada,
  Armadura Pintada, Dragão Pintado e o supremo Mural Vivo). O catálogo chega a 38 Magias.
- Páginas XII.7 (Armas Mágicas), XII.18 (Fumaça), XII.29 (Pintura Mágica) e XII.30 (Plantas) do capítulo XII. MAGIAS do
  diário AS REGRAS.

### Alterado
- As páginas do capítulo XII foram renumeradas em ordem alfabética (Artes Negras é a XII.8, Vento a XII.38).
- O aviso de novidades fala da 0.20.

## 0.19.0 — 2026-10-23

### Adicionado
- **Quatro Magias de Conjuração**, para qualquer classe de magia: **Gigante** (Golpe Gigante, Mão Gigante, Corpo
  Gigante, Pisada do Gigante, Punho do Titã e o supremo Queda do Titã: [Agarrado], [Cambaleante], [Derrubado]),
  **Encantamento** (Encantamento: Força, Guarda e Pressa nos aliados, Desencanto, Grande Encantamento e o supremo
  Universo Um), **Olhos Mágicos** (Olhar de Pedra, Olho Clínico, Olhar Hipnótico, Olho do Demônio, Mil Olhos e o
  supremo Olhar Petrificante: [Rigidez], [Marcado], [Encantado], [Paralisado]) e **Alta Velocidade** (Golpe Veloz,
  Rajada de Golpes, Velocidade Máxima, Chute Supersônico, Cem Golpes e o supremo Tempestade de Golpes: [Perseguição],
  [Acelerado]). O catálogo chega a 34 Magias.
- Páginas XII.5 (Alta Velocidade), XII.11 (Encantamento), XII.17 (Gigante) e XII.26 (Olhos Mágicos) do capítulo XII.
  MAGIAS do diário AS REGRAS.

### Alterado
- As páginas do capítulo XII foram renumeradas em ordem alfabética (Arco do Tempo é a XII.6, Vento a XII.34).
- O aviso de novidades fala da 0.19.

## 0.18.0 — 2026-10-23

### Adicionado
- **Três Magias da mente e do espaço**, para qualquer classe de magia: **Projeção de Pensamento** (Eco de Pensamento,
  Voz do Pensamento, Projeção, Muitas Projeções, Exército de Pensamento e o supremo Projeção Astral: cópias que deixam
  [Intangível] e [Provocado]), **Território** (Calor Espacial, Território: Troca, Território: Prisão, Território:
  Domínio, Colapso Espacial e o supremo Território Absoluto: a troca de lugar com um aliado e o [Marcado]) e **Reflexão**
  (Torção, Reflexo, Miragem, Corpo Torcido, Mundo Torcido e o supremo Reflexão Total: [Rigidez], [Espelho], [Oculto]).
  O catálogo chega a 30 Magias.
- Páginas XII.23 (Projeção de Pensamento), XII.26 (Reflexão) e XII.29 (Território) do capítulo XII. MAGIAS do diário AS
  REGRAS.
- Cada Magia tem uma frase curta (`flags.eternia.magic.tagline`), que aparece no cartão dela na escolha da Magia.

### Alterado
- As páginas do capítulo XII foram renumeradas em ordem alfabética (Raio é a XII.24, Vento a XII.30).
- **A escolha da Magia** ganhou uma janela própria e grande, no lugar da lista que não cabia na tela: um cartão por
  Magia (o ícone, a categoria, uma frase curta e o que os feitiços fazem: área, controle, desgaste, cura, proteção,
  apoio, mobilidade), filtros por categoria e por função, busca por Magia ou feitiço e, ao lado, a página da Magia sob o
  ponteiro: o que ela é, o Tabu, os feitiços por NP (os que já chegam no seu NP em verde) e a linha final. Sem nada sob
  o ponteiro, um guia de como as Magias funcionam. Um clique escolhe, dois confirmam. O diálogo do kit avisa que a Magia
  vem depois, e a subida para o NP 5 e o NP 10 abre a janela direto.
- **A aba Classe foi refeita** para caber na ficha sem rolar: a faixa da classe, o Motor, a trilha do NP (o que a classe
  dá em cada NP e quantos talentos chegam; as escolhas em aberto brilham e um clique leva à seção) e as seções em abas:
  Kit com as regras do Motor, Elemento, Magias com as três vagas, Talentos por ramo, Caminho e Ápice, Gerais e
  Dedicações. A seção com uma escolha em aberto abre primeiro, e o ponteiro sobre uma habilidade mostra o que ela faz.
- O aviso de novidades fala da 0.18.

## 0.17.0 — 2026-10-23

### Adicionado
- **Três Magias Perdidas**, para qualquer classe de magia, cada uma com o seu Tabu: **Matador de Deuses** (o vento
  negro: Rugido, Sopro Curativo, Dança, Bênção e Bóreas do Deus do Céu, e o supremo Arte Secreta: Lança Celestial; Tabu:
  em combate, Iniciativa −NP e Velocidade −1), **Magia Viva** (Centelha da Vida, Cria de Barro, Sangue Vivo, Corpo
  Refeito, Fera Criada e o supremo Gênese; Tabu: em combate, Recuperação e Defesa Mágica −NP) e **Arco do Tempo**
  (Avanço Rápido, Tempo Lento, Restaurar, Acelerar, Envelhecer e o supremo Última Era, que cura os aliados e deixa
  [Fadiga] em quem conjura; Tabu: em combate, Defesas −NP÷2). O catálogo chega a 27 Magias.
- Páginas XII.5 (Arco do Tempo), XII.18 (Magia Viva) e XII.20 (Matador de Deuses) do capítulo XII. MAGIAS do diário AS
  REGRAS.

### Alterado
- As páginas do capítulo XII foram renumeradas em ordem alfabética (Artes Negras é a XII.6).
- O aviso de novidades fala da 0.17.

## 0.16.0 — 2026-10-23

### Adicionado
- **As Magias elementais**, para qualquer classe de magia: **Fogo** (Chama Laranja, Chama Roxa, Chama Azul, Chama
  Amarela, Coluna de Fogo e o supremo Chama Arco-Íris), **Raio** (Relâmpago, Corrente Elétrica, Passo do Relâmpago,
  Trovão, Tempestade de Raios e o supremo Palácio do Trovão), **Terra** (Punho de Rocha, Muralha de Rocha, Avalanche de
  Rocha, Pele de Pedra, Chão Partido e o supremo Fúria da Montanha) e **Vento** (Lâmina de Vento, Rajada, Armadura de
  Tempestade, Redemoinho, Furacão e o supremo Espaço Aéreo: Zero). Com a Água e a Moldagem de Gelo, os seis elementos
  clássicos estão no catálogo, que chega a 24 Magias.
- Páginas XII.13 (Fogo), XII.20 (Raio), XII.23 (Terra) e XII.24 (Vento) do capítulo XII. MAGIAS do diário AS REGRAS.

### Alterado
- **O Feiticeiro saiu da lista de classes e das Dedicações**: o Mago Negro (a Pressão é o Calor feito motor das
  Magias), com a Magia Fogo, tomou o lugar dele (`flags.eternia.retired` no item de classe e na Dedicação, como o
  Ressonante e o Tecelão). As fichas que já o usam continuam funcionando, e a página XI.7 avisa que é classe antiga.
- As páginas do capítulo XII foram renumeradas em ordem alfabética (Gravidade é a XII.14).
- O aviso de novidades fala da 0.16.

## 0.15.0 — 2026-10-23

### Adicionado
- **O Mago Azul**, a quinta classe com Magias e a última das sete classes de magia (compêndio Raças e Classes, pasta
  Classes; 36 habilidades). Motor **Almas**: o Absorver guarda num grimório a alma do monstro que ele derruba, com a
  natureza (o maior atributo do monstro: Fera, Animal, Demônio ou Espírito) e o elemento dele; o Take Over veste uma
  alma (Fera [Fortalecido], Animal [Acelerado], Demônio [Despertado], Espírito [Anulação]) e o elemento entra no dano
  dos Feitiços; a Essência vira o Golpe da Alma, que deixa a marca da natureza. Ramos: O Grimório, A Forma, A Garra e A
  Guarda; Caminhos: Corpo Inteiro, Metamorfose e Grimório Azul; Ápice: Alma Soberana (duas almas de uma vez).
- **Três Magias novas**, as de Take Over: **Alma de Satã** (Faísca Maligna, Fluxo das Trevas, Explosão Maligna,
  Halphas, Sitri e o supremo Extinção da Alma), **Alma de Fera** (os Braços de Fera de Pedra, de Touro de Ferro e de
  Touro Negro, o Homem-Lagarto, o Homem-Tigre e o supremo Corpo Inteiro) e **Alma Animal** (Gato, Pássaro, Coelho,
  Peixe, Urso e o supremo Estouro da Manada). O catálogo chega a 20 Magias.
- O emblema do Mago Azul (a máscara de monstro com chifres e a chama da alma), a página **XI.10** do diário AS REGRAS e
  as páginas XII.2, XII.3 e XII.4 do capítulo XII. MAGIAS.

### Alterado
- As páginas de classe do diário depois do Invocador foram renumeradas (Mago Branco XI.11 a Tecelão XI.22), e as do
  capítulo XII também (Artes Negras é a XII.5); as páginas do Ressonante e do Tecelão apontam para os números novos do
  Mago Vermelho (XI.13) e do Mago Branco (XI.11).
- XII.a cita a Essência do Mago Azul entre os Motores das Magias.
- O aviso de novidades fala da 0.15.

## 0.14.0 — 2026-10-23

### Adicionado
- **O Mago Branco**, a quarta classe com Magias (compêndio Raças e Classes, pasta Classes; 36 habilidades). Motor
  **Lei**: escreve em runas um número de 2 a 12, e cada teste de qualquer personagem no combate com dois dados que somam
  a Lei acende Runas (os Feitiços também acendem: +1, os grandes +2); cada Runa reescreve um dado de um teste nos cartões
  de ataque, o do aliado para cima e o do inimigo para baixo. Kit: Lei, Escrever a Lei, Reescrever e Cura. Ramos: A
  Runa, O Selo, A Barreira e O Julgamento; Caminhos: Augúrio, Lei Absoluta e Cerco; Ápice: Lei Perfeita.
- **Três Magias novas**: **Escrita Rúnica** (Runa da Prisão, Escrita Negra: Dor, Runa do Revide, Escrita Negra: Asas,
  Escrita Negra: Escuridão e o supremo Escrita Rúnica: Regra Absoluta), **Escrita Sólida** (as palavras Fogo, Guarda,
  Silêncio, Ferro e Trovão, e o supremo A Palavra Final) e **Magia das Fadas**, a primeira Magia Ancestral (Luz, Ilusão,
  Bênção, Esfera e Brilho das Fadas, e o supremo Lei das Fadas, no NP 10). O catálogo chega a 17 Magias.
- O emblema do Mago Branco (o capuz com a runa na testa e a barra serrilhada do manto), a página **XI.10** do diário
  AS REGRAS e as páginas XII.6, XII.7 e XII.11 do capítulo XII. MAGIAS.

### Alterado
- **O Tecelão saiu da lista de classes e das Dedicações**: o Mago Branco tomou o lugar dele (`flags.eternia.retired` no
  item de classe e na Dedicação, como o Ressonante). As fichas que já o usam continuam funcionando.
- As páginas de classe do diário depois do Invocador foram renumeradas (Mago Negro XI.11 a Tecelão XI.21), e as do
  capítulo XII também (Esmagamento é a XII.8); a página do Ressonante aponta para a nova XI.12 do Mago Vermelho.
- XII.a cita as Runas do Mago Branco entre os Motores das Magias, e as Magias Ancestrais têm o supremo no NP 10.
- O aviso de novidades fala da 0.14.

## 0.13.0 — 2026-10-23

### Adicionado
- **Três Magias novas**, para as classes de magia: **Espíritos Celestiais** (Portadora, as chaves dos portões: Portão do
  Touro, do Carneiro, do Sagitário, do Aguadeiro, do Leão: Impacto de Régulo, o Vestido Estelar e o supremo Urano
  Metria), **Magia Seith** (as almas nos bonecos: Formação Linha, X e Bárion, Possessão, Olhos de Boneco e o supremo
  Ritual das Almas) e **Teatro de Bonecas** (Boneca de Pedra, de Madeira, de Nuvem e da Terra, Marionete e o supremo
  Grande Teatro). O catálogo chega a 14 Magias.
- Páginas XII.7, XII.9 e XII.14 do capítulo XII. MAGIAS do diário AS REGRAS.

### Alterado
- **O Invocador virou classe de magia**: escolhe uma Magia no NP 1, outra no NP 5 e a terceira no NP 10, e, com um
  espírito presente, os Feitiços das Magias dão Laços a ele (+1, os grandes +2). Os feitiços supremos pedem o Teto,
  gastam todos os Laços e só saem com um espírito que chegou antes da rodada. A classe, o kit e os talentos continuam os
  mesmos; a página XI.9 do diário, o Pacto e a Dedicação explicam a regra nova.
- As fichas que já têm o Invocador ganham as vagas de Magia sozinhas (migração `kudenCleanup`, versão 4).
- A linha do Motor de cada Magia agora diz só "o Motor da sua classe de magia"; a lista dos Motores fica em XII.a.
- O aviso de novidades fala da 0.13.

## 0.12.0 — 2026-10-23

### Adicionado
- **O Pictomante**, a terceira classe com Magias (compêndio Raças e Classes, pasta Classes; 36 habilidades). Motor
  **Moldes**: cada Feitiço, da classe ou das Magias, deixa uma construção no campo, que fica em pé de uma rodada para a
  outra até ser quebrada; quebrar vira dano (o Estilhaçar: 1d6 + NP por Molde) ou defesa (o Escudo Esculpido:
  [Anulação: Moldes × (NP+5)] contra um golpe). Caminhos: Arma (qualquer Feitiço de dano quebra Moldes junto), Criatura
  (os Moldes viram feras que atacam sozinhas no Encerramento) e Paisagem (o escudo vira muralha para o grupo); Ápice:
  Obra-Prima.
- **Três Magias novas**: **Moldagem de Gelo** (Lança, Escudo, Martelo, Chão, Águias, Lâmina de Gelo: Dança dos Sete
  Cortes e o supremo Impacto de Gelo), **Moldagem de Memória** (Memorizar, Feitiço Lembrado, Esquecimento, Fortaleza da
  Terra Ardente, Noite das Estrelas Cadentes e o supremo Lembrança Absoluta) e **Matador de Demônios**, a primeira Magia
  Perdida (o gelo negro do demônio, com o Tabu das Marcas do Demônio: em combate, as Defesas caem [NP]). Servem a
  qualquer classe de magia.
- O emblema do Pictomante (o pincel e os cristais que ele ergue), a página **XI.16** do diário AS REGRAS e as páginas
  XII.8, XII.9 e XII.10 do capítulo XII. MAGIAS.
- A condição de efeito **Não tem a habilidade** (`notSkill`), o contrário de "Tem a habilidade".

### Alterado
- As páginas de classe do diário depois do Pictomante foram renumeradas (Ressonante XI.17 a Tecelão XI.20), e Reequipar:
  O Cavaleiro virou a XII.11.
- As Magias que já existiam citam os Moldes do Pictomante junto da Pressão e da Carga.
- O aviso de novidades fala da 0.12.

## 0.11.0 — 2026-10-23

### Adicionado
- **O Mago Vermelho**, a segunda classe com Magias (compêndio Raças e Classes, pasta Classes; 36 habilidades). Motor
  **Arsenal**: o mago guarda as peças num espaço mágico e tem uma na mão, a Espada, a Armadura ou o Foco; a Carga cresce
  na Manutenção e com os Feitiços e dá o poder da peça (Espada: +[Carga × 2] nos Ataques com Arma; Armadura: [Anulação:
  Carga × 2]; Foco: +[Carga × 2] em Feitiços e curas). O Reequipar troca de peça e solta a Descarga da antiga.
  Caminhos: Arma Selada, Panóplia e Troca Relâmpago; Ápice: Arsenal Infinito. É o Motor do Ressonante feito motor das
  Magias.
- **Quatro Magias novas**: **Reequipar: O Cavaleiro** (Portadora: as armaduras de batalha, com feitiços que são Ataques
  com Arma: Roda Celeste, Asa Negra, Armadura Adamantina, Traje do Coração Puro e o supremo Armadura de Nakagami: Luz
  Estelar), **Cartas** (Portadora: Cartas Lançadas, Carta do Trovão, Leitura da Sorte, Prisão de Cartas, Tempestade de
  Cartas e Os Vinte e Dois Arcanos), **Gravidade** (Queda, Mudança de Gravidade, Campo Gravitacional, Gravidade Zero,
  Buraco Negro e Peso do Mundo) e **Cajados Mágicos** (Portadora: Raio do Cajado, Muro de Névoa, Sono, Arranha-Céu, Dança
  dos Cinco Cajados e Círculo de Cinco Camadas: Canto Sagrado). Servem a qualquer classe de magia.
- O emblema do Mago Vermelho (o chapéu de aba larga com a pluma), a página **XI.11** do diário AS REGRAS e as páginas
  XII.3, XII.4, XII.7 e XII.8 do capítulo XII. MAGIAS.

### Alterado
- **O Ressonante saiu da lista de classes** e das Dedicações: o Mago Vermelho tomou o lugar dele. As fichas que já o
  usam continuam funcionando, e a página dele no diário diz que é uma classe antiga. Para quem cria conteúdo:
  `flags.eternia.retired` no item de classe e na Dedicação esconde a classe dos navegadores para quem ainda não a tem.
- As páginas de classe do diário depois do Mago Vermelho foram renumeradas (Matador de Dragões XI.12 a Tecelão XI.19), e
  as Magias do capítulo XII foram renumeradas em ordem alfabética.
- As Magias que já existiam citam a Carga do Mago Vermelho junto da Pressão do Mago Negro.
- O aviso de novidades fala da 0.11.

## 0.10.1 — 2026-10-23

### Alterado
- O **navegador de habilidades** deixa empilhar escolhas na mesma habilidade: depois de escolher, o botão de subir
  continua no lugar e cada clique sobe mais um NH na seleção (adquirir e subir, ou subir duas vezes), até o NH Máximo e
  o NP do personagem. O "−" da linha tira um NH e o X do rodapé tira a escolha inteira. Cada NH gasta uma escolha, e
  descer o NP oferece desfazer todos eles.
- Um talento pode ser escolhido junto com o que ele pede, na mesma seleção; se o pedido sai da seleção, ele sai junto.
- O NH das linhas e do rodapé do navegador aparece como "NH" no pt-BR (antes, "SR"), e o motivo de um talento travado
  por requisito volta a dizer o que falta (antes, mostrava o limite de NH).
- AS REGRAS, II. PERSONAGENS: várias escolhas podem ir para a mesma habilidade, dentro do NH Máximo e do NP.

## 0.10.0 — 2026-10-23

### Adicionado
- **O Mago Negro**, a primeira classe com Magias (compêndio Raças e Classes, pasta Classes; 36 habilidades). Motor
  **Pressão**: cada Feitiço, da classe ou das Magias, aumenta a Pressão (+1, os grandes +2), e ela soma +[Pressão × 2]
  ao dano dos Feitiços; no Teto vem o Ponto Crítico e a Sobrecarga no Encerramento, a menos que a Liberação solte tudo
  numa área. Caminhos: Classe S, Mago Santo e Spriggan; Ápice: Segunda Origem. É o Motor do Feiticeiro feito motor das
  Magias (o Feiticeiro continua até as Magias elementais chegarem).
- **As Magias**: a classe diz como você conjura; a Magia diz o que você conjura. As classes de magia escolhem uma Magia
  no NP 1, outra no NP 5 e a terceira no NP 10; a aba Classe mostra as Magias com os feitiços de cada uma, e o navegador
  de habilidades mostra os feitiços das suas Magias (a origem "Magia"). Os feitiços alimentam e gastam o Motor da sua
  classe, e o supremo de cada Magia (NP 7) pede o Teto e gasta tudo. As quatro primeiras: **Água** (Lâmina, Prisão e
  Corpo de Água, Nebulosa de Água, Sierra, Maremoto), **Artes Negras** (Proibida, com o Tabu: [Maldito] em combate;
  Toque e Esfera da Morte, Véu das Trevas, Predação da Morte, Sentença Negra), **Corpos Celestes** (Estrela Cadente,
  Meteoro, Velocidade da Luz, Altairis, Grand Chariot, Sema) e **Esmagamento** (Toque Esmagador, Onda de Esmagamento,
  Desmontagem, Quebrar a Guarda, Ruptura, Esmagamento Absoluto).
- **O resumo da mudança de NP**: subir pelo botão ou digitando outro NP no brasão (vários de uma vez, ou para baixo)
  abre a mesma caixa antes de mudar, com os Atributos Base antes e depois (e os modificadores que mudam), os PV, as
  escolhas de habilidade, os talentos que liberam e o que a classe dá em cada NP do salto (o Caminho, as Magias, a
  Dedicação, o Ápice). Confirmado, o chat registra, vêm as escolhas da classe e o navegador abre com as escolhas
  contadas; descendo, dá para desfazer as escolhas feitas acima do NP novo; cancelar deixa o NP como estava.
- O emblema do Mago Negro (o chapéu pontudo com os olhos acesos), a página **XI.10** e o capítulo **XII. MAGIAS** do
  diário AS REGRAS (a geral e uma página por Magia), e a tag de elemento [Água] (`Water`).
- Para quem cria conteúdo: o Motor `"@class"` (o da classe de quem usa), os estados no acerto sem código
  (`flags.eternia.hitStatuses`), as vagas de Magia do item de classe (`{ rank, magic: true }`) e as palavras "pontos
  gastos" e "pontos do Motor" nos colchetes.

### Alterado
- O **navegador de habilidades** abre mostrando só o que o personagem pode escolher agora: as de NP acima do dele, as
  que pedem outra antes e as que já estão no NH máximo ficam escondidas, com uma nota de quantas são ("Mostrar todas").
  A caixa "Só o que posso escolher" mostra a lista inteira.
- Um NP digitado na ficha passa a contar as escolhas de habilidade a partir do NP de onde o personagem saiu (antes, o
  navegador podia ficar sem a contagem e deixar escolher sem limite). Sem escolhas pendentes, só o Mestre adiciona
  habilidades de Combate e Gerais (o modo livre, com o aviso de que não contam); os jogadores veem a lista.
- As páginas de classe do diário depois do Invocador foram renumeradas (Matador de Dragões XI.11 a Tecelão XI.18), e a
  XI. CLASSES fala das 18 classes e das Magias.
- O aviso de novidades fala da 0.10.

## 0.9.0 — 2026-10-23

### Adicionado
- **O Matador de Dragões**, a primeira das classes de magia (compêndio Raças e Classes, pasta Classes; 52 habilidades
  em Habilidades de Classe). Motor **Escamas**: o Matador come o próprio elemento (o Devorar dá +1, ou +2 com uma
  fonte; o Punho de Ferro do Dragão, +1; cada ataque do elemento que o atinge, +1, e o de um aliado não causa dano) e
  gasta as Escamas nos golpes de dragão (o Rugido, a Garra, a Asa, a Presa, o Chifre de Espada...), magias que somam o
  Poder de Ataque das luvas e causam dano mágico do elemento. No Teto vem a **Força do Dragão** ([Despertado: NP +
  2×Semente], −1 Escama no Encerramento, até zerar); quando ela acaba, deixa a [Fadiga] e a **Semente do Dragão**
  cresce 1. É o Tabu da classe: cada Força seguinte é mais forte e mais cara, e a Semente só zera no fim do cenário.
- **Os elementos**, escolhidos junto com a classe: Fogo ([Chama], [Queimando]), Ferro ([Ferro], [Fissurado]), Céu
  ([Vento], [Lento]) e Raio ([Choque], [Eletrificado]). Cada um dá a tag e o estado dos golpes, a imunidade
  ([Anulação (tag): NP×2 + 10] e o estado), a fonte do Devorar e três talentos próprios, com uma Arte Secreta no NP 7.
  A aba Classe ganhou a seção **Elemento**, e o navegador de habilidades só mostra os talentos do elemento escolhido.
- Os Caminhos do Matador são as gerações: a **Primeira** come os outros elementos e entra no Modo Dragão Duplo, a
  **Segunda** tem a lacrima (+1 Escama por rodada) e a **Terceira** entra na Força do Dragão quando quiser. O Ápice é o
  **Modo Rei Dragão**.
- O emblema do Matador de Dragões (a cabeça de dragão, no hexágono turquesa da magia) e a página **XI.10** do diário AS
  REGRAS.
- A Dedicação pode deixar escolher uma habilidade entre várias (`dedicationChoice`): a do Matador dá as Escamas
  Menores, o Devorar, o Punho de Ferro do Dragão e um elemento à escolha.
- Tags de elemento novas: [Ferro] (`Iron`) e [Vento] (`Wind`).
- O Motor de uma classe pode pôr tags no dano das habilidades (`damageTags`), tomar um cartão de dano inteiro sem dano
  (`absorbs`), ouvir todo cartão de dano aplicado, com ou sem PV tirado (`onStruck`), e ter palavras próprias nos
  colchetes (`chips`, como a Semente).

### Alterado
- As páginas de classe do diário AS REGRAS depois do Invocador foram renumeradas (do Menestrel, XI.11, ao Tecelão,
  XI.17), e a XI. CLASSES fala das 17 classes.
- O aviso de novidades fala da 0.9.

## 0.8.5 — 2026-10-22

### Alterado
- A ficha de habilidade ganhou a aba **Detalhes**, entre Descrição e Efeitos: NH, Momento, Teste, Alvo, Alcance, Custo,
  Limite, Dano e Macro saíram de cima da descrição e foram para ela. A aba Descrição, que abre primeiro, mostra só o
  texto da habilidade.

## 0.8.4 — 2026-10-22

### Adicionado
- **Os emblemas das 16 classes**, no jeito dos emblemas de Log Horizon: a família dá a moldura e as cores (losango
  verde para Guardião, Samurai, Monge e Ressonante; quadrado creme para Assassino, Berserker, Caçador, Comandante e
  Menestrel; círculo rosa para Sacerdote, Druida e Oráculo; hexágono turquesa para Feiticeiro, Invocador, Estrategista
  e Tecelão) e a classe dá o símbolo (o escudo, a katana, o punho, a gema, o punhal, o machado duplo, o arco, o
  estandarte, a lira, o sol, a pegada, o olho, a chama, o círculo de invocação, os dados, o carretel). Aparecem no
  brasão da aba Classe, no item da classe e, com um selo "+", na Dedicação. Gerados por `tools/make-class-icons.mjs`.
- A migração `kudenCleanup` (versão 3) põe o emblema nos itens de classe e nas Dedicações dos mundos que ainda têm a
  imagem em branco.

## 0.8.3 — 2026-10-22

### Alterado
- **Os dados se escrevem 2d6, na frente da fórmula:** "[Poder de Ataque + 2D]" virou "[2d6 + Poder de Ataque]",
  "[65+2D]" virou "[2d6 + 65]", "+1D no teste" virou "+1d6 no teste" e "(1 + Cortes)D" virou "(1 + Cortes)d6", em
  todos os textos dos compêndios (habilidades, itens, bestiário e o diário AS REGRAS), nos cartões do Motor, nas
  descrições dos estados, nos textos da interface e nos documentos. O que o sistema mostra segue o mesmo padrão: os
  dados dos testes na ficha (2d6), o Teste e o Dano dos cartões ("2d6 + 4 vs Esquiva", "2d6 + [Poder de Ataque]
  Físico"), a ficha de monstro, os bônus das rolagens, o HUD, a bancada e os valores dos destaques ("2d6 + 12").
  Textos antigos, feitos à mão nos mundos, continuam sendo lidos ("5+2D") e aparecem no padrão novo no campo Teste.

## 0.8.2 — 2026-10-22

### Adicionado
- **Switch**, habilidade básica nova (Ação de Movimento, 1 por rodada, um aliado a até 2 Qd): vocês trocam de lugar e de
  Ódio, e o aliado fica [Concentrado]. Quem segurava o inimigo passa o Ódio para quem chega descansado. A troca dos
  tokens e do Ódio é automática (`useActions` `{ type: "switch" }`, só entre aliados), e o diário AS REGRAS fala dela
  no Ódio (IV.b).

### Alterado
- O Momento **Constante** se chama **Passiva** em português (a habilidade que está sempre valendo): no campo Momento
  das habilidades, na tag, no grupo de habilidades da ficha e do HUD (**Passivas**), nos textos dos compêndios (os
  poderes dos itens, os talentos das classes e o diário AS REGRAS) e no README. O campo lido pela automação continua
  `Constant`, então os mundos não mudam; nomes como Vigília Constante ficam.

### Corrigido
- Profissões: a faixa de Materiais da aba Profissão, a bancada (a Oficina e a Coleta) e o cartão do chat mostram cada
  Anima-mundi com a cor do seu nível; antes todas apareciam com a cor da Anima-mundi 1.

## 0.8.1 — 2026-10-22

### Adicionado
- **Os colchetes dos textos em destaque:** os "[...]" das descrições de habilidades e itens, dos cartões do chat, do
  diário AS REGRAS, do cartão do Motor na aba Classe e dos avisos de uso viram etiquetas pela função: fórmulas em
  verde, com o valor do personagem ao lado ([NP+3] de um personagem de NP 10 mostra 13; [Poder Mágico + 2D], 2D+12),
  estados em vermelho, tags em pergaminho, valores do personagem em azul, Momentos em dourado e os outros termos em
  cor neutra. Passar o mouse explica cada uma: o que é NP ou NH e quanto vale agora, a regra do estado ou da tag
  (`module/helpers/text-chips.mjs`, `css/text-chips.css`).

### Alterado
- **As caixas de mensagem** seguem um padrão só (`module/helpers/dialogs.mjs`): a barra verde com borda dourada, o
  pergaminho e dois botões do mesmo tamanho, a ação em verde e Cancelar em pergaminho (vermelho-tijolo quando a ação
  vai contra um aviso). O aviso antes de usar uma habilidade mostra a imagem e o nome dela e cada motivo com o ícone
  do seu tipo; subir NP mostra o retrato e o que o personagem ganha; vender e converter itens mostram o item ou o
  personagem; as escolhas do Motor, as quantidades, o ouro e os outros campos ficam no mesmo visual.
- No chat, os estados escritos nos cartões são as etiquetas vermelhas e continuam aplicando o estado com um clique.

## 0.8.0 — 2026-10-21

### Adicionado
- **As outras 15 classes**: Assassino, Berserker, Caçador, Comandante, Druida, Estrategista, Feiticeiro, Guardião,
  Invocador, Menestrel, Monge, Oráculo, Ressonante, Sacerdote e Tecelão, cada uma com o seu Motor, 36 habilidades
  automatizadas (o kit, 16 talentos em quatro ramos, 4 Gerais, três Caminhos com dois talentos, o Ápice, a Dedicação e
  o Motor Menor), a base e a sua página no diário AS REGRAS. Com o Samurai, a Eternia tem 16 classes
  (`docs/classes.md`, "As classes").
- Motor das classes: os eventos de cada turno, do movimento do token, dos acertos e erros, do dano e da cura aplicados
  pelos cartões e dos testes rolados (também vistos por todos os Motores do combate); estados passivos que o Motor
  mantém no personagem; uma nota na aba Classe e no HUD; botões das classes nos cartões de ataque; `plan.vars`
  (`@use.<chave>` nas fórmulas) e `plan.autoHit`; os eventos de cada personagem em fila, sem perder pontos.
- Condições de efeito **Motor da classe no estado** e **Motor da classe com pelo menos**.
- Cartões de ataque: um teste pode ser mudado depois de rolado (os dados ou o total), com o acerto, o Crítico e a
  Falha Crítica julgados de novo e a mudança anotada no cartão.
- Ganchos para módulos e macros: `eternia.attackResult`, `eternia.damaged`, `eternia.healed` e `eternia.check`.
- Aviso de novidades da 0.8.

### Alterado
- O cartão do Motor na aba Classe perdeu a arte da katana: fica a caixa de pergaminho com uma borda verde em cima,
  igual para todas as classes.
- O diário AS REGRAS: a página XI. CLASSES traz como as classes funcionam, a lista das 16 e a automação; cada classe
  tem a sua página (XI.1 a XI.16).
- O README lista as 16 classes numa tabela; `docs/classes.md` tem o mapa final das partes da regra e uma seção por
  classe.

### Corrigido
- A imunidade (`immune`) de um efeito passivo de habilidade passou a valer: antes só os efeitos do próprio personagem
  contavam.

## 0.7.1 — 2026-10-21

### Alterado
- Termos mais claros em português: o Processo de Abertura virou **Manutenção**, o Processo Principal virou
  **Turno** (o seu turno) e o Briefing virou **Preparação**, no rastreador de combate, nos Momentos das habilidades,
  nos textos dos compêndios e no diário AS REGRAS. Os campos lidos pela automação continuam em inglês (`Setup`,
  `Main Process`, `Briefing`), então os mundos não mudam.
- A migração `kudenCleanup` (versão 2) troca a imagem dos itens que ainda apontam para o ícone antigo do Samurai.

### Removido
- O campo "A pergunta" do cartão do Motor na aba Classe.
- Os ícones das classes, por enquanto: o medalhão da aba Classe é só o verde, e o item de classe e a Dedicação usam
  uma imagem em branco (`assets/icons/classes/blank.svg`) até cada classe ganhar o seu.

## 0.7.0 — 2026-10-21

### Adicionado
- **As classes da Eternia** (`docs/classes.md`, página **XI. CLASSES** do diário AS REGRAS): cada classe tem a sua
  base, um **Motor** (a regra que só ela tem), talentos que mexem no Motor, um Caminho no NP 3, a Dedicação (a
  multiclasse) a partir do NP 5 e o Ápice no NP 10.
- **O Samurai**, a primeira classe, no compêndio Raças e Classes (pasta Classes) e as 36 habilidades dele em
  Habilidades de Classe: o Motor **Bainha** (Embainhada ou Desembainhada, os Cortes, o Corte Perfeito), o kit, 16
  talentos em quatro ramos, 4 Gerais, os Caminhos da Lua Cheia, da Água Corrente e do Relâmpago (com dois talentos
  cada), o Ápice Mente Vazia, a Dedicação e a Bainha Menor. Tudo automatizado.
- **Motor das classes** (`module/classes/`): o estado no ator (`flags.eternia.motor.<classe>`), os requisitos e o que
  cada habilidade gasta, ganha ou muda (`flags.eternia.motor`), a ação que ela gasta no lugar da do Momento, o custo
  de Ódio pelos pontos ("Hate 1+Cortes"), os valores `@spent`, `@perfect`, `@per` e `@motor.*` nas fórmulas, o
  acerto automático do Corte Perfeito, o Desfazer devolvendo o Motor, e as reações ao Processo de Abertura e de
  Encerramento, ao início e fim do combate, aos ataques declarados, às esquivas e aos inimigos derrubados.
- **Aba Classe** na ficha do personagem (o brasão, a base, o Motor, o kit, os talentos por ramo, o Caminho, o Ápice,
  os Gerais, as Dedicações e os marcos), o **Motor no HUD** e no **token** (losangos acima da barra de PV).
- Navegador de habilidades: requisitos entre talentos (`flags.eternia.requires`), talentos de Caminho só para quem
  segue o Caminho (`flags.eternia.pathTalent`), a fonte **Dedicação** (a Dedicação de uma classe para as outras e os
  talentos [Dedicação] dela dois NP depois, no máximo duas, a segunda depois de dois talentos da primeira).
- Habilidades iniciais por NP: os espaços de `system.grants` de uma classe podem dizer o NP (`rank`) e ser dados sem
  perguntar (`auto`); a subida de NP (e o NP mudado à mão) oferece o que chegou. Uma habilidade pode dar outras ao
  ser aprendida (`flags.eternia.dedicationGrants`).
- Tags de papel das classes (Dano, Defesa, Cura, Controle) e as tags [Iai] e [Dedicação].
- Migração que limpa dos mundos o que o Kuden e os arquétipos deixaram.
- Aviso de novidades da 0.7.

### Alterado
- As Joias do Chamado da Vida curam quem tem uma classe com o papel [Cura] (antes, o arquétipo Curandeiro).
- O seletor de classes mostra os papéis da classe no lugar do arquétipo.

### Removido
- **O Kuden** (regra da casa): a configuração, as abas da ficha e da habilidade, o painel do HUD, o ambiente da cena,
  as 11 condições de efeito que ele trazia e `game.eternia.kuden`.
- **Os arquétipos** de Log Horizon: o campo do item de classe, o pacote Habilidades de Arquétipo e a fonte Arquétipo
  do navegador de habilidades.

## 0.6.0 — 2026-10-21

### Adicionado
- **108 itens de Sword Art Online** no compêndio de Itens, em três pastas (Aincrad, Alfheim e Submundo), do nível 1
  ao 30: 59 armas e 49 proteções e acessórios, com ícones pintados próprios (`assets/icons/items/`). Os raros são
  Artefatos de [M4] a [M7], cada um com bônus fixos, estados em todo combate e poderes automatizados; os lendários
  [M7] são fortes de propósito.
- Poder de item que só funciona com outro item equipado junto (`withItem`, como a Explosão Estelar da Elucidator com a
  Dark Repulser).
- Efeitos de habilidade só para os aliados ou só para os inimigos entre os alvos (`recipients`: `allies`, `enemies`).
- Aviso de novidades da 0.6.

## 0.5.0 — 2026-10-21

### Adicionado
- **Ícones únicos para todos os 867 itens do compêndio**, sem repetir: os ícones pintados do Foundry (por caminho, sem
  copiá-los) e arte própria da Eternia para as 27 katanas e os 13 chicotes (`assets/icons/items/`). Famílias com
  graus (poções, venenos, pergaminhos, cartas, canções, engenhocas) mudam de forma a cada grau e de cor a cada tipo.
- **Molduras e efeitos nos ícones** (`module/icons/`): moldura pelo grau mágico ([M1]–[M3] na cor da qualidade,
  [M4]–[M6] dourada com gema, [M7] espectral); nas armas, armaduras, escudos e acessórios, um reflexo do nível 11 e,
  do 21 ao 30, brilho, borda de luz e partículas do tema do item. Valem em todas as telas; só os ícones visíveis são
  desenhados.
- Configuração **Ícones animados** (de cada jogador) e, para macros, `game.eternia.icons` (`styleOf`, `refresh`).
- Flag `flags.eternia.icon` (`fx`: tema das partículas; `hue`: variação de cor) e a referência `docs/icones.md`.
- Aviso de novidades da 0.5.

## 0.4.1 — 2026-10-21

### Alterado
- O Item Misterioso agora se chama **Anima-mundi**, com imagem e texto novos, e o Estilhaço Estelar, **Quintessência**.
  Os que já estão nas fichas continuam valendo como material.

## 0.4.0 — 2026-10-21

### Adicionado
- **As 10 profissões da Eternia**, as subclasses, no compêndio Raças e Classes (pasta Profissões): Ferreiro,
  Alfaiate, Artesão, Alquimista, Cozinheiro, Escriba, Engenheiro, Bardo, Coletor e Mercador. Cada uma sobe do Rank 1
  ao 5 com EXP (+Rank na rolagem, Rank + 1 tentativas por cenário, itens até o nível Rank × 6) e tem um talento.
- **Aba Profissão** na ficha: o brasão com o Rank, a EXP e as tentativas do cenário, os botões da bancada, as
  chances da Oficina, os materiais, o talento, as armadilhas do Engenheiro, as obras e a escada de Ranks; sem
  profissão, as dez para escolher.
- **A bancada:** a Oficina (base da mochila ou do catálogo, 1 Item Misterioso, 2D + Rank, de Incomum [M1] a
  Perfeito [M3], com os aprimoramentos escolhidos e o nome da obra), a Fusão (dois iguais viram um melhor; o
  Lendário [M4] pede um Estilhaço Estelar), a Coleta, o Retoque e a Venda do Mercador, e os talentos Afiar, Remendo,
  Banquete e Cópia. A rolagem aparece na tela e cada ação posta um cartão no chat.
- **25 aprimoramentos** (armas, proteções, bolsas, acessórios e consumíveis) e 3 lendários (Fio do Destino, Égide e
  Coração Estelar), automatizados nos números do item ou em efeitos dele; dobram do nível 11 e triplicam do 21.
- **Itens novos** no compêndio de Itens: as Engenhocas (Bomba Incendiária, Bomba de Gelo, Rede e Pedra de Faísca) e as
  Canções (Hino de Coragem, Marcha de Guerra, Balada do Pavor e Canção de Ninar), em três graus, e o Estilhaço
  Estelar. Bombas e redes viram armadilhas: Regiões da cena que disparam no primeiro inimigo que entra.
- Página **X. PROFISSÕES** no diário AS REGRAS e a referência técnica `docs/profissoes.md`.
- Efeitos: tags de dano (`damageTags`), estados ao acertar (`onHit`, que o Desfazer tira), `consumeOn: "attack"`, a
  ação de uso `removeStatus` (também em itens usáveis) e a chave `eternia.passive.luck` (Destino máximo que não se
  soma). Estados de condição no início do combate (`sceneStatuses`).
- Tag [Engenhoca] e os alvos Grupo e Todos.
- Para macros: `game.eternia.professions` (`open`, `of`, `addExp`).
- Aviso de novidades da 0.4.

### Alterado
- O Mercador vende pelo valor cheio também nas lojas.
- O Item Misterioso ganhou imagem e texto de material das profissões.

## 0.3.0 — 2026-10-21

### Adicionado
- **As 8 raças da Eternia** no compêndio Raças e Classes: Humanos, Elfos, Flügel, Etherious, Oni, Exceed, Vargr e
  Kitsune. Cada uma dá +2 em atributos (o Humano escolhe onde), PV e Destino, **duas habilidades inatas** (uma Geral
  e uma de Combate, que entram ao escolher a raça) e **duas desbloqueáveis** com a subida de nível (a Geral a partir
  do NP 3 e a de Combate a partir do NP 5).
- **32 habilidades raciais automatizadas** no compêndio Habilidades Raciais, com efeito direto e descrição visual:
  Bênçãos e Coleção de Bênçãos, Força dos Laços, Segunda Origem; Olhos de Mana, Pacto Espiritual (Gelo, Vento,
  Luz ou Terra), Canção dos Quase-Espíritos, Grande Espírito; Asas de Luz, Graça do Astro (Sol, Estrela, Mar, Lua,
  Relâmpago ou Tempestade), Biblioteca Viva, Golpe Celeste; O Livro, Maldição, Voz do Purgatório, Forma Etherious;
  Clarividência, Chifre, Elo de Sangue, Oni Desperto; Aera, Parceiro, Premonição, Velocidade Máxima; Faro de Lobo,
  Matilha, Caçador da Estepe, Forma da Lua; Mil Faces, Caudas, Encanto da Raposa e Fogo-Raposa.
- Navegador de habilidades: habilidades liberadas a partir de um NP (`flags.eternia.minRank`) e habilidades que só
  vêm de uma escolha, como as Bênçãos (`flags.eternia.choiceOnly`).
- Habilidades que dão outras a cada NH (`flags.eternia.rankGrants`): a Coleção de Bênçãos oferece uma Bênção nova
  a cada NH e leva as suas Bênçãos junto se for removida.
- Efeitos: para quem usa, para os alvos ou para os dois (`recipients`); efeitos alternativos escolhidos ao usar
  (`chooseEffect`); imunidade a estados (`immune`); Fadiga quando acabam (`fatigueOnEnd`); efeitos que acabam
  com um estado (`endsWith`) ou depois de um teste, Esquiva ou dano (`consumeOn`); Anulação passiva
  (`eternia.passive.cancel`); ações ao usar, como mudar a Fadiga ou dobrar um estado (`useActions`); e a condição
  de efeito "Tem a habilidade".
- Aviso de novidades da 0.3.

### Alterado
- Habilidades sem teste com efeitos só para quem usa (ou para quem usa e os alvos) se aplicam sozinhas ao usar,
  mesmo sem alvos marcados.
- Usar de novo uma habilidade de efeitos alternativos só troca o mesmo efeito (as Caudas guardam a Ilusão quando
  gastam outra num Truque).
- A Fúria deixa usar as habilidades feitas para ela (as que exigem a Fúria).
- As imagens das regras (Referência Rápida e AS REGRAS) e os ícones dos efeitos de itens, que ainda apontavam para
  o caminho do sistema antigo e apareciam quebrados.

## 0.2.0 — 2026-10-21

### Adicionado
- **31 condições novas**, somadas aos 23 estados de base e automatizadas: Paralisado, Adormecido, Enraizado,
  Derrubado, Lento e Agarrado (Controle); Silenciado, Desarmado, Cego e Selado (Bloqueio); Medo, Encantado,
  Provocado e Fúria (Mente); Queimando, Envenenado, Congelando, Eletrificado e Maldito (Elementais); Exposto,
  Fissurado, Marcado e Sentença (Quebra de guarda); Acelerado, Fortalecido, Concentrado, Espelho, Intangível, Último
  Fôlego e Despertado (Estados de Combate); e Vínculo.
- **Automação das condições:** os dados dos testes e das Esquivas, o dano a mais, o dano aplicado (Exposto,
  Intangível, Marcado, Último Fôlego, Vínculo, Espelho, Maldito), o dano no início do Processo Principal, na Ação
  Maior e no Encerramento, a perda de vez, a ordem do Lento, as duas Ações Menores do Acelerado, os acúmulos com
  limiar, as defesas e a Velocidade na ficha, o fim de cada condição e o Desfazer. O que elas proíbem (ações, alvos e
  movimento) avisa ou bloqueia.
- **Livrar-se de uma condição** gastando a ação da regra, pelo botão no painel de Estados do HUD.
- A regra de cada estado no tooltip da ficha, do HUD e dos estados clicáveis do chat, e o painel de estados da ficha
  separado por família.
- Página **IX. CONDIÇÕES DA ETERNIA** no diário AS REGRAS.
- Tags [Feitiço] e [Canção].
- Configurações "Efeitos automáticos das condições" e "O que as condições proíbem".
- Para macros: `game.eternia.applyStatus` aceita a origem (`from`), `game.eternia.conditions.recover` e
  `game.eternia.conditions.damage`.
- 31 ícones de estado do game-icons.net (`tools/make-status-icons.mjs`) e a referência técnica `docs/condicoes.md`.
- Aviso de novidades da 0.2.

### Alterado
- Paralisado, Silenciado e Provocado acabam no fim do Processo Principal de quem os recebeu, como Atordoado e
  Cambaleante. A configuração passou a se chamar "Estados que acabam no fim do Processo Principal".
- Aflito também protege Medo e Encantado.
- O fim de cena também encerra o Vínculo.

## 0.1.0 — 2026-10-21

Primeira versão da Eternia. Parte do [LHTTRPG](https://github.com/DeadlyPoisonK/LHTTRPG) 2.1.1 (o histórico dele
continua no git deste repositório) e incorpora o módulo
[lhtrpg-automacao](https://github.com/rezendesjoao/lhtrpg-automacao) 1.4.0 e a tradução
[lhttrpg-br](https://github.com/rezendesjoao/lhttrpg-br) 1.0.1, que deixam de ser necessários.

### Adicionado
- **Ficha de personagem e ficha de monstro em pergaminho** como as fichas do sistema (as do módulo de automação,
  com o mesmo visual).
- **HUD de ações** no lugar da barra de macros, **barras e nomes dos tokens** no estilo da ficha, **chat** e
  **janelas** em pergaminho, e o tema do **TBG** e do Custom Chat Tabs.
- **Automação de mesa:** custos de Ódio e Destino, limites de uso, Momento e economia de ações, Topo e Abaixo no Ódio
  por combate, Encerramento, Incapacitado, fim de cena, Corpo a corpo encostado, cartões de ataque e dano ligados,
  botões de Destino, ajudantes de turno, estados clicáveis no chat, efeitos criados a partir de um cartão e as
  Ferramentas do Mestre.
- **Kuden** (regra da casa).
- **Português do Brasil** como idioma do sistema: a interface inteira e os termos das habilidades (tags, Momento,
  Alcance, Alvo, Custo, Limite e Teste) na tela.
- Logo da Eternia (`tools/make-logo.py`).

### Alterado
- O sistema se chama **Eternia** (id `eternia`): manifesto, código, flags, configurações, textos e caminhos.
- Os compêndios que ficaram estão em português e já trazem os dados que o módulo completava na hora: dano, efeitos,
  bônus, estados de início de cena, Fadiga da comida, cura das poções e joias, trava de NP e os poderes de gatilho
  dos itens (`flags.eternia.powers`).
- Compêndios e pastas com nomes em português.

### Removido
- Raças, classes e subclasses de Log Horizon, e todas as habilidades gerais e de combate (de classe, de arquétipo,
  raciais, comuns e de subclasse). Os compêndios continuam, vazios, para o conteúdo da Eternia.
- As raças e classes de Log Horizon escritas no código (e a migração dos campos antigos de raça e classe), os
  emblemas das classes e os ícones de raças, classes e arquétipos.
- O README em espanhol e o guia de habilidades em espanhol.
