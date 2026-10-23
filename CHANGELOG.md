# Changelog

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
