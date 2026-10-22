# Changelog

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
