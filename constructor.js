// ==UserScript==
// @name                Upador Automático Tribal Wars
// @namespace           Murilo KZC
// @include             **screen=main*
// @version             0.0.5
// @copyright           2018, Tribalwarsbr100 (https://openuserjs.org//users/Tribalwarsbr100)
// @license             AGPL-3.0-or-later
// @supportURL          https://github.com/tribalwarsbr100/Upador-Tribal-Wars/issues
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// @grant               none
// ==/UserScript==


/*##############################################

Lógica inicial de Programação obtida através de um tutorial
Denominado "Os 5 primeiros dias - Modo Novato"
Imagens também do mesmo
Autoria: senson

https://forum.tribalwars.com.br/index.php?threads/os-5-primeiros-dias-modo-novato.334845/#post-3677800

##############################################*/


//*************************** CONFIGURAÇÃO ***************************//
// Escolha Tempo de espera mínimo e máximo entre ações (em milissegundos)
const Min_Tempo_Espera = 800000; // 13 minutos 20 segundos
const Max_Tempo_Espera = 900000; // 15 minutos

// Etapa_1: Upar o bot automaticamente em Série de Edifícios
const Etapa = "Etapa_1";

// Escolha se você deseja que o bot enfileire os edifícios na ordem definida (= true) ou
// assim que um prédio estiver disponível para a fila de construção (= false)
const Construção_Edificios_Ordem = true;

// Configuração para coletar recompensas de quests
const Quest_Interval_Minutes = 10; // em minutos, padrão 10
const Quest_Interval = Quest_Interval_Minutes * 60 * 1000;

//*************************** /CONFIGURAÇÃO ***************************//

// Constantes (NÃO DEVE SER ALTERADAS)
const Visualização_Geral = "OVERVIEW_VIEW";
const Edificio_Principal = "HEADQUARTERS_VIEW";

(function () {
    'use strict';

    console.log("-- Script do Tribal Wars ativado --");

    // Criar a UI para exibir o próximo edifício
    createBuildingUI();

    if (Etapa === "Etapa_1") {
        executarEtapa1();
    }

    // Configurar intervalo para coletar recompensas de quests
    setInterval(collectQuestRewards, Quest_Interval);

})();

//*************************** FUNÇÕES DE CONSTRUÇÃO ***************************//

// Etapa 1: Construção
function executarEtapa1() {
    let Evoluir_vilas = getEvoluir_vilas();
    console.log("Evoluir_vilas: " + Evoluir_vilas);
    if (Evoluir_vilas === Edificio_Principal) {
        setInterval(function () {
            // Construir qualquer edifício custeável, se possível
            Proxima_Construção();
        }, 1000);
    }
    else if (Evoluir_vilas === Visualização_Geral) {
        // Visualização Geral PG
        let l_main = document.getElementById("l_main");
        if (l_main && l_main.children.length > 0 && l_main.children[0].children.length > 0) {
            l_main.children[0].children[0].click();
            console.log("Clicou no botão de Visualização Geral.");
        }
        else {
            console.log("Botão de Visualização Geral não encontrado.");
        }
    }
}

// Gerenciamento da fila de construção
setInterval(function () {
    var tr = $('#buildqueue').find('tr').eq(1);

    if (tr.length > 0) {
        let text = tr.find('td').eq(1).find('span').eq(0).text().trim().replace(/\s/g, "");
        let timeSplit = text.split(':');

        if (timeSplit.length === 3) {
            let seconds = parseInt(timeSplit[0], 10) * 60 * 60 + parseInt(timeSplit[1], 10) * 60 + parseInt(timeSplit[2], 10);
            if (seconds < 3 * 60) {
                console.log("Completar Grátis");
                tr.find('td').eq(2).find('a').eq(2).click();
            }
        }
    }

    // Missão concluída - Tenta clicar em qualquer botão de confirmação visível
    $('.btn.btn-confirm-yes').each(function () {
        if (!$(this).hasClass('hidden') && !$(this).is(':disabled')) {
            $(this).click();
            console.log("Clicou no botão de confirmação.");
        }
    });

}, 500);

// Ação do processo
let delay = Math.floor(Math.random() * (Max_Tempo_Espera - Min_Tempo_Espera) + Min_Tempo_Espera);

// Ação do processo após o delay
setTimeout(function () {
    let Evoluir_vilas = getEvoluir_vilas();
    console.log("Ação após delay. Evoluir_vilas: " + Evoluir_vilas);
    if (Evoluir_vilas === Edificio_Principal) {
        // Construir qualquer edifício custeável, se possível
        Proxima_Construção();
    }
    else if (Evoluir_vilas === Visualização_Geral) {
        // Visualização Geral Pag
        let l_main = document.getElementById("l_main");
        if (l_main && l_main.children.length > 0 && l_main.children[0].children.length > 0) {
            l_main.children[0].children[0].click();
            console.log("Clicou no botão de Visualização Geral.");
        }
        else {
            console.log("Botão de Visualização Geral não encontrado.");
        }
    }
}, delay);

function getEvoluir_vilas() {
    let currentUrl = window.location.href;
    console.log("Current URL: " + currentUrl); // Para depuração

    if (currentUrl.includes('overview') || currentUrl.includes('Visualização Geral')) {
        return Visualização_Geral;
    }
    else if (currentUrl.includes('main')) {
        return Edificio_Principal;
    }
    else {
        console.log("Não foi possível determinar a visualização atual.");
        return undefined;
    }
}

function Proxima_Construção() {
    let Construção_proximo_edificio = getConstrução_proximo_edificio();
    if (Construção_proximo_edificio !== undefined) {
        Construção_proximo_edificio.click();
        console.log("Clicked on " + Construção_proximo_edificio.id);

        // Utilizar o ID do botão de construção para exibir na UI
        let buildingID = Construção_proximo_edificio.id;
        updateBuildingUI(buildingID);
        console.log("Próximo Edifício: " + buildingID);
    }
}

function getConstrução_proximo_edificio() {
    let Construção_Edifcios_Serie = getConstrução_Edifcios_Serie();
    let instituir;
    while (instituir === undefined && Construção_Edifcios_Serie.length > 0) {
        var proximo = Construção_Edifcios_Serie.shift();
        let próximo_edifício = document.getElementById(proximo);
        if (próximo_edifício) {
            var Visivel = próximo_edifício.offsetWidth > 0 || próximo_edifício.offsetHeight > 0;
            if (Visivel) {
                instituir = próximo_edifício;
            }
            if (Construção_Edificios_Ordem) {
                break;
            }
        }
    }
    return instituir;
}
function getConstrução_Edifcios_Serie() {
    var Sequência_Construção = [];

    // Edificios Inicial conforme figura: https://i.imgur.com/jPuHuHN.png

    //*************************** QUEST ***************************//
    // Construção Madeira 1
    Sequência_Construção.push("main_buildlink_wood_1");
    // Construção Argila 1
    Sequência_Construção.push("main_buildlink_stone_1");
    // Construção Ferro 1
    Sequência_Construção.push("main_buildlink_iron_1");
    // Construção Madeira 2
    Sequência_Construção.push("main_buildlink_wood_2");
    // Construção Argila 2
    Sequência_Construção.push("main_buildlink_stone_2");
    // Construção Edificio Principal 2
    Sequência_Construção.push("main_buildlink_main_2");
    // Construção Edificio Principal 3
    Sequência_Construção.push("main_buildlink_main_3");
    // Construção Quartel 1
    Sequência_Construção.push("main_buildlink_barracks_1");
    // Construção Madeira 3
    Sequência_Construção.push("main_buildlink_wood_3");
    // Construção Argila 3
    Sequência_Construção.push("main_buildlink_stone_3");
    // Construção Quartel 2
    Sequência_Construção.push("main_buildlink_barracks_2");

    //------------- Atacar Aldeia Barbara ------------------//

    // Construção Armazém 2
    Sequência_Construção.push("main_buildlink_storage_2");
    // Construção Ferro 2
    Sequência_Construção.push("main_buildlink_iron_2");
    // Construção Armazém 3
    Sequência_Construção.push("main_buildlink_storage_3");

    //---------------- Recrutar Lanceiro -----------------//

    // Construção Quartel 3
    Sequência_Construção.push("main_buildlink_barracks_3");
    // Construção Estatua 1
    Sequência_Construção.push("main_buildlink_statue_1");
    // Construção Fazenda 2
    Sequência_Construção.push("main_buildlink_farm_2");
    // Construção Ferro 3
    Sequência_Construção.push("main_buildlink_iron_3");
    // Construção Edificio Principal 4
    Sequência_Construção.push("main_buildlink_main_4");
    // Construção Edificio Principal 5
    Sequência_Construção.push("main_buildlink_main_5");
    // Construção Ferreiro 1
    Sequência_Construção.push("main_buildlink_smith_1");
    // Construção Madeira 4
    Sequência_Construção.push("main_buildlink_wood_4");
    // Construção Argila 4
    Sequência_Construção.push("main_buildlink_stone_4");

    //---------------- Recrutar Paladino - Escolher Bandeira -  -----------------//

    // Construção Muralha 1
    Sequência_Construção.push("main_buildlink_wall_1");
    // Construção Esconderijo 2
    Sequência_Construção.push("main_buildlink_hide_2");
    // Construção Esconderijo 3
    Sequência_Construção.push("main_buildlink_hide_3");
    // Construção Madeira 5
    Sequência_Construção.push("main_buildlink_wood_5");
    // Construção Argila 5
    Sequência_Construção.push("main_buildlink_stone_5");
    // Construção Mercado 1
    Sequência_Construção.push("main_buildlink_market_1");
    // Construção Madeira 6
    Sequência_Construção.push("main_buildlink_wood_6");
    // Construção Argila 6
    Sequência_Construção.push("main_buildlink_stone_6");
    // Construção Fazenda 3
    Sequência_Construção.push("main_buildlink_farm_3");
    // Construção Fazenda 4
    Sequência_Construção.push("main_buildlink_farm_4");
    // Construção Fazenda 5
    Sequência_Construção.push("main_buildlink_farm_5");
    // Construção Madeira 7
    Sequência_Construção.push("main_buildlink_wood_7");
    // Construção Argila 7
    Sequência_Construção.push("main_buildlink_stone_7");
    // Construção Ferro 4
    Sequência_Construção.push("main_buildlink_iron_4");
    // Construção Ferro 5
    Sequência_Construção.push("main_buildlink_iron_5");
    // Construção Ferro 6
    Sequência_Construção.push("main_buildlink_iron_6");
    // Construção Madeira 8
    Sequência_Construção.push("main_buildlink_wood_8");
    // Construção Argila 8
    Sequência_Construção.push("main_buildlink_stone_8");
    // Construção Ferro 7
    Sequência_Construção.push("main_buildlink_iron_7");
    // Construção Madeira 9
    Sequência_Construção.push("main_buildlink_wood_9");
    // Construção Argila 9
    Sequência_Construção.push("main_buildlink_stone_9");
    // Construção Madeira 10
    Sequência_Construção.push("main_buildlink_wood_10");
    // Construção Fazenda 6
    Sequência_Construção.push("main_buildlink_farm_6");
    Sequência_Construção.push("main_buildlink_farm_7");
    // Construção Argila 10
    Sequência_Construção.push("main_buildlink_stone_10");
    Sequência_Construção.push("main_buildlink_storage_5");
    // arma 6
    Sequência_Construção.push("main_buildlink_storage_6");
    // Construção Armazém 7
    Sequência_Construção.push("main_buildlink_storage_7");
    // arma8
    Sequência_Construção.push("main_buildlink_storage_8");
    // Construção Armazém 9
    Sequência_Construção.push("main_buildlink_storage_9");


    //---------------- https://image.prntscr.com/image/oMwaEPpCR2_1XaHzlMaobg.png -  -----------------//

    // Construção Madeira 11
    Sequência_Construção.push("main_buildlink_wood_11");
    // Construção Argila 11
    Sequência_Construção.push("main_buildlink_stone_11");
    // Construção Madeira 12
    Sequência_Construção.push("main_buildlink_wood_12");
    // Construção Argila 12
    Sequência_Construção.push("main_buildlink_stone_12");
    // Construção Armazém 7
    // Sequência_Construção.push("main_buildlink_storage_10");
    // Construção Ferro 8
    Sequência_Construção.push("main_buildlink_iron_8");
    // Construção Armazém 8
    // Sequência_Construção.push("main_buildlink_storage_11");
    // Construção Ferro 9
    Sequência_Construção.push("main_buildlink_iron_9");
    // Construção Ferro 10
    Sequência_Construção.push("main_buildlink_iron_10");

    //---------------- https://image.prntscr.com/image/n6tBlPGORAq9RmqSVccTKg.png -  -----------------//

    // Construção Madeira 13
    Sequência_Construção.push("main_buildlink_wood_13");
    // Construção Argila 13
    Sequência_Construção.push("main_buildlink_stone_13");
    //Construção Fazenda 8
    Sequência_Construção.push("main_buildlink_farm_8");
    //Construção Fazenda 9
    Sequência_Construção.push("main_buildlink_farm_9");
    // Construção Ferro 11
    Sequência_Construção.push("main_buildlink_iron_11");

    // Construção Ferro 12
    Sequência_Construção.push("main_buildlink_iron_12");

    //---------------- https://image.prntscr.com/image/ERCLrS5cT32ntSv1IevLUg.png -  -----------------//

    // Construção Muralha 2
    //     Sequência_Construção.push("main_buildlink_wall_2");
    // Construção Muralha 3
    //     Sequência_Construção.push("main_buildlink_wall_3");
    // Construção Muralha 4
    //     Sequência_Construção.push("main_buildlink_wall_4");
    // Construção Muralha 5
    //     Sequência_Construção.push("main_buildlink_wall_5");
    // Construção Ferro 13
    Sequência_Construção.push("main_buildlink_iron_13");
    // Construção Ferro 14
    Sequência_Construção.push("main_buildlink_iron_14");

    //---------------- https://image.prntscr.com/image/V15bxH7KSFa5gu3d02yYIQ.png -  -----------------//



    //---------------- https://image.prntscr.com/image/3pioalUXRK6AH9wNYnRxyQ.png -  -----------------//


    //     Sequência_Construção.push("main_buildlink_stable_3");
    // Construção Armazém 11
    Sequência_Construção.push("main_buildlink_storage_12");
    // Construção Fazenda 10
    Sequência_Construção.push("main_buildlink_farm_10");
    //Construção Fazenda 11
    Sequência_Construção.push("main_buildlink_farm_11");
    // Construção Fazenda 12
    Sequência_Construção.push("main_buildlink_farm_12");
    // Construção Armazém 12
    Sequência_Construção.push("main_buildlink_storage_13");
    // Construção Madeira 14
    Sequência_Construção.push("main_buildlink_wood_14");
    // Construção Argila 14
    Sequência_Construção.push("main_buildlink_stone_14");
    // Construção Madeira 15
    Sequência_Construção.push("main_buildlink_wood_15");
    // Construção Argila 15
    Sequência_Construção.push("main_buildlink_stone_15");
    // Construção Armazém 13
    Sequência_Construção.push("main_buildlink_storage_14");
    //     Sequência_Construção.push("main_buildlink_wall_9");
    // Construção Armazém 14
    //     Sequência_Construção.push("main_buildlink_barracks_9");
    // Construção Armazém 15
    //     Sequência_Construção.push("main_buildlink_main_12");
    // Construção Armazém 16
    Sequência_Construção.push("main_buildlink_storage_15");
    // Construção Armazém 17
    //     Sequência_Construção.push("main_buildlink_main_13");
    // Construção Fazenda 13
    Sequência_Construção.push("main_buildlink_farm_13");
    // Construção Fazenda 14
    //     Sequência_Construção.push("main_buildlink_main_14");
    // Construção Madeira 16
    Sequência_Construção.push("main_buildlink_wood_16");
    // Construção Argila 16
    //     Sequência_Construção.push("main_buildlink_main_15");
    // Construção Madeira 17
    Sequência_Construção.push("main_buildlink_wood_17");
    // Construção Argila 17
    Sequência_Construção.push("main_buildlink_stone_17");
    // Construção Edificio Principal 16
    // Construção Estabulo 4
    Sequência_Construção.push("main_buildlink_storage_16");
    // Construção Armazém 19
    Sequência_Construção.push("main_buildlink_storage_17");
    //     Sequência_Construção.push("main_buildlink_barracks_12");
    // Construção Ferro 15
    Sequência_Construção.push("main_buildlink_iron_15");
    // Construção Ferro 16
    Sequência_Construção.push("main_buildlink_iron_16");
    // Construção Fazenda 15
    Sequência_Construção.push("main_buildlink_farm_15");
    // Construção Fazenda 16
    //     Sequência_Construção.push("main_buildlink_wall_10");
    // Construção Fazenda 17
    Sequência_Construção.push("main_buildlink_farm_17");
    //     Sequência_Construção.push("main_buildlink_wall_11");
    // Construção Fazenda 18
    //     Sequência_Construção.push("main_buildlink_wall_12");
    // Construção Mercado 7
    //     Sequência_Construção.push("main_buildlink_market_7");
    // Construção Mercado 8
    //     Sequência_Construção.push("main_buildlink_market_8");
    // Construção Mercado 9
    //     Sequência_Construção.push("main_buildlink_market_9");
    // Construção Ferreiro 12
    //     Sequência_Construção.push("main_buildlink_smith_12");
    // Construção Mercado 10
    //     Sequência_Construção.push("main_buildlink_market_10");
    // Construção Madeira 18
    Sequência_Construção.push("main_buildlink_wood_18");
    // Construção Argila 18
    //     Sequência_Construção.push("main_buildlink_smith_13");
    // Construção Madeira 19
    Sequência_Construção.push("main_buildlink_wood_19");
    // Construção Argila 19
    Sequência_Construção.push("main_buildlink_stone_19");
    // Construção Fazenda 19
    //     Sequência_Construção.push("main_buildlink_smith_14");
    // Construção Muralha 13
    //     Sequência_Construção.push("main_buildlink_wall_13");
    // Construção Ferro 16
    Sequência_Construção.push("main_buildlink_iron_16");
    // Construção Ferro 17
    //     Sequência_Construção.push("main_buildlink_smith_15");
    // Construção Edificio Principal 17
    //     Sequência_Construção.push("main_buildlink_main_17");
    // Construção Edificio Principal 18
    //     Sequência_Construção.push("main_buildlink_main_18");
    // Construção Edificio Principal 19
    //     Sequência_Construção.push("main_buildlink_main_19");
    // Construção Edificio Principal 20
    //     Sequência_Construção.push("main_buildlink_main_20");
    // Construção Armazém 20
    Sequência_Construção.push("main_buildlink_storage_18");
    // Construção Armazém 21
    Sequência_Construção.push("main_buildlink_storage_19");
    // Construção Armazém 22
    Sequência_Construção.push("main_buildlink_storage_20");
    // Construção Armazém 23
    Sequência_Construção.push("main_buildlink_storage_21");
    // Construção Madeira 20
    Sequência_Construção.push("main_buildlink_wood_20");
    // Construção Argila 20
    Sequência_Construção.push("main_buildlink_stone_20");
    // Construção Ferreiro 16
    // Sequência_Construção.push("main_buildlink_smith_16");
    // Construção Ferreiro 17
    // Sequência_Construção.push("main_buildlink_smith_17");
    // Construção Ferro 18
    Sequência_Construção.push("main_buildlink_iron_18");
    // Construção Madeira 20
    Sequência_Construção.push("main_buildlink_wood_21");
    // Construção Argila 20
    Sequência_Construção.push("main_buildlink_stone_21");
    //     Sequência_Construção.push("main_buildlink_stable_9");
    // Construção Fazenda 20
    //     Sequência_Construção.push("main_buildlink_farm_20");
    // Construção Muralha 14
    //     Sequência_Construção.push("main_buildlink_wall_14");
    // Construção Muralha 15
    //     Sequência_Construção.push("main_buildlink_wall_15");
    // Construção Fazenda 21
    //     Sequência_Construção.push("main_buildlink_farm_21");
    // Construção Armazém 24
    Sequência_Construção.push("main_buildlink_storage_22");
    // Construção Ferro 19
    Sequência_Construção.push("main_buildlink_iron_19");
    // Construção Madeira 21
    Sequência_Construção.push("main_buildlink_wood_21");
    // Construção Argila 21
    Sequência_Construção.push("main_buildlink_stone_21");
    // Construção Madeira 22
    Sequência_Construção.push("main_buildlink_wood_22");
    // Construção Argila 22
    Sequência_Construção.push("main_buildlink_stone_22");
    // Construção Armazém 25
    // Sequência_Construção.push("main_buildlink_storage_17");
    // Construção Madeira 23
    Sequência_Construção.push("main_buildlink_wood_23");
    // Construção Argila 23
    Sequência_Construção.push("main_buildlink_stone_23");
    // Construção Ferro 20
    Sequência_Construção.push("main_buildlink_iron_20");
    // Construção Ferro 21
    Sequência_Construção.push("main_buildlink_iron_21");
    // Construção Ferro 22
    Sequência_Construção.push("main_buildlink_iron_22");
    // Construção Fazenda 22
    Sequência_Construção.push("main_buildlink_farm_22");
    // Construção Madeira 24
    Sequência_Construção.push("main_buildlink_wood_24");
    // Construção Argila 24
    Sequência_Construção.push("main_buildlink_stone_24");
    // Construção Ferro 23
    Sequência_Construção.push("main_buildlink_iron_23");
    // Construção Madeira 24
    Sequência_Construção.push("main_buildlink_wood_25");
    // Construção Argila 24
    Sequência_Construção.push("main_buildlink_stone_25");
    // Construção Ferro 22
    Sequência_Construção.push("main_buildlink_iron_24");
    // Construção Armazém 26
    Sequência_Construção.push("main_buildlink_storage_23");
    // Construção Muralha 19
    Sequência_Construção.push("main_buildlink_wall_19");
    // Construção Armazém 27
    Sequência_Construção.push("main_buildlink_storage_24");
    // Construção Armazém 28
    Sequência_Construção.push("main_buildlink_storage_25");
    // Construção Muralha 20
    Sequência_Construção.push("main_buildlink_wall_20");
    // Construção Madeira 26
    Sequência_Construção.push("main_buildlink_wood_26");
    // Construção Argila 26
    Sequência_Construção.push("main_buildlink_stone_26");
    // Construção Ferro 25
    Sequência_Construção.push("main_buildlink_iron_25");
    // Construção Armazém 29
    Sequência_Construção.push("main_buildlink_storage_26");
    // Construção Armazém 30
    Sequência_Construção.push("main_buildlink_storage_27");
    // Construção Fazenda 26
    //Sequência_Construção.push("main_buildlink_farm_26");
    // Construção Fazenda 27
    //Sequência_Construção.push("main_buildlink_farm_27");
    // Construção Fazenda 28
    //Sequência_Construção.push("main_buildlink_farm_28");
    // Construção Fazenda 29
    //Sequência_Construção.push("main_buildlink_farm_29");
    // Construção Fazenda 30
    //Sequência_Construção.push("main_buildlink_farm_30");
    // Construção Oficina 7
    //Sequência_Construção.push("main_buildlink_garage_7");
    // Construção Estabulo 12
    //Sequência_Construção.push("main_buildlink_stable_12");
    // Construção Oficina 8
    //Sequência_Construção.push("main_buildlink_garage_8");
    // Construção Estabulo 13
    //Sequência_Construção.push("main_buildlink_stable_13");
    // Construção Edificio Principal 21
    //Sequência_Construção.push("main_buildlink_main_21");
    // Construção Oficina 9
    //Sequência_Construção.push("main_buildlink_garage_9");
    // Construção Estabulo 14
    //Sequência_Construção.push("main_buildlink_stable_14");
    // Construção Edificio Principal 22
    //Sequência_Construção.push("main_buildlink_main_22");
    // Construção Oficina 10
    //Sequência_Construção.push("main_buildlink_garage_10");
    // Construção Estabulo 15
    //Sequência_Construção.push("main_buildlink_stable_15");
    // Construção Quartel 17
    //Sequência_Construção.push("main_buildlink_barracks_17");
    // Construção Quartel 18
    //Sequência_Construção.push("main_buildlink_barracks_18");
    // Construção Quartel 19
    //Sequência_Construção.push("main_buildlink_barracks_19");
    // Construção Quartel 20
    //Sequência_Construção.push("main_buildlink_barracks_20");
    // Construção Madeira 27
    Sequência_Construção.push("main_buildlink_wood_27");
    // Construção Argila 27
    Sequência_Construção.push("main_buildlink_stone_27");
    // Construção Ferro 26
    Sequência_Construção.push("main_buildlink_iron_26");
    // Construção Madeira 28
    Sequência_Construção.push("main_buildlink_wood_28");
    // Construção Argila 28
    Sequência_Construção.push("main_buildlink_stone_28");
    // Construção Ferro 27
    Sequência_Construção.push("main_buildlink_iron_27");
    // Construção Madeira 29
    Sequência_Construção.push("main_buildlink_wood_29");
    // Construção Argila 29
    Sequência_Construção.push("main_buildlink_stone_29");
    // Construção Quartel 22
    //Sequência_Construção.push("main_buildlink_barracks_22");
    // Construção Ferro 28
    Sequência_Construção.push("main_buildlink_iron_28");
    // Construção Madeira 30
    Sequência_Construção.push("main_buildlink_wood_30");
    // Construção Argila 30
    Sequência_Construção.push("main_buildlink_stone_30");
    // Construção Quartel 23
    //Sequência_Construção.push("main_buildlink_barracks_23");
    // Construção Ferro 29
    Sequência_Construção.push("main_buildlink_iron_29");
    // Construção Ferro 30
    Sequência_Construção.push("main_buildlink_iron_30");


    return Sequência_Construção;

}

//*************************** NOVA FUNCIONALIDADE ***************************//

// Função para coletar recompensas de quests
function collectQuestRewards() {
    console.log("Iniciando coleta de recompensas de quests.");

    // Step 1: Verificar se o popup de quests já está aberto
    const popupContent = document.querySelector('.popup_box_content');
    if (popupContent && isElementVisible(popupContent)) {
        console.log("Popup de quests já está aberto.");
        processRewards();
        return;
    }

    // Step 2: Encontrar e clicar no botão que abre o popup de quests
    let questButton = document.querySelector('#new_quest');
    if (questButton) {
        questButton.click();
        console.log("Clicou no botão que abre o popup de quests.");
    } else {
        console.log("Botão para abrir o popup de quests não encontrado.");
        return;
    }

    // Step 3: Esperar até que o popup esteja aberto
    let popupOpenInterval = setInterval(function () {
        const popupContent = document.querySelector('.popup_box_content');
        if (popupContent && isElementVisible(popupContent)) {
            clearInterval(popupOpenInterval);
            console.log("Popup de quests aberto.");
            processRewards();
        }
    }, 500); // Verifica a cada 500ms
}

function processRewards() {
    // Step 4: Clicar na aba 'Recompensas' usando o seletor correto
    let recompensasTab = document.querySelector('a.tab-link[data-tab="reward-tab"]');
    if (recompensasTab) {
        recompensasTab.click();
        console.log("Clicou na aba 'Recompensas'.");
    } else {
        console.log("Aba 'Recompensas' não encontrada.");
        fecharPopup();
        return;
    }

    // Step 5: Esperar um pouco para a aba de recompensas carregar
    setTimeout(function () {
        // Step 6: Encontrar todos os botões 'Reivindicar'
        let reivindicarButtons = document.querySelectorAll('.reward-system-claim-button');
        if (reivindicarButtons.length > 0) {
            console.log(`Encontrou ${reivindicarButtons.length} botões 'Reivindicar'.`);
            reivindicarButtons.forEach(function (button, index) {
                if (!button.disabled && isElementVisible(button)) {
                    // Simular um pequeno atraso entre cliques para evitar detecção de bot
                    setTimeout(function () {
                        button.click();
                        console.log(`Clicou no botão 'Reivindicar' com data-reward-id=${button.getAttribute('data-reward-id')}.`);
                    }, index * 500); // 500ms entre cada clique
                }
            });
        } else {
            console.log("Nenhum botão 'Reivindicar' encontrado.");
        }

        // Step 7: Esperar um pouco para os diálogos de confirmação
        setTimeout(function () {
            // Step 8: Clicar nos botões de confirmação
            let confirmButtons = document.querySelectorAll('.btn.btn-confirm-yes');
            confirmButtons.forEach(function (button) {
                if (isElementVisible(button)) {
                    setTimeout(function () {
                        button.click();
                        console.log("Clicou no botão de confirmação.");
                    }, 500); // 500ms de atraso
                }
            });

            // Step 9: Fechar o popup
            setTimeout(function () {
                fecharPopup();
            }, 1000); // Espera 1 segundo antes de fechar
        }, 2000); // Espera 2 segundos para as confirmações aparecerem
    }, 1500); // Espera 1.5 segundos para a aba de recompensas carregar
}

function fecharPopup() {
    // Step 10: Encontrar e clicar no botão de fechar o popup
    // Tentando encontrar um botão de fechar com classes conhecidas
    let closeButton = document.querySelector('.popup_box_content a.close') ||
        document.querySelector('.popup_box_content a.popup_close') ||
        document.querySelector('.popup_box_content a.btn-close');
    if (closeButton && isElementVisible(closeButton)) {
        closeButton.click();
        console.log("Fechou o popup de quests clicando no botão de fechar.");
    } else {
        // Alternativa: tentar pressionar a tecla Esc
        console.log("Botão de fechar popup não encontrado. Tentando pressionar Esc.");
        let escEvent = new KeyboardEvent('keydown', { 'key': 'Escape', 'keyCode': 27, 'which': 27 });
        document.dispatchEvent(escEvent);
    }
}

// Função auxiliar para verificar a visibilidade de um elemento
function isElementVisible(element) {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

// Função para criar a UI de construção
function createBuildingUI() {
    // Verifica se a UI já existe para evitar duplicações
    if (document.getElementById('building-ui')) return;

    // Cria o container da UI
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

    // Adiciona a UI ao corpo do documento
    document.body.appendChild(uiContainer);
}

// Função para atualizar a UI com o próximo edifício
function updateBuildingUI(buildingID) {
    let ui = document.getElementById('building-ui');
    if (ui) {
        ui.innerHTML = `<strong>Próximo Edifício:</strong> ${buildingID}`;
    }
}

//*************************** /NOVA FUNCIONALIDADE ***************************//
