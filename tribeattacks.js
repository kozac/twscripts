/*
 * Script Name: Tribe Players Under Attack
 * Version: v1.2.6+support_details_command_share_warning
 * Last Updated: 2026-03-27
 * Author: RedAlert / Modificação por ChatGPT
 * Author URL: https://twscripts.dev/
 * Help: https://forum.tribalwars.net/index.php?threads/tribe-players-under-attack-tribe-leader.287111/
 *
 * Esse script exibe os ataques e as tropas atuais de cada aldeia dos jogadores da tribo,
 * busca também a quantidade de tropas de apoio que estão a caminho de cada aldeia atacada,
 * e agora mostra no topo da tabela os players que não estão compartilhando comandos.
 */

if (typeof DEBUG !== 'boolean') DEBUG = false;

var scriptConfig = {
    scriptData: {
        prefix: 'tribePlayersUnderAttack',
        name: 'Tribe Players Under Attack',
        version: 'v1.2.6+support_details_command_share_warning',
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
            Actions: 'Actions',
            'Players not sharing commands': 'WARNING, Players not sharing commands',
            None: 'None',
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
            Actions: 'Actions',
            'Players not sharing commands': 'ATTENTION, Joueurs ne partageant pas les commandes',
            None: 'Aucun',
        },
        pt_BR: {
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
            Actions: 'Ações',
            'Players not sharing commands': 'ATENÇÃO, Players não compartilhando comandos',
            None: 'Nenhum',
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
        await twSDK.init(scriptConfig);
        const scriptInfo = twSDK.scriptInfo();

        initTribePlayersUnderAttack();

        async function initTribePlayersUnderAttack() {
            const playersToFetch = await getTribeMembersList();

            if (playersToFetch.length) {
                const playersData = [...playersToFetch];
                const coordsRegex = twSDK.coordsRegex;
                const memberUrls = playersToFetch.map((item) => item.url);

                twSDK.startProgressBar(memberUrls.length);

                twSDK.getAll(
                    memberUrls,
                    function (index, data) {
                        twSDK.updateProgressBar(index, memberUrls.length);

                        const htmlDoc = jQuery.parseHTML(data);
                        const villagesTableRows = jQuery(htmlDoc)
                            .find(`.table-responsive table tr`)
                            .not(':first');
                        const totalPlayerVillagesCount = villagesTableRows.length;

                        const villageIncs = [];

                        if (villagesTableRows && villagesTableRows.length) {
                            villagesTableRows.each(function () {
                                try {
                                    const _this = jQuery(this);
                                    const incomingsCount = parseInt(
                                        _this.find('td:last').text().trim(),
                                        10
                                    );

                                    if (incomingsCount > 0) {
                                        const currentVillageId = parseInt(
                                            twSDK.getParameterByName(
                                                'id',
                                                window.location.origin +
                                                    _this
                                                        .find('td:first a')
                                                        .attr('href')
                                            ),
                                            10
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
                                            .each(function () {
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
                                        game_data.units.forEach((unit, index2) => {
                                            villageTroops[unit] = villageData[index2];
                                        });

                                        villageIncs.push({
                                            villageId: currentVillageId,
                                            villageName: currentVillageName,
                                            villageCoords: currentVillageCoords,
                                            incsCount: incomingsCount,
                                            troops: villageTroops,
                                            support: null,
                                        });
                                    }
                                } catch (error) {
                                    UI.ErrorMessage(
                                        twSDK.tt('Error fetching player incomings!')
                                    );
                                    console.error(`${scriptInfo} Error:`, error);
                                }
                            });
                        }

                        let totalIncs = villageIncs.map(
                            (incoming) => incoming.incsCount
                        );
                        totalIncs = parseInt(
                            twSDK.sumOfArrayItemValues(totalIncs),
                            10
                        );

                        playersData[index] = {
                            ...playersData[index],
                            incomings: villageIncs,
                            totalPlayerVillages: Math.ceil(totalPlayerVillagesCount / 2),
                            villagesUnderAttack: villageIncs.length,
                            totalIncomingsNumber: totalIncs,
                        };
                    },
                    async function () {
                        const customStyle = `
                            .ra-player-incomings { margin-bottom: 10px; border: 1px solid #7d510f; }
                            .ra-player-incomings:last-child { margin-bottom: 0; }
                            .ra-player-incomings h3 { user-select: none; font-weight: normal; margin: 0; padding: 5px; font-size: 14px; background-color: #cfb278 !important; position: relative; cursor: pointer; }
                            .toggle-details { margin-left: 5px; font-size: 11px; }
                            .details-row { background: #f3f0d9; }
                            .details-table { width: 100%; font-size: 10px; }
                            .details-table th { padding: 2px; }
                            .details-table td { padding: 2px; text-align: center; }
                            .loading-message { padding: 10px; text-align: center; font-size: 13px; }
                            .ra-command-share-warning { margin: 0 0 10px; padding: 8px 10px; border: 1px solid #b33b2e; background: #fbe3e1; color: #9b1c12; font-size: 12px; line-height: 1.5; }
                            .ra-command-share-warning strong { display: block; margin-bottom: 4px; color: #b00000; }
                            .ra-command-share-warning a { color: #9b1c12; font-weight: 700; text-decoration: underline; }
                            .ra-command-share-warning .ra-command-share-list { word-break: break-word; }
                        `;
                        const loadingMessage = `<div class="loading-message">Carregando apoio chegando, aguarde...</div>`;
                        twSDK.renderBoxWidget(
                            loadingMessage,
                            'raTribePlayersUnderAttack',
                            'ra-tribe-players-under-attack',
                            customStyle
                        );

                        const playersNotSharingPromise = getPlayersNotSharingCommands();

                        await fetchSupportDataForPlayersData(playersData);

                        let playersNotSharingCommands = [];
                        try {
                            playersNotSharingCommands = await playersNotSharingPromise;
                        } catch (error) {
                            console.error(
                                `${scriptInfo} Error fetching command sharing data:`,
                                error
                            );
                        }

                        const playerIncomingsTable = buildPlayerIncomingsTable(
                            playersData,
                            playersNotSharingCommands
                        );
                        twSDK.renderBoxWidget(
                            playerIncomingsTable,
                            'raTribePlayersUnderAttack',
                            'ra-tribe-players-under-attack',
                            customStyle
                        );

                        togglePlayerExpandableWidget();
                        handleClickMassSupport();
                        toggleDetailsRow();
                    },
                    function () {
                        UI.ErrorMessage(twSDK.tt('Error fetching player incomings!'));
                    }
                );
            } else {
                try {
                    const tribeMembers = await getTribeMembersListNotLeader();
                    const tribeMembersData = [...tribeMembers];
                    const tribeMemberUrls = tribeMembers.map((item) => item.url);
                    twSDK.startProgressBar(tribeMemberUrls.length);
                    twSDK.getAll(
                        tribeMemberUrls,
                        function (index, data) {
                            twSDK.updateProgressBar(index, tribeMemberUrls.length);
                            const htmlDoc = jQuery.parseHTML(data);
                            let incomingsCount = jQuery(htmlDoc)
                                .find(`.table-responsive table tr:first th:last`)
                                .text()
                                .trim();
                            incomingsCount = parseInt(
                                incomingsCount.substring(1, incomingsCount.length - 1),
                                10
                            );
                            tribeMembersData[index] = {
                                ...tribeMembersData[index],
                                incomings: incomingsCount,
                            };
                        },
                        function () {
                            if (DEBUG) {
                                console.debug(`${scriptInfo} tribeMembersData`, tribeMembersData);
                            }
                            try {
                                let dialogContent = `
                                    <div class="ra-popup-content ra-mb15">
                                        <table class="ra-table vis" width="100%">
                                            <thead>
                                                <tr>
                                                    <th class="ra-tal">${twSDK.tt('Player Name')}</th>
                                                    <th>${twSDK.tt('Incomings')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                `;
                                const playersWhoHaveShared = tribeMembersData
                                    .filter((tribeMember) => tribeMember.incsShown)
                                    .sort((a, b) => b.incomings - a.incomings);
                                const playersWhoHaveNotShared = tribeMembersData.filter(
                                    (tribeMember) => !tribeMember.incsShown
                                );
                                const tribeMembersList = [
                                    ...playersWhoHaveShared,
                                    ...playersWhoHaveNotShared,
                                ];
                                tribeMembersList.sort((a, b) => b.incomings - a.incomings);
                                tribeMembersList.forEach((tribeMember) => {
                                    const { id, name, incomings, incsShown } = tribeMember;
                                    const className = incsShown ? '' : 'incs-shown-disabled';
                                    dialogContent += `
                                        <tr class="${className}">
                                            <td class="ra-tal">
                                                <a href="/game.php?screen=info_player&id=${id}" target="_blank" rel="noopener noreferrer">
                                                    ${twSDK.cleanString(name)}
                                                </a>
                                            </td>
                                            <td>${twSDK.formatAsNumber(incomings)}</td>
                                        </tr>
                                    `;
                                });
                                dialogContent += `</tbody></table></div>`;
                                const customStyle = `.incs-shown-disabled td { opacity: 0.5; }`;
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
                            UI.ErrorMessage(twSDK.tt('Error fetching player incomings!'));
                        }
                    );
                } catch (error) {
                    UI.ErrorMessage(twSDK.tt('There was an error!'));
                    console.error(`${scriptInfo} Error:`, error);
                }
            }
        }

        async function fetchSupportDataForPlayersData(playersData) {
            for (let p = 0; p < playersData.length; p++) {
                const player = playersData[p];
                if (player.incomings && player.incomings.length) {
                    for (let i = 0; i < player.incomings.length; i++) {
                        const village = player.incomings[i];
                        await sleep(500);
                        try {
                            const supportData = await getSupportData(village.villageId);
                            village.support = supportData;
                        } catch (error) {
                            console.error(
                                `${scriptInfo} Error fetching support data for village ${village.villageId}:`,
                                error
                            );
                            village.support = {};
                            game_data.units.forEach((unit) => {
                                if (unit !== 'militia') {
                                    village.support[unit] = 0;
                                }
                            });
                        }
                    }
                }
            }
        }

        function buildPlayerIncomingsTable(playerIncomings, playersNotSharingCommands = []) {
            let playerIncomingsList = ``;
            const commandSharingWarningHtml = buildCommandSharingWarning(
                playersNotSharingCommands
            );

            playerIncomings.sort((a, b) => b.totalIncomingsNumber - a.totalIncomingsNumber);
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
                    const incomingsTable = buildSinglePlayerIncomingsTable(incomings);
                    const totalIncs = twSDK.formatAsNumber(totalIncomingsNumber);
                    const villagesUnderAttackCount = twSDK.formatAsNumber(villagesUnderAttack);
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
                                </a> <b>(${villagesUnderAttackCount}/${twSDK.formatAsNumber(totalPlayerVillages)})</b>
                                - ${twSDK.tt('Incomings')}: <b>${totalIncs}</b> - ${twSDK.tt('Incs/Village Under Attack:')} <b>${incomingsPerVillageUnderAttackRatio}</b> - ${twSDK.tt('Incs/Total Village:')} <b>${incomingsPerTotalVillageRatio}</b>
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
                playerIncomingsList = `<b>${twSDK.tt('No player is under attack!')}</b>`;
            }
            return `${commandSharingWarningHtml}${playerIncomingsList}`;
        }

        function buildCommandSharingWarning(playersNotSharingCommands) {
            if (!playersNotSharingCommands || !playersNotSharingCommands.length) {
                return '';
            }

            const playersListHtml = playersNotSharingCommands
                .map((player) => {
                    return `<a href="${player.profileUrl}" target="_blank" rel="noopener noreferrer">${twSDK.cleanString(player.name)}</a>`;
                })
                .join(', ');

            return `
                <div class="ra-command-share-warning">
                    <strong>${twSDK.tt('Players not sharing commands')}</strong>
                    <div class="ra-command-share-list">${playersListHtml}</div>
                </div>
            `;
        }

        function buildSinglePlayerIncomingsTable(incomings) {
            let troopsHead = '';
            game_data.units.forEach((unit) => {
                if (unit !== 'militia') {
                    troopsHead += `<th width="6.5%"><img src="/graphic/unit/unit_${unit}.png"></th>`;
                }
            });
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
            incomings.sort((a, b) => b.incsCount - a.incsCount);
            incomings.forEach((incoming) => {
                const { incsCount, troops, villageName, villageId, support } = incoming;
                const supportData = support || {};
                let mainRowCells = '';
                game_data.units.forEach((unit) => {
                    if (unit !== 'militia') {
                        const current = parseInt(troops[unit], 10) || 0;
                        const sup = parseInt(supportData[unit], 10) || 0;
                        const total = current + sup;
                        mainRowCells += `<td class="unit-total" data-unit="${unit}">${twSDK.formatAsNumber(total)}</td>`;
                    }
                });
                incomingsTable += `
                    <tr class="incoming-row" data-village-id="${villageId}" data-current-troops='${JSON.stringify(troops)}' data-support='${JSON.stringify(supportData)}'>
                        <td class="ra-tal">
                            <a href="/game.php?screen=info_village&id=${villageId}" target="_blank" rel="noopener noreferrer">
                                ${villageName}
                            </a>
                        </td>
                        <td>${twSDK.formatAsNumber(incsCount)}</td>
                        ${mainRowCells}
                        <td>
                            <a href="${game_data.link_base_pure}place&mode=call&target=${villageId}&village=${game_data.village.id}" class="btn ra-ask-support-btn" target="_blank" rel="noopener noreferrer">
                                ${twSDK.tt('Support')}
                            </a>
                            <button class="btn toggle-details" title="Ver detalhes">i</button>
                        </td>
                    </tr>
                    <tr class="details-row" data-village-id="${villageId}" style="display:none;">
                        <td colspan="100%">
                            <div class="details-content">${buildDetailsContent(troops, supportData)}</div>
                        </td>
                    </tr>
                `;
            });
            incomingsTable += `</tbody></table>`;
            return incomingsTable;
        }

        function buildDetailsContent(troops, supportData) {
            let breakdownHtml = '<table class="details-table"><tr>';
            game_data.units.forEach(function (unit) {
                if (unit !== 'militia') {
                    breakdownHtml += `<th>${unit}</th>`;
                }
            });
            breakdownHtml += '</tr><tr>';
            game_data.units.forEach(function (unit) {
                if (unit !== 'militia') {
                    const current = parseInt(troops[unit], 10) || 0;
                    const sup = supportData && supportData[unit] ? parseInt(supportData[unit], 10) : 0;
                    const total = current + sup;
                    breakdownHtml += `<td>
                        Na aldeia: ${twSDK.formatAsNumber(current)}<br>
                        Apoio chegando: ${twSDK.formatAsNumber(sup)}<br>
                        <strong>Total: ${twSDK.formatAsNumber(total)}</strong>
                    </td>`;
                }
            });
            breakdownHtml += '</tr></table>';
            return breakdownHtml;
        }

        function sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }

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
                                const value = parseInt(cell.text().trim().replace(/\./g, ''), 10) || 0;
                                supportData[unit] = value;
                            }
                        }
                    });
                }
                return supportData;
            } catch (error) {
                console.error(`${scriptInfo} Error fetching support data for village ${villageId}:`, error);
                let supportData = {};
                game_data.units.forEach((unit) => {
                    if (unit !== 'militia') {
                        supportData[unit] = 0;
                    }
                });
                return supportData;
            }
        }

        async function getPlayersNotSharingCommands() {
            let troopsMemberPage =
                '/game.php?village=' +
                game_data.village.id +
                '&screen=ally&mode=members_troops';

            if (game_data.player.sitter != '0') {
                troopsMemberPage += '&t=' + game_data.player.id;
            }

            const response = await jQuery.get(troopsMemberPage);
            const htmlDoc = jQuery.parseHTML(response);
            const rows = jQuery(htmlDoc)
                .find('.table-responsive table tr')
                .not(':first');
            const playersNotSharingCommands = [];

            rows.each(function () {
                const $row = jQuery(this);
                const $cells = $row.find('td');
                if (!$cells.length) return;

                const firstCellText = $cells.first().text().trim();
                if (!firstCellText || firstCellText === 'Sumário') return;

                const $playerLink = $cells.first().find('a[href*="screen=info_player"]');
                if (!$playerLink.length) return;

                const lastCellText = $cells.last().text().trim();
                if (lastCellText !== '?') return;

                let profileUrl = $playerLink.attr('href') || '';
                if (
                    profileUrl &&
                    profileUrl.indexOf('http://') !== 0 &&
                    profileUrl.indexOf('https://') !== 0
                ) {
                    profileUrl = window.location.origin + profileUrl;
                }

                const playerId = parseInt(
                    twSDK.getParameterByName('id', profileUrl),
                    10
                );
                const playerName = twSDK.cleanString($playerLink.text().trim());

                if (!playerId || !playerName) return;

                playersNotSharingCommands.push({
                    id: playerId,
                    name: playerName,
                    profileUrl,
                });
            });

            const uniquePlayers = [];
            const seen = new Set();
            playersNotSharingCommands.forEach((player) => {
                if (seen.has(player.id)) return;
                seen.add(player.id);
                uniquePlayers.push(player);
            });

            return uniquePlayers;
        }

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

        function handleClickMassSupport() {
            jQuery('.ra-ask-support-btn').on('click', function () {
                jQuery(this).addClass('btn-confirm-yes');
            });
        }

        async function getTribeMembersList() {
            let troopsMemberPage =
                '/game.php?village=' +
                game_data.village.id +
                '&screen=ally&mode=members_defense';
            if (game_data.player.sitter != '0') {
                troopsMemberPage += '&t=' + game_data.player.id;
            }
            const response = await jQuery.get(troopsMemberPage);
            const options = jQuery(response).find('.input-nicer option:not([disabled])');
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
                if (!isNaN(parseInt(option.value, 10))) {
                    membersToFetch.push({
                        url: url,
                        id: parseInt(option.value, 10),
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
                if (!isNaN(parseInt(option.value, 10))) {
                    membersToFetch.push({
                        url: url,
                        id: parseInt(option.value, 10),
                        name: twSDK.cleanString(option.text),
                        incsShown: !option.disabled,
                    });
                }
            });
            return membersToFetch;
        }
    }
);
