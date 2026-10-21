# Análise dos módulos de Pathfinder 2e (base da versão 1.0)

Em 2026-10-18, dez módulos de PF2e e três HUDs para Foundry foram lidos por inteiro (código, configurações e
textos) para escolher o que vale ter, reescrito do zero, no Log Horizon TRPG — Automação. Nenhum código foi
copiado: vários deles não têm licença (pf2e-toolbelt, pf2e-dailies) ou têm licença que contaminaria o módulo (o
Keybind Menagerie é GPL-3.0).

Legenda do veredito:
- **1.0**: virou uma função da versão 1.0 (o nome entre parênteses é o do módulo).
- **Já existe**: o sistema `lhtrpg` ou este módulo já fazem.
- **Candidato**: vale para o LH e fica para uma próxima versão.
- **Não se aplica**: regra ou interface só do PF2e.

## O que entrou na 1.0

| Ideia | De onde veio | Como ficou no LH |
|---|---|---|
| HUD com painéis por categoria, atalhos fixos e tooltips | PF2e HUD, Token Action HUD, Argon | HUD de ações acima da barra de macros: testes, habilidades por Momento, Kuden, itens, estados, turno |
| Rolar as defesas dos alvos sem caçar o cartão | Toolbelt (Target Helper) | Esquivas pendentes no HUD, roladas pelo botão do próprio cartão |
| Pips de ações por rodada | Argon, Sundry (Reaction tracker) | Ações Maior, Menor e Movimento restantes no HUD |
| Aviso quando começa a vez | Workbench (lembrete de ações) | Aviso com som no começo do seu Processo Principal |
| Selecionar o token da vez | Workbench | Seleciona o token do dono (para o Mestre, os inimigos) |
| Levar a tela até quem age | Sundry | Configuração de cliente |
| Limpar os alvos no fim da vez | Toolbelt (antigo Untarget), Workbench | Limpa ao acabar o seu Processo Principal |
| Ctrl+clique num efeito do chat aplica nos selecionados | Ctrl-Click Effects | Estados escritos nos cartões viram links que aplicam pelo motor de estados do sistema |
| Criar efeito a partir de qualquer cartão | Extempore Effects | "Criar efeito nos alvos" com as durações do sistema (Processo, Rodada, Cena) |
| Bloquear ataque de quem não pode agir | Workbench (Cannot attack) | Aviso de Incapacitado ou Morto antes de usar uma habilidade |
| Cabeçalhos de seção nas configurações | Sundry, Utility Buttons | Seções no menu de configurações do módulo |
| Aviso único de novidades | Companion Compendia | Janela de novidades, uma vez por usuário |

## PF2e Workbench (xdy) — Apache-2.0

| Função | O que faz | Para o LH |
|---|---|---|
| Mistificação de NPC (nome por traços, número/adjetivo, revelar pela HUD do token) | Esconde o nome real dos inimigos | **Candidato**: nomes escondidos até o estado [Identificado] e a Identificação de Inimigo |
| Mistificação de itens de NPC | Itens do saque ficam não identificados | Não se aplica (o gatilho "inimigo a 0 PV" pode virar aviso de Itens Deixados) |
| Lembrete "não pode atacar" | Avisa ou cancela ataque de quem está caído | **1.0** (Incapacitado não age) |
| Lembrete de alvo | Avisa ou cancela ataque sem alvo | **Candidato**, desligado por padrão (mesas por texto usam pouco o mapa) |
| Lembrete de ações (Atordoado, Lento, Acelerado) | Sussurra as ações da rodada | **1.0** em forma de aviso de turno e pips no HUD |
| Arma de sopro / recarga | Marca uso por N rodadas | Já existe (limites por Cena, Cenário e Rodada) |
| Gerenciador de Pontos Heroicos | Distribui, zera e sorteia pontos | **Candidato**: gerenciador de Destino com motivo e registro |
| Escalar NPC / rolador de NPC por nível | Ajusta ou improvisa estatísticas | **Candidato** quando as tabelas de criação de inimigos estiverem digitadas |
| Magia privada com aviso público | Esconde o que o NPC conjurou | **Candidato**: habilidade de monstro secreta com cartão resumido |
| Cores de raridade, licenças OGL, aprender magia | Marcas na ficha e compra de magias | Não se aplica |
| Mover combatente a 0 PV para antes do atual | Regra de morrer do PF2e | Não se aplica |
| Dano persistente e cura rápida automáticos | Aplica no começo/fim do turno | Já existe (Regeneração e Deterioração no Encerramento) |
| Morrendo, Inconsciente, Ferido | Automação dos 0 PV | Já existe (Incapacitado e fim de cena) |
| Derrubar itens, embainhar armas | Regras de PF2e | Não se aplica |
| Rolar dano automático no acerto | Pula um clique | Não (no LH há reações entre o acerto e o dano) |
| Reduzir Assustado a cada turno | Diminui condição com valor | Já existe para Atordoado e Cambaleante (fim do Processo) |
| Lembrar e restaurar alvos do combatente | Guarda alvos entre turnos | Não (o oposto, limpar, entrou) |
| Variantes de Ponto Heroico | Rerrolagens diferentes | Não se aplica |
| Housepatcher (erratas em compêndios) | Corrige compêndios do sistema | Já existe à parte (conteúdo dos compêndios em `patches.mjs`) |
| Ponteiro no mapa, animação de token, tela de pausa | Cosméticos | Não (fora do escopo) |
| Recolher cartões longos, abrir dados do dano | Organização do chat | Já existe (chat refeito na 0.6) |
| Teclas para macros de qualquer página da barra | Atalhos | Não |
| Tecla para o Mestre marcar alvos de um jogador | Ajuda em mesa grande | **Candidato** (fase de mesa por texto) |
| Paleta de ações básicas, testes em grupo | Macros de ações | Parcialmente na 1.0 (painel Testes); teste em grupo é **candidato** |

## PF2e Toolbelt (reonZ) — sem licença (só ideias)

| Função | O que faz | Para o LH |
|---|---|---|
| Target Helper | Linhas por alvo para defesas, dano por alvo, rolar todas as defesas dos NPCs | Já existe no sistema (cartão de ataque com alvos; monstros esquivam sozinhos); a parte do jogador entrou na **1.0** (esquivas no HUD) |
| Template Helper | Marca os tokens dentro do modelo | **Candidato** (habilidades de Área) |
| Better Chat Message (juntar/injetar dano) | Soma danos de aliados num cartão | **Candidato** |
| Anonymous | Esconde ações de NPC dos jogadores | **Candidato**, junto com a mistificação |
| Auto Cover | Cobertura automática | Não se aplica |
| Condition Manager | Condição com duração e origem | **1.0** em parte (Criar efeito com duração do sistema) |
| Better Effects Panel | Remover efeito com um clique | **1.0** (× no painel Estados do HUD) |
| Regiões "Add Effect" e terreno difícil | Efeito ao entrar numa região | **Candidato** (zonas e campos) |
| Better Merchant, Giveth, Droppeth, Better Trade, Better Inventory | Loja, presentes, itens no mapa | Já existe em parte no sistema (lojas e baús); o resto é **candidato** da fase de cena e sessão |
| Identify, imagem de não identificado, runas automáticas | Identificação de itens do PF2e | Não se aplica |
| Actionable | Botão de usar com macro e custos | Já existe (uso de habilidades com custos e limites) |
| Hero Actions | Baralho de ações heroicas | Não se aplica |
| Share Data | Companheiro divide PV e turno | **Candidato** (invocações) |
| Better Actor Sheet, Better Movement, Better Tool | Ficha, teleporte, apagar região | Não (fora do escopo) |
| Resource Tracker | Contadores flutuantes | **Candidato** (medidores de raide) |
| Roll Tracker | Estatística das rolagens | **Candidato** adaptado a 2d6 (críticos e falhas) |
| Importador de personagem | Importa do Pathbuilder | Não se aplica |

## PF2e Companion Compendia (TikaelSol) — Apache-2.0

| Função | O que faz | Para o LH |
|---|---|---|
| Compêndios de companheiros, eidolons, seguidores | Conteúdo com regras automáticas | **Candidato**: modelos de invocação do Invocador, pelo NP do dono |
| Notas no cartão enquanto um bônus está ativo | Lembra o efeito no ataque | **Candidato** |
| Aviso único de mudança | Janela uma vez por usuário | **1.0** (aviso de novidades) |

## PF2e Dailies (reonZ) — sem licença (só ideias)

| Função | O que faz | Para o LH |
|---|---|---|
| Janela de preparação diária | Escolhas do dia num lugar só, com resumo e proteção contra repetir | **Candidato**: janela de fim de cena, de cenário e de descanso (hoje são as Ferramentas do Mestre) |
| Itens temporários destacados e removidos no descanso | Controle do que expira | **Candidato** |
| Rações | Gasta comida no descanso | Já existe em parte (comida remove Fadiga) |
| Cargas, cajados, servidor de magias | Magia do PF2e | Não se aplica |
| Dailies personalizados com código | Extensível pelo Mestre | Não |

## PF2e Keybind Menagerie (Drental) — GPL-3.0 (só ideias)

| Função | O que faz | Para o LH |
|---|---|---|
| Teclas de condição (ligar, subir, descer) | Estados por teclado no token sob o mouse | **Candidato** |
| Encerrar turno, marcar derrotado | Atalhos de combate | **1.0** em parte (Encerrar no HUD; Esc fecha o painel) |
| Mostrar arte, alternar visibilidade, ir para a busca | Atalhos gerais | Não |
| Tomar cobertura, levantar escudo, ações do PF2e | Ações do sistema | Não se aplica |

## PF2e Utility Buttons / flatcheck-helper (oWave) — MIT

| Função | O que faz | Para o LH |
|---|---|---|
| Testes simples no cartão (oculto, ofuscado…) | Mostra e rola o teste que falta | Não se aplica (o LH não tem teste simples) |
| Rerrolar com Ponto Heroico | Janela de rerrolagem | Já existe (Destino: +1D e rerrolar nos cartões) |
| Esconder o resultado até os testes passarem | Segura o resultado | **Candidato** (janela de reações da fase 3) |
| Informação no token marcado | Defesa e estado do alvo | **Candidato** (Esquiva, Resistência, Barreira, Topo de Ódio) |
| Nível de luz, regras próprias | Visão do PF2e | Não se aplica |
| Atrasar e voltar à iniciativa | Esperar a vez | Já existe no sistema (Espera) e entrou no HUD |
| Life Link / Spirit Link | Transferir PV com desfazer | **Candidato** (Proteger e redirecionar dano) |
| Emanação (aplicar em quem está no raio) | Buffs de área | **Candidato** |
| Visão compartilhada em combate, guia interno | Utilidades | Não |

## PF2e Usage Updater (ChasarooniZ) — MIT

| Função | O que faz | Para o LH |
|---|---|---|
| Usos voltam com o tempo do mundo | Recarga por hora ou dia | Já existe do jeito do LH (usos por Cena, Cenário e Rodada) |
| Ampulheta na ficha | Mostra o que está gasto | **1.0** (usos restantes em bolinhas no HUD) |
| Casos especiais (Pedra Éon, Erupção Eterna) | Itens do PF2e | Não se aplica |

## PF2e Extempore Effects (shemetz) — MIT

| Função | O que faz | Para o LH |
|---|---|---|
| Efeito a partir de qualquer cartão do chat | Marca buffs só descritos | **1.0** (Criar efeito nos alvos) |
| Duração lida do texto | "até o fim do turno" vira duração | **Candidato** (ler "até o fim da cena/rodada" do texto) |
| Efeito "Gasto: X" até recarregar | Marca o que foi usado no token | **Candidato** |
| Botões de teste dentro do texto | "teste de Atletismo" vira botão | **Candidato** ("[FOR] Dificuldade 14" vira botão) |
| Tecla de efeito vazio, efeito secreto, abrir para editar | Atalhos | **1.0** em parte (abre para editar com um alvo) |
| Aviso de efeitos que expiraram, parar o relógio | Tempo do mundo | Já existe no sistema (expiração por Processo, Rodada e Cena) |
| Aflições por estágio, recarga | Regras de PF2e | Não se aplica |

## Sundry (ChasarooniZ) — MIT

| Função | O que faz | Para o LH |
|---|---|---|
| Cores (cabeçalho do chat na cor do jogador, cores de outros módulos) | Cosmético | Não |
| Runas e dano base nas fichas, razão de ações | Informação do PF2e | Não se aplica |
| Esconder botões, esconder ícones de efeito no token, botão da lista de jogadores | Limpeza da interface | **Candidato**: esconder ícones menores nos tokens |
| Destacar defesas pendentes | Pulsa o botão que falta | **1.0** do jeito do LH (esquiva pendente no HUD) |
| Idiomas do grupo na ficha de NPC | Informação do PF2e | Não se aplica |
| Levar a tela até o combatente | Acompanha o turno | **1.0** |
| Girar token caído | Marca visual de 0 PV | **Candidato** (Incapacitado) |
| Telas de carregamento, texto e imagem da pausa | Cosmético | Não |
| Teclas: notas da campanha, atitude, ponto aleatório | Atalhos | **Candidato**: sorteio de alvo entre os marcados |
| Lista de verificação no começo da sessão | Abre um diário | **Candidato** (fase de cena e sessão) |
| Rastreador de reações e de floreios | Marca o que foi usado na rodada | **1.0** em forma de pips de ações no HUD |
| Modelos de monstro e ajuste de PV | Conteúdo do PF2e | **Candidato**: modelos de monstro por patente |

## PF2e Ctrl-Click Effects (websterguy) — Apache-2.0

| Função | O que faz | Para o LH |
|---|---|---|
| Ctrl+clique em efeito ou condição do chat | Aplica nos tokens selecionados, com a origem | **1.0** (estados clicáveis) |
| Dano persistente por Ctrl+clique | Condição de dano contínuo | **1.0** do jeito do LH ([Deterioração: N] clicável) |
| Ícone "aplicar aos selecionados" | Sem precisar do Ctrl | **1.0** (o link já aplica) |

## HUDs estudados para o desenho

- **PF2e HUD (reonZ):** barra fixa, painéis por categoria abertos por clique, filtro, atalhos por usuário e
  tooltips com os controles do mouse. Aprendido: não mover a barra de macros do core; comparar atores por uuid;
  guardar atalhos no ator-base de tokens não vinculados.
- **Token Action HUD (Larkinabout):** grupos com subgrupos, informações em selos, botão direito abre a ficha.
  Evitado: menus por passar o mouse e configurações salvas em flags a cada clique.
- **Argon (theripper93):** pips de ações por tipo, quantidade nos itens e o botão de encerrar só na sua vez.
  Evitado: o visual cinematográfico e as fontes externas.
