

// ==UserScript==
// @name                Upador Automático Tribal Wars com Recrutamento de Paladino e Verificação de População
// @namespace           Murilo KZC
// @include             **screen=main*
// @version             1.1.0
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// @grant               none
// @updateURL           https://raw.githubusercontent.com/kozac/twscripts/main/constructor.js
// @downloadURL         https://raw.githubusercontent.com/kozac/twscripts/main/constructor.js
// ==/UserScript==


//*************************** CONFIGURAÇÃO ***************************//
const Min_Tempo_Espera = 800000; // 13 minutos 20 segundos
const Max_Tempo_Espera = 900000; // 15 minutos
const Etapa = "Etapa_1";
const Construção_Edificios_Ordem = true;
const Quest_Interval_Minutes = 1;
const Quest_Interval = Quest_Interval_Minutes * 60 * 1000;
const NivelEstatuaAlvo = "Nível 1";
const COOKIE_RECRUTAMENTO = "recrutadoPaladino";
const DIAS_VALIDADE_COOKIE = 99;

// ***** CONFIGS PARA FAZENDA ***** //
const FARM_THRESHOLD = 0.90;     // Se >= 80%, prioriza a fazenda
const MAX_FARM_LEVEL = 30;       // Nível máximo permitido
// *************************** /CONFIGURAÇÃO ***************************//

const Visualização_Geral = "OVERVIEW_VIEW";
const Edificio_Principal = "HEADQUARTERS_VIEW";

let isRecruiting = false;
let currentVillageId = null;
let csrfToken = null;
let construindoFazenda = false; // Flag para saber se estamos forçando fazenda


(function () {
    'use strict';

    console.log("-- Script do Tribal Wars ativado --");

    // Criar a UI para exibir o próximo edifício
    createBuildingUI();

    if (Etapa === "Etapa_1") {
        executarEtapa1();
    }

    // Intervalos
    setInterval(collectQuestRewards, Quest_Interval);  // Coletar quests
    setInterval(verificarEstatua, 5000);               // Recrutar Paladino

})();

//*************************** FUNÇÕES DE CONSTRUÇÃO ***************************//
function executarEtapa1() {
    let Evoluir_vilas = getEvoluir_vilas();
    if (Evoluir_vilas === Edificio_Principal) {
        setInterval(function () {
            if (!isRecruiting) {
                Proxima_Construção();
            }
        }, 10000);
    }
    else if (Evoluir_vilas === Visualização_Geral) {
        let l_main = document.getElementById("l_main");
        if (l_main && l_main.children.length > 0 && l_main.children[0].children.length > 0) {
            l_main.children[0].children[0].click();
            console.log("Clicou no botão de Visualização Geral.");
        }
    }
}

// Verifica se a construção pode ser finalizada gratuitamente
setInterval(function () {
    var tr = $('#buildqueue').find('tr').eq(1);

    if (tr.length > 0) {
        let text = tr.find('td').eq(1).find('span').eq(0).text().trim().replace(/\s/g, "");
        let timeSplit = text.split(':');

        if (timeSplit.length === 3) {
            let seconds = parseInt(timeSplit[0], 10) * 3600
                + parseInt(timeSplit[1], 10) * 60
                + parseInt(timeSplit[2], 10);
            if (seconds < 3 * 60) {
                console.log("Completar Grátis");
                tr.find('td').eq(2).find('a').eq(2).click();
            }
        }
    }

    // Confirmações de missões, etc.
    $('.btn.btn-confirm-yes').each(function () {
        if (!$(this).hasClass('hidden') && !$(this).is(':disabled')) {
            $(this).click();
            console.log("Clicou no botão de confirmação.");
        }
    });
}, 500);

// Intervalo aleatório para chamar Proxima_Construção()
let delay = Math.floor(Math.random() * (Max_Tempo_Espera - Min_Tempo_Espera) + Min_Tempo_Espera);
setTimeout(function () {
    let Evoluir_vilas = getEvoluir_vilas();
    if (Evoluir_vilas === Edificio_Principal && !isRecruiting) {
        Proxima_Construção();
    }
    else if (Evoluir_vilas === Visualização_Geral) {
        let l_main = document.getElementById("l_main");
        if (l_main && l_main.children.length > 0 && l_main.children[0].children.length > 0) {
            l_main.children[0].children[0].click();
            console.log("Clicou no botão de Visualização Geral.");
        }
    }
}, delay);


// Verifica em qual tela estamos
function getEvoluir_vilas() {
    let currentUrl = window.location.href;

    if (currentUrl.includes('overview') || currentUrl.includes('Visualização Geral')) {
        return Visualização_Geral;
    }
    else if (currentUrl.includes('main')) {
        const urlParams = new URLSearchParams(window.location.search);
        currentVillageId = urlParams.get('village');
        csrfToken = getCSRFToken();
        return Edificio_Principal;
    }
    else {
        console.log("Não foi possível determinar a visualização atual.");
        return undefined;
    }
}

function getCSRFToken() {
    let csrfInput = document.querySelector('input[name="h"]');
    if (csrfInput) {
        return csrfInput.value;
    }
    let csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta) {
        return csrfMeta.getAttribute('content');
    }
    return null;
}

// ---------------------- LÓGICA PARA EVITAR VÁRIAS FAZENDAS NA FILA ----------------------
// Retorna true se houver uma construção de fazenda já na fila
function isFarmInQueue() {
    // Seletor: #buildqueue .buildorder_farm
    let farmQueueRow = document.querySelector('#buildqueue .buildorder_farm');
    return (farmQueueRow !== null);
}

// Retorna se a fazenda está acima do threshold (ex: 80%)
function isFarmOverThreshold() {
    const popCurrentEl = document.querySelector('#pop_current_label');
    const popMaxEl = document.querySelector('#pop_max_label');
    if (!popCurrentEl || !popMaxEl) return false;

    let currentPop = parseInt(popCurrentEl.innerText.trim());
    let maxPop = parseInt(popMaxEl.innerText.trim());
    if (isNaN(currentPop) || isNaN(maxPop)) return false;

    let ratio = currentPop / maxPop;
    console.log(`População: ${currentPop}/${maxPop} => ratio = ${(ratio * 100).toFixed(2)}%`);
    return ratio >= FARM_THRESHOLD;
}

function getFarmLevelFromDOM() {
    let farmSpan = document.querySelector('#main_buildrow_farm > td:nth-child(1) > span');
    if (!farmSpan) {
        // Tenta outra forma
        const link = document.querySelector('#main_buildlink_farm a');
        if (!link) return 0;
        let levelText = link.textContent.match(/\d+/);
        return levelText ? parseInt(levelText[0]) : 0;
    }
    let farmText = farmSpan.textContent.trim();
    let levelMatch = farmText.match(/\d+/);
    return levelMatch ? parseInt(levelMatch[0]) : 0;
}

function getFarmQueue() {
    let Sequência_Fazenda_Construção = [];
    for (let nivel = 2; nivel <= MAX_FARM_LEVEL; nivel++) {
        Sequência_Fazenda_Construção.push(`main_buildlink_farm_${nivel}`);
    }
    return Sequência_Fazenda_Construção;
}

// Retorna o próximo elemento de construção
function getConstrução_proximo_edificio(forcarFazenda = false) {
    let fila = forcarFazenda ? getFarmQueue() : getConstrução_Edifcios_Serie();
    let instituir;
    while (instituir === undefined && fila.length > 0) {
        let proximoId = fila.shift();
        let proximoEl = document.getElementById(proximoId);
        if (proximoEl) {
            var visivel = (proximoEl.offsetWidth > 0 || proximoEl.offsetHeight > 0);
            if (visivel) {
                instituir = proximoEl;
            }
            if (Construção_Edificios_Ordem) {
                break;
            }
        }
    }
    return instituir;
}

function Proxima_Construção() {
    // 1) Verifica condição para forçar fazenda
    let fazendaNivelAtual = getFarmLevelFromDOM();
    let fazendaLotada = isFarmOverThreshold();

    // Se a fazenda está acima do threshold E não está no nível máximo
    // OU se já estamos no modo fazenda
    if ((fazendaLotada && fazendaNivelAtual < MAX_FARM_LEVEL) || construindoFazenda) {
        construindoFazenda = true;
        console.log(`Modo Fazenda Ativo. Nível fazenda atual: ${fazendaNivelAtual}`);

        // Se a fazenda já estiver no máximo, sai do modo fazenda
        if (fazendaNivelAtual >= MAX_FARM_LEVEL) {
            console.log("Fazenda no nível máximo. Voltando à construção normal.");
            construindoFazenda = false;
        }
        else {
            // Antes de tentar construir outra fazenda, verifica se já tem uma na fila
            if (isFarmInQueue()) {
                console.log("Já existe FAZENDA na fila. Aguardando finalizar para não duplicar.");
                construindoFazenda = false;

                let proximoEdificio = getConstrução_proximo_edificio(construindoFazenda);
                if (proximoEdificio) {
                    proximoEdificio.click();
                    updateBuildingUI(proximoEdificio.id);
                    console.log("Próximo Edifício:", proximoEdificio.id);
                }
            }
        }
    }
    else {
        // Caso não esteja lotada ou já resolvido, sai do modo fazenda
        construindoFazenda = false;
    }

    // 2) Seleciona a fila apropriada
    let proximoEdificio = getConstrução_proximo_edificio(construindoFazenda);
    if (proximoEdificio) {
        proximoEdificio.click();
        updateBuildingUI(proximoEdificio.id);
        console.log("Próximo Edifício:", proximoEdificio.id);
    }
}

function getConstrução_Edifcios_Serie() {
    var Sequência_Construção = [];

    // Estatua 1
    Sequência_Construção.push("main_buildlink_statue_1");
    // Bosque 1
    Sequência_Construção.push("main_buildlink_wood_1");
    // Argila 1
    Sequência_Construção.push("main_buildlink_stone_1");
    // Ferro 1
    Sequência_Construção.push("main_buildlink_iron_1");
    // Bosque 2
    Sequência_Construção.push("main_buildlink_wood_2");
    // Argila 2
    Sequência_Construção.push("main_buildlink_stone_2");
    // Ferro 2
    Sequência_Construção.push("main_buildlink_iron_2");
    // Bosque 3
    Sequência_Construção.push("main_buildlink_wood_3");
    // Armazém 2
    Sequência_Construção.push("main_buildlink_storage_2");
    // Armazém 3
    Sequência_Construção.push("main_buildlink_storage_3");
    // Edifício Principal 2
    Sequência_Construção.push("main_buildlink_main_2");
    // Edifício Principal 3
    Sequência_Construção.push("main_buildlink_main_3");
    // Quartel 1
    Sequência_Construção.push("main_buildlink_barracks_1");
    // Mercado 1
    Sequência_Construção.push("main_buildlink_market_1");
    // Fazenda 2
    Sequência_Construção.push("main_buildlink_farm_2");
    // Fazenda 3
    Sequência_Construção.push("main_buildlink_farm_3");
    // Argila 3
    Sequência_Construção.push("main_buildlink_stone_3");
    // Ferro 3
    Sequência_Construção.push("main_buildlink_iron_3");
    // Armazém 4
    Sequência_Construção.push("main_buildlink_storage_4");
    // Muralha 1
    Sequência_Construção.push("main_buildlink_wall_1");
    // Muralha 2
    Sequência_Construção.push("main_buildlink_wall_2");
    // Mercado 2
    Sequência_Construção.push("main_buildlink_market_2");
    // Bosque 4
    Sequência_Construção.push("main_buildlink_wood_4");
    // Argila 4
    Sequência_Construção.push("main_buildlink_stone_4");
    // Ferro 4
    Sequência_Construção.push("main_buildlink_iron_4");
    // Esconderijo 2
    Sequência_Construção.push("main_buildlink_hide_2");
    // Esconderijo 3
    Sequência_Construção.push("main_buildlink_hide_3");
    // Quartel 2
    Sequência_Construção.push("main_buildlink_barracks_2");
    // Bosque 5
    Sequência_Construção.push("main_buildlink_wood_5");
    // Bosque 6
    Sequência_Construção.push("main_buildlink_wood_6");
    // Bosque 7
    Sequência_Construção.push("main_buildlink_wood_7");
    // Armazém 5
    Sequência_Construção.push("main_buildlink_storage_5");
    // Fazenda 4
    Sequência_Construção.push("main_buildlink_farm_4");
    // Fazenda 5
    Sequência_Construção.push("main_buildlink_farm_5");
    // Bosque 8
    Sequência_Construção.push("main_buildlink_wood_8");
    // Argila 5
    Sequência_Construção.push("main_buildlink_stone_5");
    // Argila 6
    Sequência_Construção.push("main_buildlink_stone_6");
    // Bosque 9
    Sequência_Construção.push("main_buildlink_wood_9");
    // Argila 7
    Sequência_Construção.push("main_buildlink_stone_7");
    // Ferro 5
    Sequência_Construção.push("main_buildlink_iron_5");
    // Armazém 6
    Sequência_Construção.push("main_buildlink_storage_6");
    // Fazenda 6
    Sequência_Construção.push("main_buildlink_farm_6");
    // Bosque 10
    Sequência_Construção.push("main_buildlink_wood_10");
    // Bosque 11
    Sequência_Construção.push("main_buildlink_wood_11");
    // Bosque 12
    Sequência_Construção.push("main_buildlink_wood_12");
    // Quartel 3
    Sequência_Construção.push("main_buildlink_barracks_3");
    // Quartel 4
    Sequência_Construção.push("main_buildlink_barracks_4");
    // Quartel 5
    Sequência_Construção.push("main_buildlink_barracks_5");
    // Argila 8
    Sequência_Construção.push("main_buildlink_stone_8");
    // Ferro 6
    Sequência_Construção.push("main_buildlink_iron_6");
    // Armazém 7
    Sequência_Construção.push("main_buildlink_storage_7");
    // Fazenda 7
    Sequência_Construção.push("main_buildlink_farm_7");
    // Armazém 8
    Sequência_Construção.push("main_buildlink_storage_8");
    // Edifício Principal 4
    Sequência_Construção.push("main_buildlink_main_4");
    // Edifício Principal 5
    Sequência_Construção.push("main_buildlink_main_5");
    // Ferreiro 1
    Sequência_Construção.push("main_buildlink_smith_1");
    // Bosque 13
    Sequência_Construção.push("main_buildlink_wood_13");
    // Argila 9
    Sequência_Construção.push("main_buildlink_stone_9");
    // Argila 10
    Sequência_Construção.push("main_buildlink_stone_10");
    // Ferro 7
    Sequência_Construção.push("main_buildlink_iron_7");
    // Armazém 9
    Sequência_Construção.push("main_buildlink_storage_9");
    // Fazenda 8
    Sequência_Construção.push("main_buildlink_farm_8");
    // Bosque 14
    Sequência_Construção.push("main_buildlink_wood_14");
    // Argila 11
    Sequência_Construção.push("main_buildlink_stone_11");
    // Argila 12
    Sequência_Construção.push("main_buildlink_stone_12");
    // Ferro 8
    Sequência_Construção.push("main_buildlink_iron_8");
    // Quartel 6
    Sequência_Construção.push("main_buildlink_barracks_6");
    // Armazém 10
    Sequência_Construção.push("main_buildlink_storage_10");
    // Armazém 11
    Sequência_Construção.push("main_buildlink_storage_11");
    // Bosque 15
    Sequência_Construção.push("main_buildlink_wood_15");
    // Argila 13
    Sequência_Construção.push("main_buildlink_stone_13");
    // Ferro 9
    Sequência_Construção.push("main_buildlink_iron_9");
    // Fazenda 9
    Sequência_Construção.push("main_buildlink_farm_9");
    // Bosque 16
    Sequência_Construção.push("main_buildlink_wood_16");
    // Argila 14
    Sequência_Construção.push("main_buildlink_stone_14");
    // Ferro 10
    Sequência_Construção.push("main_buildlink_iron_10");
    // Armazém 12
    Sequência_Construção.push("main_buildlink_storage_12");
    // Bosque 17
    Sequência_Construção.push("main_buildlink_wood_17");
    // Argila 15
    Sequência_Construção.push("main_buildlink_stone_15");
    // Ferro 11
    Sequência_Construção.push("main_buildlink_iron_11");
    // Quartel 7
    Sequência_Construção.push("main_buildlink_barracks_7");
    // Quartel 8
    Sequência_Construção.push("main_buildlink_barracks_8");
    // Quartel 9
    Sequência_Construção.push("main_buildlink_barracks_9");
    // Bosque 18
    Sequência_Construção.push("main_buildlink_wood_18");
    // Ferro 12
    Sequência_Construção.push("main_buildlink_iron_12");
    // Ferro 13
    Sequência_Construção.push("main_buildlink_iron_13");
    // Argila 16
    Sequência_Construção.push("main_buildlink_stone_16");
    // Ferro 14
    Sequência_Construção.push("main_buildlink_iron_14");
    // Edifício Principal 6
    Sequência_Construção.push("main_buildlink_main_6");
    // Edifício Principal 7
    Sequência_Construção.push("main_buildlink_main_7");
    // Edifício Principal 8
    Sequência_Construção.push("main_buildlink_main_8");
    // Edifício Principal 9
    Sequência_Construção.push("main_buildlink_main_9");
    // Edifício Principal 10
    Sequência_Construção.push("main_buildlink_main_10");
    // Fazenda 10
    Sequência_Construção.push("main_buildlink_farm_10");
    // Armazém 13
    Sequência_Construção.push("main_buildlink_storage_13");
    // Ferreiro 2
    Sequência_Construção.push("main_buildlink_smith_2");
    // Ferreiro 3
    Sequência_Construção.push("main_buildlink_smith_3");
    // Ferreiro 4
    Sequência_Construção.push("main_buildlink_smith_4");
    // Ferreiro 5
    Sequência_Construção.push("main_buildlink_smith_5");
    // Estábulo 1
    Sequência_Construção.push("main_buildlink_stable_1");
    // Estábulo 2
    Sequência_Construção.push("main_buildlink_stable_2");
    // Estábulo 3
    Sequência_Construção.push("main_buildlink_stable_3");
    // Argila 17
    Sequência_Construção.push("main_buildlink_stone_17");
    // Armazém 14
    Sequência_Construção.push("main_buildlink_storage_14");
    // Armazém 15
    Sequência_Construção.push("main_buildlink_storage_15");
    // Argila 18
    Sequência_Construção.push("main_buildlink_stone_18");
    // Ferro 15
    Sequência_Construção.push("main_buildlink_iron_15");
    // Ferro 16
    Sequência_Construção.push("main_buildlink_iron_16");
    // Ferro 17
    Sequência_Construção.push("main_buildlink_iron_17");
    // Bosque 19
    Sequência_Construção.push("main_buildlink_wood_19");
    // Argila 19
    Sequência_Construção.push("main_buildlink_stone_19");
    // Ferro 18
    Sequência_Construção.push("main_buildlink_iron_18");
    // Bosque 20
    Sequência_Construção.push("main_buildlink_wood_20");
    // Argila 20
    Sequência_Construção.push("main_buildlink_stone_20");
    // Ferro 19
    Sequência_Construção.push("main_buildlink_iron_19");
    // Armazém 16
    Sequência_Construção.push("main_buildlink_storage_16");
    // Armazém 17
    Sequência_Construção.push("main_buildlink_storage_17");

    // Ciclo 1: Bosque 21, Argila 21, Ferro 20
    Sequência_Construção.push("main_buildlink_wood_21");
    Sequência_Construção.push("main_buildlink_stone_21");
    Sequência_Construção.push("main_buildlink_iron_20");

    // Ciclo 2: Bosque 22, Argila 22, Ferro 21 => depois Armazém 18
    Sequência_Construção.push("main_buildlink_wood_22");
    Sequência_Construção.push("main_buildlink_stone_22");
    Sequência_Construção.push("main_buildlink_iron_21");
    Sequência_Construção.push("main_buildlink_storage_18");

    // Ciclo 3: Bosque 23, Argila 23, Ferro 22
    Sequência_Construção.push("main_buildlink_wood_23");
    Sequência_Construção.push("main_buildlink_stone_23");
    Sequência_Construção.push("main_buildlink_iron_22");

    // Ciclo 4: Bosque 24, Argila 24, Ferro 23 => depois Armazém 19
    Sequência_Construção.push("main_buildlink_wood_24");
    Sequência_Construção.push("main_buildlink_stone_24");
    Sequência_Construção.push("main_buildlink_iron_23");
    Sequência_Construção.push("main_buildlink_storage_19");

    // Ciclo 5: Bosque 25, Argila 25, Ferro 24
    Sequência_Construção.push("main_buildlink_wood_25");
    Sequência_Construção.push("main_buildlink_stone_25");
    Sequência_Construção.push("main_buildlink_iron_24");

    // Ciclo 6: Bosque 26, Argila 26, Ferro 25 => depois Armazém 20
    Sequência_Construção.push("main_buildlink_wood_26");
    Sequência_Construção.push("main_buildlink_stone_26");
    Sequência_Construção.push("main_buildlink_iron_25");
    Sequência_Construção.push("main_buildlink_storage_20");

    // Ciclo 7: Bosque 27, Argila 27, Ferro 26
    Sequência_Construção.push("main_buildlink_wood_27");
    Sequência_Construção.push("main_buildlink_stone_27");
    Sequência_Construção.push("main_buildlink_iron_26");

    // Ciclo 8: Bosque 28, Argila 28, Ferro 27 => depois Armazém 21
    Sequência_Construção.push("main_buildlink_wood_28");
    Sequência_Construção.push("main_buildlink_stone_28");
    Sequência_Construção.push("main_buildlink_iron_27");
    Sequência_Construção.push("main_buildlink_storage_21");

    // Ciclo 9: Bosque 29, Argila 29, Ferro 28
    Sequência_Construção.push("main_buildlink_wood_29");
    Sequência_Construção.push("main_buildlink_stone_29");
    Sequência_Construção.push("main_buildlink_iron_28");

    // Ciclo 10: Bosque 30, Argila 30, Ferro 29 => depois Armazém 22
    Sequência_Construção.push("main_buildlink_wood_30");
    Sequência_Construção.push("main_buildlink_stone_30");
    Sequência_Construção.push("main_buildlink_iron_29");
    Sequência_Construção.push("main_buildlink_storage_22");

    // Ciclo 11: aqui, Bosque e Argila já estão no 30; faltava apenas Ferro = 29 -> 30
    Sequência_Construção.push("main_buildlink_iron_30");

    return Sequência_Construção;
}

//*************************** /FUNÇÕES DE CONSTRUÇÃO ***************************//


//*************************** NOVA FUNCIONALIDADE (PALADINO) ***************************//
function setCookie(nome, valor, dias) {
    const data = new Date();
    data.setTime(data.getTime() + (dias * 86400000));
    const expires = "expires=" + data.toUTCString();
    document.cookie = nome + "=" + valor + ";" + expires + ";path=/";
}
function getCookie(nome) {
    const nomeEQ = nome + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nomeEQ) === 0) return c.substring(nomeEQ.length, c.length);
    }
    return null;
}
function checkCookie(nome) {
    return getCookie(nome) !== null;
}
function eraseCookie(nome) {
    document.cookie = nome + '=; Max-Age=-99999999; path=/';
}

function verificarEstatua() {
    if (isRecruiting) return;
    if (checkCookie(COOKIE_RECRUTAMENTO)) {
        console.log("Recrutamento já realizado anteriormente.");
        return;
    }
    let buildings = getCurrentBuildings();
    if (!buildings) return;

    const statueElement = document.querySelector('#main_buildrow_statue > td:nth-child(1) > span');
    if (!statueElement) return;

    let nivelEstatua = statueElement.textContent;
    if (nivelEstatua == NivelEstatuaAlvo) {
        console.log("Estátua atingiu o nível alvo. Iniciando recrutamento do paladino.");
        iniciarRecrutamentoPaladino();
    }
}

function getCurrentBuildings() {
    if (typeof unsafeWindow !== 'undefined' &&
        unsafeWindow.game_data &&
        unsafeWindow.game_data.village &&
        unsafeWindow.game_data.village.buildings) {
        return unsafeWindow.game_data.village.buildings;
    }
    // Alternativamente, parse do DOM se necessário
    return null;
}

async function iniciarRecrutamentoPaladino() {
    isRecruiting = true;
    try {
        let recrutamentoResponse = await recrutarPaladino();
        if (recrutamentoResponse && recrutamentoResponse.knight && recrutamentoResponse.knight.id) {
            let knightId = recrutamentoResponse.knight.id;
            let aceleracaoResponse = await acelerarRecrutamento(knightId);

            if (aceleracaoResponse && aceleracaoResponse.error) {
                console.error("Erro ao acelerar o recrutamento:", aceleracaoResponse.error);
            }
            else {
                setCookie(COOKIE_RECRUTAMENTO, "true", DIAS_VALIDADE_COOKIE);
                console.log("Recrutamento bem-sucedido. Cookie definido.");
            }
        }
    } catch (error) {
        console.error("Erro durante o recrutamento do paladino:", error);
    } finally {
        isRecruiting = false;
    }
}

async function recrutarPaladino() {
    if (!currentVillageId || !csrfToken) return null;
    let url = `https://${window.location.host}/game.php?village=${currentVillageId}&screen=statue&ajaxaction=recruit`;
    let formData = new URLSearchParams();
    formData.append('home', currentVillageId);
    formData.append('name', 'Paul');
    formData.append('h', csrfToken);

    let response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: formData.toString(),
        credentials: 'include'
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

async function acelerarRecrutamento(knightId) {
    if (!currentVillageId || !csrfToken || !knightId) return null;
    let url = `https://${window.location.host}/game.php?village=${currentVillageId}&screen=statue&ajaxaction=recruit_rush`;
    let formData = new URLSearchParams();
    formData.append('knight', knightId);
    formData.append('home', currentVillageId);
    formData.append('h', csrfToken);

    let response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: formData.toString(),
        credentials: 'include'
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    let data = await response.json();
    console.log("Resposta da aceleração:", data);
    return data;
}
//*************************** /NOVA FUNCIONALIDADE ***************************//


//*************************** COLETAR RECOMPENSAS DAS QUESTS ***************************//
function collectQuestRewards() {
    console.log("Iniciando coleta de recompensas de quests.");
    const popupContent = document.querySelector('.popup_box_content');
    if (popupContent && isElementVisible(popupContent)) {
        processRewards();
        return;
    }
    let questButton = document.querySelector('#new_quest');
    if (questButton) {
        questButton.click();
        console.log("Clicou no botão que abre o popup de quests.");
    }
    else {
        return;
    }
    let popupOpenInterval = setInterval(function () {
        const popupContent = document.querySelector('.popup_box_content');
        if (popupContent && isElementVisible(popupContent)) {
            clearInterval(popupOpenInterval);
            processRewards();
        }
    }, 500);
}

function processRewards() {
    let recompensasTab = document.querySelector('a.tab-link[data-tab="reward-tab"]');
    if (recompensasTab) {
        recompensasTab.click();
    } else {
        fecharPopup();
        return;
    }
    setTimeout(function () {
        let reivindicarButtons = document.querySelectorAll('.reward-system-claim-button');
        if (reivindicarButtons.length > 0) {
            reivindicarButtons.forEach(function (button, index) {
                if (!button.disabled && isElementVisible(button)) {
                    setTimeout(function () {
                        button.click();
                    }, index * 500);
                }
            });
        }
        setTimeout(function () {
            let confirmButtons = document.querySelectorAll('.btn.btn-confirm-yes');
            confirmButtons.forEach(function (button) {
                if (isElementVisible(button)) {
                    setTimeout(function () {
                        button.click();
                    }, 500);
                }
            });
            setTimeout(function () {
                fecharPopup();
            }, 1000);
        }, 2000);
    }, 1500);
}

function fecharPopup() {
    let closeButton = document.querySelector('.popup_box_content a.close') ||
        document.querySelector('.popup_box_content a.popup_close') ||
        document.querySelector('.popup_box_content a.btn-close');
    if (closeButton && isElementVisible(closeButton)) {
        closeButton.click();
    } else {
        let escEvent = new KeyboardEvent('keydown', { 'key': 'Escape', 'keyCode': 27, 'which': 27 });
        document.dispatchEvent(escEvent);
    }
}

function isElementVisible(element) {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}
//*************************** /COLETAR RECOMPENSAS DAS QUESTS ***************************//


//*************************** CRIAÇÃO DE UI ***************************//
function createBuildingUI() {
    if (document.getElementById('building-ui')) return;
    let uiContainer = document.createElement('div');
    uiContainer.id = 'building-ui';
    uiContainer.style.position = 'fixed';
    uiContainer.style.top = '50px';
    uiContainer.style.left = '10px';
    uiContainer.style.padding = '10px';
    uiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    uiContainer.style.color = '#fff';
    uiContainer.style.fontSize = '14px';
    uiContainer.style.borderRadius = '5px';
    uiContainer.style.zIndex = '1000';
    uiContainer.style.fontFamily = 'Arial, sans-serif';
    uiContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    uiContainer.innerHTML = '<strong>Próximo Edifício:</strong> Nenhum';
    document.body.appendChild(uiContainer);
}

function updateBuildingUI(buildingID) {
    let ui = document.getElementById('building-ui');
    if (ui) {
        ui.innerHTML = `<strong>Próximo Edifício:</strong> ${buildingID}`;
    }
}
//*************************** /CRIAÇÃO DE UI ***************************//


//*************************** ÁUDIO IMPERCEPTÍVEL ***************************//
let audioCtx = null;
let oscillator = null;
let gainNode = null;
let audioIniciado = false;

function iniciarAudioImperceptivel() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
    }
    if (!oscillator) {
        oscillator = audioCtx.createOscillator();
        oscillator.frequency.value = 19000;
        oscillator.type = 'sine';

        gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.02;

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch((err) => {
            console.warn('Não foi possível retomar o AudioContext:', err);
        });
    }
    if (!audioIniciado && audioCtx.state === 'running') {
        oscillator.start();
        audioIniciado = true;
        console.log('Oscilador iniciado: deve aparecer o ícone de áudio na aba.');
    }
}

window.addEventListener('click', function onUserClick() {
    iniciarAudioImperceptivel();
});
//*************************** /ÁUDIO IMPERCEPTÍVEL ***************************//
