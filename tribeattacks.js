
if (typeof DEBUG !== 'boolean') DEBUG = false;

var scriptConfig = {
    scriptData: {
        prefix: 'tribePlayersUnderAttack',
        name: 'Tribe Players Under Attack',
        version: 'v1.2.5+support_details_throttled',
        author: 'RedAlert',
        authorUrl: 'https://twscripts.dev/',
        helpLink:
            'https://forum.tribalwars.net/index.php?threads/tribe-players-under-attack-tribe-leader.287111/',
    },
    translations: {
        en_DK: {
            'Tribe Players Under Attack': 'Tribe Players Under Attack',
            Help: 'Help',
            'Error fetching player incomings!': 'Error fetching player incomings!',
            Village: 'Village',
            Support: 'Support',
            'Villages under attack:': 'Villages under attack:',
            'No player is under attack!': 'No player is under attack!',
            'Player Name': 'Player Name',
            Incomings: 'Incomings',
            'Incs/Village Under Attack:': 'Incs/Village Under Attack:',
            'Incs/Total Village:': 'Incs/Total Village:',
            'There was an error!': 'There was an error!',
        },
        fr_FR: {
            'Tribe Players Under Attack': 'Joueur tribu sous attaque',
            Help: 'Aide',
            'Error fetching player incomings!': 'Erreur chargement ordres entrants!',
            Village: 'Village',
            Support: 'Support',
            'No player is under attack!': 'Aucun joueur sous attaque!',
            'Player Name': 'Pseudo du joueur',
            Incomings: 'Entrants',
            'Incs/Village Under Attack:': 'Ordres/Village sous Attaque:',
            'Incs/Total Village:': 'Ordres/Total Village:',
            'There was an error!': 'Oupsi il y a eu une erreur!',
        },
        br_BR: {
            'Tribe Players Under Attack': 'Jogadores da tribo sobre ataque',
            Help: 'Ajuda',
            'Error fetching player incomings!': 'Erro ao buscar dados dos jogadores!',
            Village: 'Aldeia',
            Support: 'Suporte',
            'No player is under attack!': 'Nenhum jogador sobre ataque!',
            'Player Name': 'Nome do jogador',
            Incomings: 'Entradas',
            'Incs/Village Under Attack:': 'Comandos/Aldeias sobre ataque:',
            'Incs/Total Village:': 'Comandos/Total das aldeias:',
            'There was an error!': 'Ops! Houve um erro!',
        },
    },
    allowedMarkets: [],
    allowedScreens: [],
    allowedModes: [],
    isDebug: DEBUG,
    enableCountApi: true,
};

$.getScript(
    `https://twscripts.dev/scripts/twSDK.js?url=${document.currentScript.src}`,
    async function () {
        // Inicializa a biblioteca
        await twSDK.init(scriptConfig);
        const scriptInfo = twSDK.scriptInfo();

        initTribePlayersUnderAttack();

        // Função principal do script
        async function initTribePlayersUnderAttack() {
            const playersToFetch = await getTribeMembersList();

            if (playersToFetch.length) {
                const playersData = [...playersToFetch];
                const coordsRegex = twSDK.coordsRegex;
                const memberUrls = playersToFetch.map((item) => item.url);

                // Exibe a barra de progresso e notifica o usuário
                twSDK.startProgressBar(memberUrls.length);

                twSDK.getAll(
                    memberUrls,
                    function (index, data) {
                        twSDK.updateProgressBar(index, memberUrls.length);

                        // Converte a resposta para HTML
                        const htmlDoc = jQuery.parseHTML(data);
                        const villagesTableRows = jQuery(htmlDoc)
                            .find(`.table-responsive table tr`)
                            .not(':first');
                        const totalPlayerVillagesCount =
                            villagesTableRows.length;

                        const villageIncs = [];

                        // Para cada linha (aldeia) da tabela, extrai os dados
                        if (villagesTableRows && villagesTableRows.length) {
                            villagesTableRows.each(function () {
                                try {
                                    const _this = jQuery(this);
                                    const incomingsCount = parseInt(
                                        _this.find('td:last').text().trim()
                                    );
                                    if (incomingsCount > 0) {
                                        const currentVillageId = parseInt(
                                            twSDK.getParameterByName(
                                                'id',
                                                window.location.origin +
                                                    _this
                                                        .find('td:first a')
                                                        .attr('href')
                                            )
                                        );
                                        const currentVillageName = _this
                                            .find('td:first')
                                            .text()
                                            .trim();
                                        const currentVillageCoords = _this
                                            .find('td:first')
                                            .text()
                                            .trim()
                                            .match(coordsRegex)[0];

                                        let villageData = [];

                                        _this
                                            .find('td')
                                            .not(':first')
                                            .not(':last')
                                            .not(':eq(0)')
                                            .each(function (index, element) {
                                                const unitAmount =
                                                    jQuery(this)
                                                        .text()
                                                        .trim() !== '?'
                                                        ? jQuery(this)
                                                              .text()
                                                              .trim()
                                                        : 0;
                                                villageData.push(unitAmount);
                                            });

                                        villageData.shift();

                                        let villageTroops = {};
                                        game_data.units.forEach(
                                            (unit, index) => {
                                                villageTroops[unit] =
                                                    villageData[index];
                                            }
                                        );

                                        villageIncs.push({
                                            villageId: currentVillageId,
                                            villageName: currentVillageName,
                                            villageCoords: currentVillageCoords,
                                            incsCount: incomingsCount,
                                            troops: villageTroops,
                                        });
                                    }
                                } catch (error) {
                                    UI.ErrorMessage(
                                        twSDK.tt(
                                            'Error fetching player incomings!'
                                        )
                                    );
                                    console.error(
                                        `${scriptInfo} Error:`,
                                        error
                                    );
                                }
                            });
                        }

                        let totalIncs = villageIncs.map(
                            (incoming) => incoming.incsCount
                        );
                        totalIncs = parseInt(
                            twSDK.sumOfArrayItemValues(totalIncs)
                        );

                        // Atualiza os dados do jogador
                        playersData[index] = {
                            ...playersData[index],
                            incomings: villageIncs,
                            totalPlayerVillages: Math.ceil(
                                totalPlayerVillagesCount / 2
                            ),
                            villagesUnderAttack: villageIncs.length,
                            totalIncomingsNumber: totalIncs,
                        };
                    },
                    function () {
                        if (DEBUG) {
                            console.debug(
                                `${scriptInfo} playersData`,
                                playersData
                            );
                        }

                        try {
                            const playerIncomingsTable =
                                buildPlayerIncomingsTable(playersData);

                            const customStyle = `
                                .ra-player-incomings { margin-bottom: 10px; border: 1px solid #7d510f; }
                                .ra-player-incomings:last-child { margin-bottom: 0; }
                                .ra-player-incomings h3 { user-select: none; font-weight: normal; margin: 0; padding: 5px; font-size: 14px; background-color: #cfb278 !important; position: relative; cursor: pointer; }
                                .toggle-details { margin-left: 5px; font-size: 11px; }
                                .details-row { background: #f3f0d9; }
                                .details-table { width: 100%; font-size: 10px; }
                                .details-table th { padding: 2px; }
                                .details-table td { padding: 2px; text-align: center; }
                            `;

                            // Renderiza a interface do script
                            twSDK.renderBoxWidget(
                                playerIncomingsTable,
                                'raTribePlayersUnderAttack',
                                'ra-tribe-players-under-attack',
                                customStyle
                            );

                            // Inicializa os handlers de ações
                            togglePlayerExpandableWidget();
                            handleClickMassSupport();
                            toggleDetailsRow();

                            // Após renderizar a interface, busca e atualiza os dados de apoio e totais
                            updateSupportData();
                        } catch (error) {
                            UI.ErrorMessage(twSDK.tt('There was an error!'));
                            console.error(`${scriptInfo} Error:`, error);
                        }
                    },
                    function () {
                        UI.ErrorMessage(
                            twSDK.tt('Error fetching player incomings!')
                        );
                    }
                );
            } else {
                try {
                    const tribeMembers = await getTribeMembersListNotLeader();

                    const tribeMembersData = [...tribeMembers];
                    const tribeMemberUrls = tribeMembers.map(
                        (item) => item.url
                    );

                    // Exibe a barra de progresso e notifica o usuário
                    twSDK.startProgressBar(tribeMemberUrls.length);

                    twSDK.getAll(
                        tribeMemberUrls,
                        function (index, data) {
                            twSDK.updateProgressBar(
                                index,
                                tribeMemberUrls.length
                            );

                            // Converte a resposta para HTML
                            const htmlDoc = jQuery.parseHTML(data);
                            let incomingsCount = jQuery(htmlDoc)
                                .find(
                                    `.table-responsive table tr:first th:last`
                                )
                                .text()
                                .trim();
                            incomingsCount = parseInt(
                                incomingsCount.substring(
                                    1,
                                    incomingsCount.length - 1
                                )
                            );

                            // Atualiza os dados do jogador
                            tribeMembersData[index] = {
                                ...tribeMembersData[index],
                                incomings: incomingsCount,
                            };
                        },
                        function () {
                            if (DEBUG) {
                                console.debug(
                                    `${scriptInfo} tribeMembersData`,
                                    tribeMembersData
                                );
                            }

                            try {
                                let dialogContent = `
                                    <div class="ra-popup-content ra-mb15">
                                        <table class="ra-table vis" width="100%">
                                            <thead>
                                                <tr>
                                                    <th class="ra-tal">
                                                        ${twSDK.tt('Player Name')}
                                                    </th>
                                                    <th>
                                                        ${twSDK.tt('Incomings')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                `;

                                const playersWhoHaveShared = tribeMembersData
                                    .filter(
                                        (tribeMember) => tribeMember.incsShown
                                    )
                                    .sort((a, b) => b.incomings - a.incomings);

                                const playersWhoHaveNotShared =
                                    tribeMembersData.filter(
                                        (tribeMember) => !tribeMember.incsShown
                                    );

                                const tribeMembersList = [
                                    ...playersWhoHaveShared,
                                    ...playersWhoHaveNotShared,
                                ];

                                tribeMembersList.sort((a, b) => {
                                    return b.incomings - a.incomings;
                                });

                                tribeMembersList.forEach((tribeMember) => {
                                    const { id, name, incomings, incsShown } =
                                        tribeMember;
                                    const className = incsShown
                                        ? ''
                                        : 'incs-shown-disabled';

                                    dialogContent += `
                                        <tr class="${className}">
                                            <td class="ra-tal">	
                                                <a href="/game.php?screen=info_player&id=${id}" target="_blank" rel="noopener noreferrer">
                                                    ${twSDK.cleanString(name)}
                                                </a>
                                            </td>
                                            <td>${twSDK.formatAsNumber(
                                                incomings
                                            )}</td>
                                        </tr>
                                    `;
                                });

                                dialogContent += `</tbody></table></div>`;

                                const customStyle = `
                                    .incs-shown-disabled td { opacity: 0.5; }
                                `;

                                twSDK.renderFixedWidget(
                                    dialogContent,
                                    'raTribePlayersUnderAttack',
                                    'ra-tribe-players-under-attack',
                                    customStyle
                                );
                            } catch (error) {
                                console.error(`${scriptInfo} Error:`, error);
                            }
                        },
                        function () {
                            UI.ErrorMessage(
                                twSDK.tt('Error fetching player incomings!')
                            );
                        }
                    );
                } catch (error) {
                    UI.ErrorMessage(twSDK.tt('There was an error!'));
                    console.error(`${scriptInfo} Error:`, error);
                }
            }
        }

        // Função que constrói a tabela geral de incomings dos jogadores
        function buildPlayerIncomingsTable(playerIncomings) {
            let playerIncomingsList = ``;

            playerIncomings.sort(
                (a, b) => b.totalIncomingsNumber - a.totalIncomingsNumber
            );

            playerIncomings.forEach((player) => {
                const {
                    id,
                    incomings,
                    name,
                    totalIncomingsNumber,
                    totalPlayerVillages,
                    villagesUnderAttack,
                } = player;

                if (incomings.length) {
                    const incomingsTable =
                        buildSinglePlayerIncomingsTable(incomings);
                    const totalIncs =
                        twSDK.formatAsNumber(totalIncomingsNumber);
                    const villagesUnderAttackCount =
                        twSDK.formatAsNumber(villagesUnderAttack);

                    const incomingsPerVillageUnderAttackRatio = parseFloat(
                        totalIncomingsNumber / villagesUnderAttack
                    ).toFixed(2);
                    const incomingsPerTotalVillageRatio = parseFloat(
                        totalIncomingsNumber / totalPlayerVillages
                    ).toFixed(2);

                    playerIncomingsList += `
                        <div class='ra-player-incomings'>
                            <h3 class="ra-player-incomings-toggle">
                                <a href='/game.php?screen=info_player&id=${id}' target='_blank' rel='noopener noreferrer'>
                                    ${name}
                                </a> <b>(${villagesUnderAttackCount}/${twSDK.formatAsNumber(
                        totalPlayerVillages
                    )})</b>
                                - ${twSDK.tt(
                                    'Incomings'
                                )}: <b>${totalIncs}</b> - ${twSDK.tt(
                        'Incs/Village Under Attack:'
                    )} <b>${incomingsPerVillageUnderAttackRatio}</b> - ${twSDK.tt(
                        'Incs/Total Village:'
                    )} <b>${incomingsPerTotalVillageRatio}</b>
                                <span class="ra-toggle-icon">
                                    <img src="/graphic/plus.png">
                                </span>
                            </h3>
                            <div class="ra-player-incomings-table">
                                ${incomingsTable}
                            </div>
                        </div>
                    `;
                }
            });

            if (playerIncomingsList.length === 0) {
                playerIncomingsList = `<b>${twSDK.tt(
                    'No player is under attack!'
                )}</b>`;
            }

            return playerIncomingsList;
        }

        // Função que constrói a tabela de incomings de um jogador,
        // gerando para cada aldeia duas linhas: a linha principal com os totais e uma linha de detalhes (inicialmente oculta)
        function buildSinglePlayerIncomingsTable(incomings) {
            let troopsHead = '';
            game_data.units.forEach((unit) => {
                if (unit !== 'militia') {
                    troopsHead += `<th width="6.5%"><img src="/graphic/unit/unit_${unit}.png"></th>`;
                }
            });

            // Cabeçalho da tabela permanece o mesmo
            let incomingsTable = `
                <table class="ra-table" width="100%">
                    <thead>
                        <tr>
                            <th width="20%">${twSDK.tt('Village')}</th>
                            <th width="7%"><img src="/graphic/unit/att.png"></th>
                            ${troopsHead}
                            <th width="10%">${twSDK.tt('Actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // Ordena as aldeias pela quantidade de ataques (decrescente)
            incomings.sort((a, b) => b.incsCount - a.incsCount);

            incomings.forEach((incoming) => {
                const { incsCount, troops, villageName, villageId } = incoming;
                const supportUrl = `${game_data.link_base_pure}place&mode=call&target=${villageId}&village=${game_data.village.id}`;

                // Linha principal: exibe o nome, quantidade de ataques e, para cada unidade,
                // uma célula com o total (inicialmente, o valor atual).
                incomingsTable += `
                    <tr class="incoming-row" data-village-id="${villageId}" data-current-troops='${JSON.stringify(
                    troops
                )}'>
                        <td class="ra-tal">
                            <a href="/game.php?screen=info_village&id=${villageId}" target="_blank" rel="noopener noreferrer">
                                ${villageName}
                            </a>
                        </td>
                        <td>${twSDK.formatAsNumber(incsCount)}</td>
                `;
                // Para cada unidade (exceto militia), cria a célula com o total
                game_data.units.forEach((unit) => {
                    if (unit !== 'militia') {
                        incomingsTable += `<td class="unit-total" data-unit="${unit}">${twSDK.formatAsNumber(troops[unit])}</td>`;
                    }
                });
                // Última célula: botão de suporte e botão de detalhamento
                incomingsTable += `
                        <td>
                            <a href="${supportUrl}" class="btn ra-ask-support-btn" target="_blank" rel="noopener noreferrer">
                                ${twSDK.tt('Support')}
                            </a>
                            <button class="btn toggle-details" title="Ver detalhes">i</button>
                        </td>
                    </tr>
                    <!-- Linha de detalhes (inicialmente oculta) -->
                    <tr class="details-row" data-village-id="${villageId}" style="display:none;">
                        <td colspan="100%">
                            <div class="details-content">Carregando detalhes...</div>
                        </td>
                    </tr>
                `;
            });

            incomingsTable += `</tbody></table>`;

            return incomingsTable;
        }

        // FUNÇÃO AUXILIAR: Busca os dados de apoio (apoio indo) de uma aldeia
        async function getSupportData(villageId) {
            let infoUrl = `/game.php?village=${game_data.village.id}&screen=info_village&id=${villageId}`;
            if (game_data.player.sitter != '0') {
                infoUrl += '&t=' + game_data.player.id;
            }
            try {
                const response = await jQuery.get(infoUrl);
                const htmlDoc = jQuery.parseHTML(response);
                const supportTable = jQuery(htmlDoc).find('table#support_sum');
                let supportData = {};
                // Inicializa com zero para cada unidade (exceto militia)
                game_data.units.forEach((unit) => {
                    if (unit !== 'militia') {
                        supportData[unit] = 0;
                    }
                });
                if (supportTable.length > 0) {
                    const supportRow = supportTable.find('tbody tr').first();
                    game_data.units.forEach((unit) => {
                        if (unit !== 'militia') {
                            const cell = supportRow.find(`td[data-unit="${unit}"]`);
                            if (cell.length > 0) {
                                const value = parseInt(
                                    cell.text().trim().replace(/\./g, '')
                                ) || 0;
                                supportData[unit] = value;
                            }
                        }
                    });
                }
                return supportData;
            } catch (error) {
                console.error(
                    `${scriptInfo} Error fetching support data for village ${villageId}:`,
                    error
                );
                let supportData = {};
                game_data.units.forEach((unit) => {
                    if (unit !== 'militia') {
                        supportData[unit] = 0;
                    }
                });
                return supportData;
            }
        }

        // FUNÇÃO AUXILIAR: Delay (sleep) para aguardar um tempo determinado (em ms)
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // FUNÇÃO: Atualiza os dados de apoio para cada aldeia, de forma sequencial com delay para evitar excesso de requisições.
        async function updateSupportData() {
            const $rows = jQuery('.incoming-row');
            for (let i = 0; i < $rows.length; i++) {
                const $row = jQuery($rows[i]);
                const villageId = $row.data('village-id');
                const currentTroops = JSON.parse($row.attr('data-current-troops'));
                try {
                    const supportData = await getSupportData(villageId);
                    let breakdownHtml = '<table class="details-table"><tr>';
                    // Atualiza as células da linha principal e monta cabeçalho para o breakdown
                    game_data.units.forEach(function (unit) {
                        if (unit !== 'militia') {
                            const current = parseInt(currentTroops[unit]) || 0;
                            const support = parseInt(supportData[unit]) || 0;
                            const total = current + support;
                            // Atualiza a célula na linha principal com o total
                            $row.find(`.unit-total[data-unit="${unit}"]`).html(twSDK.formatAsNumber(total));
                            breakdownHtml += `<th>${unit}</th>`;
                        }
                    });
                    breakdownHtml += '</tr><tr>';
                    // Monta a linha com o detalhamento para cada unidade
                    game_data.units.forEach(function (unit) {
                        if (unit !== 'militia') {
                            const current = parseInt(currentTroops[unit]) || 0;
                            const support = parseInt(supportData[unit]) || 0;
                            const total = current + support;
                            breakdownHtml += `<td>
                                Atual: ${twSDK.formatAsNumber(current)}<br>
                                Apoio: ${twSDK.formatAsNumber(support)}<br>
                                <strong>Total: ${twSDK.formatAsNumber(total)}</strong>
                            </td>`;
                        }
                    });
                    breakdownHtml += '</tr></table>';
                    // Atualiza a linha de detalhes correspondente
                    const $detailsRow = $row.next(`.details-row[data-village-id="${villageId}"]`);
                    $detailsRow.find('.details-content').html(breakdownHtml);
                } catch (error) {
                    console.error("Error updating support data for villageId: " + villageId, error);
                }
                // Aguarda 500ms antes de processar a próxima aldeia (pode ajustar conforme necessário)
                await sleep(500);
            }
        }

        // Handler: Ao clicar no botão "toggle-details", exibe/recolhe a linha de detalhes
        function toggleDetailsRow() {
            jQuery(document).on('click', '.toggle-details', function (e) {
                e.stopPropagation();
                const $btn = jQuery(this);
                const $row = $btn.closest('tr.incoming-row');
                const villageId = $row.data('village-id');
                const $detailsRow = $row.next(`.details-row[data-village-id="${villageId}"]`);
                $detailsRow.slideToggle(200);
            });
        }

        // Handler: Expande/recolhe a visualização do widget do jogador (mantido do script original)
        function togglePlayerExpandableWidget() {
            jQuery('.ra-player-incomings-toggle').on('click', function () {
                jQuery(this)
                    .parent()
                    .find('.ra-player-incomings-table')
                    .slideToggle(50);
                const toggleIcon = jQuery(this).find('.ra-toggle-icon img');
                const toggleIconSrc = jQuery(toggleIcon).attr('src');
                if (toggleIconSrc === '/graphic/minus.png') {
                    jQuery(toggleIcon).attr('src', '/graphic/plus.png');
                } else {
                    jQuery(toggleIcon).attr('src', '/graphic/minus.png');
                }
            });
        }

        // Handler: Ao clicar no botão de suporte em massa (mantido do script original)
        function handleClickMassSupport() {
            jQuery('.ra-ask-support-btn').on('click', function () {
                jQuery(this).addClass('btn-confirm-yes');
            });
        }

        // Funções auxiliares para obter a lista de membros da tribo (líder e não-líder)
        async function getTribeMembersList() {
            let troopsMemberPage =
                '/game.php?village=' +
                game_data.village.id +
                '&screen=ally&mode=members_defense';
            if (game_data.player.sitter != '0') {
                troopsMemberPage += '&t=' + game_data.player.id;
            }

            const response = await jQuery.get(troopsMemberPage);
            const options = jQuery(response).find(
                '.input-nicer option:not([disabled])'
            );

            const membersToFetch = [];

            options.map(function (_, option) {
                let url =
                    '/game.php?screen=ally&mode=members_defense&player_id=' +
                    option.value +
                    '&village=' +
                    game_data.village.id;
                if (game_data.player.sitter != '0') {
                    url += '&t=' + game_data.player.id;
                }
                if (!isNaN(parseInt(option.value))) {
                    membersToFetch.push({
                        url: url,
                        id: parseInt(option.value),
                        name: option.text,
                    });
                }
            });

            return membersToFetch;
        }

        async function getTribeMembersListNotLeader() {
            let troopsMemberPage =
                '/game.php?village=' +
                game_data.village.id +
                '&screen=ally&mode=members_troops';
            if (game_data.player.sitter != '0') {
                troopsMemberPage += '&t=' + game_data.player.id;
            }

            const response = await jQuery.get(troopsMemberPage);
            const options = jQuery(response).find('.input-nicer option');

            const membersToFetch = [];

            options.map(function (_, option) {
                let url =
                    '/game.php?screen=ally&mode=members_troops&player_id=' +
                    option.value +
                    '&village=' +
                    game_data.village.id;

                if (game_data.player.sitter != '0') {
                    url += '&t=' + game_data.player.id;
                }
                if (!isNaN(parseInt(option.value))) {
                    membersToFetch.push({
                        url: url,
                        id: parseInt(option.value),
                        name: twSDK.cleanString(option.text),
                        incsShown: !option.disabled,
                    });
                }
            });

            return membersToFetch;
        }
    }
);
