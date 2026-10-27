# A matemática da Eternia

Este documento é a régua do sistema. Toda classe, Magia, habilidade de raça ou criatura nova é medida contra ele antes
de entrar no compêndio: os números de cada seção são os que as 14 classes, as 97 Magias, as 8 raças e as 52 criaturas
do Império seguem desde a 0.42. As contas vêm de um simulador (Monte Carlo de lutas, com os dados e as regras de
`module/helpers/combat-cards.mjs`), em `Desktop/Daggerheart/Eternia-Balanceamento/simulador` (fora do repositório; a
seção 8 diz como rodar). Onde este documento e uma regra do compêndio discordarem, vale a regra, e o documento está
desatualizado.

## 1. Os dados

- **Teste:** 2d6 + modificador contra 2d6 + modificador (Teste de Precisão contra Esquiva ou Resistência).
- **Crítico:** dois ou mais 6. **Falha Crítica:** todos os dados em 1.
- **Quem ganha** (a ordem do cartão de ataque): a Falha Crítica do ataque erra; a Falha Crítica da defesa leva o golpe;
  o Crítico da defesa esquiva; o Crítico do ataque acerta; senão, o ataque precisa passar a defesa. **Empate é do
  defensor.**
- **Dados a mais:** +1d6 num teste soma 3,5 em média e pesa mais que +3 fixo, porque também aumenta a chance de
  Crítico. Um dado a menos tira o mesmo.
- **Lacaio:** os testes do lacaio são fixos (cada dado vale 3): 2d6 + 4 vira 10. Não tem Crítico nem Falha Crítica; a
  defesa dele ainda rola.
- **Dano:** Nd6 + fixo − Defesa (Física ou Mágica), nunca abaixo de 0. Média de Nd6 = 3,5 × N. A Anulação tira um
  valor de cada golpe; a Barreira absorve até o valor dela e some.

Chance de acertar, pela diferença entre o modificador do ataque e o da defesa:

| Diferença | −4 | −3 | −2 | −1 | 0 | +1 | +2 | +3 | +4 | +5 | +6 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2d6 contra 2d6 | 12% | 17% | 25% | 34% | 44% | 55% | 66% | 75% | 83% | 88% | 91% |
| 3d6 contra 2d6 | 41% | 50% | 60% | 69% | 77% | 84% | 89% | 92% | 95% | 96% | 96% |
| 2d6 contra 3d6 | 4% | 5% | 8% | 11% | 16% | 23% | 31% | 40% | 50% | 59% | 68% |

O teto de 96% e o piso de 4% são o Crítico e a Falha Crítica.

### O Ódio (IV.b, automatizado em `module/automation/hate.mjs` e no cartão de dano)

- Quem tem o maior Ódio do grupo fica [Topo de Ódio]: cada golpe que leva soma **Ódio × o multiplicador do monstro**
  de dano direto (o Dano de Ódio).
- Os outros ficam [Abaixo no Ódio]: **+2 nas Esquivas** contra os monstros.
- Cada Esquiva que um personagem falha tira **1 de Ódio** dele. O Ódio zera no começo e no fim do combate.
- O Ódio sobe pelo custo das habilidades (o "Ódio 2" do bloco). Na prática, 1 a 5 por rodada; o tanque fica no topo e
  leva a maior parte dos golpes. É uma parte grande do dano que o grupo sofre, e as contas abaixo já a contam.

## 2. Os personagens

- **Atributos:** a classe dá 10 pontos, a raça +2, o jogador 5 (nenhum acima de 7 no NP 1), e cada atributo sobe 1 por
  NP. **Modificador = atributo ÷ 3, para baixo.**
- **Precisão** = o maior modificador (+ a da arma). **Esquiva** = DES. **Resistência** = POD. **Defesa Física** =
  2 × FOR + armadura (+ escudo). **Defesa Mágica** = 2 × INT + armadura. **Iniciativa** = FOR + INT.
- **Faixas de PV** (da classe; a raça soma por cima):

| Faixa | PV no NP 1 | Por NP | Classes |
|---|---|---|---|
| Frágil | 35 | +4 | Mago Negro |
| Leve | 40 | +5 | Assassino, Invocador, Mago Branco, Pictomante |
| Firme | 40 | +6 | Caçador, Hierofante, Lutador, Mago Azul, Mago Vermelho, Matador de Dragões |
| Robusta | 50 | +8 | Berserker, Samurai |
| Colossal | 55 | +9 | Centurião |

- **Equipamento:** as contas usam o melhor item comprável de nível até o NP (sem raros, de Aincrad ou "Not For Sale").
- **Poder Mágico do equipamento:** uma fonte só, a arma (um Cajado) ou a melhor Pedra Mágica ou Anel Mágico, a maior;
  os outros acessórios que dão Poder Mágico (a Guarda de Sigilos) somam por cima, dentro do limite de 3 acessórios
  (`module/helpers/magic-power.mjs`). Somar Cajado com Pedras dava +27 no NP 5, mais que qualquer diferença de classe.

## 3. A régua das classes

A **régua** é o que um personagem deve render por rodada: o PV do comum do Guia de Criação de Inimigos ÷ 3,5 (quatro
personagens derrubam quatro comuns em cerca de 3,5 rodadas, se todos acertarem; com erros e defesas, a luta dura de 4 a
6 rodadas).

| NP | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| PV do comum | 40 | 47 | 53 | 59 | 65 | 71 | 77 | 83 | 89 | 95 |
| Régua por rodada | 11,6 | 13,3 | 15,0 | 16,8 | 18,5 | 20,2 | 21,9 | 23,7 | 25,4 | 27,1 |

**Valor de uma classe por rodada** = dano causado + dano a mais que ela dá aos aliados (as Ordens, as Runas que viram
acertos) + dano que ela evita (Anulação, Barreira, Runas que viram esquivas) − 1/3 do PV que ela paga (Laços, Pressão,
Ira). Medido no melhor Caminho, numa luta de 4 rodadas ao lado de 3 aliados na régua.

**Faixa boa:** de 0,8× a 1,3× a régua do NP 3 ao NP 7. No NP 1 vale de 0,6× a 1,1× (com três escolhas, um Motor que
precisa de várias rodadas ainda não fecha o ciclo). No NP 10, de 1,1× a 1,4×: o Ápice é um degrau acima, para todas
por igual.

As 14 classes na 0.42 (vezes a régua, melhor Caminho):

| Classe | NP 1 | NP 3 | NP 5 | NP 7 | NP 10 |
|---|---|---|---|---|---|
| Samurai | 0,86 | 0,95 | 1,08 | 1,02 | 1,27 |
| Assassino | 0,87 | 0,97 | 0,95 | 0,90 | 1,17 |
| Berserker | 0,65 | 0,78 | 0,91 | 1,15 | 1,37 |
| Caçador | 1,05 | 0,91 | 0,98 | 1,25 | 1,43 |
| Centurião | 0,73 | 0,90 | 1,17 | 1,17 | 1,28 |
| Hierofante | 0,65 | 1,15 | 1,22 | 1,13 | 1,20 |
| Lutador | 0,58 | 0,86 | 0,94 | 0,91 | 1,19 |
| Invocador | 1,16 | 0,96 | 1,12 | 0,81 | 1,21 |
| Mago Azul | 1,09 | 0,95 | 1,18 | 1,19 | 1,44 |
| Mago Branco | 1,01 | 1,26 | 1,25 | 1,25 | 1,21 |
| Mago Negro | 0,93 | 0,89 | 1,10 | 0,84 | 1,24 |
| Mago Vermelho | 0,81 | 0,87 | 1,27 | 1,36 | 1,31 |
| Matador de Dragões | 1,04 | 0,91 | 1,00 | 1,08 | 1,11 |
| Pictomante | 0,72 | 1,00 | 1,05 | 1,02 | 1,26 |

Antes da 0.42 a faixa ia de 0,7× a 4,7×: o Samurai e o Berserker rendiam três a quatro vezes a régua.

## 4. As Leis do Motor (para criar ou mexer numa classe)

As exceções que estouravam as classes eram sempre as mesmas. Uma classe nova segue estas leis, e `docs/classes.md`
tem o resto da construção (kit, ramos, Caminhos, Ápice, Dedicação):

1. **Ritmo:** em média, **2 pontos do Motor por rodada** (a Manutenção e uma ação). Quem ganha mais rápido tem ponto
   que vale menos.
2. **Valor do ponto** no golpe que gasta tudo: **1d6 + NP por ponto num alvo**, **1d6 + NP÷2 por ponto em área**. Um
   golpe que gasta "à escolha" segue a mesma conta. **2d6 por ponto** só numa classe com o Teto pela metade e o ritmo
   pela metade.
3. **Motor cheio:** **um bônus só por classe** (acertar sem esquiva, +[NP×2 + 10] ou um estado forte). Quando o bônus
   vem de um talento (o NP 7 de um ramo) e não do próprio Motor, vale **uma vez por cena** (a flag do Motor zera no
   `onCombatStart`).
4. **Talentos de Teto:** +1 por talento; numa classe de Teto pela metade, +1 vale como +2.
5. **Ápice:** transforma o Motor (mais um número da Lei, a Força que continua, metade dos pontos que ficam) **sem dar
   ação a mais** e sem dobrar o valor do ponto.
6. **Pagar com PV:** um ponto comprado com PV custa NP÷2 + 2 (o Laço do Invocador). O antigo NP + 3 tirava 48 PV no
   NP 5 de uma classe Leve: a classe pagava mais do que rendia.
7. **Arredondamento:** "NP÷2" e "Pontos×NP÷2" são sempre **para baixo** (`floor` nas fórmulas). Para cima só quando a
   regra diz ("metade, para cima").
8. **Estados do Motor:** um estado que o Motor dá toda rodada ou a vários aliados fica em NP÷2 + 2 (o Ponto de Ataque,
   a Lei Dourada) ou mais baixo (o Valor da natureza do Mago Azul, nível ÷ 3 + 2; a Bandeira, Ordens ÷ 2 + 1). Um
   estado de transformação fica em NP + algo e cobra Fadiga (a Força do Dragão, [Despertado: NP + 2 × Semente]).
   Multiplicar o Valor do estado pelos pontos (o antigo Ordens × 2) estoura no NP alto.

Fórmulas: `@spent` (pontos gastos), `@cr` (NP), `@motor.value`, `@use.<chave>` (o que o `plan` do Motor calculou; sem
o `plan`, vale 0), `@magic` e `@attack` (Poder Mágico e de Ataque). Um "uma vez por cena" do Motor é uma flag em
`DEFAULTS` que o `plan` liga em `plan.changes` e o `onCombatStart` desliga.

**Conferir uma classe nova:** escreva a política dela no simulador (`classes-final.js`, uma função por Caminho), rode
`node final2.js` e veja se cada Caminho cai na faixa da seção 3 em todos os NP. Se um Caminho passa de 1,3×, procure a
lei que ele quebra.

## 5. As Magias

### As categorias

| Categoria | O que ganha | O que paga |
|---|---|---|
| Conjuração e Portadora (as comuns) | a base | — (a Portadora pede o objeto equipado) |
| Perdida, Proibida e Maldição | cerca de +1d6 por feitiço de ataque | um **Tabu** que custa de 1,5 a 3,5 de dano recebido por rodada no NP 10 |
| Ancestral | **+1d6 em todo feitiço de ataque** que não é o supremo | nada (sem Tabu); o supremo só chega no NP 10 |

As Ancestrais são as mais fortes (as mais raras no sorteio, 3%); as Perdidas, Proibidas e Maldições ficam acima das
comuns e pagam o Tabu.

### Os dados dos feitiços de ataque

| NP do feitiço | Comum | Perdida, Proibida, Maldição | Ancestral |
|---|---|---|---|
| 1 | 2d6 (grande, 3d6 com Ódio 2) | 2,7d6 a 3d6 | 3d6 |
| 3 | 2d6 a 3d6, com estado | 3d6 a 3,5d6 | 3d6 |
| 5 | 3d6 (grande: +2 no Motor) | 4d6 a 5d6 | 4d6 |
| 7 | o supremo | o supremo | 5d6 |
| Supremo (NP 7; NP 10 nas Ancestrais) | (1 + 2 × pontos)d6 + pontos × NP, pede o Motor no Teto e gasta tudo | igual | igual |

Todos somam o Poder Mágico. Entre as comuns, nenhuma fica a mais de 1,5d6 da média; as que batem menos compensam com
apoio (Encantamento, Telepatia, Moldagem de Gelo, Corpos Celestes) ou acertam sem teste e pagam com Fadiga (a Magia dos
Anjos).

### O peso do Tabu

Custo em dano recebido por rodada, num mago típico, no NP 5 e no NP 10:

| Tabu | NP 5 | NP 10 | Nota |
|---|---|---|---|
| −2 nas Esquivas | +2,3 | +3,2 | o "−1d6 nas Esquivas" custava +4,1/+5,5: passava da faixa |
| Defesa Física −NP | +1,4 | +2,8 | |
| Defesas Física e Mágica −NP÷2 | +0,7 | +1,8 | |
| Defesa Física −NP÷2 | +0,6 | +1,4 | |
| Defesa Mágica −NP | +0,4 | +0,7 | só um quarto dos golpes é mágico |
| Defesa Mágica −NP÷2 | +0,2 | +0,4 | |
| Recuperação −NP | ~0 | ~0 | só pesa em quem cura |
| [Maldito] em combate | — | — | sem cura e sem Barreira: forte, medido à mesa |

Um Tabu novo custa entre 1,5 e 3,5 no NP 10: some as linhas. "Recuperação −NP" e as Defesas Mágicas sozinhas não
chegam lá; junte uma Defesa Física ou as Esquivas. Na 0.42, o Portão do Inferno, as Artes Brancas e o Sangue
Demoníaco têm "Recuperação −NP e Defesa Mágica −NP÷2" (+0,4): ficam abaixo da faixa e pagam de outro jeito (o Portão
com 1d6 a menos nos feitiços, as Artes Brancas com o Prazer que pega aliados, o Sangue Demoníaco com a [Fraqueza
(Radiância)]).

### O Traço

Toda Magia tem um Traço passivo: em geral **+NP÷2 de dano** em quem já tem um estado (a Ancestral e a Perdida que caçam
demônios, +NP contra a tag) e, às vezes, imunidade a um ou dois estados. Um Traço não dá dano sem condição.

**Conferir uma Magia nova:** os feitiços na linha da categoria (tabela acima), o supremo com a fórmula do supremo, o
Tabu entre 1,5 e 3,5. Rode `node magias-score.js` e `node tabu.js`: o ganho por feitiço contra as comuns e o custo do
Tabu aparecem lado a lado.

## 6. As raças

- **Orçamento igual:** +2 em atributos e **16 pontos de PV e Destino** (1 Destino = 8 PV, a troca que as próprias raças
  usam): Humanos, Elfos, Demônios e Celestiais têm +8 PV e 1 Destino; Dracônicos e Lupinos +16 PV; Felinos e Vulpinos
  2 Destino.
- **Estágios da forma:** I no NP 1 (as inatas), II no NP 3, III no NP 7, IV no NP 12 (+1 atributo), V no NP 16 (a
  Fera, uma vez por cenário).
- **Habilidade de raça:** vale de 2 a 10 de dano equivalente por luta no NP 1 a 5, e de 10 a 50 no NP 10, somando os
  estágios. Uma habilidade "à vontade" (sem limite) pesa como quatro de "1/cena".

Valor das habilidades por luta na 0.42 (NH 1, estágios I a III; os PV e o Destino à parte):

| Raça | NP 1 | NP 5 | NP 7 | NP 10 |
|---|---|---|---|---|
| Humanos | 2,5 | 7,3 | 23,5 | 33,3 |
| Elfos | 7,0 | 7,0 | 11,4 | 12,5 |
| Dracônicos | 6,2 | 16,2 | 30,9 | 40,2 |
| Demônios | 3,8 | 5,6 | 11,9 | 18,5 |
| Celestiais | 4,4 | 4,4 | 15,9 | 17,1 |
| Bestiais Felinos | 6,7 | 10,4 | 24,3 | 28,9 |
| Bestiais Lupinos | 4,4 | 4,4 | 29,4 | 39,1 |
| Bestiais Vulpinos | 3,0 | 12,5 | 25,6 | 49,8 |

Antes da 0.42 a distância no NP 10 era de 5,4 (Celestiais) a 112 (Vulpinos). Elfos e Celestiais ainda ficam embaixo
porque a parte forte deles é situacional (os espíritos, o voo), que a conta não mede inteira.

**Conferir uma habilidade de raça nova:** some ao `races-final.js` a conta dela (usos por cena × o que faz) e veja se a
raça fica entre as outras no mesmo NP.

## 7. Os inimigos e os encontros

### O alvo

**Um encontro padrão custa ao grupo pelo menos 65% dos PV somados no NP 1, e 1,5% a mais a cada NP (78,5% no NP 10)**,
em média, sem a luta ficar mais longa (4 a 6 rodadas). O dano que chega é: a chance de acerto × (dano − Defesa) + o
Dano de Ódio no topo + as áreas e o [Destino 1] dos chefes + o bônus da Ação Menor + os estados de dano (Queimando,
Envenenado, Deterioração, Chama Negra).

### O encontro padrão

Quatro personagens do mesmo NP contra **um** destes (todos têm o PV de cerca de 4 comuns):

- **4 comuns**, o encontro mais fácil: é nele que a tabela abaixo bate o alvo;
- **6 lacaios** (metade do PV, testes fixos, o mesmo dano): fica um pouco abaixo do alvo nos NP baixos; 8 lacaios já
  passam de 85% (os lacaios do Império batem mais: 4 Estirges, 4 Goblins Saqueadores, 5 Kobolds Batedores; veja a
  coluna "Quantas no alvo" abaixo);
- **1 chefe de grupo + 2 comuns** (o chefe com o dobro do PV, Destino, [Destino 1]: área e o (Menor)): o clímax, de 83%
  a 90%, com o grupo todo caindo em metade das vezes;
- **1 chefe solo** (4 vezes o PV, área e o [Destino 1]): fica no alvo.

A curva é íngreme: quando um personagem cai, o grupo bate menos, a luta dura mais e o resto apanha mais. Com o dano
desta tabela, 3 comuns custam de 37% a 46% dos PV, 4 comuns o alvo, e 5 comuns derrubam o grupo inteiro em 72% a 88%
das lutas. Os Aventureiros voltam no fim da cena (VI. REFERÊNCIA, Incapacitado e Morto), então cair é caro, mas não
acaba a campanha.

### O comum de cada NP

PV, defesas, acerto e Ódio são os do Guia de Criação de Inimigos (a média dos nove Tipos E). O dano do ataque principal
é o novo; o Guia dentro do sistema (compêndio `rules`) já está com ele.

| NP | PV | Def. F/M | Acerto | Ódio | Dano antes | **Dano agora** | 4 comuns | 6 lacaios | Chefe + 2 | Chefe solo |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 6/4 | 2d6+3 | ×1 | 2d6+15 | **2d6+22** (×1,32) | 65% | 51% | 83% | 70% |
| 2 | 47 | 7/6 | 2d6+4 | ×1 | 2d6+20 | **2d6+22** (×1,07) | 68% | 61% | 85% | 73% |
| 3 | 53 | 9/8 | 2d6+4 | ×1 | 2d6+24 | **2d6+31** (×1,23) | 70% | 61% | 86% | 74% |
| 4 | 59 | 11/10 | 2d6+4 | ×2 | 2d6+29 | **2d6+40** (×1,31) | 71% | 57% | 83% | 69% |
| 5 | 65 | 12/11 | 2d6+5 | ×2 | 2d6+34 | **2d6+46** (×1,29) | 71% | 66% | 86% | 74% |
| 6 | 71 | 14/13 | 2d6+5 | ×2 | 2d6+38 | **2d6+56** (×1,40) | 74% | 66% | 86% | 72% |
| 7 | 77 | 15/15 | 2d6+5 | ×2 | 2d6+43 | **2d6+71** (×1,56) | 74% | 63% | 84% | 74% |
| 8 | 83 | 17/17 | 2d6+6 | ×2 | 2d6+48 | **2d6+71** (×1,42) | 79% | 75% | 89% | 77% |
| 9 | 89 | 18/18 | 2d6+6 | ×2 | 2d6+52 | **2d6+90** (×1,64) | 78% | 74% | 87% | 77% |
| 10 | 95 | 20/20 | 2d6+7 | ×3 | 2d6+57 | **2d6+97** (×1,63) | 80% | 78% | 90% | 80% |

As porcentagens são os PV perdidos pelo grupo, em média de 1.050 lutas por célula (sete grupos de classes diferentes).
Em 4 comuns, alguém cai em 80% a 91% das lutas e o grupo inteiro em 16% (NP 2) a 47% (NP 10).

**Converter um dano do Guia (ou um dano antigo):** dano novo = (3,5 × dados + fixo) × o fator do NP − 3,5 × dados.
Um Tipo E que bate menos que a média (o Encouraçado) continua batendo menos, na mesma proporção.

**Do NP 11 em diante:** o Guia cresce cerca de 4,7 no fixo e 6 de PV por NP, e o fator subiu 0,05 por NP do 1 ao 10;
use fator = 1,10 + 0,05 × NP até a conta ser refeita para esses NP.

### Criar uma criatura

1. NP, Tipo E e categoria (lacaio, comum, chefe de grupo, chefe solo); copie do Guia o PV, as defesas, os testes e o
   Ódio do NP.
2. O ataque principal com o **dano da tabela** (o do Guia já está nela). Lacaio: o mesmo dano, metade do PV, testes
   fixos. Chefe de grupo: o mesmo dano, PV × 2, Destino de 3 a 6, "(Menor): +5 de dano" e "[Destino 1]: área".
   Chefe solo: o mesmo dano, PV × 4, um ataque em área e a Couraça (livra-se de Estados Negativos no Encerramento).
3. **O que a criatura faz além do dano** pesa como dano: um estado que tira o turno ([Paralisado], [Petrificado],
   engolir), um estado de dano por rodada, uma invocação, [Intangível], uma aura de [Fortalecido]. Quanto mais disso,
   **menos dano bruto** (o simulador só conta os estados de dano e o que tira o turno; o resto fica a seu juízo).
4. Teste: ponha a ficha no compêndio `bestiary` (pasta O Império), rode `node monsters.js` e `node calib.js` no
   simulador; a linha da criatura mostra quanto o grupo perde no encontro dela (4 dela, 6 se lacaio, ela + 2 comuns se
   chefe de grupo, sozinha se chefe solo). **Do alvo a alvo + 10 pontos** está bom. Muito acima, ela conta como mais de
   um comum: anote quantas cabem num encontro (`node weights.js`).

### O Império na 0.42

O bestiário foi desenhado acima do Guia: metade das comuns já passava muito do alvo em 4 delas. Elas ficaram como
estavam (só o dano subiu nesta versão), e a coluna "Quantas no alvo" diz quantas usar num encontro de 4 personagens
para ficar no alvo. As 17 abaixo do alvo ganharam dano (o fator no dano médio de todos os ataques e no bônus do
"(Menor)"; curas e estados ficaram iguais), no máximo ×2: mais que isso muda o que a criatura é. O Necromante Renegado e
o Espectro do Inverno ficam abaixo do alvo mesmo com ×2, porque o perigo deles está no que a conta não pega (os
mortos que o Necromante levanta e a [Névoa de Cinza]; a aura de [Congelando] e o [Intangível] do Espectro).

| NP | Criatura | Tipo | Fator no dano | Encontro dela (antes → agora) | Quantas no alvo |
|---|---|---|---|---|---|
| 1 | Estirge | lacaio | — | 6 dela: 94% → 95% | 4 |
| 1 | Kobold Batedor | lacaio | — | 6 dela: 80% → 78% | 5 |
| 1 | Zumbi Cambaleante | lacaio | ×1,19 | 6 dela: 47% → 66% | 6 |
| 2 | Carniçal | comum | — | 4 dela: 98% → 99% | 3 |
| 2 | Cocatriz | comum | — | 4 dela: 99% → 99% | 3 |
| 2 | Geleia Ocre | comum | — | 4 dela: 92% → 91% | 3 |
| 2 | Gnoll Saqueador | comum | — | 4 dela: 99% → 99% | 2 |
| 2 | Kobold Glutão | comum | — | 4 dela: 96% → 96% | 3 |
| 2 | Lobo Atroz | comum | — | 4 dela: 99% → 98% | 3 |
| 3 | Cão Intermitente | comum | — | 4 dela: 98% → 98% | 3 |
| 3 | Contrabandista | comum | ×1,50 | 4 dela: 41% → 69% | 4 |
| 3 | Harpia | comum | ×1,37 | 4 dela: 35% → 71% | 4 |
| 3 | Javali Atroz | comum | — | 4 dela: 85% → 87% | 3 |
| 3 | Mímico | comum | — | 4 dela: 83% → 82% | 3 |
| 3 | Monstro da Ferrugem | comum | — | 4 dela: 80% → 79% | 4 |
| 3 | Orc Guerreiro | comum | — | 4 dela: 81% → 83% | 3 |
| 3 | Senhor Kobold | chefe de grupo | — | ele + 2 comuns: 88% → 89% | — |
| 3 | Sombra | comum | — | 4 dela: 72% → 72% | 4 |
| 4 | Aranha-Alçapão | comum | — | 4 dela: 86% → 87% | 3 |
| 4 | Bugbear Emboscador | comum | — | 4 dela: 92% → 92% | 3 |
| 4 | Cubo Gelatinoso | comum | — | 4 dela: 98% → 98% | 3 |
| 4 | Doppelganger | comum | — | 4 dela: 77% → 76% | 4 |
| 4 | Gárgula | comum | — | 4 dela: 94% → 94% | 3 |
| 4 | Velha Cicatriz | chefe de grupo | ×1,21 | ela + 2 comuns: 58% → 70% | — |
| 5 | Aranha de Fase | comum | — | 4 dela: 93% → 93% | 3 |
| 5 | Basilisco | comum | ×1,18 | 4 dela: 36% → 74% | 4 |
| 5 | Capitão Contrabandista | chefe de grupo | ×1,74 | ele + 2 comuns: 38% → 73% | — |
| 5 | Goblin Saqueador | lacaio | — | 6 dela: 97% → 97% | 4 |
| 5 | Javali Gigante | comum | ×1,10 | 4 dela: 57% → 73% | 4 |
| 5 | Lagarto-Lanterna | comum | — | 4 dela: 98% → 98% | 3 |
| 5 | Necromante Renegado | chefe de grupo | ×2,00 | ele + 2 comuns: 30% → 54% | — |
| 6 | Arbusto Errante | chefe de grupo | ×1,14 | ele + 2 comuns: 60% → 71% | — |
| 6 | Goblin Piromaníaco | comum | — | 4 dela: 98% → 98% | 3 |
| 6 | Golem de Carne | chefe solo | ×1,76 | sozinho: 24% → 72% | — |
| 6 | Ogro de Cabeça de Lobo | chefe de grupo | — | ele + 2 comuns: 78% → 76% | — |
| 6 | Revenante | comum | — | 4 dela: 96% → 95% | 3 |
| 6 | Tropa Goblin | comum | — | 4 dela: 100% → 100% | 2 |
| 6 | Worg | comum | — | 4 dela: 75% → 76% | 4 |
| 7 | Chefe Goblin | chefe de grupo | — | ele + 2 comuns: 73% → 73% | — |
| 7 | Espectro do Inverno | chefe solo | ×2,00 | sozinho: 18% → 52% | — |
| 7 | Fantasma | chefe de grupo | — | ele + 2 comuns: 93% → 94% | — |
| 7 | Hidra do Pântano | chefe solo | ×1,21 | sozinha: 60% → 76% | — |
| 7 | Kobold Sentinela | comum | ×1,05 | 4 dela: 64% → 76% | 4 |
| 7 | Santo Partido | chefe de grupo | — | ele + 2 comuns: 89% → 89% | — |
| 8 | Demônio das Sombras | chefe solo | ×1,41 | sozinho: 49% → 77% | — |
| 8 | Meio-Dragão Ardente | chefe de grupo | — | ele + 2 comuns: 90% → 90% | — |
| 8 | Uivo Violeta | chefe de grupo | ×1,47 | ele + 2 comuns: 55% → 74% | — |
| 9 | Homem-Tigre | chefe solo | ×1,60 | sozinho: 37% → 79% | — |
| 9 | Serafim Errante | chefe solo | ×2,00 | sozinho: 25% → 76% | — |

"Quantas no alvo" é o maior número delas que fica até o alvo + 10 pontos. A migração `bestiary` (versão 2) leva o dano
novo às criaturas que já estão nos mundos.

## 8. Como refazer as contas

O simulador fica em `Desktop/Daggerheart/Eternia-Balanceamento/simulador` (Node, sem dependências) e lê o compêndio
deste repositório (`src/packs`). Depois de mudar uma regra:

```
node skills.js && node items.js && node monsters.js   # o compêndio em tabelas
node final2.js        # as 14 classes contra a régua (seção 3): report-classes-final.json
node races-final.js   # o valor das raças (seção 6)
node magias-score.js && node tabu.js                  # as Magias e os Tabus (seção 5)
node calib.js         # cada criatura do Império no encontro dela, e o fator que a leva ao alvo (seção 7)
node weights.js       # quantas de cada comum cabem no alvo
node calib-guide4.js && node doc-table.js             # a tabela do comum por NP (seção 7)
```

`guide-original.json` é o Guia com o dano de antes da 0.42: a tabela da seção 7 parte dele, então não refaça o
`guide.json` a partir do Guia novo. O `party-mc.js` guarda o valor de cada classe por NP em `class-values.json`:
apague esse arquivo depois de mudar uma classe. As classes ficam em `classes-final.js` (uma política por Caminho, a regra de
cada Motor reescrita em JavaScript) e os encontros em `party-mc.js` (o grupo de 4, o Ódio, as áreas, o Destino e as
regras dos monstros).

**O que a conta não pega:** controle e posição ([Lento], [Enraizado], [Derrubado], quem fica na frente), invocações,
[Intangível], curas no meio da luta, itens de Aincrad e raros, profissões e Talentos Gerais, e a escolha do Mestre de
quem atacar (a conta põe 75% dos golpes no Topo de Ódio). As porcentagens são a média de muitas lutas; uma luta de mesa
pode sair muito acima ou abaixo.
