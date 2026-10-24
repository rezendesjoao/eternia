# Condições: referência técnica

As regras de cada condição, como o jogador lê, estão na página **IX. CONDIÇÕES DA ETERNIA** do diário AS REGRAS
(`src/packs/rules`) e no tooltip de cada estado (`ETERNIA.StatusDesc.<id>` nos arquivos de idioma). Este arquivo
diz onde cada regra está no código e como criar uma condição nova.

## Onde fica cada coisa

| Arquivo | O que faz |
|---|---|
| `module/conditions/catalog.mjs` | As 52 condições (id, grupo, família, ícone, campo do Valor, acúmulo, contagem, origem) e as tabelas das regras: quem perde a vez (`NO_ACTIONS`), sem movimento (`NO_MOVEMENT`), sem reações (`NO_REACTIONS`), quem falha nas Esquivas (`NO_DODGE`), tags que o Silenciado impede (as habilidades com [Maldição] passam), o que acaba no fim do próprio turno (`END_OF_OWN_PROCESS`; os de `WHOLE_TURN` dados no próprio turno duram até o fim do próximo), no Encerramento e no fim da cena, o que o Aflito protege, a ação para se livrar (`RECOVERY`) e os limiares dos acúmulos e o Sol (`SUN_NOON`, `SUN_NIGHT`). |
| `module/conditions/rules.mjs` | Consultas comuns: `has`, `rating`, `sourcesOf`, `isHostile`, `removeStatuses`, `addStatus` e as duas configurações. |
| `module/conditions/rolls.mjs` | −1d6 e +1d6 dos testes e das Esquivas, a Esquiva que falha sozinha (Adormecido, Petrificado, Pesadelo), o dano a mais (Ímpeto, Combo, Clones no corpo a corpo; o Ritmo em d6 no próximo feitiço, `isSpell`) e o a menos do Enfraquecido, e o Concentrado e o Ritmo que se gastam. Chamado pelas rolagens de habilidade, pelos cartões de ataque, pelas fichas, pelo HUD e pelo Destino. |
| `module/conditions/damage.mjs` | O dano dos cartões (antes: Exposto, Intangível, Intocável, Encharcado, Pacificado de quem ataca, os Clones (`cloneDecoy`), Petrificado pela metade, a Inversão que cura; depois: Último Fôlego, o Fôlego Extra (`spendExtraBreath`), Vínculo, Espelho, Combo que quebra, Adormecido, Encantado, Chama no Congelando e no Encharcado), o que o Desfazer devolve, o Maldito, O Único (nada de ataques chega), o Contragolpe (`counterFor` e `counterBack`: o dano volta dobrado ao atacante, só de golpe direto, ou de qualquer um com o tipo "any"), o Rancor (guarda o PV perdido, até NP×4), a Chama Negra e o Maldito que bloqueiam a cura (`healBlocker`), o `takeDamage` (o dano das próprias condições, com Barreira, Anulação da tag e linha no chat; quem não é dono pede ao Mestre pelo socket) e o `takeHealing` (a cura do Dreno, pelo mesmo caminho; com Inversão, fere), a Agonia (`agonyPain`) e a Inversão que troca Fortalecido e Regeneração por Enfraquecido e Deterioração (`invertGift`). |
| `module/conditions/actions.mjs` | O que as condições proíbem ao usar uma habilidade (lido por `automation/use.mjs`; o Dominado não mira em quem o domina nem no lado dele; a Amnésia deixa só as básicas, `isBasicSkill`) e ao mover o token, e as ações de cada turno (Acelerado, Lento). |
| `module/conditions/turns.mjs` | O Relógio do Sol e o Fôlego Extra que volta na Manutenção (`setupConditions`; o feitiço da Magia Sol sobe o Sol em `afterAction`), início do turno (Envenenado, Confuso), fim do próprio turno (`endOwnStatuses`, `endOwnProcess`: Ímpeto que sobe, Combo sem ataque), o Combo dos cartões de ataque (`onAttackCard`), Ação Maior (Eletrificado, Intangível, Oculto), Encerramento (Queimando, Chama Negra, Pesadelo, Sentença, Pavio, o golpe do Servo, o Motor que o Casulo das Trevas alimenta, `cleanupFeeds`, a contagem d'O Único, o que acaba na rodada), limiares dos acúmulos, Despertado e Ímpeto que deixam Fadiga, Selado sem nome e a origem Incapacitada. |
| `module/conditions/derived.mjs` | Defesas (Exposto, Fissurado, Sol, Ímpeto), Velocidade e Iniciativa na ficha. |
| `module/conditions/recovery.mjs` | Livrar-se gastando a ação da regra (botão do HUD; com Agonia, dói); um Estado Negativo de um efeito infinito, com Ação Maior. |
| `module/conditions/lasting.mjs` | O que dura mais que a regra: os efeitos infinitos (Traço `infinite`; a duração de um processo ou da rodada vira o fim da cena, e os estados deles não acabam no fim do turno nem no Encerramento) e os estados renovados (`renew`); os que tiram o turno (`NO_ACTIONS`) nunca (`mayLast`). `naturalEnd` filtra os fins naturais (chamado por `turns.mjs`: `endOwnStatuses` e `cleanupConditions`), `breakFreeActions` dá o Livrar-se com Ação Maior dos efeitos infinitos hostis, `lastingEffectData` e `lastingHitData` marcam os efeitos. |
| `module/conditions/status-actions.mjs` | As ações de uso que mexem em muitos estados de uma vez: `promote`, `doubleStatuses`, `demote`, `raise` e `cancelSpells`. |
| `module/conditions/distance.mjs` | A Distância (Tabu da Invasão): `noEngaged` (os feitiços da Magia não miram quem está engajado) e a chave `eternia.passive.closeDodge` (dados nas Esquivas contra golpes corpo a corpo). |
| `module/conditions/decree.mjs` | Os Decretos (a Magia Mandamentos): quem os carrega, o alcance, quem pegam (o Tabu, os imunes), o que quebra cada um (os ganchos `eternia.damaged`, `eternia.defeated`, `eternia.recovered`, `eternia.freed`, `eternia.attack`, `eternia.attacked`, `eternia.processEnd`, `eternia.skillUsed`, o movimento do token, a chegada de um Estado de Combate), a maldição dada pelo Mestre (socket `decreeBreak`, com `nextTurn` quando é o turno de quem quebrou) e a contagem `decreeRounds`. |
| `module/conditions/blows.mjs` | O que um golpe faz além do dano (`blowOutcome`, chamado pelo cartão antes das condições do defensor): a Execução (`execute`), o golpe que não mata (`noKill`), o Valor que cai (`lower`: a [Sentença] a 0 derruba), os bônus virados do avesso (`convert`); os estados de acerto condicionais (`hitApplies`: `targetTags`, `belowHp`) e a cura que fere (`healingHurts`). |
| `module/conditions/souls.mjs` | Os efeitos que alcançam quem está em volta: comer almas (`soulEater`), a colheita do Rito (`harvest`), o efeito que alimenta o Motor de quem o deu em cada Encerramento (`feedSource`, chamado por `cleanupConditions`) e a limpeza dos aliados (`cleanse`). Uma queda é o Incapacitado chegando (cartão, condição, Sentença, Execução), tratada pelo Mestre principal. |
| `module/conditions/forms.mjs` | As Formas (`form`: uma forma por grupo, a nova desfaz a anterior) e o estado em quem causa dano ao portador (`struckStatus`, pelo gancho `eternia.damaged`). |
| `module/conditions/copies.mjs` | As cópias da Lâmina Divisora: a reação feita por uma cópia (`cloneReaction`, perguntada por `automation/use.mjs` antes de contar o uso), a cópia que leva o golpe (`decoy`, em `beforeDamage`) e a habilidade que precisa de um estado (`needsStatus`, nas proibições das condições). |
| `module/conditions/transformations.mjs` | O n-ésimo feitiço da Magia na cena que transforma (`transform`, `transformNow`; `countSpell` em `afterAction`), os corações (`reviveStatus` e `surrender` sobre o Fôlego Extra) e a queda quando o efeito acaba (`fallOnEnd`; no fim da cena, `automation/scenes.mjs` pergunta `fallAtSceneEnd` antes da recuperação). |
| `module/conditions/omen.mjs` | O Presságio: os dados rolados no começo do combate (Manutenção da rodada 1) por quem tem um Traço com `omen`, guardados em `flags.eternia.omen = { combat, dice }`; os botões nos cartões de ataque (um por valor que ajuda: no teste de quem é do mesmo lado, o menor dado sobe; no de um inimigo, o maior desce) que chamam o `adjustCardRoll`; o `omenFocus`; a ação de uso `omen`; o `omenSpend` (o Presságio acaba quando o dano é rolado). |
| `module/conditions/window.mjs` | Agir fora do turno: a janela de ações (`flags.eternia.window = { key, move, minor, major, from }`, a chave "<combate>.<rodada>.<quantos agiram>", `from` a habilidade que a abriu) aberta por uma habilidade com `window`; com `offTurn`, ela só é usada no fim do turno de outra criatura. `automation/use.mjs` deixa uma ação da janela ser usada fora do turno (ou depois das do turno), conta à parte e devolve no Desfazer. |
| `module/conditions/immortal.mjs` | O Imortal: a [Regeneração] dos Traços com `immortal` na Manutenção; a cura de feitiços e itens multiplicada pelo `healTaken` (o Tabu da Fonte da Juventude: nos cartões de cura e no `takeHealing`, menos a cura `natural`); o `cover` (o Escudo de Carne: quem deu o efeito sofre o golpe no lugar, como dano direto); o `hpCost`; as ações de uso `regenNow` e `giveHp`. |
| `module/conditions/realm.mjs` | O Reino: um efeito com `realm` dá os estados da regra a quem está a até `radius` Qd de quem conjura (inimigos e aliados pela disposição do token), quando chega e em cada Manutenção. |
| `module/conditions/index.mjs` | Registra os ganchos. |

Também tocam nas condições: `helpers/statuses.mjs` (a lista dos 75 estados, o painel da ficha por família, a
sincronia campo ↔ efeito e os acúmulos), `helpers/combat-cards.mjs` e `helpers/magic-traits.mjs` (as flags de
golpe e o Traço das Magias, abaixo), `automation/round.mjs` (perder a vez, o Encerramento, o fim do próprio
Turno), `automation/scenes.mjs` (fim de cena), `documents/eterniaCombat.mjs` (a ordem do Lento),
`chat/status-links.mjs` (estados clicáveis), `hud/` (painel de Estados) e `template.json` (os campos de Valor em
`system.bad-status`).

## Os dados de um estado

- **Valor:** fica no campo `system.bad-status.<id>`. Cada efeito que dá o estado leva
  `flags.eternia.statusData = { statusId, value, tag }`; com vários efeitos, o campo guarda o maior Valor, ou a soma
  até o máximo nos estados com acúmulo (`stack`). Tirar o campo da ficha tira todos os efeitos do estado. Nos de
  contagem (`tally`: Ímpeto, Combo, Ritmo, Clones) o campo é a verdade: as regras o mudam direto, e um efeito que sai
  não desconta o Valor dele.
- **Origem:** `flags.eternia.source.casterUuid` do efeito, posto pelos efeitos de habilidade, pelos estados
  clicáveis, pelo Criar efeito e por `game.eternia.applyStatus(..., { from })`. Um estado ligado à mão, pelo HUD do
  token, fica sem origem.
- **Selado:** `statusData.tag` é o nome da habilidade selada.

## Criar uma condição nova

1. Uma entrada em `NEW_STATUSES` (`catalog.mjs`): `id`, `group` (`bad`, `combat` ou `other`), `family` (só nos
   Estados Negativos), `img`; com Valor, `path: "bad-status.<id>"` e `rated: true` (e `stack: n` se acumula;
   `tally: true` se o Valor é uma contagem que as regras mudam direto);
   `source: true` se a regra depende de quem causou; `tagged: true` se leva uma tag.
2. O campo em `template.json` (`system.bad-status.<id>: 0`) se tiver Valor.
3. `ETERNIA.StatusEffect.<id>` (nome) e `ETERNIA.StatusDesc.<id>` (regra curta) em `lang/pt-BR.json` e `lang/en.json`.
4. O ícone: uma linha em `tools/make-status-icons.mjs`, depois `node tools/make-status-icons.mjs <pasta do
   game-icons>` (a pasta tem o formato de https://github.com/game-icons/icons) e o crédito na tabela do README. Ou
   arte própria, um SVG em `assets/ui/status/<id>.svg` (os cinco da 0.26, os cinco da 0.27 e os onze da 0.28).
5. As regras: as tabelas do `catalog.mjs` cobrem os casos comuns; o resto vai no arquivo da mecânica (`rolls`,
   `damage`, `actions`, `turns` ou `derived`).
6. O nome e os sinônimos em `chat/status-links.mjs` (`STATUSES` e `SYNONYMS`), para o estado virar link no chat.
7. A entrada na página IX do diário AS REGRAS e `npm run packs:build`.

## Configurações

- `conditionRules` (ligado): toda a automação das condições (`rulesOn()`). Desligada, as condições continuam como
  estados, sem efeito automático.
- `conditionLimits` (avisar): o que as condições proíbem, em `off`, `warn` ou `block` (o Mestre sempre pode seguir).
- `endOfProcess` (ligado): os estados que acabam no fim do turno de quem os recebeu.

## Flags de efeito e de habilidade

Usados pelas raças e pelas Magias, servem para qualquer habilidade (`conditions/effects.mjs`, `helpers/item-use.mjs`;
as flags de golpe, nos cartões de dano: `helpers/combat-cards.mjs`, `helpers/magic-traits.mjs`):

| Onde | Flag | O que faz |
|---|---|---|
| Efeito | `recipients` | `"targets"` (padrão), `"self"` (quem usa), `"both"`, `"allies"` (os alvos do mesmo lado de quem usa, pela disposição do token, e quem usa) ou `"enemies"` (os alvos do outro lado) |
| Efeito | `immune` | lista de estados que não pegam enquanto o efeito existir (e acabam quando ele chega) |
| Efeito | `fatigueOnEnd` | Fadiga ao acabar (fórmula resolvida ao aplicar) |
| Efeito | `endsWith` | acaba quando o ator perde esse estado |
| Efeito | `consumeOn` | acaba depois do próximo teste desse tipo (`"negotiation"`…, `"check"`), Esquiva (`"dodge"`), dano sofrido (`"damage"`) ou a próxima rolagem de dano de quem o tem (`"attack"`) |
| Efeito | `revive` | o Fôlego Extra: `{ uses, per: "round" \| "scene", hp }`. Quem chegaria a 0 PV por dano (cartão, condição, Deterioração) fica com `hp` PV (fórmula, padrão 1) e gasta um uso; `per: "round"` volta na Manutenção, `"scene"` no fim da cena. Vários somam. Também no efeito de um Traço (o Imortal, 1 por rodada; os Sete Corações, 6 por cena) e na Gota da Fonte. Gancho `eternia.revived(actor, { effect, hp, left })` |
| Efeito | `nextTurn` | o estado que acaba no fim do próprio turno (`END_OF_OWN_PROCESS`), dado no próprio turno de quem o recebe, dura até o fim do próximo (como os de `WHOLE_TURN`: Petrificado, Amnésia, Pesadelo) |
| Efeito | `keepCombo` | o dano de um ataque não zera o [Combo] de quem tem o efeito (com `consumeOn: "damage"`, só o próximo) |
| Efeito | `damageTags`, `onHit` | tags que o dano de quem o tem ganha; estado que esse dano dá em quem atinge (`docs/profissoes.md`) |
| Efeito | `onUse` | aplica o efeito ao usar a habilidade, também nas que pedem teste contra o alvo (a criatura que fica com quem invoca, [Servo]) |
| Efeito | `trait` | o Traço de uma Magia (só na habilidade da Magia): `{ magia, bonusVs, onHit, escalate, strip, pierce, keepHidden, bonus, healBonus }`, que vale para os feitiços dessa Magia; `bonus` soma no dano e `healBonus` na cura; `combo: true` faz quem tem a Magia contar o [Combo] do zero; as outras chaves estão nas linhas "Traço" abaixo (e `execute`, que também vai num Traço) |
| Traço | `infinite` | `true`: os efeitos dos feitiços da Magia são infinitos (o Tempo Parado do Infinito; veja `infinite` no efeito e na habilidade) |
| Traço | `decreeImmune` | quem tem o Traço fica imune aos Decretos dos outros (a Marca do Rei Demônio, o Rei do Caos; quem carrega um Decreto também é) |
| Traço | `lower` | `[{ statusId, by }]`: quem o golpe acerta e já tem o estado perde `by` (1) do Valor; a [Sentença] a 0 derruba (a Praga). Também numa habilidade |
| Traço | `convert` | `{ de: para }`: o estado `de` do alvo vira `para` com o mesmo Valor (O Soberano: Fortalecido → Enfraquecido, Regeneração → Deterioração). Também numa habilidade |
| Traço | `soulEater` | `{ reach, motor, heal }`: quando uma criatura cai a até `reach` Qd, em combate, +`motor` no Motor da classe e `heal` PV (fórmula), uma vez por rodada (o Portão do Inferno) |
| Traço | `cloneReaction` | uma vez por rodada, a primeira reação com [Clones] é de uma cópia: o uso não conta no limite (a Lâmina Divisora) |
| Traço | `transform` | `{ at, statuses: [{ statusId, value }] }`: o `at`-ésimo feitiço da Magia na cena dá esses estados até o fim da cena (`flags.eternia.spellCount.<magia>`) |
| Traço | `omen`, `omenFocus` | `omen`: fórmula, os dados que o Presságio rola no começo de cada combate (a Visão: [NP÷2 + 1]); `omenFocus`: [Concentrado] quando um dado do Presságio muda o resultado de um ataque |
| Traço | `immortal` | `{ regen }` (fórmula): a [Regeneração] que quem tem o Traço ganha em combate, de novo em cada Manutenção quando tem menos (o Imortal) |
| Efeito | chave `eternia.passive.cancel` | Anulação passiva (tag em `cancelTag`) |
| Efeito | chave `eternia.passive.weakness` | Fraqueza passiva (tag em `weaknessTag`): o Tabu das Chamas do Purgatório, [Fraqueza (Radiância): NP] em combate |
| Efeito | chave `eternia.passive.closeDodge` | dados nas Esquivas contra golpes corpo a corpo (`isCloseAttack`): o Tabu da Invasão, −1 em combate |
| Efeito | `decree` | `"amor"`, `"verdade"`, `"devocao"`, `"pacifismo"`, `"paciencia"`, `"repouso"`, `"silencio"`, `"pureza"`, `"desapego"`, `"fe"` ou `"all"` (os dez): o Decreto que o portador impõe em combate (o efeito passivo de cada Mandamento; `"all"`, Os Dez Mandamentos) |
| Efeito | `decreeTabu` | os Decretos do portador pegam ele e os aliados (o Tabu dos Mandamentos, em combate) |
| Efeito | `decreeReach`, `decreeReachMult` | o alcance dos Decretos (padrão 4 Qd): o maior `decreeReach` (Revelar: 6) vezes o maior `decreeReachMult` (Forma de Assalto: 2) |
| Efeito | `decreeDamage` | dano direto (fórmula de quem carrega, `"@cr"`) em quem quebra um Decreto dele (Revelar o Mandamento) |
| Efeito | `decreeSelfImmune` | o portador não é pego pelos próprios Decretos (Os Dez Mandamentos) |
| Efeito | `decreeRounds` | o efeito acaba no Encerramento em que a contagem chega a 0 (cai 1 por Encerramento) |
| Efeito | `decreeCurse` | `{ by, decree }`: a marca de uma maldição de Decreto (posta pelo motor e pelo Mandamento Materializado) |
| Efeito | `noEngaged` | id de uma Magia: enquanto o efeito está ativo, os feitiços dela não miram quem está engajado com quem os usa (mesmo quadrado); aviso ou bloqueio como as outras proibições |
| Efeito | `infinite` | efeito infinito (posto ao aplicar, pelo Traço ou pela habilidade): não acaba no fim do processo nem da rodada, e os estados dele não acabam pela regra do fim do turno nem do Encerramento (menos os que tiram o turno, `NO_ACTIONS`); um hostil (dá Estado Negativo) sai com Ação Maior no Livrar-se |
| Efeito | `renew` | quantos fins naturais dos estados do efeito ainda passam em branco (a Promoção de Estado) |
| Efeito | `fromSpell` | o estado veio do acerto de um feitiço (cartão de dano): o Cancelamento Absoluto o conhece |
| Efeito | `noKill` | o dano dos cartões de quem o tem para em 1 PV (o Tabu da Praga, `conditions: inCombat`); só as condições derrubam |
| Efeito | `healingHurts` | `"allySpell"`: a cura de um [Feitiço] de um aliado vira dano direto em quem o tem (o Tabu d'O Soberano) |
| Efeito | `harvest` | `{ value, max, tag }`: enquanto dura, cada inimigo de quem o tem que cai sobe o [Servo] dele em `value` (até `max`), com a tag (o Rito do Rancor dos Mortos) |
| Efeito | `feedSource` | n: em cada Encerramento, enquanto o efeito durar, o Motor da classe de quem o deu ganha n (o Casulo das Trevas) |
| Efeito | `cleanse` | `{ statuses, reach }`: ao chegar, quem o tem e os aliados a até `reach` Qd perdem esses estados; o efeito sai (a Arca Ômega) |
| Efeito | `form` | o grupo da forma (`"lanca"`): ao chegar, as outras formas do mesmo grupo no ator acabam |
| Efeito | `struckStatus` | `{ statusId, value }`: quem causa dano ao portador com um cartão de dano fica com esse estado, o portador como origem (o urso da Forma Dois) |
| Efeito | `decoy` | o próximo cartão de dano aplicado ao portador acerta uma cópia: nada chega, nem dano nem estados (com `consumeOn: "damage"`, acaba com ele) |
| Efeito | `fallOnEnd` | quando o efeito acaba, o portador cai (0 PV e Incapacitado); se acabar com a cena, esse fim de cena não o levanta |
| Efeito | `reviveStatus` | `{ statusId, per }`: a cada uso do Fôlego Extra gasto, o portador fica com o estado, Valor = usos gastos na cena × `per` (o Tabu da Forma Indura: [Fúria]) |
| Efeito | `surrender` | `{ statusId, value }`: ao chegar, o portador entrega os usos do Fôlego Extra que restam na cena e fica com o estado, Valor = `value` (fórmula) + os usos entregues (a Transformação Indura: [Ímpeto]) |
| Efeito | `healTaken` | fração: a cura de feitiços e itens que o portador recebe (os cartões de cura e o `takeHealing`: o Dreno, a Dádiva) é multiplicada por ela (0.5: o Tabu da Fonte da Juventude, com a condição `inCombat`); a do próprio corpo (`takeHealing(..., { natural: true })`, a Regeneração) não |
| Efeito | `cover` | dado a um aliado: o próximo ataque que acerta esse aliado acerta quem deu o efeito (o dano que o aliado sofreria, depois da Defesa e da Anulação dele, como dano direto); nada do golpe chega ao aliado. Junto com `consumeOn: "damage"` (o Escudo de Carne) |
| Efeito | `realm` | `{ radius, enemies: [{ statusId, value }], allies: [...] }`: os estados que a área em volta de quem tem o efeito dá, na hora e em cada Manutenção, sem Esquiva (o Reino do Caos) |
| Efeito | condição `hasSkill` | só vale se quem usa tiver a habilidade com esse nome |
| Efeito | condição `notSkill` | só vale se quem usa não tiver a habilidade com esse nome (o Escudo Esculpido do Pictomante, que vira muralha no Caminho da Paisagem) |
| Habilidade | `chooseEffect` | os efeitos são alternativas: quem usa escolhe um; só aparecem as alternativas cujas condições quem usa cumpre (a Mudança de Forma oferece só as formas que a pessoa conhece, pela condição `hasSkill`) |
| Habilidade | `randomEffect` | os efeitos são alternativas: um deles, sorteado ao usar |
| Habilidade | `useActions` | `{ type: "fatigue", value }`, `{ type: "doubleStatus", status }`, `{ type: "removeStatus", statuses, value }` (com `value`, no máximo esse tanto, na ordem da lista: o Revigorar tira um), `{ type: "addStatus", status, value }` (sobe o estado em `value`: um acúmulo soma até o máximo, outro Valor fica no maior; com `value` negativo, tira de um acúmulo, que sai no 0: um Clone gasto), `{ type: "steal", statuses }` (os do alvo passam para quem usa), `{ type: "switch" }` (quem usa e o primeiro alvo trocam de lugar e de Ódio, só entre aliados: a habilidade básica Switch), `{ type: "pull" }` (o token do alvo vem para o quadrado de quem usa, engajado) ou `{ type: "push", value }` (o token do alvo vai n Qd para longe de quem usa, em linha reta), com `recipients` (também em itens usáveis); os tipos de outros módulos (`registerUseAction`, que recebem também o campo `data` da ação): `{ type: "omen", value, data: { face } }` (dados no Presságio de quem usa, rolados ou todos com a face dada), `{ type: "regenNow" }` (a [Regeneração] cura agora) e `{ type: "giveHp", value }` (quem usa dá esses PV a um aliado, nunca o último). `onUse: true` numa ação: ela vem com o uso, antes do teste, também numa habilidade com teste oposto (o Vórtice Sinistro). Puxar, empurrar e o Switch são movimentos forçados (`eterniaForced`); puxar, empurrar e o Decreto leem a posição do token pela fonte (`_source.x/y`): no Foundry v14 o `x` do documento fica no lugar antigo enquanto o movimento anima |
| Habilidade | `useActions` (vários estados) | `{ type: "promote", value }` (os Estados Negativos com Valor sobem `value`, a [Sentença] cai, os que acumulam param no máximo; os sem Valor são renovados), `{ type: "doubleStatuses" }` (o mesmo, dobrando), `{ type: "demote", statuses }` (os bônus saem de uma vez: Fortalecido, Acelerado, Concentrado, Anulação, Barreira, Regeneração, Espelho, Intangível, Despertado e Intocável, ou os listados), `{ type: "raise", status, value }` (o Valor de um estado sobe `value`, até o máximo quando acumula; dá o estado se não tinha) e `{ type: "cancelSpells" }` (os efeitos de feitiço saem: os bons de um inimigo, os ruins de um aliado ou de quem usa), em `conditions/status-actions.mjs` |
| Habilidade | `bonusVs` | `[{ statuses, ratedBad, targetTags, decreeOf, value, perValue, consume }]`: dano a mais contra quem tem um dos estados ou uma das tags (`ratedBad`: qualquer Estado Negativo com Valor; `decreeOf: true`: quem está sob a maldição de um Decreto de quem ataca; `perValue`: vezes o Valor do estado; `consume`: o golpe tira o estado) |
| Habilidade | `escalate` | `[{ if, add: [{ statusId, value }] }]`: quem o golpe acerta e já tem o estado `if` ganha os de `add` |
| Habilidade | `strip` | estados que o golpe arranca de quem acerta |
| Habilidade | `pierce` | `{ defense: "half", cancel: true, barrier: true }`: a Defesa pela metade, a Anulação ignorada, a Barreira ignorada e quebrada |
| Habilidade | `keepHidden` | o golpe não tira o [Oculto] de quem ataca |
| Habilidade | `hitStatuses` | `[{ statusId, value }]`: os estados que o golpe dá em quem acerta (o valor, uma fórmula; veja `docs/classes.md`). Cada um pode ter `rankBelow: true` (só em quem tem NP, o Rank num monstro, menor que o de quem ataca: o Apagão), `targetTags` (só em quem tem uma das tags) e `belowHp` (fórmula: só em quem fica com esse PV ou menos depois do golpe) |
| Habilidade | `randomHit` | `[{ statusId, value }]`: um deles, sorteado, em cada acerto |
| Habilidade | `drain` | fração (0.5): quem conjura recupera essa parte do PV que o golpe tirou (Dreno, pelo `takeHealing`) |
| Habilidade | `steal` | `[statusId]`: o primeiro deles que o alvo tem passa para quem atacou, com o Valor, a cada acerto |
| Habilidade | `selfBonus` | `[{ statusId, per, spend }]`: dano a mais pelo Valor de um estado de quem ataca (vezes `per`); com `spend`, o estado sai quando o dano é rolado (`spend: "free"`: sem a Fadiga que o Ímpeto ou o Despertado deixariam) |
| Habilidade | `comboGain`, `comboPerTarget` | quanto o [Combo] sobe quando o ataque acerta (padrão 1); com `comboPerTarget`, vezes os alvos acertados |
| Habilidade | `choiceGrants` | identificadores das habilidades oferecidas: ao entrar na ficha, o jogador escolhe uma que ainda não tem (a Magia Mandamentos, Absorver Mandamento) |
| Habilidade | `decreeCurse` | `true`: o acerto dá as maldições dos Decretos de quem conjura (Mandamento Materializado; com o Desapego, arranca os Estados de Combate) |
| Habilidade | `infinite` | `true`: os efeitos dela são infinitos sem precisar de Traço; `false`: nunca são, nem com o Traço (o Caixão do Tempo) |
| Habilidade | `execute` | `{ targetTags, below }`: o alvo (com uma das tags; qualquer um, sem tags) que fica com `below` PV ou menos depois do golpe cai na hora (0 PV); fórmula de quem ataca. O [Último Fôlego] e o Fôlego Extra ainda seguram. Também num Traço |
| Habilidade | `transformNow` | o feitiço transforma na hora (o `transform` do Traço da Magia) |
| Habilidade | `needsStatus` | id de um estado: sem ele, quem usa não pode usar a habilidade (as proibições das condições) |
| Habilidade | `window` | `{ move, minor, major, offTurn }`: ao ser usada em combate, abre uma janela com essas ações fora do turno (até o fim do turno em curso); `offTurn`: a habilidade só é usada no fim do turno de outra criatura (o Lampejo Divino) |
| Habilidade | `hpCost` | fórmula: PV que quem usa paga ao usar (nunca o último), devolvidos pelo Desfazer (o Golpe sem Medo) |
| Habilidade | `omenSpend` | o Presságio de quem usa acaba quando o dano dela é rolado (O Fim Já Escrito, com `@omen` na fórmula) |
| Habilidade | `withItem` | nome de outro item que precisa estar equipado junto (habilidade de item, como um par de espadas) |
| Habilidade | `special` | `"pack"` (Matilha, em `rolls.mjs`) ou `"book"` (O Livro, no renascimento) |
| Habilidade | `minRank`, `choiceOnly`, `rankGrants` | NP mínimo, só por escolha, e habilidades dadas a cada NH |

## O Relógio do Sol e o Contragolpe

- **Sol:** quem tem um Traço com `sunClock` (a Magia Sol) ganha +1 de [Sol] na Manutenção de cada rodada
  (`automation/round.mjs` → `setupConditions`) e a cada feitiço dessa Magia. No `SUN_NOON` (5) é meio-dia:
  [O Único] com Valor 1 (as rodadas que faltam) e a flag `sunNoon` com o id do combate; depois o Sol desce 1 por
  Manutenção. Numa cena com a escuridão em 0.5 ou mais (`scene.environment.darknessLevel`), o Sol para em
  `SUN_NIGHT` (2). O Valor d'O Único cai 1 em cada Encerramento; a Proeminência Final o leva a 2 com um efeito de
  `fatigueOnEnd`, e a Fadiga chega quando ele acaba.
- **Contragolpe:** um efeito com `statusData = { statusId: "counter", value, tag }` (`magical`, `physical` ou
  `any`). No cartão de dano, o dano de um golpe direto do tipo (alvo único; `any` vale para tudo, até área) é
  calculado com a Defesa e a Anulação e volta ao atacante dobrado + o Valor + o `counterBonus` dos Traços, como dano
  direto; nada do golpe (estados, dano de Esquiva falha) chega a quem devolveu, e o Contragolpe sai.

## As condições comuns das Magias altas (0.28)

- **Petrificado** (`petrified`, origem): perde o turno, não se move, falha nas Esquivas (`NO_ACTIONS`, `NO_MOVEMENT`,
  `NO_DODGE`) e sofre metade do dano do golpe (depois da Defesa e da Anulação). Sai no fim do próprio turno ou quando
  a origem cai (`freeFrom`).
- **Pacificado** (`pacified`, origem): o cartão de dano feito por quem o tem leva `pacified: true` (o cartão mostra
  "Pacificado: dano 0") e não fere ninguém, nem com o dano da Esquiva falha; os estados do golpe pegam e nada volta
  por Contragolpe. O Servo dele não ataca. Sai no Encerramento.
- **Agonia** (`agony`, Valor): `agonyPain` depois de toda cura que dá PV (cartão, `takeHealing`, Regeneração,
  Inversão) e de todo Estado Negativo tirado pelo Livrar-se ou pelo `removeStatus` (não quando a Agonia sai junto).
- **Amnésia** (`amnesia`): só habilidades `Basic` e `Item` (num monstro, as sem custo nem limite) e itens.
- **Pesadelo** (`nightmare`, Valor): como o Adormecido, mas o dano não acorda; o Valor em dano direto no Encerramento.
- **Ímpeto** (`impetus`, contagem): +Valor no dano e nas Defesas; +1 no fim de cada turno (`endOwnProcess`); passou do
  NP, [Fúria: NP] com `endsWith: "impetus"`; sai com uma Ação Menor e deixa [Fadiga] do Valor (não com
  `eterniaNoFatigue` na atualização que o zera, nem com `selfBonus.spend: "free"`).
- **Combo** (`combo`, contagem): +Valor no dano. Conta quem tem o Combo ou um Traço com `combo`: o Mestre principal lê
  cada cartão de ataque (`onAttackCard`) e, com todos os alvos resolvidos, soma `comboGain` se acertou alguém ou zera
  se errou todos; zera no fim de um turno sem ataque (pelo registro `flags.eternia.attacked`, que guarda a rodada do
  último ataque de todo atacante) e com o dano de um ataque (fora `keepCombo`).
- **Intocável** (`untouchable`): imune a dano mágico; sai no Encerramento.
- **Inversão** (`inversion`): o dano mágico, depois da Defesa e da Anulação, cura (bloqueada pelo Maldito e pela Chama
  Negra); a cura do cartão, o `takeHealing` e a Regeneração ferem; os efeitos com `statusData` de Fortalecido e
  Regeneração viram Enfraquecido e Deterioração. Sai no Encerramento.
- **Ritmo** (`rhythm`, contagem até 3): +Valor d6 no próximo dano de um feitiço (`isSpell`: `magicSpell`, [Ataque
  Mágico] ou [Feitiço]) e sai.
- **Clones** (`clones`, contagem até 6): `cloneDecoy` rola 1d6 em cada cartão de dano; até o Valor, o golpe acerta
  uma cópia (nada chega) e o Valor cai 1 (o Desfazer devolve). +Valor no dano dos ataques corpo a corpo.
- **Fórmula** `@hpLost`: os PV que faltam (PV máximo − PV).
- **Fôlego Extra:** `extraBreaths(actor)` (por efeito: `uses`, `left`, `per`, `hp`), `breathsLeft(actor, effect?)` e
  `giveUpBreaths(actor, n?, { effect })` (entrega usos sem cair: a transformação que gasta os corações que restam), em
  `conditions/damage.mjs`.

## Os Decretos

- **Quem carrega:** os efeitos ativos com `decree` (o efeito passivo de cada Mandamento; `"all"` são os dez). Só valem
  com o portador num combate iniciado, de pé, sobre os tokens da cena desse combate.
- **Quem pegam:** os inimigos do portador sempre; os aliados (mesma disposição do token) e o próprio portador só com o
  Tabu ligado (`decreeTabu`). Nunca quem carrega um Decreto ou tem um Traço com `decreeImmune`; `decreeSelfImmune` tira
  o portador dos próprios.
- **Alcance:** 4 Qd (contados como nos cartões de ataque) ou o maior `decreeReach`, vezes o maior `decreeReachMult`.
- **Quebrar:** o cliente que viu (quem aplicou o dano, usou a habilidade, moveu o token, passou o turno) pede ao Mestre
  (`decreeBreak`), que confere o Decreto e dá a maldição: efeitos com a origem no portador, `decreeCurse` e `nextTurn`
  nos estados que saem no fim do próprio turno (dada no turno de quem quebrou, dura até o fim do seguinte). Linha no
  chat: "X quebrou o Mandamento do Amor de Y: …". O mesmo Decreto quebrado de novo pelo mesmo em menos de 2 s conta
  uma vez.
- **Os gatilhos:** Amor (`eternia.damaged` com dano ou Barreira gasta no portador), Verdade (o token sai do quadrado do
  portador sem `eterniaForced`), Devoção e Pureza (`eternia.attack`: o cartão de ataque e os alvos), Repouso
  (`eternia.attacked` com `previous === round - 1`), Silêncio (`eternia.skillUsed` de uma habilidade de reação),
  Pacifismo (`eternia.defeated`), Paciência (`eternia.recovered` e `eternia.freed`), Desapego (chega um Estado de
  Combate e são dois ou mais), Fé (`eternia.processEnd` sem `attacked` nem `lost`). Atacar é fazer um ataque (o cartão
  de ataque).

## O Infinito e a promoção dos estados

- **Infinito:** um feitiço de uma Magia cujo Traço tem `infinite` (a Magia Infinito), ou uma habilidade com
  `flags.eternia.infinite: true`, dá efeitos infinitos: `applyItemEffects` e os estados do acerto do cartão de dano
  levam `flags.eternia.infinite`, e a duração `endOfProcess`/`endOfRound` vira `endOfScene`. Os estados que eles dão
  não acabam pela regra (`END_OF_OWN_PROCESS`, `END_OF_ROUND`: o filtro `naturalEnd`), menos os que tiram o turno
  (`NO_ACTIONS`: Paralisado, Adormecido, Petrificado, Pesadelo), que acabam como sempre. Um Estado Negativo de um efeito
  infinito sai com uma Ação Maior no Livrar-se do HUD (`breakFreeActions`), e o efeito inteiro sai (a prisão do Cubo
  Perfeito leva o Enraizado e o Silenciado juntos). `infinite: false` na habilidade fica de fora (o Caixão do Tempo).
- **Promover:** a ação de uso `promote` sobe o Valor de cada Estado Negativo com Valor (o campo e os efeitos que o dão,
  para que o fim de um deles deixe o Valor certo); os que acumulam param no máximo e disparam o limiar (Congelando →
  Paralisado, Fissurado → Exposto); a [Sentença] conta para baixo, então cai (até 1). Os sem Valor que acabam sozinhos
  ganham `renew` (o próximo fim natural passa em branco) e, se a duração é de um processo ou da rodada, uma rodada a
  mais; os que tiram o turno não. `doubleStatuses` faz o mesmo dobrando (a Sentença pela metade). O Cancelamento
  Absoluto num aliado, quando tira um Estado Negativo, avisa o gancho `eternia.freed` e dispara a [Agonia]
  (`agonyPain`).

## A Execução, o golpe que não mata e as almas

- **Execução:** `execute = { targetTags, below }` no feitiço (ou num Traço). Quando o cartão é aplicado, um alvo com
  uma das tags (`actorHasTag`: a tag do monstro ou uma habilidade com ela, como [Maldição]) que fica com `below` PV ou
  menos (fórmula de quem ataca) cai na hora: 0 PV, Incapacitado, o gancho `eternia.defeated` e o Desfazer, como um
  golpe que zera os PV. O [Último Fôlego] e o Fôlego Extra ainda seguram. Nada acontece se o golpe não chegou
  ([Contragolpe], [O Único], [Clones], imunidade) ou não fere (atacante [Pacificado], ou a [Inversão] virou o dano em
  cura).
- **Sem matar:** um efeito ativo de quem ataca com `noKill` (o Tabu da Praga, só em combate) faz o golpe parar em 1 PV
  (o Vínculo e o Rancor contam o PV que saiu de verdade) e suspende a Execução. As condições ([Sentença], [Agonia],
  [Envenenado], o golpe do [Servo]...) ainda derrubam, e a [Sentença] que o Traço da Praga (`lower`) leva a 0 também.
- **Comer almas:** o Traço com `soulEater` ouve o Incapacitado chegar em qualquer criatura do mapa a até `reach` Qd
  (contados como nos cartões de ataque). Em combate e uma vez por rodada (`flags.eternia.soulEaten` guarda a rodada),
  o Motor da classe (`classMotorId`) ganha `motor` e quem tem o Traço recupera `heal` PV pelo `takeHealing` (o
  [Maldito] e a [Chama Negra] bloqueiam).
- **Os lados:** aliado e inimigo (a limpeza da Ômega, a colheita do Rito, o Tabu d'O Soberano) saem da disposição do
  token na cena (`sideOn` em `conditions/blows.mjs`, como o `item-use.mjs`), não do protótipo: um ator ligado pode ter
  o protótipo de um lado e o token do outro.
- **O Rito e o Casulo:** o Rito do Rancor dos Mortos dá a quem o usa um efeito com `harvest` até o Encerramento; cada
  inimigo que cai nesse tempo cria um efeito de [Servo] com o Valor somado. O Casulo das Trevas deixa no alvo um
  [Agarrado] com `feedSource: 1`: `cleanupConditions` (o Encerramento do alvo) soma 1 no Motor de quem o lançou.

## O Presságio, agir fora do turno, o Imortal e o Reino

- **Presságio:** quem tem um Traço com `omen` (a Visão: [NP÷2 + 1]) rola esses dados na Manutenção da primeira rodada
  de cada combate e os guarda em `flags.eternia.omen`. Nos cartões de ataque, o Mestre (pelos tokens que controla) e o
  jogador (pelos seus personagens) veem um botão por valor guardado que ajuda: no teste de alguém do mesmo lado (o
  próprio ou um aliado, pela disposição do token), o valor toma o lugar do menor dado, se for maior; no de um inimigo,
  o do maior, se for menor. O clique tira o dado do Presságio e chama o `adjustCardRoll` (o Crítico e a Falha seguem os
  dados novos, os acertos são julgados de novo). Os dados somem no fim do combate. A fórmula `@omen` é a soma dos
  dados do Presságio de quem usa (O Fim Já Escrito, com `omenSpend`).
- **Fora do turno:** a janela fica em `flags.eternia.window` com a chave do momento do combate. Enquanto a chave vale,
  uma habilidade de Movimento, Menor ou Maior cuja ação a janela tem é usada fora do turno (ou, no turno, depois das
  ações do turno) e gasta a ação da janela. O Lampejo Divino (`offTurn`) só é usado quando o último a agir na rodada é
  outra criatura.
- **Imortal:** a [Regeneração] dos Traços com `immortal` é dada na Manutenção de cada rodada a quem tem menos; o Fôlego
  Extra é o `revive` da base.
- **Reino:** o efeito com `realm` fica em quem conjura até o fim da cena; quem estiver a até `radius` Qd do token dele
  recebe os estados da regra quando o efeito chega e em cada Manutenção (quem já tem o estado com esse Valor ou mais
  fica como está; as imunidades valem).

## Ganchos das condições

Rodam só no cliente que fez a mudança (o dono do ator ou o Mestre).

| Gancho | Argumentos | Quando |
|---|---|---|
| `eternia.recovered` | `actor, { amount, what, from }` | o ator recuperou PV: cartão de cura, Regeneração do Encerramento, `takeHealing` (Dreno), a cura da Inversão |
| `eternia.freed` | `actor, { statuses, by }` | saíram Estados Negativos: pelo Livrar-se (`by: "action"`) ou por um efeito que remove estados (`"effect"`) |
| `eternia.attacked` | `attacker, { message, combat, round, previous }` | o Mestre principal registrou um cartão de ataque (`flags.eternia.attacked`; `previous` = a rodada do ataque anterior no mesmo combate) |
| `eternia.processEnd` | `actor, combat, { attacked, lost }` | acabou o turno do ator (depois do Ímpeto e do Combo); `lost`: perdeu o turno para um estado |
| `eternia.skillUsed` | `item, { actor, action, targets, message }` | uma habilidade foi usada (o cartão postado, os custos pagos), com os alvos marcados (`automation/use.mjs`) |
| `eternia.revived` | `actor, { effect, hp, left }` | gastou um Fôlego Extra |
| `eternia.damaged`, `eternia.defeated`, `eternia.healed` | (veja `helpers/combat-cards.mjs`) | o cartão de dano tirou PV, levou a 0, curou |

`attackedThisRound(actor, combat)` (`conditions/turns.mjs`) diz se o ator atacou na rodada atual.

## Para macros

```js
game.eternia.applyStatus(actor, "burning", { value: 3 });       // como os efeitos de habilidade
game.eternia.applyStatus(actor, "counter", {});                  // Contragolpe sem tipo: devolve qualquer ataque
game.eternia.applyStatus(actor, "charmed", { from: vampire });   // com origem
game.eternia.applyStatus(actor, "clones", { value: 2 });          // soma: Clones até 6
game.eternia.conditions.recover(actor, "prone");                 // livra-se gastando a ação da regra
game.eternia.conditions.damage(actor, 4, { reason: "poisoned" }); // dano de condição, com linha no chat
```
