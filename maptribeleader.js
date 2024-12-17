javascript:(function(){
    var development = false;
    // declarando variáveis globais
    var options;
    var disabledUsers, playerIDs;
    var urls = [];
    var buildingUrls = [];
    var playerData = [];
    /* declarando variáveis globais */
    var mapOverlay = TWMap;
    var targetData = [];
    /* tamanhos definidos pelo usuário */
    var tileWidthX = TWMap.tileSize[0];
    var tileWidthY = TWMap.tileSize[1];
    var currentColor, totalColor;
    var currentCoords = "";
    this.watchtowerRadius = [1.1, 1.3, 1.5, 1.7, 2, 2.3, 2.6, 3, 3.4, 3.9, 4.4, 5.1, 5.8, 6.7, 7.6, 8.7, 10, 11.5, 13.1, 15];

    // armazenar imagens para o mapa
    var images = new Array();
    images[0] = new Image();
    images[1] = new Image();
    images[2] = new Image();
    images[0].src = ("/graphic//map/incoming_attack.png");
    images[1].src = ("/graphic/buildings/wall.png");
    images[2].src = ("/graphic/buildings/farm.png");

    var defaultColors = [{ "color": "#FF0000", "opacity": 0.3 }, { "color": "#FF5100", "opacity": 0.3 }, { "color": "#FFAE00", "opacity": 0.3 }, { "color": "#F2FF00", "opacity": 0.3 }, { "color": "#B7FF00", "opacity": 0.3 }, { "color": "#62FF00", "opacity": 0.3 }, { "color": "#04FF00", "opacity": 0.3 }, { "color": "#00FF7B", "opacity": 0.3 }, { "color": "#00FFAE", "opacity": 0.3 }, { "color": "#00C8FF", "opacity": 0.3 }, { "color": "#006AFF", "opacity": 0.3 }, { "color": "#1500FF", "opacity": 0.3 }, { "color": "#4000FF", "opacity": 0.3 }, { "color": "#8C00FF", "opacity": 0.3 }, { "color": "#FF00D9", "opacity": 0.3 }];
    if (localStorage.getItem("overwatchSettings")) {
        settingsData = JSON.parse(localStorage.getItem("overwatchSettings"));
        packetSize = settingsData.packetSize;
        minimum = settingsData.minimum;
        smallStack = settingsData.smallStack;
        mediumStack = settingsData.mediumStack;
        bigStack = settingsData.bigStack;
        unitPopValues = settingsData.unitPopValues;
        targetStackSize = bigStack;
    }
    else {
        var settingsData;
        var unitPopValues = {
            "spear": 1,
            "sword": 1,
            "archer": 1,
            "axe": 0,
            "spy": 0,
            "light": 0,
            "marcher": 0,
            "heavy": 4,
            "catapult": 2,
            "ram": 0,
            "knight": 2,
            "militia": 1,
            "snob": 0
        }
        var packetSize = 1000;
        var minimum = 500;
        var smallStack = 20000;
        var mediumStack = 40000;
        var bigStack = 60000;
        var targetStackSize = bigStack;
        overAllSettings = {
            "packetSize": packetSize,
            "minimum": minimum,
            "smallStack": smallStack,
            "mediumStack": mediumStack,
            "bigStack": bigStack,
            "playerSettings": settingsData,
            "unitPopValues": unitPopValues
        }
        localStorage.setItem("overwatchSettings", JSON.stringify(overAllSettings));
        settingsData = overAllSettings;
    }
    var selectedVillages = [];
    var playerSettingsVisible = true;
    var stackListCreatorVisible = false;
    var stackSizeVisible = false;
    
    // obtendo biblioteca jscolor para seleção de cores
    $.getScript("https://cdnjs.cloudflare.com/ajax/libs/jscolor/2.4.5/jscolor.min.js");
    
    // adicionar estilos
    
    $("#contentContainer").eq(0).prepend(`<style>
                        .overviewWithPadding th, .overviewWithPadding td{
                            padding: 2px 10px;
                        }
                        /* estilos de notificação*/

                        #overwatchNotification {
                            visibility: hidden; 
                            min-width: 250px; 
                            margin-left: -125px; 
                            background-color: #f4e4bc; 
                            color: #000; 
                            border: 1px solid #7d510f;
                            text-align: center; 
                            border-radius: 2px; 
                            padding: 16px; 
                            position: fixed; 
                            z-index: 1; 
                            left: 50%; 
                            top: 50px; 
                        }
                        
                        #overwatchNotification.show {
                            visibility: visible; 
                            -webkit-animation: fadein 0.5s, fadeout 0.5s 2.5s;
                            animation: fadein 0.5s, fadeout 0.5s 2.5s;
                        }
                        
                        /* Animações para desvanecer a notificação */
                        @-webkit-keyframes fadein {
                            from {top: 0; opacity: 0;}
                            to {top: 50px; opacity: 1;}
                        }
                        
                        @keyframes fadein {
                            from {top: 0; opacity: 0;}
                            to {top: 50px; opacity: 1;}
                        }
                        
                        @-webkit-keyframes fadeout {
                                from {top: 50px; opacity: 1;}
                                to {top: 0; opacity: 0;}
                        }
                        
                        @keyframes fadeout {
                            from {top: 50px; opacity: 1;}
                            to {top: 0; opacity: 0;}
                        }
                        </style>`);

    // coletar IDs de jogadores
    $.get("/game.php?screen=ally&mode=members_defense", function (membersDef) {
        options = $(membersDef).find('.input-nicer option:not(:first)');
        disabled = $(membersDef).find('.input-nicer option:not(:first):disabled');
        // obter usuários desativados
        disabledUsers = $.map(disabled, function (option) {
            return $(option).text().trim().match(/.+?(?= \()/);
        });
        playerIDs = $.map(options, function (option) {
            return option.value;
        });
        // obter todas as URLs para informações dos jogadores e edifícios
        playerIDs.forEach(element => {
            urls.push("/game.php?screen=ally&mode=members_defense&player_id=" + element)
        });
    })
        .done(function () {

            // coletar compartilhamento de edifícios
            $.get("/game.php?screen=ally&mode=members_buildings", function (membersBuildings) {
                buildingOptions = $(membersBuildings).find('.input-nicer option:not(:first)');

                playerBuildingIDs = $.map(buildingOptions, function (option) {
                    return option.value;
                });
                // obter todas as URLs para informações dos jogadores e edifícios
                playerBuildingIDs.forEach(element => {
                    buildingUrls.push("/game.php?screen=ally&mode=members_buildings&player_id=" + element)
                });
            })
                .done(function () {
                    if ($("#contentContainer")[0]) {
                        width = $("#contentContainer")[0].clientWidth;
                        $("#contentContainer").eq(0).prepend(`
                        <div id="progressbar" class="progress-bar progress-bar-alive">
                        <span id="count" class="label">0/${urls.length}</span>
                        <div id="progress"><span id="count2" class="label" style="width: ${width}px;">0/${urls.length}</span></div>
                        </div>`);
                    }
                    else {
                        width = $("#mobileHeader")[0].clientWidth;
                        $("#mobileHeader").eq(0).prepend(`
                        <div id="progressbar" class="progress-bar progress-bar-alive">
                        <span id="count" class="label">0/${urls.length}</span>
                        <div id="progress"><span id="count2" class="label" style="width: ${width}px;">0/${urls.length}</span></div>
                        </div>`);
                    }
                    getAllData();
                });
        });

    // função para espaçar requisições
    $.getAll = function (
        urls, // array de URLs
        onLoad, // chamado quando qualquer URL é carregada, parâmetros (índice, dados)
        onDone, // chamado quando todas as URLs são carregadas com sucesso, sem parâmetros
        onError // chamado quando uma URL falha ao carregar ou se onLoad lançar uma exceção, parâmetros (erro)
    ) {
        var numDone = 0;
        var lastRequestTime = 0;
        var minWaitTime = 200; // ms entre requisições
        loadNext();
        function loadNext() {
            if (numDone == urls.length) {
                onDone();
                return;
            }

            let now = Date.now();
            let timeElapsed = now - lastRequestTime;
            if (timeElapsed < minWaitTime) {
                let timeRemaining = minWaitTime - timeElapsed;
                setTimeout(loadNext, timeRemaining);
                return;
            }
            console.log('Obtendo ', urls[numDone]);
            $("#progress").css("width", `${(numDone + 1) / urls.length * 100}%`);
            $("#count").text(`${(numDone + 1)} / ${urls.length}`);
            $("#count2").text(`${(numDone + 1)} / ${urls.length}`);
            lastRequestTime = now;
            $.get(urls[numDone])
                .done((data) => {
                    try {
                        onLoad(numDone, data);
                        ++numDone;
                        loadNext();
                    } catch (e) {
                        onError(e);
                    }
                })
                .fail((xhr) => {
                    onError(xhr);
                })
        }
    };


    function getAllData() {
        // obter todas as contagens de ataques
        $.getAll(urls,
            (i, data) => {
                let attackCount;
                let playerName = $(data).find(".input-nicer option:selected").text().trim();
                let tribeName = $(data).find("#content_value h2")[0].innerText.split('(')[0].trim();
                if ($(data).find(".table-responsive table").length > 0) {
                    if ($(data).find('#ally_content img[src*="unit/att.png"]').length > 0) {
                        attackCount = $(data).find(".table-responsive table tr:first th:last")[0].innerText.replace(/[^0-9]/g, '');
                    }
                    else {
                        attackCount = "Peça ao usuário para compartilhar os incommings";
                    }
                }
                else {
                    attackCount = "Peça ao usuário para compartilhar os incommings";
                }
                // coletando informações das vilas
                let playerVillages = [];
                if ($(data).find('#ally_content img[src*="unit/att.png"]').length > 0) {
                    hasIncomings = true;
                }
                else {
                    hasIncomings = false;
                }
                
                table = $(data).find(".table-responsive table tr:not(:first)");
                for (let i = 0; i < table.length / 2; i++) {
                    let coordinate = table[i * 2].children[0].innerText.match(/\d+\|\d+/)[0];
                    // pegar unidades em cada vila
                    let unitsInVillage = {};
                    let unitsEnroute = {};
                    let currentPop = 0;
                    let totalPop = 0;
                    game_data.units.forEach((element, j) => {
                        unitsInVillage[element] = table[i * 2].children[j + 3].innerText.trim();
                        unitsEnroute[element] = table[i * 2 + 1].children[j + 1].innerText.trim() == "?" ? 0 : table[i * 2 + 1].children[j + 1].innerText.trim();
                        if (table[i * 2 + 1].children[j + 1].innerText.trim() == "?") {
                            attackCount = "Configurações necessárias não compartilhadas";
                        }
                        currentPop = currentPop + (unitsInVillage[element] * unitPopValues[game_data.units[j]]);
                        totalPop = totalPop + (unitsInVillage[element] * unitPopValues[game_data.units[j]]) + (parseInt(unitsEnroute[element]) * unitPopValues[game_data.units[j]]);
                    });
                    if (hasIncomings) {
                        attacksToVillage = table[i * 2].children[3 + game_data.units.length].innerText.trim();
                    }
                    else {
                        attacksToVillage = "---";
                    }
                    // armazenar informações da vila
                    //"unitsInVillage":unitsInVillage,"unitsEnroute":unitsEnroute,
                    playerVillages.push({ "coordinate": coordinate, "currentPop": currentPop, "totalPop": totalPop, "attacksToVillage": attacksToVillage, "unitsInVillage": unitsInVillage, "unitsEnroute": unitsEnroute });
                };
                // armazenar informações do jogador
                playerData.push({ "playerID": playerIDs[i], "tribeName": tribeName, "playerName": playerName, "attackCount": attackCount, "playerVillages": playerVillages })


            },
            () => {
                // adicionar níveis de watchtower dos jogadores
                $.getAll(buildingUrls,
                    (j, buildingTable) => {
                        if ($(buildingTable).find(".table-responsive")) {
                            if ($(buildingTable).find('#ally_content img[src*="buildings/watchtower.png"]').length > 0) {
                                console.log('watchtower encontrada')
                                let cellIndex = $(buildingTable).find('#ally_content img[src*="buildings/watchtower.png"]').parent().index();
                                let wallIndex = $(buildingTable).find('#ally_content img[src*="buildings/wall.png"]').parent().index();
                                let rows = $(buildingTable).find('#ally_content tr:nth-child(n+2)');
                                if (playerData[j].playerVillages.length == 0) {
                                    // nenhuma vila do jogador encontrada? deve não estar compartilhando dados em outra página, pegar coordenadas aqui
                                    let replaceVillages = [];
                                    for (let p = 0; p < rows.length; p++) {
                                        coordinate = rows[p].children[0].innerText.match(/\d+\|\d+/)[0];
                                        replaceVillages.push({ "coordinate": coordinate, "currentPop": 0, "totalPop": 0, "attacksToVillage": "---" });
                                    }
                                    playerData[j].playerVillages = replaceVillages;
                                }
                                for (let r = 0; r < rows.length; r++) {
                                    if (rows[r].children[cellIndex].innerText.trim() != 0) {
                                        playerData[j].playerVillages[r]["watchtower"] = parseInt(rows[r].children[cellIndex].innerText.trim());
                                    }
                                    playerData[j].playerVillages[r]["wall"] = parseInt(rows[r].children[wallIndex].innerText.trim());
                                }
                            }
                            else {
                                let rows = $(buildingTable).find('#ally_content tr:nth-child(n+2)');
                                if (playerData[j].playerVillages.length == 0) {
                                    // nenhuma vila do jogador encontrada? deve não estar compartilhando dados em outra página, pegar coordenadas aqui
                                    let replaceVillages = [];
                                    for (let p = 0; p < rows.length; p++) {
                                        coordinate = rows[p].children[0].innerText.match(/\d+\|\d+/)[0];
                                        replaceVillages.push({ "coordinate": coordinate, "currentPop": 0, "totalPop": 0, "attacksToVillage": "---" });
                                    }
                                    playerData[j].playerVillages = replaceVillages;
                                }
                                for (let r = 0; r < rows.length; r++) {
                                    if (playerData[j].playerVillages) {
                                        playerData[j].playerVillages[r]["watchtower"] = 0;
                                        playerData[j].playerVillages[r]["wall"] = rows[r].children[rows[r].children.length-1].innerText.trim();
                                    }
                                }
                            }
                        }
                    },
                    () => {
                        // ao concluir
                        createUIOverview();

                        // inicializar todos os seletores de cor
                        jscolor.init()
                        $("#progressbar").remove();
                        // if(development==false)
                        // {
                        //     // scripts ofuscados
                        //     $.getScript('https://shinko-to-kuma.com/scripts/overwatchMap.js');
                        //     // obtendo funcionalidade de slider
                        //     $.getScript('https://shinko-to-kuma.com/scripts/overwatchSlider.js');
                        // }
                        // else
                        // {
                        //     // scripts apenas para desenvolvimento, desofuscados
                        //     $.getScript('https://dl.dropboxusercontent.com/s/jx7so03e0zhgej7/mapOverlay.js');
                        //     $.getScript('https://dl.dropboxusercontent.com/s/zbk87m9xkqrjdjz/slider.js');
                        // }
                        // carregando estilos CSS para o slider de intervalo duplo personalizado

                        $("#contentContainer").eq(0).prepend(`<style>.middle {
    	position: relative;
    	width: 100%;
    	max-width: 500px;
    }
    .jscolor-picker-border{
    	background: #f4e4bc!important;
    	border: 1px solid #7d510f!important;
    }
    
    .slider {
    	position: relative;
    	z-index: 1;
    	height: 10px;
    	margin: 0 15px;
    }
    .slider > .track {
    	position: absolute;
    	z-index: 1;
    	left: 0;
    	right: 0;
    	top: 0;
    	bottom: 0;
    	border-radius: 5px;
    	background-image: linear-gradient(to right, black, red , yellow, green);
    }
    .slider > .range {
    	position: absolute;
    	z-index: 2;
    	left: 25%;
    	right: 25%;
    	top: 0;
    	bottom: 0;
    	border-radius: 5px;
    	background-color: #FF0000;
    }
    .slider > .thumb {
    	position: absolute;
    	z-index: 3;
    	width: 20px!important;
    	height: 20px;
    	border-radius: 50%;
    	box-shadow: 0 0 0 0 rgba(255,255,0,.1);
    	transition: box-shadow .3s ease-in-out;
    }
    .slider > .thumb.left {
        background-color: #FF0000!important;
    	left: 25%;
    	transform: translate(-10px, -5px);
    }
    .slider > .thumb.right {
        background-color: #FF0000!important;
    	right: 25%;
    	transform: translate(10px, -5px);
    }
    .slider > .thumb.hover {
    	box-shadow: 0 0 0 20px rgba(255,0,0,.1);
    }
    .slider > .thumb.active {
    	box-shadow: 0 0 0 40px rgba(255,0,0,.2);
    }
    
    input[type=range] {
    	position: absolute;
    	pointer-events: none;
    	-webkit-appearance: none;
    	z-index: 2;
    	height: 10px;
    	width: 100%;
    	opacity: 0;
    }
    input[type=range]::-webkit-slider-thumb {
    	pointer-events: all;
    	width: 30px;
    	height: 30px;
    	border-radius: 0;
    	border: 0 none;
    	background-color: red;
    	-webkit-appearance: none;
    }
    </style>`);

                        // declarando elementos
                        var inputLeft = document.getElementById("input-left");
                        var inputRight = document.getElementById("input-right");

                        var thumbLeft = document.querySelector(".slider > .thumb.left");
                        var thumbRight = document.querySelector(".slider > .thumb.right");
                        var range = document.querySelector(".slider > .range");
                        var track = document.querySelector(".slider > .track");

                        // atualizar valores
                        function setLeftValue() {
                            var _this = inputLeft,
                                min = parseInt(_this.min),
                                max = parseInt(_this.max);

                            _this.value = Math.min(parseInt(_this.value), parseInt(inputRight.value) - 1);

                            var percent = ((_this.value - min) / (max - min)) * 100;

                            thumbLeft.style.left = percent + "%";
                            range.style.left = percent + "%";
                            $(".track").css('background-image', `linear-gradient(to right, #75FFFF, black ${(minimum / bigStack) * 100}%, black ${inputLeft.value - 10}%, red ${inputLeft.value}%, red ${inputRight.value}%, yellow ${parseInt(inputRight.value) + 10}%, yellow 95% ,green)`);
                            smallStack = Math.round(bigStack * (percent / 100));
                            $("#smallStack").val(smallStack);
                        }
                        setLeftValue();

                        function setRightValue() {
                            var _this = inputRight,
                                min = parseInt(_this.min),
                                max = parseInt(_this.max);

                            _this.value = Math.max(parseInt(_this.value), parseInt(inputLeft.value) + 1);

                            var percent = ((_this.value - min) / (max - min)) * 100;

                            thumbRight.style.right = (100 - percent) + "%";
                            range.style.right = (100 - percent) + "%";
                            $(".track").css('background-image', `linear-gradient(to right, #75FFFF, black ${(minimum / bigStack) * 100}%, black ${inputLeft.value - 10}%, red ${inputLeft.value}%, red ${inputRight.value}%, yellow ${parseInt(inputRight.value) + 10}%, yellow 95% ,green)`);
                            mediumStack = Math.round(bigStack * (percent / 100));
                            $("#mediumStack").val(mediumStack);
                        }
                        setRightValue();

                        // adicionando ouvintes para estilização
                        inputLeft.addEventListener("input", setLeftValue);
                        inputRight.addEventListener("input", setRightValue);

                        inputLeft.addEventListener("mouseover", function () {
                            thumbLeft.classList.add("hover");
                        });
                        inputLeft.addEventListener("mouseout", function () {
                            thumbLeft.classList.remove("hover");
                        });
                        inputLeft.addEventListener("mousedown", function () {
                            thumbLeft.classList.add("active");
                        });
                        inputLeft.addEventListener("mouseup", function () {
                            thumbLeft.classList.remove("active");
                            storeSettings();
                        });

                        inputRight.addEventListener("mouseover", function () {
                            thumbRight.classList.add("hover");
                        });
                        inputRight.addEventListener("mouseout", function () {
                            thumbRight.classList.remove("hover");
                        });
                        inputRight.addEventListener("mousedown", function () {
                            thumbRight.classList.add("active");
                        });
                        inputRight.addEventListener("mouseup", function () {
                            thumbRight.classList.remove("active");
                            storeSettings();
                        });
                       

                        recalculate();
                        makeMap();

                        // verificando que tipo de mundo estamos
                        archersEnabled = game_data.units.includes("archer");
                        paladinEnabled = game_data.units.includes("knight");

                        $doc = $(document);
                        let $popup = $doc.find('#map_popup');
                        // capturar dados do tooltip
                        let originalReceivedInfo = TWMap.popup.receivedPopupInformationForSingleVillage;
                        TWMap.popup.receivedPopupInformationForSingleVillage = function (e) {
                            originalReceivedInfo.call(TWMap.popup, e);
                            if (Object.keys(e).length > 0) makeOutput(e);
                        };

                        // capturar dados do tooltip que já foram carregados uma vez antes
                        let originalDisplayForVillage = TWMap.popup.displayForVillage;
                        TWMap.popup.displayForVillage = function (e, a, t) {
                            originalDisplayForVillage.call(TWMap.popup, e, a, t);
                            if (Object.keys(e).length > 0) makeOutput(e);
                        };

                        function makeOutputContainer(data) {
                            // criar tooltip de exibição de tropas do overwatch
                            $("#overwatch_info").remove();
                            testVar = data;
                            coordinate = data.xy.toString().substring(0, 3) + "|" + data.xy.toString().substring(3, 6);
                            thisData = targetData.filter(function (coord) { return coord.coord == coordinate });
                            troopsHome = [];
                            troopsEnRoute = [];
                            if (thisData.length > 0) {
                                if (Object.keys(thisData[0].unitsInVillage).length > 0) troopsHome = thisData[0].unitsInVillage;
                                if (Object.keys(thisData[0].unitsEnRoute).length > 0) troopsEnRoute = thisData[0].unitsEnRoute;
                                let $villageInfoContainer = $(`
                                        <div id="overwatch_info" style="background-color:#e5d7b2;">
                                        <h1>Overwatch</h1>
                                            <table class='vis' style="width:100%">
                                                <tr style="background-color:#c1a264 !important">
                                                    <th>Overwatch</th>
                                                    <th><img src="/graphic/unit/unit_spear.png" title="" alt="" class=""></th>
                                                    <th><img src="/graphic/unit/unit_sword.png" title="" alt="" class=""></th>
                                                    <th><img src="/graphic/unit/unit_axe.png" title="" alt="" class=""></th>
                                                    ${!archersEnabled ? '' : `
                                                        <th><img src="/graphic/unit/unit_archer.png" title="" alt="" class=""></th>
                                                        ` }
                                                    <th><img src="/graphic/unit/unit_spy.png" title="" alt="" class=""></th>
                                                    <th><img src="/graphic/unit/unit_light.png" title="" alt="" class=""></th>
                                                    ${!archersEnabled ? '' : `
                                                        <th><img src="/graphic/unit/unit_marcher.png" title="" alt="" class=""></th>
                                                        ` }
                                                    <th><img src="/graphic/unit/unit_heavy.png" title="" alt="" class=""></th>
                                                    <th><img src="/graphic/unit/unit_ram.png" title="" alt="" class=""></th>
                                                    <th><img src="/graphic/unit/unit_catapult.png" title="" alt="" class=""></th>
                                                    ${!paladinEnabled ? '' : `
                                                        <th><img src="/graphic/unit/unit_knight.png" title="" alt="" class=""></th>
                                                        ` }
                                                    <th><img src="/graphic/unit/unit_snob.png" title="" alt="" class=""></th>
                                                </tr>
                                                ${!troopsHome ? '' : `
                                                <tr>
                                                    <td>Em casa</td>
                                                    ${makeTroopTds(troopsHome || {})}
                                                </tr>`}
                                                ${!troopsEnRoute ? '' : `
                                                <tr>
                                                    <td>Em trânsito</td>
                                                    ${makeTroopTds(troopsEnRoute || {})}
                                                </tr>
                                                `}
                                            </table>
                                        <div>`);
                                $villageInfoContainer.appendTo($popup);
                                return $villageInfoContainer;
                            }
                            else {
                                let $villageInfoContainer = $(`
            <div id="overwatch_info" style="background-color:#e5d7b2;">
            <h1>Sem informações sobre esta vila</h1>
            <div>`);
                                $villageInfoContainer.appendTo($popup);
                                return $villageInfoContainer;
                            }

                        }

                        function makeOutput(data) {
                            if ($('#overwatch_info').length) {
                                return;
                            }
                            let $villageInfoContainer = makeOutputContainer(data);
                        }

                        function makeTroopTds(troops) {
                            var counts = [];
                            counts.push(troops['spear']);
                            counts.push(troops['sword']);
                            counts.push(troops['axe']);
                            if (archersEnabled) counts.push(troops['archer']);
                            counts.push(troops['spy']);
                            counts.push(troops['light']);
                            if (archersEnabled) counts.push(troops['marcher']);
                            counts.push(troops['heavy']);
                            counts.push(troops['ram']);
                            counts.push(troops['catapult']);
                            if (paladinEnabled) counts.push(troops['knight']);
                            counts.push(troops['snob']);

                            var parts = [];
                            counts.forEach((cnt) => parts.push(`<td>${cnt || cnt == 0 ? cnt : ''}</td>`));
                            return parts.join(' ');
                        }

                    },
                    (error) => {
                        console.error(error);
                    });
            },
            (error) => {
                console.error(error);
            });
    }

    function saveSettingsAndRedraw() {
        storeSettings();
        recalculate();
        makeMap();
    }

    function updateStackSizes() {
        // atualizando todas as configurações de pilha e posições dos sliders
        $("#emptyStack").val(minimum);
        $("#smallStack").val(smallStack);
        $("#mediumStack").val(mediumStack);
        $("#bigStack").val(bigStack);
        $("#input-left").val(Math.floor(smallStack / bigStack * 100));
        $("#input-right").val(Math.floor(mediumStack / bigStack * 100));
        targetStackSize = bigStack;
        updateSlider();
        storeSettings();
    }

    function updateMedium(el) {
        // atualizar valor da configuração de pilha média e ajustar a posição do slider individual
        mediumStack = el.value;
        $("#input-right").val(Math.floor(mediumStack / bigStack * 100));
        updateSlider();
        storeSettings();
    }

    function updateSmall(el) {
        // atualizar valor da configuração de pilha pequena e ajustar a posição do slider individual
        smallStack = el.value;
        $("#input-left").val(Math.floor(smallStack / bigStack * 100));
        updateSlider();
        storeSettings();
    }

    function toggleOpen(div) {
        var x = document.getElementById(div);
        if (x.style.display === "none") {
            x.style.display = "block";
        } else {
            x.style.display = "none";
        }
    }

    function displayCategory(category) {
        allCategories = ["stackList", "stackSize", "playerSettings", "importExport"]

        $("#" + category).eq(0).css("display", "")
        $("#" + category + "Button").attr("class", "btn evt-cancel-btn btn-confirm-yes");
        for (var i = 0; i < allCategories.length; i++) {
            if (category != allCategories[i]) {
                $("#" + allCategories[i]).css("display", "none");
                $("#" + allCategories[i] + "Button").attr("class", "btn evt-confirm-btn btn-confirm-no");
            }
        }
    }

    function numberWithCommas(x) {
        // adicionar ponto para tornar números mais legíveis
        x = x.toString();
        var pattern = /(-?\d+)(\d{3})/;
        while (pattern.test(x))
            x = x.replace(pattern, "$1.$2");
        return x;
    }

    function storeSettings() {
        console.log("salvando");
        let overAllSettings = {};
        let settingsData = [];
        // salvar configurações do objeto
        Object.keys(unitPopValues).forEach(element => {
            console.log(element);
            unitPopValues[element] = $("#" + element).val();
        });
        playerData.forEach(el => {
            el.color = $(`#val${el.playerID.replace(/[\s()]/g, '')}`).val();
            el.opacity = $(`#alp${el.playerID.replace(/[\s()]/g, '')}`).val();
            el.checkedWT = $(`#checkMapWT${el.playerID.replace(/[\s()]/g, '')}`).is(":checked");
            el.checkedWTMini = $(`#checkWTMini${el.playerID.replace(/[\s()]/g, '')}`).is(":checked");
            settingsData.push(
                [
                    { "color": el.color, "opacity": el.opacity },
                    { "checkedWT": el.checkedWT, "checkedWTMini": el.checkedWTMini },
                ]
            );
        });
        overAllSettings = {
            "packetSize": packetSize,
            "minimum": minimum,
            "smallStack": smallStack,
            "mediumStack": mediumStack,
            "bigStack": bigStack,
            "playerSettings": settingsData,
            "unitPopValues": unitPopValues
        }
        localStorage.setItem("overwatchSettings", JSON.stringify(overAllSettings));
        showNotification("Configurações salvas");
        recalculate();
    }

    function updateSlider() {
        range.style.left = (smallStack / bigStack * 100) + "%";
        thumbRight.style.right = (100 - (mediumStack / bigStack * 100)) + "%";
        thumbLeft.style.left = (smallStack / bigStack * 100) + "%";
        range.style.right = (100 - (mediumStack / bigStack * 100)) + "%";
        $(".track").css('background-image', `linear-gradient(to right, #75FFFF, black ${(minimum / bigStack) * 100}%, black ${inputLeft.value - 10}%, red ${inputLeft.value}%, red ${inputRight.value}%, yellow ${parseInt(inputRight.value) + 10}%, yellow 95% ,green)`);
    }

    function showNotification(msg) {
        console.log("mostrar notificação: " + msg);
        var x = document.getElementById("overwatchNotification");
        x.innerText = msg;
        x.className = "show";
        setTimeout(function () { x.className = x.className.replace("show", ""); }, 3000);
    }

    function toggleUI() {
        if ($('#toggleIcon[src*="minus.png"]').length > 0) $('#toggleIcon')[0].src = "graphic/plus.png";
        else $('#toggleIcon')[0].src = "graphic/minus.png";
        $('#toggleUi').toggle();
        $('#titleOverwatch').toggle();
    }

    function importData() {
        array = JSON.parse($("#importData").val());
        playerData = playerData.concat(array);
        showNotification("Dados dos jogadores importados!");
        createUIOverview();
    }

    function exportData() {
        text = JSON.stringify(playerData)
        var dummy = document.createElement("textarea");
        // dummy.style.display = 'none'
        document.body.appendChild(dummy);
        dummy.value = text;
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
        showNotification("Dados dos jogadores copiados para a área de transferência");
    }

    function createUIOverview() {

        $("#overwatchNotification").remove();
        $("#tribeLeaderUI").remove();
        scriptUI = ` <div id="overwatchNotification">Placeholder</div>
                        <div id="tribeLeaderUI" class="ui-widget-content vis" style="min-width:200px;background:#f4e4bc;position:fixed;cursor:move;z-index:999;">
                        <div style="min-height:35px">
                            <h3 id="titleOverwatch" style="display:none;margin: auto;text-align:center;padding-top:6px">Overwatch</h3>
                            <img id="toggleIcon" style="position:absolute;left:20px;top: 10px;" class="widget-button" onclick="toggleUI();" src="graphic/minus.png" />
                            <div id="toggleUi" style="">
                        <center>
                        <table style="margin:30px 20px">
                        <tr>
                            <td>
                                <input type="button" style="display: inline;" class="btn evt-confirm-btn btn-confirm-yes" id="playerSettingsButton" onclick="displayCategory('playerSettings')" value="Configurações de Jogador"/>
                            </td>
                            <td>
                                <input type="button" style="display: inline;" class="btn evt-confirm-btn btn-confirm-yes" id="stackSizeButton" onclick="displayCategory('stackSize')" value="Configurações de Tamanho de Pilha"/>
                            </td>
                            <td>
                                <input type="button" style="display: inline;" class="btn evt-confirm-btn btn-confirm-yes" id="stackListButton" onclick="displayCategory('stackList')" value="Gerador de Lista de Pilhas"/>
                            </td>
                            <td>
                                <input type="button" style="display: inline;" class="btn evt-confirm-btn btn-confirm-yes" id="importExportButton" onclick="displayCategory('importExport')" value="Importar/Exportar Dados"/>
                            </td>
                        </tr>
                        </table>
                        <div id="playerSettings">
                            <div style="max-height: 600px!important;overflow-y:auto;margin: 30px;width: fit-content;">
                            <table class="vis overviewWithPadding" style="border: 1px solid #7d510f;min-width:600px;max-width: 900px;">
                                <thead><tr>
                                    <th>Nome do Jogador</th>
                                    <th ${"watchtower" in game_data.village.buildings ? "" : 'style="display:none"'} style="width:80px;text-align: center;">WT no Mapa</th>
                                    <th ${"watchtower" in game_data.village.buildings ? "" : 'style="display:none"'} style="width:80px;text-align: center;">WT no Minimapa</th>
                                    <th style="width:80px;text-align: center;">Cor no Mapa</th>
                                    <th>Contagem de Ataques Incoming</th>
                                </tr>
                                </thead>
                                <tbody>`
        playerData.forEach((el, i) => {
            // verificando se temos dados ou não
            if (settingsData.playerSettings == undefined || settingsData.playerSettings[i] == undefined) {
                if (i < defaultColors.length) {
                    el.color = defaultColors[i].color;
                    el.opacity = defaultColors[i].opacity;
                }
                else {
                    el.color = "#FFF";
                    el.opacity = 0.3;
                }
                checkedWT = false;
                checkedWTMini = false;
            }
            else {
                console.log(settingsData.playerSettings[i]);
                el.color = settingsData.playerSettings[i][0].color;
                el.opacity = settingsData.playerSettings[i][0].opacity;
                checkedWT = settingsData.playerSettings[i][1].checkedWT;
                checkedWTMini = settingsData.playerSettings[i][1].checkedWTMini;
            }

            // classe de linha alternada para melhor legibilidade
            if (i % 2 == 0) {
                rowClass = "row_b";
            }
            else {
                rowClass = "row_a";
            }
            scriptUI += `
                            <tr class="${rowClass}">
                                <td>${el.playerName}</td>
                                <td ${"watchtower" in game_data.village.buildings ? "" : 'style="display:none"'}><center><input id="checkMapWT${el.playerID.replace(/[\s()]/g, '')}" type="checkbox" ${checkedWT ? 'checked' : ''}></input></center></td>
                                <td ${"watchtower" in game_data.village.buildings ? "" : 'style="display:none"'}><center><input id="checkWTMini${el.playerID.replace(/[\s()]/g, '')}" type="checkbox" ${checkedWTMini ? 'checked' : ''}></input></center></td>
                                <td><center><button class="btn" id="color${el.playerID.replace(/[\s()]/g, '')}" data-jscolor="{
                                    valueElement:'#val${el.playerID.replace(/[\s()]/g, '')}',
                                    alphaElement:'#alp${el.playerID.replace(/[\s()]/g, '')}'}"></button>
                                <input id="val${el.playerID.replace(/[\s()]/g, '')}" value="${el.color}" name="color${el.playerName}[value]" type="hidden">
                                <input id="alp${el.playerID.replace(/[\s()]/g, '')}" value="${el.opacity}" name="color${el.playerName}[alpha]" type="hidden">
                                </center></td>
                                <td>${el.attackCount}</td>
                            </tr>
                            `;

        });
        scriptUI += `
                        <tr ${"watchtower" in game_data.village.buildings ? "" : 'style="display:none"'}style="border-top: 1px solid black;">
                            <td style="text-align:right">Selecionar todos:</td>
                            <td><center><input id="checkAllWT" type="checkbox"></input></center></td>
                            <td><center><input id="checkAllWTMini" type="checkbox"></input></center></td>
                            <td colspan="2"></td>
                        </tr>
                            </tbody>
                        </table>
                        </div>
                        </div>
                        <div id="stackSize">
                            <table class="vis" style="margin: 30px;">
                                <tr>
                                    <th>Vazio</th>
                                    <th colspan="2" style="width:400px;text-align:center">Pilha Pequena - Média</th>
                                    <th>Pilha Grande</th>
                                </tr>
                                <tr style="height:70px">
                                    <td><input type="text" id="emptyStack" name="emptyStack" onchange="javascript:minimum=$(this).val();updateStackSizes();"></td>
                                    <td colspan="2">
                                        <div class="middle">
                                            <div class="multi-range-slider">
                                                <input type="range" id="input-left" min="0" max="100" value="25">
                                                <input type="range" id="input-right" min="0" max="100" value="75">
                        
                                                <div class="slider">
                                                    <div class="track"></div>
                                                    <div class="range"></div>
                                                    <div class="thumb left"></div>
                                                    <div class="thumb right"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><input type="text" id="bigStack" name="bigStack" onchange="javascript:bigStack=$(this).val();updateStackSizes();"></td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td>
                                        <label style="text-align:right">Pilha Pequena</label><input type="text" style="margin-left: 20px;" onchange="updateSmall(this)" id="smallStack" name="smallStack">
                                    </td>
                                    <td style="text-align: right;">
                                        <label style="margin-left: 40px;margin-right: 10px;">Pilha Média</label><input type="text" style="margin-right: 20px;" onchange="updateMedium(this)" id="mediumStack" name="mediumStack">
                                    </td>
                                    <td></td>
                                </tr>
                            </table>
                            <table class="vis overviewWithPadding" style="border: 1px solid #7d510f;margin:20px;">
                                <thead>
                                    <tr>
                                        <th style="text-align:center" width="35"><a href="#" class="unit_link" data-unit="spear"><img src="https://dsus.innogamescdn.com/asset/a9e85669/graphic/unit/unit_spear.png" title="Lanceiro" alt="" class=""></a></th>
                                        <th style="text-align:center" width="35"><a href="#" class="unit_link" data-unit="sword"><img src="https://dsus.innogamescdn.com/asset/a9e85669/graphic/unit/unit_sword.png" title="Espadachim" alt="" class=""></a></th>
                                        <th style="text-align:center" width="35"><a href="#" class="unit_link" data-unit="axe"><img src="https://dsus.innogamescdn.com/asset/a9e85669/graphic/unit/unit_axe.png" title="Machado" alt="" class=""></a></th>
                                        <th style="text-align:center" width="35"><a href="#" class="unit_link" data-unit="archer"><img src="https://dsus.innogamescdn.com/asset/a9e85669/graphic/unit/unit_archer.png" title="Arqueiro" alt="" class=""></a></th>
                                        <th style="text-align:center" width="35"><a href="#" class="unit_link" data-unit="spy"><img src="https://dsus.innogamescdn.com/asset/a9e85669/graphic/unit/unit_spy.png" title="Espião" alt="" class=""></a></th>
                                        <th style="text-align:center" width="35"><a href="#" class="unit_link" data-unit="light"><img src="https://dsus.innogamescdn.com/asset/a9e85669/graphic/unit/unit_light.png" title="Cavalo Leve" alt="" class=""></a></th>
                                        <th style="text-align:center" width="35"><a href="#" class="unit_link" data-unit="marcher"><img src="https://dsus.innogamescdn.com/asset/a9e85669/graphic/unit/unit_marcher.png" title="Arqueiro Montado" alt="" class=""></a></th>
                                        <th style="text-align:center" width="35"><a href="#" class="unit_link" data-unit="heavy"><img src="https://dsus.innogamescdn.com/asset/a9e85669/graphic/unit/unit_heavy.png" title="Cavalo Pesado" alt="" class=""></a></th>
                                        <th style="text-align:center" width="35"><a href="#" class="unit_link" data-unit="ram"><img src="https://dsus.innogamescdn.com/asset/a9e85669/graphic/unit/unit_ram.png" title="Caroço" alt="" class=""></a></th>
                                        <th style="text-align:center" width="35"><a href="#" class="unit_link" data-unit="catapult"><img src="https://dsus.innogamescdn.com/asset/a9e85669/graphic/unit/unit_catapult.png" title="Catapulta" alt="" class=""></a></th>
                                        <th style="text-align:center" width="35"><a href="#" class="unit_link" data-unit="snob"><img src="https://dsus.innogamescdn.com/asset/a9e85669/graphic/unit/unit_knight.png" title="Cavaleiro" alt="" class=""></a></th>
                                        <th style="text-align:center" width="35"><a href="#" class="unit_link" data-unit="snob"><img src="https://dsus.innogamescdn.com/asset/a9e85669/graphic/unit/unit_snob.png" title="Nobre" alt="" class=""></a></th>
                                        <th style="text-align:center" width="35"><a href="#" class="unit_link" data-unit="militia"><img src="https://dsus.innogamescdn.com/asset/a9e85669/graphic/unit/unit_militia.png" title="Milícia" alt="" class=""></a></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td align="center"><input type="text" data-pop="1" onchange="storeSettings();" name="spear" id="spear" size="2" value="${unitPopValues.spear}" value=""></td>
                                        <td align="center"><input type="text" data-pop="1" onchange="storeSettings();" name="sword" id="sword" size="2" value="${unitPopValues.sword}"></td>
                                        <td align="center"><input type="text" data-pop="1" onchange="storeSettings();" name="axe" id="axe" size="2" value="${unitPopValues.axe}"></td>
                                        <td align="center"><input type="text" data-pop="1" onchange="storeSettings();" name="archer" id="archer" size="2" value="${unitPopValues.archer}"></td>
                                        <td align="center"><input type="text" data-pop="2" onchange="storeSettings();" name="spy" id="spy" size="2" value="${unitPopValues.spy}"></td>
                                        <td align="center"><input type="text" data-pop="4" onchange="storeSettings();" name="light" id="light" size="2" value="${unitPopValues.light}"></td>
                                        <td align="center"><input type="text" data-pop="5" onchange="storeSettings();" name="marcher" id="marcher" size="2" value="${unitPopValues.marcher}"></td>
                                        <td align="center"><input type="text" data-pop="6" onchange="storeSettings();" name="heavy" id="heavy" size="2" value="${unitPopValues.heavy}"></td>
                                        <td align="center"><input type="text" data-pop="5" onchange="storeSettings();" name="ram" id="ram" size="2" value="${unitPopValues.ram}"></td>
                                        <td align="center"><input type="text" data-pop="8" onchange="storeSettings();" name="catapult" id="catapult" size="2" value="${unitPopValues.catapult}"></td>
                                        <td align="center"><input type="text" data-pop="1" onchange="storeSettings();" name="knight" id="knight" size="2" value="${unitPopValues.knight}"></td>
                                        <td align="center"><input type="text" data-pop="100" onchange="storeSettings();" name="snob" id="snob" size="2" value="${unitPopValues.snob}"></td>
                                        <td align="center"><input type="text" data-pop="1" onchange="storeSettings();" name="militia" id="militia" size="2" value="${unitPopValues.militia}"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div id="stackList">
                            <div style="width:600px; margin: 30px;">
                                <h1>
                                    Vilas selecionadas: <span id="countSelectedVillages">0</span>
                                </h1>
                                <hr>
                                <p>
                                    <textarea rows="${((selectedVillages.length + 1) < 10) ? selectedVillages.length + 1 : 10}" style="width:590px;max-height:155px;overflow-y: auto;" id="villageList" value=""></textarea>
                                </p>
                                <hr>
                                <p>
                                    <textarea rows="${((selectedVillages.length + 4) < 10) ? selectedVillages.length + 4 : 10}" style="width:590px;max-height:155px;overflow-y: auto;" id="villageListBB" value=""></textarea>
                                </p>
                                <br />
                            </div>
                        </div>
                        <div id="importExport">
                            <div style="width:600px; margin: 30px;">
                                <h1>
                                    Exportar Dados
                                </h1>
                                <hr>
                                <p>
                                    <a href="#" style="width:20%;" class="btn btn-default" onclick="exportData();">Exportar Jogadores</a>
                                </p>
                                <hr>
                                <h1>
                                    Importar Dados
                                </h1>
                                <p>
                                    <textarea rows="3" style="width:590px;max-height:155px;overflow-y: auto;" id="importData" value=""></textarea>
                                </p>
                                <p>
                                    <a href="#" style="width:20%;" class="btn btn-default" onclick="importData();">Importar Jogadores</a>
                                </p>
                                <hr>
                                <br />

                            </div>
                        </div>
                        <div style="margin:20px 20px">
                            <a href="#" style="width:20%;" class="btn btn-default" onclick="saveSettingsAndRedraw();">Redesenhar Mapa</a>
                            <br>
                            <small style="margin-top:10px">Script criado por Sass - Shinko to Kuma</small>
                        </div>
                        </center>
                        </div>
                        </div>
                        </div>
                        `;

        $("#contentContainer").prepend(scriptUI);



        $("#checkAllWT").click(function () {
            console.log("alternando checkboxes");
            $('input:checkbox[id^="checkMapWT"]').not(this).prop('checked', this.checked);
        });
        $("#checkAllWTMini").click(function () {
            console.log("alternando mini checkboxes");
            $('input:checkbox[id^="checkWTMini"]').not(this).prop('checked', this.checked);
        });

        // configurando todas as configurações iniciais
        $("#emptyStack").val(minimum);
        $("#smallStack").val(smallStack);
        $("#mediumStack").val(mediumStack);
        $("#bigStack").val(bigStack);
        $("#input-left").val(Math.floor(smallStack / bigStack * 100));
        $("#input-right").val(Math.floor(mediumStack / bigStack * 100));
        displayCategory("playerSettings");
        $("#tribeLeaderUI").draggable();
        jscolor.install();
    }

    // obter dados atualizados usando todos os dados dos jogadores que temos disponíveis da página do líder da tribo
    function recalculate() {
        targetData = [];
        playerData.forEach(player => {
            if (player.playerVillages) {
                player.playerVillages.forEach(village => {
                    currentPop = 0;
                    totalPop = 0;
                    game_data.units.forEach((element, j) => {
                        currentPop = currentPop + (village.unitsInVillage[element] * unitPopValues[game_data.units[j]]);
                        totalPop = totalPop + (village.unitsInVillage[element] * unitPopValues[game_data.units[j]]) + (parseInt(village.unitsEnroute[element]) * unitPopValues[game_data.units[j]]);
                    });
                    let wt;
                    if (village.watchtower) wt = village.watchtower;
                    else wt = 0;
                    if (village.wall) wall = village.wall;
                    else wall = "---";
                    targetData.push({
                        "playerName": player.playerName,
                        "tribeName": player.tribeName,
                        "coord": village.coordinate,
                        "incomingAttacks": village.attacksToVillage,
                        "incomingSupports": 0,
                        "currentStack": currentPop,
                        "totalStack": totalPop,
                        "watchtower": wt,
                        "wall": wall,
                        "checkedWT": player.checkedWT,
                        "checkedWTMini": player.checkedWTMini,
                        "color": player.color,
                        "opacity": player.opacity,
                        "unitsInVillage": village.unitsInVillage,
                        "unitsEnRoute": village.unitsEnroute,
                    })
                });
            }
        });
    }

    function makeMap() {
        if (mapOverlay.mapHandler._spawnSector) {
            // já existe, não recriar
        }
        else {
            // não existe ainda
            mapOverlay.mapHandler._spawnSector = mapOverlay.mapHandler.spawnSector;
        }
        mapOverlay.mapHandler.spawnSector = function (data, sector) {
            mapOverlay.mapHandler._spawnSector(data, sector);
            // Canvas principal do mapa
            var beginX = sector.x - data.x;
            var endX = beginX + mapOverlay.mapSubSectorSize;
            var beginY = sector.y - data.y;
            var endY = beginY + mapOverlay.mapSubSectorSize;
            for (var x in data.tiles) {
                var x = parseInt(x, 10);
                if (x < beginX || x >= endX) {
                    continue;
                }
                for (var y in data.tiles[x]) {
                    var y = parseInt(y, 10);
                    if (y < beginY || y >= endY) {
                        continue;
                    }
                    var v = mapOverlay.villages[(data.x + x) * 1000 + (data.y + y)];
                    if (v) {
                        var el = $('#mapOverlay_canvas_' + sector.x + '_' + sector.y);
                        if (!el.length) {
                            var canvas = document.createElement('canvas');
                            canvas.style.position = 'absolute';
                            canvas.width = (mapOverlay.map.scale[0] * mapOverlay.map.sectorSize);
                            canvas.height = (mapOverlay.map.scale[1] * mapOverlay.map.sectorSize);
                            canvas.style.zIndex = 10;
                            canvas.className = 'mapOverlay_map_canvas';
                            canvas.id = 'mapOverlay_canvas_' + sector.x + '_' + sector.y;
                            st_pixel = mapOverlay.map.pixelByCoord(sector.x, sector.y),

                                targetData.forEach(element => {
                                    t = element.coord.split('|');
                                    if (t[0] >= sector.x && t[0] < sector.x + 5 && t[1] >= sector.y && t[1] < sector.y + 5) {
                                        // console.log("desenhando overlay da vila no setor"+sector.x+sector.y);
                                        originXY = mapOverlay.map.pixelByCoord(t[0], t[1]),
                                            originX = (originXY[0] - st_pixel[0]) + mapOverlay.tileSize[0] / 2,
                                            originY = (originXY[1] - st_pixel[1]) + mapOverlay.tileSize[1] / 2,
                                            x = (t[0] - st_pixel[0]) + mapOverlay.tileSize[0] / 2,
                                            y = (t[1] - st_pixel[1]) + mapOverlay.tileSize[1] / 2;
                                        // marcarVila(canvas, x, y, 20, '#FFFFFF');
                                        // marcarVila(canvas,originX,originY,20,'#FFFFFF');
                                        // circuloVila(canvas, x, y, 20, '#FFFFFF');
                                        // circuloVila(canvas,originX,originY,20,'#FFFFFF');


                                        // DEFININDO CORES DAS PILHAS
                                        // atual
                                        if (element.currentStack < minimum) currentColor = "rgba(117, 255, 255, 0.5)";
                                        else if (element.currentStack < smallStack && element.currentStack > minimum) currentColor = "rgba(0, 0, 0, 0.5)";
                                        else if (element.currentStack > smallStack && element.currentStack < mediumStack) currentColor = "rgba(255, 0, 0, 0.5)";
                                        else if (element.currentStack > mediumStack && element.currentStack < bigStack) currentColor = "rgba(255, 255, 0, 0.5)";
                                        else if (element.currentStack > bigStack) currentColor = "rgba(0, 255, 0, 0.5)";
                                        // total
                                        if (element.totalStack < minimum) totalColor = "rgba(117, 255, 255, 0.5)";
                                        else if (element.totalStack < smallStack && element.totalStack > minimum) totalColor = "rgba(0, 0, 0, 0.5)";
                                        else if (element.totalStack > smallStack && element.totalStack < mediumStack) totalColor = "rgba(255, 0, 0, 0.5)";
                                        else if (element.totalStack > mediumStack && element.totalStack < bigStack) totalColor = "rgba(255, 255, 0, 0.5)";
                                        else if (element.totalStack > bigStack) totalColor = "rgba(0, 255, 0, 0.5)";

                                        // adicionando cores das pilhas
                                        drawLeftTriangle(canvas, originX, originY, currentColor);
                                        drawRightTriangle(canvas, originX, originY, totalColor);

                                        // adicionando ícones no mapa para overlay
                                        if (element.incomingAttacks > 0) iconOnMap(images[0], canvas, originX - 19, originY - 12, 15);
                                        if (element.wall < 20 || element.wall == "---") iconOnMap(images[1], canvas, originX + 7, originY - 12, 15);
                                        iconOnMap(images[2], canvas, originX - 19, originY + 10, 15);

                                        // adicionando texto ao overlay
                                        if (element.incomingAttacks > 0) textOnMap(element.incomingAttacks, ctx, originX - 5, originY - 8, "white", "10px Arial");
                                        if (element.wall < 20 || element.wall == "---") textOnMap(element.wall, ctx, originX + 20, originY - 8, "white", "10px Arial");
                                        textOnMap(Math.floor(element.totalStack / 1000) + "k", ctx, originX - 2, originY + 14, "white", "10px Arial");
                                    }

                                });

                        // loop separado para desenho de watchtower para que sejam desenhados sobre tudo
                        targetData.forEach(element => {
                            t = element.coord.split('|'),
                                originXY = mapOverlay.map.pixelByCoord(t[0], t[1]),
                                originX = (originXY[0] - st_pixel[0]) + mapOverlay.tileSize[0] / 2,
                                originY = (originXY[1] - st_pixel[1]) + mapOverlay.tileSize[1] / 2,
                                x = (t[0] - st_pixel[0]) + mapOverlay.tileSize[0] / 2,
                                y = (t[1] - st_pixel[1]) + mapOverlay.tileSize[1] / 2;
                            if (element.watchtower > 0 && element.checkedWT) {
                                drawMapTowers(canvas, sector, originX, originY, element.watchtower, element.color, element.opacity);
                            }
                        });

                        sector.appendElement(canvas, 0, 0);

                        // marcando vilas selecionadas que precisam ser redesenhadas
                        selectedVillages.forEach(element => {
                            t = element.split('|');
                            let village = TWMap.villages[t[0] + t[1]];
                            if (village && village.id) {
                                if (currentCoords.includes(t[0] + "|" + t[1])) {
                                    $(`[id="map_village_${village.id}"]`).css({
                                        filter: 'brightness(800%) grayscale(100%)',
                                    });
                                }
                                else {
                                    $(`[id="map_village_${village.id}"]`).css({ filter: 'none' });
                                }
                            }
                        });

                    }
                }
            }

            // Canvas do minimapa
            for (var key in mapOverlay.minimap._loadedSectors) {
                var sector = mapOverlay.minimap._loadedSectors[key];
                var el = $('#mapOverlay_topo_canvas_' + key);
                if (!el.length) {
                    var canvas = document.createElement('canvas');
                    canvas.style.position = 'absolute';
                    canvas.width = '250';
                    canvas.height = '250';
                    canvas.style.zIndex = 11;
                    canvas.className = 'mapOverlay_topo_canvas';
                    canvas.id = 'mapOverlay_topo_canvas_' + key;
                    // loop aqui se necessário
                    targetData.forEach(element => {
                        t = element.coord.split('|'),
                            x = (t[0] - sector.x) * 5 + 3,
                            y = (t[1] - sector.y) * 5 + 3;
                        // var originX = (x - sector.x) * 5 + 3;
                        // var originY = (y - sector.y) * 5 + 3
                        if (element.watchtower > 0 && element.checkedWTMini) {
                            drawTopoTowers(canvas, sector, x, y, element.watchtower, element.color, element.opacity);
                        }
                    });

                    // até aqui
                    sector.appendElement(canvas, 0, 0);
                }
            }
        }

        mapOverlay.reload();
    }

    // funções de desenho
    function markVillage(canvas, x, y, size, color) {
        var ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.moveTo(x - size, y - size);
        ctx.lineTo(x + size, y + size);
        ctx.moveTo(x + size, y - size);
        ctx.lineTo(x - size, y + size);
        ctx.stroke();
        ctx.closePath();
    }

    function circleVillage(canvas, x, y, size, color) {
        var ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.closePath();
    }
    function iconOnMap(img, canvas, x, y, size) {
        ctx = canvas.getContext("2d");
        ctx.drawImage(img, x - (size / 2), y - (size / 2), size, size);
    }

    function drawLeftTriangle(canvas, x, y, color) {
        ctx = canvas.getContext("2d");
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - (tileWidthX / 2), y - (tileWidthY / 2));
        ctx.lineTo(x + (tileWidthX / 2), y - (tileWidthY / 2));
        ctx.lineTo(x - (tileWidthX / 2), y + (tileWidthY / 2));
        ctx.fill();
    }

    function drawRightTriangle(canvas, x, y, color) {
        ctx = canvas.getContext("2d");
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + (tileWidthX / 2), y - (tileWidthY / 2));
        ctx.lineTo(x + (tileWidthX / 2), y + (tileWidthY / 2));
        ctx.lineTo(x - (tileWidthX / 2), y + (tileWidthY / 2));
        ctx.fill();
    }

    function textOnMap(text, ctx, x, y, color, font) {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.save();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        ctx.miterLimit = 1;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    function drawTopoTowers(canvas, sector, x, y, wtLevel, color, opacity) {
        var ctx = canvas.getContext('2d');
        ctx.lineWidth = 1;
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity;

        // desenhar WT
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.arc(x, y, this.watchtowerRadius[wtLevel - 1] * 5, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();

        // marcar vila com WT
        ctx.beginPath();
        ctx.strokeStyle = "#000000";
        ctx.moveTo(x - 2, y - 2);
        ctx.lineTo(x + 2, y + 2);
        ctx.moveTo(x + 2, y - 2);
        ctx.lineTo(x - 2, y + 2);
        ctx.stroke();
        ctx.closePath();
        ctx.globalAlpha = 1;
    }


    function drawMapTowers(canvas, sector, x, y, wtLevel, color, opacity) {
        var ctx = canvas.getContext('2d');
        ctx.lineWidth = 2;
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity;
        let wtr = this.watchtowerRadius[wtLevel - 1]

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.ellipse(x, y, wtr * TWMap.map.scale[0], wtr * TWMap.map.scale[1], 0, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.strokeStyle = "#000000";
        ctx.moveTo(x - 6, y - 6);
        ctx.lineTo(x + 6, y + 6);
        ctx.moveTo(x + 6, y - 6);
        ctx.lineTo(x - 6, y + 6);
        ctx.stroke();
        ctx.closePath();
        ctx.globalAlpha = 1;
    }

    // sobrescrevendo o evento de clique para o mapa para não obter o menu de opções de múltiplos botões
    TWMap.map._handleClick = function (e) {
        let pos = this.coordByEvent(e);
        let coord = pos.join('|');
        let village = TWMap.villages[pos[0] * 1000 + pos[1]];
        stacklist = "";
        stacklistBB = "[table]\n[**]Coordenada[||]Pilha Atual[||]Pacotes Necessários[/**]\n";

        // verificar se a vila clicada está na lista de alvos selecionados
        if (village && village.id) {
            // não está na lista de alvos selecionados ainda, adicionar e criar overlay
            if (!currentCoords.includes(coord)) {
                $(`[id="map_village_${village.id}"]`).css({
                    filter: 'brightness(800%) grayscale(100%)',
                });
                selectedVillages.push(coord);
                currentCoords += coord;
                if (targetData) {
                    filteredArray = [];
                    selectedVillages.forEach(function (e) {
                        filteredArray.push(targetData.filter(function (o) {
                            return o.coord === e;
                        }));
                    });
                    stacklist = "";
                    stacklistBB = "[table]\n[**]Coordenada[||]Nome do Jogador[||]Nome da Tribo[||]Pilha Atual[||]Pacotes Necessários[/**]\n";

                    if (filteredArray.length > 0) {
                        filteredArray.forEach(element => {
                            if (element.length > 0) {
                                stacklist += `Coordenada: ${element[0].coord} - Jogador:  ${element[0].playerName} - Tribo:  ${element[0].tribeName} - Pilha Atual: ${numberWithCommas(element[0].totalStack)} - Pacotes Necessários: ${Math.round((targetStackSize - element[0].totalStack) / packetSize)}\n`;
                                stacklistBB += `[*][coord]${element[0].coord}[/coord][|]${element[0].playerName}[|]${element[0].tribeName}[|]${numberWithCommas(element[0].totalStack)}[|]${Math.round((targetStackSize - element[0].totalStack) / packetSize)}\n`;
                            }
                            else {
                                selectedVillages.splice(-1, 1);
                                $(`[id="map_village_${village.id}"]`).css({
                                    filter: 'brightness(800%) grayscale(100%)',
                                });
                            }
                        });
                    }
                }
                else {
                    stacklist = "Welp";
                }
                stacklistBB += "[/table]"
                $('#villageList').attr('rows', ((selectedVillages.length + 1) < 10) ? selectedVillages.length + 1 : 10);
                $('#villageListBB').attr('rows', ((selectedVillages.length + 4) < 10) ? selectedVillages.length + 4 : 10);
                $('#villageList').val(stacklist);
                $('#villageListBB').val(stacklistBB);
                $('#countSelectedVillages').text(selectedVillages.length);
            } else {
                // remover vila das listas e remover o overlay
                selectedVillages = selectedVillages.filter((village) => village !== coord);

                filteredArray = [];
                selectedVillages.forEach(function (e) {
                    filteredArray.push(targetData.filter(function (o) {
                        return o.coord === e;
                    }));
                });
                if (filteredArray.length > 0) {
                    filteredArray.forEach(element => {
                        if (element.length > 0) {
                            stacklist += `Coordenada: ${element[0].coord} - Pilha Atual: ${numberWithCommas(element[0].totalStack)} - Pacotes Necessários: ${Math.round((targetStackSize - element[0].totalStack) / packetSize)}\n`;
                            stacklistBB += `[*][coord]${element[0].coord}[/coord][|]${numberWithCommas(element[0].totalStack)}[|]${Math.round((targetStackSize - element[0].totalStack) / packetSize)}\n`;
                        }
                        else {
                            selectedVillages.splice(-1, 1);
                            $(`[id="map_village_${village.id}"]`).css({
                                filter: 'brightness(800%) grayscale(100%)',
                            });
                        }
                    });
                }

                currentCoords = currentCoords.replace(coord, '');
                stacklistBB += "[/table]"
                $(`[id="map_village_${village.id}"]`).css({ filter: 'none' });
                $('#villageList').attr('rows', ((selectedVillages.length + 1) < 10) ? selectedVillages.length + 1 : 10);
                $('#villageListBB').attr('rows', ((selectedVillages.length + 4) < 10) ? selectedVillages.length + 4 : 10);
                $('#villageList').val(stacklist);
                $('#villageListBB').val(stacklistBB);
                $('#countSelectedVillages').text(selectedVillages.length);
            }
        }
        return false;
    };
})();
