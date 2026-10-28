# A matemática da Eternia

Este documento é a régua do sistema. Toda classe, Magia, habilidade de raça ou criatura nova é medida contra ele antes
de entrar no compêndio: os números de cada seção são os que as 14 classes, as 97 Magias, as 8 raças e as 104 criaturas
do bestiário seguem (as 52 do Império desde a 0.42, as 52 de Norlangarth desde a 0.47). As contas vêm de um simulador (Monte Carlo de lutas, com os dados e as regras de
`module/helpers/combat-cards.mjs`), em `Desktop/Daggerheart/Eternia-Balanceamento/simulador` (fora do repositório; a
seção 8 diz como rodar). Desde a 0.48, a seção 9 faz o mesmo com a economia: o preço de cada item, o que cada criatura
deixa e as recompensas das missões saem de um modelo só, medido no mesmo simulador. Onde este documento e uma regra do
compêndio discordarem, vale a regra, e o documento está desatualizado.

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

### Norlangarth na 0.47

As 52 criaturas novas de NP 1 a 3 (as florestas, as aldeias, as minas, os lagos, as Montanhas do Fim, as catacumbas e a Cova
do Norte) partiram do Guia (o PV, as defesas e os testes do Tipo E) e tiveram o dano calibrado no simulador: `calib-new.js`
mede cada uma no encontro dela e `tune-new.js` acha o fator no dano dos ataques e do (Menor) que a leva ao alvo (as auras
do Encerramento ficam como foram desenhadas). Quem tem o que o simulador não conta (multiplicar-se, chamar outros, cópias,
[Intangível], maldições, comer o equipamento, ossos que remontam, auras de controle, disfarce) ficou **abaixo** do alvo
de propósito, pela regra do item 3 de "Criar uma criatura"; a última coluna diz o quê. A coluna "Por encontro" é quantas
cabem no alvo + 10 num grupo de 4 (a conta do `weights.js`): as novas foram feitas para o encontro padrão, 4 comuns ou 6
lacaios.

| NP | Criatura | Tipo | Encontro dela | Por encontro | O que a conta não pega (e a deixa abaixo) |
|---|---|---|---|---|---|
| 1 | Batedor do Grisu | lacaio | 6 dela: 67% | 6 | os Pavios que somam |
| 1 | Besouro-Moeda | lacaio | 6 dela: 69% | 6 | o disfarce de tesouro |
| 1 | Boneco de Neve Vivo | comum | 4 dela: 70% | 4 | o [Congelando] que paralisa, a neve que explode |
| 1 | Caveira Errante | lacaio | 6 dela: 60% | 6 | o [Desarmado] |
| 1 | Coelho-Chifrudo | lacaio | 6 dela: 58% | 6 | a Ninhada (mais coelhos a cada rodada sem ferimento) |
| 1 | Corvos Ladrões | comum | 2 dela: 74% | 2 | tropa: conta como 2 comuns; foge na metade dos PV |
| 1 | Cão da Estrada | comum | 4 dela: 71% | 4 | o avanço de graça, +8 contra quem caiu |
| 1 | Diabrete do Azar | lacaio | 6 dela: 60% | 6 | a aura de [Presunçoso] |
| 1 | Duende do Avesso | comum | 4 dela: 59% | 4 | o dano físico o cura |
| 1 | Espantalho Vivo | comum | 4 dela: 58% | 4 | o olhar ([Medo], [Paralisado]), o disfarce |
| 1 | Estalactite Viva | lacaio | 6 dela: 67% | 6 | o disfarce no teto |
| 1 | Floco-Vivo | lacaio | 6 dela: 9% | à vontade | inofensivo: o perigo é o Guardião do Inverno que ele chama |
| 1 | Graveto-Praga | lacaio | 6 dela: 64% | 6 | o disfarce, o fogo que não pega |
| 1 | Lagartixa-Tesouro | comum | 4 dela: 17% | à vontade | evento de tesouro: foge na 3ª rodada |
| 1 | Morcego-de-Gelo | lacaio | 6 dela: 63% | 6 | o [Congelando] que paralisa |
| 1 | Mão-de-Lodo | comum | 4 dela: 65% | 4 | começa [Oculta]; [Agarrado] e [Nadando] |
| 1 | Nepente Faminta | comum | 4 dela: 58% | 4 | o Fruto chama 1d2 nepentes |
| 1 | Nepente-Mãe | chefe de grupo | ele + 2 comuns: 79% | — | o encanto que puxa, as filhas que chama |
| 1 | Raposa-das-Neves | comum | 4 dela: 60% | 4 | as cópias ([Clones]) |
| 1 | Ratazana do Celeiro | lacaio | 6 dela: 68% | 6 | o [Contágio] que passa adiante |
| 1 | Rei dos Ratos | chefe de grupo | ele + 2 comuns: 80% | — | as ratazanas que se soltam |
| 1 | Sapo-Boca-de-Poço | comum | 4 dela: 62% | 4 | engolir (tira um personagem da luta) |
| 2 | Aranha-Isca | comum | 4 dela: 63% | 4 | a isca disfarçada, o encanto que puxa |
| 2 | Armadura-Colônia | comum | 4 dela: 63% | 4 | metade do dano de [Lâmina] e [Contundente] |
| 2 | Ceifeira do Meio-Dia | chefe de grupo | ele + 2 comuns: 84% | — | o Decreto da Fé |
| 2 | Criança-Fardo | comum | 4 dela: 64% | 4 | o peso ([Lento], [Enraizado], [Derrubado]) |
| 2 | Cão da Maldição | comum | 4 dela: 57% | 4 | a [Sentença: 3] que só sai com a morte daquele cão |
| 2 | Devorador de Escudos | comum | 4 dela: 63% | 4 | engole o escudo ou a armadura |
| 2 | Fogo-Fátuo | comum | 4 dela: 60% | 4 | [Intangível], o encanto que puxa, o Último Suspiro |
| 2 | Kappa | comum | 4 dela: 71% | 4 | fica fraco quando derrubado (a conta não dá esse desconto) |
| 2 | Lasca-Sussurrante | lacaio | 6 dela: 56% | 6 | a magia a divide; estoura ao cair |
| 2 | Muda do Giga Cedro | comum | 4 dela: 71% | 4 | imune a fogo, Anulação 4, a cura das raízes |
| 2 | Mão do Teto | comum | 4 dela: 71% | 4 | começa [Oculta]; separa o grupo |
| 2 | Pisadeira | comum | 4 dela: 68% | 4 | o [Adormecido] e +10 contra quem dorme |
| 2 | Rasura | comum | 4 dela: 67% | 4 | a forma que muda (Anulação, [Espelho], [Regeneração]…) |
| 2 | Serpente de Presas Azuis | chefe de grupo | ele + 2 comuns: 85% | — | o abraço que suga 6 PV por rodada |
| 3 | Boca-Balbuciante | comum | 4 dela: 67% | 4 | a aura de [Confuso] |
| 3 | Bocarra Pútrida | comum | 4 dela: 70% | 4 | o estado ao acaso do hálito |
| 3 | Boitatá | chefe de grupo | ele + 2 comuns: 85% | — | o olhar, o fogo de quem a golpeia |
| 3 | Cavalo-d'Água | comum | 4 dela: 68% | 4 | engolir, o disfarce, a crina que cola |
| 3 | Caveira Flamejante | comum | 4 dela: 68% | 4 | volta das cinzas uma vez |
| 3 | Cervo do Inverno | comum | 4 dela: 68% | 4 | pode ser poupado; o [Maldito] ao morrer |
| 3 | Coisa-Sem-Nome | comum | 4 dela: 65% | 4 | cresce quando identificada |
| 3 | Cão de Ossos de Dragão | comum | 4 dela: 60% | 4 | remonta duas vezes (menos contra [Contundente] e [Radiância]) |
| 3 | Draugr do Túmulo | chefe de grupo | ele + 2 comuns: 84% | — | crescer, erguer os caídos |
| 3 | Estátua Sentinela | lacaio | 6 dela: 62% | 6 | metade do dano físico; prende a arma ao cair |
| 3 | Gorro-Vermelho | comum | 4 dela: 74% | 4 | a cura pelo golpe; a sede pode matá-lo |
| 3 | Guardião do Inverno | chefe solo | sozinho: 74% | — | poupa e vai embora quando todos se curvam |
| 3 | Juiz de Pedra | chefe de grupo | ele + 2 comuns: 81% | — | o Decreto da Fé, a reverência, as estátuas |
| 3 | Névoa-Mentirosa | comum | 4 dela: 67% | 4 | a névoa que deixa todos [Ocultos], o encanto |
| 3 | Reflexo de Gelo | comum | 4 dela: 67% | 4 | o [Espelho: 5], copiar o rosto |
| 3 | Verme de Gelo | comum | 4 dela: 63% | 4 | a explosão de gelo ao cair |

O simulador ganhou três coisas na 0.47: os ataques com limite "n/Cena" (a Queda do Teto) só são usados n vezes por luta,
o [Pavio] e o [Contágio] contam como dano por rodada (1 e 3 rodadas), e o `pulseK` deixa uma aura de Encerramento fora do
fator. O Floco-Vivo e a Lagartixa-Tesouro não foram calibrados: um é inofensivo e chama o Guardião do Inverno (chefe solo
de NP 3) quando o primeiro cai, o outro é um evento de tesouro.

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
node calib-new.js     # as criaturas de Norlangarth (0.47) no encontro delas, contra a faixa
node tune-new.js      # o fator de dano que leva cada uma ao alvo dela (tune-new.json; apply-tune.py o aplica nos lotes)
node calib-guide4.js && node doc-table.js             # a tabela do comum por NP (seção 7)
node economia-precos.mjs   # o preço de cada item pelo modelo (seção 9): economia-precos.json
node economia-drops.mjs    # o que cada criatura deixa pelo modelo: economia-drops.json
node economia-mc.mjs       # as simulações da economia (Monte Carlo, Anima-mundi, equipamento, missões, sessões)
node economia-equip.js     # o equipamento atrasado nos encontros (0 a 3 níveis): economia-equip.json
node economia-doc.mjs > economia-doc.md                # as tabelas da seção 9
node economia-aplicar.mjs  # escreve preços, drops e textos no compêndio (--dry para ensaiar)
```

Os números da economia ficam em `module/economy/data.mjs` (o comum, o Anima-mundi, o [Material-Base], a Quintessência,
o fator dos itens, o começo, a venda, as missões, o Retoque, a Proposta e a Coleta): os scripts `economia-*` leem esse
arquivo, então mudar um número lá e rodar `economia-aplicar.mjs` muda o sistema e as tabelas juntos. A base deles é
`economia-base.json` (os preços do livro e os drops da 0.47, guardados antes da 0.48): não rode `economia-base.mjs` de novo.

`guide-original.json` é o Guia com o dano de antes da 0.42: a tabela da seção 7 parte dele, então não refaça o
`guide.json` a partir do Guia novo. O `party-mc.js` guarda o valor de cada classe por NP em `class-values.json`:
apague esse arquivo depois de mudar uma classe. As classes ficam em `classes-final.js` (uma política por Caminho, a regra de
cada Motor reescrita em JavaScript) e os encontros em `party-mc.js` (o grupo de 4, o Ódio, as áreas, o Destino e as
regras dos monstros).

**O que a conta não pega:** controle e posição ([Lento], [Enraizado], [Derrubado], quem fica na frente), invocações,
[Intangível], curas no meio da luta, itens de Aincrad e raros, profissões e Talentos Gerais, e a escolha do Mestre de
quem atacar (a conta põe 75% dos golpes no Topo de Ódio). As porcentagens são a média de muitas lutas; uma luta de mesa
pode sair muito acima ou abaixo.

## 9. A economia

A moeda é o **Yuld** (desde a 0.48; nos dados continua o campo do ouro: `system.inventory.gold` do personagem,
`system.gold` da pilha, `gold` da linha de drop). Os números ficam em `module/economy/data.mjs` e saem de um modelo
com uma unidade só, o **comum**: o que um inimigo comum deixa, em média, no NP dele. A âncora é do usuário: **um
Anima-mundi de nível 1 se compra com o que 2 monstros de NP 1 deixam.**

### O modelo

- **O comum:** (3 × NP² + 13 × NP + 84) ÷ 4 Yuld (25 no NP 1, 129 no NP 10). É a curva do "Valor Esperado dos Itens
  Deixados" do Guia de Criação de Inimigos (23 a 120 G), posta em 25 no NP 1 para a âncora fechar em 50.
- **O encontro vale 4 comuns, seja quem for que o encha** (XIV.g): um comum vale 1 encontro ÷ 4, um lacaio ÷ 6, uma
  criatura mais forte ÷ quantas dela fazem um encontro (as de "3 por encontro", 4/3 de comum; a tropa que conta como 2
  comuns, 2). Antes, o lacaio valia 1/4 de comum: 6 lacaios rendiam 37% de 4 comuns pelo mesmo perigo.
- **O chefe segue o Guia de Criação de Inimigos (Passo 6):** 4 comuns no 1d6 (6 no chefe solo, que é o encontro inteiro),
  mais um Anima-mundi do NP + 1 e um [Material-Base] do NP, fixos. A Fenda paga a cena (as levas não deixam nada): 1
  encontro a Pequena, 2 a Grande, 3 a Fenda-mãe. A Lagartixa-Tesouro deixa o que um chefe deixa; o Floco-Vivo, um comum.
- **O Anima-mundi de nível N custa (2 + 0,1 × (N − 1)) comuns do NP N:** 50 Yuld no nível 1 (a âncora) e 370 no 10. O
  peso sobe devagar: no próprio NP, o Anima-mundi custa 2 comuns no NP 1 e 2,9 no NP 10. O [Material-Base] de nível N vale
  1,5 comum do NP N; a Quintessência, três Anima-mundi 10 (1.110 Yuld).
- **Os itens custam o preço do livro (Log Horizon, em G) × 2.** Cada categoria tem o seu peso em comuns do nível do item
  (a tabela abaixo) e cada item, a sua força dentro da categoria, que é a do livro (os preços do livro são quase
  proporcionais ao comum do nível em todas as categorias; o que fica a mais de 6 vezes ou a menos de 1/10 da curva da
  categoria é puxado para ela, e só a Máscara caiu nisso). Os itens nomeados com receita custam a receita: o
  [Material-Base] do nível, a base pelo preço novo, os Anima-mundi do nível pelo preço do modelo (os de nível acima de 10,
  pela mesma fórmula) e o Custo de Fabricação na mesma proporção de antes. O Anima-mundi subiu mais que os itens (×3,33 contra
  ×2): ele ficou mais caro em relação ao equipamento do que era no livro, e a Oficina custa mais.
- **Por que ×2 e não ×10/3 nos itens:** com tudo a ×10/3 (a taxa da âncora), os drops pagariam 1/6 do que manter o
  equipamento do balanço custa, e farmar deixaria de ser caminho (com o triplo de lutas, o grupo ainda ficaria 5 níveis
  atrás no NP 10; tabela abaixo). Com ×2, só os encontros deixam o grupo para trás, farmar o triplo quase acompanha e a
  missão padrão de 12 comuns acompanha. A alternativa fica nas tabelas, para o caso de querer mais difícil: subir
  `PRICE_RATE` para 10/3 pede a missão padrão em 20 comuns.
- **O começo:** 700 Yuld (antes 350 de ouro), o preço do kit mais caro de uma classe (`KITS`, o do Centurião).
- **A venda (AS REGRAS V.e):** os tesouros ([Valioso], [Material-Base]) pelo preço cheio; os itens mágicos ([M1] a [M7]),
  o Anima-mundi e a Quintessência pela metade; o resto (equipamento usado, consumíveis) por 1/10 ou pela porcentagem da
  loja (`sellMultiplier`, agora 10% por padrão). O Anima-mundi sem o Selo do Anima (`flags.eternia.unsealed`: o da
  Coleta e as partes de monstro que o texto diz "sem o Selo") serve na Oficina e nenhuma loja compra. O Mercador vende o
  resto pelo cheio. Antes, o código vendia tudo pela metade nas lojas, até os [Valioso] que AS REGRAS mandavam vender
  pelo cheio.
- **As missões (AS REGRAS V.e):** a recompensa de cada personagem, em comuns do NP: pequena 4, padrão 12, grande 24,
  épica 48. A padrão é uma para cada NP que o grupo sobe.
- **As profissões:** a Coleta acha Anima-mundi até o NP do personagem (antes, um Coletor de Rank 1 achava o de nível 6 no
  NP 1) e sem o Selo; o Retoque custa 2 Anima-mundi do nível do item, dobrando a cada retoque (antes, 100 G em qualquer
  nível). Sem isso, um Coletor de Rank 5 vendendo o que acha dobrava a renda do grupo.
- **Os monstros que mexem na bolsa:** a Mão Leve rouba o dobro de antes (os preços dobraram); a Proposta oferece a
  metade do que o monstro deixa (2d6 × 35 no Capitão Contrabandista, contra os 479 Yuld dele), para a escolha pesar.

| NP | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Um comum deixa | 25 | 31 | 38 | 46 | 56 | 68 | 81 | 95 | 111 | 129 |
| Um encontro padrão | 100 | 122 | 150 | 184 | 224 | 270 | 322 | 380 | 444 | 514 |
| Um lacaio (÷ 6) | 17 | 20 | 25 | 31 | 37 | 45 | 54 | 63 | 74 | 86 |
| Um chefe | 205 | 252 | 310 | 389 | 479 | 580 | 702 | 835 | 979 | 1.079 |
| Um chefe solo | 255 | 313 | 385 | 481 | 591 | 715 | 863 | 1.025 | 1.201 | 1.336 |

### O Anima-mundi: quantos comuns de cada NP pagam um

O número é o modelo (o preço ÷ o comum do NP); entre parênteses, a média e o p90 de lutas até a bolsa pagar, num Monte
Carlo de 2.000 corridas com os comuns do bestiário daquele NP vendendo o que deixam (do NP 8 em diante o bestiário ainda
não tem comuns). A média passa do modelo porque a bolsa passa do preço na última luta (um Anima-mundi 1 pede 2 comuns de
valor, e na mesa sai entre 2 e 4 lutas, 2,7 em média), e no NP 5 porque três comuns de lá deixam Anima-mundi sem selo, que
serve na Oficina mas não vira Yuld.

| Anima-mundi | Preço (antes) | NP 1 | NP 2 | NP 3 | NP 4 | NP 5 | NP 6 | NP 7 | NP 8 | NP 9 | NP 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 50 (15 G) | 2 (2,7/4) | 1,6 (2,2/4) | 1,3 (2,1/3) | 1,1 (1,5/2) | 0,9 (2,1/3) | 0,7 (1,5/2) | 0,6 (1/1) | 0,5 | 0,5 | 0,4 |
| 2 | 65 (20 G) | 2,6 (3,3/4) | 2,1 (2,8/4) | 1,7 (2,5/3) | 1,4 (2,1/3) | 1,2 (2,6/4) | 1 (1,5/2) | 0,8 (1,5/2) | 0,7 | 0,6 | 0,5 |
| 3 | 85 (25 G) | 3,4 (4/6) | 2,8 (3,4/4) | 2,3 (2,9/4) | 1,8 (2,5/4) | 1,5 (3/5) | 1,3 (1,8/2) | 1,1 (1,7/2) | 0,9 | 0,8 | 0,7 |
| 4 | 105 (30 G) | 4,2 (4,7/6) | 3,4 (4/6) | 2,8 (3,5/5) | 2,3 (2,7/4) | 1,9 (3,6/5) | 1,6 (2,1/3) | 1,3 (1,8/2) | 1,1 | 0,9 | 0,8 |
| 5 | 135 (40 G) | 5,4 (6/8) | 4,4 (5/6) | 3,6 (4,4/6) | 2,9 (3,3/4) | 2,4 (4,4/6) | 2 (2,7/4) | 1,7 (2,1/3) | 1,4 | 1,2 | 1,1 |
| 6 | 170 (50 G) | 6,8 (7,5/9) | 5,6 (6,2/8) | 4,5 (5,3/7) | 3,7 (4,5/6) | 3 (5,2/8) | 2,5 (3/4) | 2,1 (2,7/3) | 1,8 | 1,5 | 1,3 |
| 7 | 210 (60 G) | 8,4 (9/11) | 6,9 (7,5/9) | 5,6 (6,4/8) | 4,6 (5,1/6) | 3,8 (6,3/9) | 3,1 (3,8/5) | 2,6 (3,2/4) | 2,2 | 1,9 | 1,6 |
| 8 | 260 (70 G) | 10,4 (10,9/14) | 8,5 (9/11) | 6,9 (7,8/10) | 5,7 (6,3/8) | 4,6 (7,6/10) | 3,9 (4,5/6) | 3,2 (3,8/5) | 2,7 | 2,3 | 2 |
| 9 | 310 (90 G) | 12,4 (13,1/16) | 10,2 (10,7/13) | 8,3 (9,2/11) | 6,7 (7,4/9) | 5,5 (8,9/12) | 4,6 (5,2/7) | 3,9 (4,4/5) | 3,3 | 2,8 | 2,4 |
| 10 | 370 (110 G) | 14,8 (15,3/18) | 12,1 (12,8/15) | 9,9 (10,9/13) | 8 (8,7/10) | 6,6 (10,4/13) | 5,5 (6/8) | 4,6 (5,2/6) | 3,9 | 3,3 | 2,9 |

### Os preços por categoria (em comuns do nível do item, e a mediana em Yuld)

| Categoria | Itens | Comuns do nível | Nv 1 | Nv 5 | Nv 10 | Nv 20 | Nv 30 |
|---|---|---|---|---|---|---|---|
| Arma de duas mãos | 48 | 7,5 | 200 | 340 | 760 | 2.800 | 6.800 |
| Arma de duas mãos [M4-6] | 30 | 26,7 | 940 | 1.350 | 3.550 | 9.950 | — |
| Arma de duas mãos [M7] | 4 | 41,3 | — | — | — | — | 32.800 |
| Arma de uma mão | 73 | 4,8 | 140 | 240 | 540 | 2.000 | 4.800 |
| Arma de uma mão [M4-6] | 51 | 22 | 690 | 860 | 2.800 | 7.450 | — |
| Arma de uma mão [M7] | 12 | 41,3 | — | — | — | — | 32.800 |
| Arco e besta | 20 | 8,5 | 240 | 460 | 960 | 3.600 | 8.800 |
| Arco e besta [M4-6] | 11 | 27,1 | 730 | 1.740 | 3.550 | 14.100 | — |
| Arco e besta [M7] | 3 | 41,3 | — | — | — | — | 32.800 |
| Cajado de duas mãos | 8 | 8 | 220 | 360 | 800 | 2.800 | 7.000 |
| Cajado de duas mãos [M4-6] | 5 | 26,8 | 720 | 1.140 | 4.500 | — | — |
| Cajado de duas mãos [M7] | 1 | 40,9 | — | — | — | — | 28.600 |
| Cajado de uma mão | 9 | 7,2 | 240 | 280 | 900 | 2.800 | 6.800 |
| Cajado de uma mão [M4-6] | 5 | 26,5 | 700 | 1.560 | 4.650 | 9.650 | — |
| Arma de arremesso | 9 | 4,6 | 120 | 200 | 460 | 1.720 | 4.000 |
| Arma de arremesso [M4-6] | 7 | 22,2 | 580 | 720 | 2.000 | — | — |
| Arma de arremesso [M7] | 1 | 40,3 | — | — | — | — | — |
| Instrumento | 7 | 4,2 | 120 | 220 | 560 | 1.800 | 3.400 |
| Instrumento [M4-6] | 4 | 22,4 | 840 | 840 | 3.200 | 13.550 | — |
| Armadura pesada | 16 | 9,5 | 280 | 420 | 1.060 | 3.800 | 9.400 |
| Armadura pesada [M4-6] | 8 | 32,5 | — | 1.820 | 3.750 | 10.450 | — |
| Armadura pesada [M7] | 1 | 41,3 | — | — | — | — | 32.800 |
| Armadura média | 16 | 8,8 | 240 | 240 | 1.400 | 3.400 | 8.600 |
| Armadura média [M4-6] | 10 | 26,4 | 810 | 1.280 | 3.200 | — | — |
| Armadura leve | 21 | 7,9 | 140 | 500 | 1.000 | 3.400 | 8.400 |
| Armadura leve [M4-6] | 12 | 23,9 | 840 | 1.460 | 4.050 | 5.900 | — |
| Escudo | 10 | 4 | 140 | 200 | 640 | 1.480 | — |
| Escudo [M4-6] | 6 | 23,4 | 500 | 1.580 | 2.300 | 12.600 | — |
| Acessório | 121 | 4,4 | 100 | 240 | 720 | 2.200 | 3.600 |
| Acessório [M4-6] | 53 | 20,6 | 610 | 1.180 | 2.800 | 11.400 | — |
| Bolsa | 23 | 4 | 100 | 180 | 560 | 1.640 | 3.200 |
| Bolsa [M4-6] | 7 | 24,8 | 930 | 1.450 | 2.650 | 15.700 | — |
| Poção | 54 | 3,3 | 40 | 380 | 380 | 1.580 | — |
| Poção [M4-6] | 4 | 21,1 | — | 1.700 | 2.250 | — | — |
| Remédio | 5 | 2,1 | 80 | 80 | — | — | — |
| Pergaminho | 60 | 3,1 | 80 | 140 | 420 | 1.140 | 2.400 |
| Pergaminho [M4-6] | 4 | 19 | 360 | 1.530 | — | — | — |
| Comida | 24 | 2,3 | 40 | 140 | 300 | 920 | 1.880 |
| Comida [M4-6] | 6 | 21,1 | 790 | 1.390 | 1.760 | 9.250 | — |
| Toxina | 49 | 2,3 | 60 | 120 | 280 | 1.160 | 2.100 |
| Amuleto | 44 | 3,6 | 90 | 140 | 460 | 1.500 | 2.800 |
| Gema | 17 | 3,2 | 80 | 160 | 480 | 1.580 | — |
| Engenhoca | 12 | 2,4 | 80 | — | 400 | 1.000 | — |
| Canção | 12 | 2,7 | 80 | — | 400 | 1.000 | — |
| Invocação | 7 | 5,3 | 180 | 360 | 620 | — | — |
| Invocação [M1-3] | 18 | 5,4 | 120 | 180 | 720 | 2.400 | — |
| Diversos | 7 | 1,6 | 40 | 140 | — | — | — |
| Anima-mundi | 10 | 2,5 | 65 | 135 | 310 | — | — |

### As missões (Yuld para cada personagem)

| Missão | Comuns | NP 1 | NP 2 | NP 3 | NP 4 | NP 5 | NP 6 | NP 7 | NP 8 | NP 9 | NP 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Pequena | 4 | 100 | 120 | 150 | 185 | 220 | 270 | 320 | 380 | 440 | 510 |
| Padrão | 12 | 300 | 370 | 450 | 550 | 670 | 810 | 970 | 1.140 | 1.330 | 1.540 |
| Grande | 24 | 600 | 730 | 900 | 1.100 | 1.340 | 1.620 | 1.930 | 2.300 | 2.650 | 3.100 |
| Épica | 48 | 1.200 | 1.460 | 1.800 | 2.200 | 2.700 | 3.250 | 3.850 | 4.550 | 5.350 | 6.150 |

### As simulações

**1. Monte Carlo dos drops.** Cada criatura do bestiário rolada 20.000 vezes com a tabela nova e com a de antes; os
encontros sorteados entre as criaturas do NP (4 comuns, ou os que pesam o mesmo; 6 lacaios; um chefe e 2 comuns; o chefe
solo). "Vendido" é o que o grupo recebe vendendo tudo pelas regras de venda; antes, as lojas pagavam a metade.

| NP | Modelo | 4 comuns | 6 lacaios | Chefe + 2 | Chefe solo |
|---|---|---|---|---|---|
| 1 | 100 | 102 · 102 (p10 70, p90 142); antes 84 · 42 | 108 · 108 (p10 98, p90 118); antes 35 · 19 | 257 · 224 (p10 186, p90 344); antes 175 · 88 | — |
| 2 | 122 | 136 · 136 (p10 91, p90 180); antes 109 · 55 | 120 · 120 (p10 120, p90 120); antes 42 · 21 | 321 · 278 (p10 249, p90 429); antes 233 · 117 | — |
| 3 | 150 | 163 · 146 (p10 106, p90 224); antes 140 · 72 | 150 · 150 (p10 150, p90 150); antes 54 · 27 | 389 · 318 (p10 293, p90 514); antes 300 · 151 | 386 · 334 (p10 280, p90 600); antes 226 · 113 |
| 4 | 184 | 202 · 190 (p10 135, p90 273); antes 146 · 78 | — | 505 · 430 (p10 414, p90 628); antes 317 · 161 | — |
| 5 | 224 | 262 · 176 (p10 160, p90 372); antes 200 · 100 | 336 · 336 (p10 308, p90 364); antes 78 · 60 | 614 · 441 (p10 499, p90 745); antes 465 · 248 | — |
| 6 | 270 | 311 · 311 (p10 228, p90 408); antes 205 · 119 | — | 747 · 597 (p10 630, p90 898); antes 547 · 298 | 715 · 554 (p10 560, p90 1.010); antes 438 · 219 |
| 7 | 322 | 322 · 322 (p10 252, p90 404); antes 297 · 162 | — | 861 · 685 (p10 743, p90 1.038); antes 657 · 353 | 866 · 685 (p10 658, p90 1.086); antes 501 · 268 |
| 8 | 380 | — | — | 838 · 663 (p10 703, p90 1.088); antes 544 · 283 | 1.020 · 820 (p10 775, p90 1.485); antes 584 · 313 |
| 9 | 444 | — | — | — | 1.193 · 956 (p10 917, p90 1.757); antes 690 · 369 |

**2. O que manter o equipamento custa.** O equipamento do balanço (seção 2: o melhor item comprável de nível até o NP) em
cinco kits (duas mãos, uma mão e escudo, cajado, arco, artes marciais); a troca é o que entra no NP seguinte, menos 1/10
do que sai. Uma sessão tem 2 encontros padrão e o clímax (um chefe e 2 comuns); cada personagem leva 1/4 e vende (o
Anima-mundi do chefe pela metade). Por NP, uma poção do nível e um acessório a cada 3 NP. "Falta" é o que os drops de uma
sessão não pagam.

| NP | Comum | Drops da sessão | Troca do equipamento no NP seguinte | Poção | Acessório (1 a cada 3 NP) | Falta | Falta em comuns | Missão padrão |
|---|---|---|---|---|---|---|---|---|
| 1 | 25 | 105 | 450 | 40 | 100 | 419 | 16,7 | 300 |
| 2 | 30,5 | 129 | 210 | 40 | 100 | 155 | 5,1 | 370 |
| 3 | 37,5 | 158 | 672 | 80 | 180 | 654 | 17,4 | 450 |
| 4 | 46 | 195 | 788 | 80 | 220 | 746 | 16,2 | 550 |
| 5 | 56 | 238 | 777 | 180 | 260 | 805 | 14,4 | 670 |
| 6 | 67,5 | 288 | 169 | 380 | 280 | 354 | 5,2 | 810 |
| 7 | 80,5 | 344 | 1.179 | 380 | 280 | 1.308 | 16,2 | 970 |
| 8 | 95 | 407 | 1.589 | 380 | 680 | 1.789 | 18,8 | 1.140 |
| 9 | 111 | 476 | 1.199 | 380 | 1.000 | 1.436 | 12,9 | 1.330 |
| 10 | 128,5 | 544 | 0 | 380 | 740 | 82 | 0,6 | 1.540 |
| 11 | 147,5 | 618 | 1.300 | 380 | 740 | 1.309 | 8,9 | 1.770 |
| 12 | 168 | 697 | 1.031 | 520 | 740 | 1.101 | 6,6 | 2.000 |

**3. O atraso do equipamento.** Um personagem do NP 1 ao 20 que compra, NP a NP, a poção da sessão, a troca do
equipamento e um acessório a cada 3 NP, com o que cada cenário rende. O número é quantos níveis o equipamento dele fica
atrás do NP.

| Cenário | NP 2 | NP 4 | NP 6 | NP 8 | NP 10 | NP 15 | NP 20 |
|---|---|---|---|---|---|---|---|
| Só os 3 encontros da sessão, 1 NP por sessão | 0 | 1 | 3 | 5 | 7 | 10,8 | 12,6 |
| Só encontros, 2 sessões por NP | 0 | 1 | 2,4 | 4,4 | 5,8 | 7,8 | 8,6 |
| Farmando o dobro (6 encontros por NP) | 0 | 0,4 | 2 | 3,8 | 4 | 4,8 | 4,2 |
| Farmando o triplo (9 encontros por NP) | 0 | 0 | 1 | 1,2 | 1,8 | 0,8 | 0 |
| Meia missão padrão por NP | 0 | 0 | 1 | 1,2 | 1,8 | 0,8 | 0 |
| A missão padrão por NP | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Antes (0.47): só os drops, vendidos pela metade (o código) | 0 | 0,6 | 2,4 | 4,4 | 6,4 | 9,6 | 11,8 |
| Antes (0.47): só os drops, [Valioso] pelo cheio (AS REGRAS) | 0 | 0 | 0,6 | 1 | 1,8 | 1,2 | 0,8 |
| Alternativa (itens a 10/3): só os encontros | 0 | 1,2 | 3,2 | 5,2 | 7,2 | 12,2 | 16,2 |
| Alternativa: farmando o triplo | 0 | 1 | 2,4 | 4 | 5,2 | 6,8 | 6,6 |
| Alternativa: missão de 12 comuns | 0 | 0 | 1,2 | 1,4 | 1,8 | 1,4 | 0,8 |

A missão padrão que deixa o atraso em zero, em comuns por personagem por NP:

**4. Sessões para equipar um personagem.** A troca do equipamento do NP e o kit inteiro (o equipamento do balanço e três
acessórios do nível) do zero, em sessões só de drops, antes e agora, e com a missão padrão.

| NP | Troca do equipamento do NP | Sessões | Antes (G · sessões) | Kit inteiro do zero | Sessões | Antes | Com a missão |
|---|---|---|---|---|---|---|---|
| 2 | 450 | 3,5 | 134 · 2,3 | 816 | 6,3 | 7,1 | 1,6 |
| 3 | 210 | 1,3 | 38 · 0,5 | 964 | 6,1 | 6,6 | 1,6 |
| 4 | 672 | 3,4 | 257 · 2,9 | 1.400 | 7,2 | 7,9 | 1,9 |
| 5 | 788 | 3,3 | 257 · 2,3 | 1.692 | 7,1 | 7,7 | 1,9 |
| 6 | 777 | 2,7 | 246 · 1,9 | 1.888 | 6,6 | 7,1 | 1,7 |
| 7 | 169 | 0,5 | 62 · 0,4 | 1.956 | 5,7 | 6,2 | 1,5 |
| 8 | 1.179 | 2,9 | 395 · 2,1 | 3.460 | 8,5 | 9,3 | 2,2 |
| 9 | 1.589 | 3,3 | 557 · 2,6 | 4.940 | 10,4 | 11,3 | 2,7 |
| 10 | 1.199 | 2,2 | 341 · 1,4 | 4.196 | 7,7 | 8,4 | 2 |
| 15 | 2.260 | 2,3 | 850 · 1,9 | 6.564 | 6,8 | 7,4 | 1,7 |
| 20 | 0 | 0 | 0 · 0 | 17.848 | 11,6 | 12,8 | 2,9 |

**5. O equipamento atrasado nos encontros.** O encontro padrão de 4 comuns e o chefe com 2 comuns da seção 7, com o grupo
usando o equipamento de 0 a 3 níveis abaixo do NP (`economia-equip.js`, 60 lutas por grupo e célula). O encontro é
muito sensível ao equipamento: um nível atrás, ele sai de ~70% para ~85% dos PV, e o grupo inteiro cai em metade das lutas.
É por isso que a missão padrão foi medida para manter o equipamento no NP: a economia aperta nas compras de fora do
equipamento do balanço (acessórios, consumíveis, Anima-mundi, itens mágicos e a Oficina), não nele.

| NP | Atraso 0 | Atraso 1 | Atraso 2 | Atraso 3 |
|---|---|---|---|---|
| 1 | 64% (tpk 21%) · chefe 81% | 65% (tpk 20%) · chefe 81% | 65% (tpk 19%) · chefe 81% | 63% (tpk 19%) · chefe 83% |
| 2 | 69% (tpk 17%) · chefe 87% | 84% (tpk 48%) · chefe 94% | 85% (tpk 51%) · chefe 93% | 83% (tpk 49%) · chefe 93% |
| 3 | 70% (tpk 23%) · chefe 87% | 66% (tpk 16%) · chefe 86% | 82% (tpk 45%) · chefe 91% | 82% (tpk 45%) · chefe 90% |
| 4 | 71% (tpk 29%) · chefe 83% | 87% (tpk 59%) · chefe 91% | 85% (tpk 55%) · chefe 90% | 92% (tpk 75%) · chefe 93% |
| 5 | 69% (tpk 26%) · chefe 88% | 87% (tpk 61%) · chefe 94% | 94% (tpk 80%) · chefe 96% | 93% (tpk 78%) · chefe 97% |
| 6 | 72% (tpk 30%) · chefe 87% | 76% (tpk 39%) · chefe 87% | 88% (tpk 63%) · chefe 92% | 93% (tpk 78%) · chefe 96% |
| 7 | 72% (tpk 35%) · chefe 84% | 74% (tpk 39%) · chefe 84% | 74% (tpk 35%) · chefe 83% | 84% (tpk 56%) · chefe 89% |
| 8 | 79% (tpk 44%) · chefe 88% | 88% (tpk 65%) · chefe 94% | 87% (tpk 64%) · chefe 92% | 87% (tpk 61%) · chefe 94% |
| 9 | 76% (tpk 37%) · chefe 88% | 84% (tpk 55%) · chefe 91% | 90% (tpk 72%) · chefe 93% | 90% (tpk 70%) · chefe 94% |
| 10 | 78% (tpk 42%) · chefe 90% | 83% (tpk 51%) · chefe 91% | 88% (tpk 65%) · chefe 94% | 94% (tpk 82%) · chefe 96% |

### Os kits das classes

| Classe | Antes (G) | Agora (Yuld) |
|---|---|---|
| samurai | 335 | 670 |
| guardiao | 350 | 700 |
| berserker | 345 | 690 |
| monge | 315 | 630 |
| assassino | 325 | 650 |
| cacador | 325 | 650 |
| comandante | 345 | 690 |
| matador | 315 | 630 |
| magonegro | 305 | 610 |
| magobranco | 325 | 650 |
| magovermelho | 340 | 680 |
| magoazul | 315 | 630 |
| invocador | 325 | 650 |
| pictomante | 335 | 670 |

O começo é 700 Yuld; a Quintessência vale 1.110; o [Material-Base] de nível N, 40, 45, 55, 70, 85, 100, 120, 145, 165, 195 (N = 1 a 10).

Drops: 104 criaturas; 2 a mais de 10% do valor do modelo (Basilisco ×1.17, Contrabandista ×1.23).

### O que mudou da 0.47 para a 0.48

- **Os encontros rendem mais** (4 comuns ≈ 100 Yuld no NP 1, antes 84 G vendidos por 42), **os lacaios rendem como os
  comuns** (6 lacaios: 108, antes 35) e os chefes, mais (o Anima-mundi do chefe vale 3,3 vezes o de antes).
- **Os itens custam o dobro**, e o Anima-mundi, 3,3 vezes. A âncora vale: 2 comuns de NP 1 pagam um Anima-mundi 1 (antes,
  0,65 de comum pagava).
- **Só com os drops, a economia nova fica mais dura que a do livro** (AS REGRAS, [Valioso] pelo cheio): no NP 10, o
  equipamento fica 7 níveis atrás, contra 1,8; igual à do código antigo, que vendia os [Valioso] pela metade. Com a missão
  padrão, o equipamento acompanha o NP e sobra Yuld para o resto. Antes não havia tabela de missão: a Tabela de Tesouro
  dos Prêmios de LH não estava no sistema.
- **Revender ficou caro:** o equipamento usado rende 1/10 (antes, a metade), então cada troca custa quase o preço inteiro.

### Criar conteúdo novo na economia

- **Uma criatura:** o valor é `monsterValue` de `economy/data.mjs` pelo tipo e por quantas dela fazem um encontro
  (a coluna "Quantas no alvo" ou "Por encontro" da seção 7). Divida-o pelas faces do 1d6 como os livros fazem (1–3 barato,
  4–5 médio, 6 raro); um chefe leva o Anima-mundi do NP + 1 e o [Material-Base] do NP fixos e o resto na rolagem. Uma
  parte que serve de Anima-mundi vale o preço do Anima-mundi e leva `flags.eternia.unsealed` quando não tem o Selo.
  Confira com `node economia-drops.mjs`: a linha da criatura mostra o valor dela contra o do modelo.
- **Um item:** o peso da categoria (a tabela de preços) × o comum do nível × a força dele dentro da categoria (1 para o
  item comum; o livro dá a força dos itens de LH). Um item mágico feito na Oficina custa a base mais o Anima-mundi do
  nível × o grau; um nomeado, a receita.
- **Uma missão:** a tabela de missões, pelo NP do grupo. Uma parte pode vir como item, que conta até 3/4 do preço.

