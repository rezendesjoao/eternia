# Changelog

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
