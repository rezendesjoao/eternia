# Changelog

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
