# Eternia

Sistema de RPG de mesa para o **Foundry VTT v14**. As regras de base são as de Log Horizon TRPG (ficha, habilidades
por NH, combate por Processos, Ódio, Destino, estados e durações); as classes, as raças e as habilidades são as da
Eternia. A ficha em pergaminho, o HUD de ações, o chat, os tokens e a automação de mesa fazem parte do próprio
sistema, feitos para mesas com muitos jogadores e vários combates ao mesmo tempo.

## Versão 0.1.0

- **Já vem pronto:** a ficha de personagem e a de monstro, o HUD de ações, o chat, os tokens e as outras janelas no
  mesmo visual; toda a automação de combate e de uso de habilidades; o Kuden (regra da casa); a interface em
  português do Brasil.
- **Compêndios com conteúdo:** Habilidades Básicas, Habilidades de Montaria, Poderes EX do Mestre, Itens, Bestiário
  e Regras, em português.
- **Compêndios vazios, à espera do conteúdo da Eternia:** Raças e Classes, Habilidades Comuns e de Subclasse,
  Habilidades Raciais, Habilidades de Arquétipo e Habilidades de Classe. As raças, classes e habilidades gerais e de
  combate de Log Horizon foram tiradas do sistema.

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
  Reações, Abertura, Encerramento, Constantes…), com NH, custo e limite. Clique na imagem para usar e no nome para
  abrir os detalhes ali mesmo; o botão Explorar abre o navegador de habilidades.
- **Kuden:** o Núcleo, o Recurso, os Pontos de Kuden e as peças (só com a regra da casa ligada).
- **Inventário:** a riqueza (receber e gastar ouro fica registrado no chat), o boneco de equipamento (sete espaços
  ligados por linhas às partes do corpo), o que se carrega, os tíquetes e o espaço da bolsa.
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

## Os tokens

A barra de PV (com a Fadiga hachurada e a Barreira num filete azul-aço), o Destino em losangos dourados e o nome em
versalete numa faixa na cor da disposição. Uma configuração escolhe quem vê a barra de PV: todos; todos, mas os
jogadores só veem a de um inimigo [Identificado]; ou cada token por conta própria.

## O HUD de ações

Com um token selecionado (ou, para um jogador, o personagem atribuído a ele), uma barra de pergaminho fica no pé da
tela, no lugar da barra de macros do Foundry:

- **Recursos:** PV, Barreira, Destino, Ódio e Fadiga.
- **Turno:** a rodada e o Processo, as ações que restam no seu Processo Principal, Espera e **Encerrar**; **Entrar**
  coloca o token num combate em que ele ainda não está.
- **Esquivas pendentes:** quando um ataque mira o seu personagem, **Esquivar** rola pelo próprio cartão.
- **Painéis:** Testes, Habilidades (as que não dá para usar agora ficam esmaecidas, com o motivo), Kuden, Itens (com
  os poderes de gatilho) e Estados. **Shift + clique** usa e já rola o Teste.
- **Atalhos fixos** pelo alfinete, **Esc** fecha o painel, e o HUD se ajusta às telas menores, ao chat flutuante, à
  lista de jogadores e à barra lateral aberta.
- A barra de macros fica escondida, mas as teclas 1 a 0 continuam executando as macros. Cada jogador escolhe entre
  esconder, trocar ou mostrar.

## A automação

### Uso de habilidades
- **Custos de Ódio e Destino** pagos ao usar (o Ódio só conta em combate iniciado).
- **Limites de uso** (1/Cena, (NH)/Cenário, 1/Rodada…) contados por personagem.
- **Momento e economia de ações:** cada ação no seu Processo, a Abertura na Abertura, o Encerramento no
  Encerramento, a Ação Maior, a Menor e a de Movimento uma vez por Processo Principal.
- **Habilidades de itens:** o item equipado, a trava de NP, o Ódio mínimo e a Pré-Ação.
- **Avisar ou bloquear:** cada conferência pergunta se é para usar mesmo assim ou bloqueia o jogador (o Mestre
  sempre pode forçar).
- **Registro no cartão** com o que foi gasto e o botão **Desfazer uso**.

### Combate
- **Topo e Abaixo no Ódio por combate**, certos mesmo com vários combates ao mesmo tempo.
- **Encerramento:** a Regeneração cura e depois a Deterioração causa dano, com um resumo no chat.
- **Atordoado e Cambaleante** acabam no fim do Processo Principal de quem os recebeu.
- **Incapacitado** com PV 0; Incapacitados, Mortos e Ausentes passam a vez.
- **Fim de cena ao encerrar o combate:** Aventureiros Incapacitados voltam, Mortos revivem com Fadiga, inimigos
  Incapacitados morrem, Estados Negativos e de Combate acabam.
- **Cartões de ataque e dano:** o dano fica ligado ao ataque certo, não aplica em quem ainda precisa esquivar nem em
  quem esquivou, pergunta antes de aplicar de novo, e cartões privados aparecem para os donos dos alvos.
- **Corpo a corpo encostado** (regra da casa): um token encostado, de lado ou na diagonal, conta como Corpo a corpo.
- **Destino:** +1D no Teste, rerrolar o acerto, a esquiva ou qualquer 2D6, e remover um Estado Negativo.

### Turno (cada jogador escolhe)
Aviso com som quando começa a sua vez, selecionar o token na sua vez, levar a tela até quem age e limpar os alvos no
fim da sua vez.

### Estados e efeitos a partir do chat
- **Estados clicáveis:** os estados escritos nos cartões ([Atordoado], [Deterioração: 10], [Fraqueza (Chama): 5]…)
  viram links que aplicam o estado nos seus alvos, até o fim da cena.
- **Criar efeito nos alvos:** botão direito num cartão de habilidade ou item.

### Conteúdo dos itens e monstros
Os itens e os monstros dos compêndios já trazem os dados que antes só existiam no texto: o dano dos ataques de
monstro e dos consumíveis, os estados, os bônus fixos, os estados de início de cena, a Fadiga que a comida tira, a
cura das poções e joias, a trava de NP e os **poderes de gatilho dos itens**, que viram habilidades de quem carrega
o item (usadas pelo ícone do item, com Momento, limite, custo e Desfazer). Monstros feitos à mão têm o dano dos
ataques lido do texto, em português ou inglês.

### Ferramentas do Mestre
Em **Configurar Opções → Eternia → Ferramentas do Mestre**: encerrar a cena ou o cenário dos tokens selecionados ou
de todos os personagens, completar o que falta no mundo (dano de monstros feitos à mão e habilidades dos poderes de
itens) e o ambiente da cena para o Kuden.

## Kuden (regra da casa)

Uma assinatura própria para cada personagem, paga com as mesmas escolhas de habilidade das comuns: Núcleo, Técnicas,
Dons, Dons maiores, Ápice, Restrições, Recurso do Núcleo (manual ou pela hora da cena), ambiente da cena (hora, céu
aberto, escuridão e miasma) e condições novas de efeito (Recurso, ambiente, alvo Chefe ou Raide, PV ≤ N%). Fica na
aba Kuden da ficha do personagem e da ficha da habilidade, e pode ser desligado nas configurações.

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
| Atordoado e Cambaleante acabam no fim do Processo Principal | ligado |
| Incapacitado automático | ligado |
| Fim de cena ao encerrar o combate | ligado |
| Aventureiros mortos revivem no fim da cena | ligado |
| Corpo a corpo alcança os quadrados vizinhos | ligado |
| Correções nos cartões de ataque e dano | ligado |
| Botões de Destino | ligado |
| Estados clicáveis no chat | ligado |
| Criar efeito a partir de um cartão | ligado |
| Conteúdo dos itens e monstros | ligado |
| Kuden (regra da casa) | ligado |
| Tema pergaminho no chat | ligado |
| Janelas do sistema em pergaminho | ligado |
| Barras e nomes dos tokens no estilo da ficha | ligado |
| Quem vê a barra de PV dos tokens | todos, sempre |

Cada jogador escolhe as suas: HUD de ações (ligado), HUD sem token selecionado (ligado), barra de macros do Foundry
(esconder), aviso da sua vez (ligado), selecionar o token na sua vez (desligado), levar a tela até quem age
(desligado) e limpar os alvos no fim da sua vez (ligado).

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
eternia.fillWorld({ dryRun: true });  // conta (ou completa) o que falta no mundo
eternia.syncItemSkills(actor);        // habilidades dos poderes dos itens do personagem
eternia.parseMonsterDamage(html);     // lê o dano de um ataque de monstro escrito em texto
eternia.hud();                        // o HUD de ações desta tela
eternia.kuden.ledgerOf(actor);        // Pontos de Kuden: custo, pago, guardado, escolhas pendentes
eternia.kuden.settle(actor);          // paga o que falta com as escolhas pendentes
```

## Limites conhecidos

- **Reações** (Antes/Após o Teste, Antes/Após o Dano, Rolagem de Dano) ainda não são oferecidas na hora certa.
- **Desfazer uso** devolve custos e contagens, mas não apaga os efeitos que a habilidade aplicou.
- **Poderes de itens** que dependem de uma escolha, de um resultado ou de outra habilidade ficam só com os campos, o
  texto e a contagem de usos; o efeito deles é feito à mão.
- **Os estados das habilidades** entram pelo botão **Aplicar efeitos**, depois do acerto.
- **Erro do core 14.367 no console** com combates simultâneos (`Cannot use 'in' operator to search for 'turn'`): vem
  do rastreador de combate do Foundry e é inofensivo.

## Desenvolvimento

- `module/` é o código (entrada em `module/eternia.mjs`): `documents/`, `sheets/` (as fichas de pergaminho estendem as
  classes base), `helpers/`, `apps/`, `piles/`, `automation/`, `chat/`, `content/`, `hud/`, `canvas/`, `kuden/` e
  `i18n/` (os termos em português). `templates/`, `css/` e `lang/` seguem a mesma divisão.
- O visual de pergaminho (`css/automation.css`, `sheet.css`, `chat.css`, `windows.css`, `hud.css` e `tbg.css`) entra
  na camada de CSS `modules` (veja `styles` no `system.json`), acima do CSS base do sistema e do Foundry.
- Os compêndios são versionados em `src/packs/<pacote>/*.json`, em português. Os campos que a automação lê (tags,
  Momento, alcance, alvo, custo, limite, tipos) ficam em inglês e aparecem traduzidos na tela.
  - `npm install` e depois `npm run packs:build` compila `src/packs` → `packs` (com o mundo fechado).
  - `npm run packs:unpack` faz o caminho de volta, depois de editar os compêndios dentro do Foundry.
- `npm run package` monta `dist/eternia.zip` e `dist/system.json` para a release.
- `tools/make-textures.py` gera as texturas da ficha e `tools/make-logo.py` o logo, sem arte de terceiros.

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
- **Ícones** de [game-icons.net](https://game-icons.net) sob [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
  (fundos dos estados recoloridos). Autores: Lorc, Delapouite, Skoll, Sbed e Zeromancer.

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
| Habilidades de Montaria | horse-head | Delapouite |

</details>

## Licença

O código (scripts, templates, estilos e arquivos de idioma) é distribuído sob a **licença MIT**, veja
[LICENSE.txt](LICENSE.txt). Ela não cobre as regras, o cenário nem o conteúdo de Log Horizon TRPG, que pertencem a
Mamare Touno e Kadokawa.
