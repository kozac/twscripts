(function() {
    // Função auto-executável para evitar poluição do escopo global
    (function() {
        /** 
         * **Helper: Funções para Gerenciar Cookies**
         */
        function setCookie(name, value, days) {
            let expires = "";
            if (days) {
                let date = new Date();
                date.setTime(date.getTime() + (days*24*60*60*1000));
                expires = "; expires=" + date.toUTCString();
            }
            document.cookie = name + "=" + (encodeURIComponent(value) || "")  + expires + "; path=/";
        }

        function getCookie(name) {
            let nameEQ = name + "=";
            let ca = document.cookie.split(';');
            for(let i=0;i < ca.length;i++) {
                let c = ca[i];
                while (c.charAt(0)==' ') c = c.substring(1,c.length);
                if (c.indexOf(nameEQ) == 0) return decodeURIComponent(c.substring(nameEQ.length,c.length));
            }
            return null;
        }

        function deleteCookie(name) {   
            document.cookie = name+'=; Max-Age=-99999999;';  
        }

        /**
         * **Função para Verificar se o Jogador Está em uma Tribo**
         */
        function isInTribe() {
            return parseInt(game_data.player.ally) > 0;
        }

        /**
         * **Função para Buscar os Membros da Tribo**
         */
        function fetchTribeMembers() {
            return new Promise(function(resolve, reject) {
                let membersDefenseURL = `/game.php?village=${game_data.village.id}&screen=ally&mode=members_defense`;
                if (game_data.player.sitter != '0') {
                    membersDefenseURL += `&t=${game_data.player.id}`;
                }

                $.get(membersDefenseURL, function(data) {
                    // Parseia o HTML recebido
                    let html = $(data);
                    // Seleciona todas as opções na classe '.input-nicer' que não estão desabilitadas
                    let options = html.find('.input-nicer option:not([disabled])');

                    let tribeMembers = [];

                    options.each(function() {
                        let name = $(this).text().trim();
                        if (name) {
                            tribeMembers.push(name);
                        }
                    });

                    resolve(tribeMembers);
                }).fail(function() {
                    reject('Falha ao buscar os membros da tribo.');
                });
            });
        }

        /**
         * **Função para Extrair os Nomes dos Jogadores que Enviaram Apoio**
         */
        function getSupportingPlayers() {
            let supportingPlayers = new Set();

            // Seletores para apoio ainda a caminho
            let supportEnRouteSelector = '#commands_outgoings > table > tbody > tr > td:nth-child(1) > span > span > a > span.quickedit-label';
            $(supportEnRouteSelector).each(function() {
                let fullText = $(this).text().trim();
                let playerName = fullText.split(':')[0].trim(); // Extrai o nome antes dos ':'
                if (playerName) {
                    supportingPlayers.add(playerName);
                }
            });

            // Seletores para apoio já chegou
            let supportArrivedSelector = '#withdraw_selected_units_village_info > table > tbody > tr > td:nth-child(1) > a:nth-child(2)';
            $(supportArrivedSelector).each(function() {
                let playerName = $(this).text().trim();
                if (playerName) {
                    supportingPlayers.add(playerName);
                }
            });

            return Array.from(supportingPlayers);
        }

        /**
         * **Função para Extrair Dados da Aldeia Atual**
         */
        function getCurrentVillageInfo() {
            let coordinates = $('#content_value > table > tbody > tr > td:nth-child(1) > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(2)').text().trim();
            let playerName = $('#content_value > table > tbody > tr > td:nth-child(1) > table:nth-child(1) > tbody > tr:nth-child(5) > td:nth-child(2) > a').text().trim();
            let villageName = $('#content_value > h2').text().trim();

            return { coordinates, playerName, villageName };
        }

        /**
         * **Função para Comparar Membros da Tribo com Jogadores que Enviaram Apoio**
         */
        function compareSupport(tribeMembers, supportingPlayers, ownerName) {
            const supported = [];
            const notSupported = [];

            tribeMembers.forEach(function(member) {
                if (member === ownerName) {
                    // Excluir o dono da aldeia da comparação
                    return;
                }
                if (supportingPlayers.includes(member)) {
                    supported.push(member);
                } else {
                    notSupported.push(member);
                }
            });

            return { supported, notSupported };
        }

        /**
         * **Função para Carregar Dados de Apoio Armazenados em Cookies**
         */
        function loadSupportData() {
            let data = getCookie('tribalSupportData');
            if (data) {
                try {
                    return JSON.parse(data);
                } catch (e) {
                    console.error('Erro ao parsear os dados do cookie:', e);
                    return { villages: [], supportCounts: {} };
                }
            } else {
                return { villages: [], supportCounts: {} };
            }
        }

        /**
         * **Função para Salvar Dados de Apoio em Cookies**
         */
        function saveSupportData(data) {
            // Armazena os dados por 365 dias
            setCookie('tribalSupportData', JSON.stringify(data), 365);
        }

        /**
         * **Função para Atualizar os Dados de Apoio**
         */
        function updateSupportData(data, villageInfo, supported, notSupported) {
            // Adiciona os dados da aldeia atual
            data.villages.push({
                coordinates: villageInfo.coordinates,
                playerName: villageInfo.playerName,
                villageName: villageInfo.villageName,
                supported: supported,
                notSupported: notSupported
            });

            // Atualiza contagem de apoio por jogador
            supported.forEach(function(player) {
                if (!data.supportCounts[player]) {
                    data.supportCounts[player] = { supported: 0, notSupported: 0 };
                }
                data.supportCounts[player].supported += 1;
            });

            notSupported.forEach(function(player) {
                if (!data.supportCounts[player]) {
                    data.supportCounts[player] = { supported: 0, notSupported: 0 };
                }
                data.supportCounts[player].notSupported += 1;
            });

            return data;
        }

        /**
         * **Função para Calcular Estatísticas de Apoio**
         */
        function calculateSupportStats(data) {
            const totalVillages = data.villages.length;
            let stats = [];

            for (let player in data.supportCounts) {
                let supported = data.supportCounts[player].supported;
                let notSupported = data.supportCounts[player].notSupported;
                let totalSupports = supported + notSupported;
                let supportPercentage = ((supported / totalVillages) * 100).toFixed(2);

                stats.push({
                    player: player,
                    supported: supported,
                    notSupported: notSupported,
                    supportPercentage: supportPercentage
                });
            }

            // Ordena do mais para o menos apoiador
            stats.sort((a, b) => b.supported - a.supported);

            return stats;
        }

        /**
         * **Função para Exibir as Estatísticas de Apoio na Interface do Usuário**
         */
        function displaySupportStats(stats, totalVillages) {
            // Remove qualquer container anterior para evitar duplicações
            $('#supportStatsContainer').remove();

            // Cria um contêiner fixo na parte inferior esquerda da página
            let container = $('<div id="supportStatsContainer"></div>').css({
                position: 'fixed',
                bottom: '10px',
                left: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '2px solid #000',
                borderRadius: '8px',
                padding: '15px',
                zIndex: 10000,
                maxHeight: '600px',
                overflowY: 'auto',
                width: '400px',
                boxShadow: '0 0 10px rgba(0,0,0,0.5)'
            });

            // **Adicionar Título**
            container.append('<h3 style="margin-top:0; text-align:center;">Estatísticas de Apoio da Tribo</h3>');

            // **Adicionar Resumo Total de Aldeias Analisadas**
            container.append(`<p><strong>Total de Aldeias Analisadas:</strong> ${totalVillages}</p>`);

            // **Tabela de Estatísticas**
            let table = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 5px;">Jogador</th>
                            <th style="border: 1px solid #000; padding: 5px;">Apoiou</th>
                            <th style="border: 1px solid #000; padding: 5px;">Não Apoiou</th>
                            <th style="border: 1px solid #000; padding: 5px;">% Apoio</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.map(stat => `
                            <tr>
                                <td style="border: 1px solid #000; padding: 5px;">${stat.player}</td>
                                <td style="border: 1px solid #000; padding: 5px;">${stat.supported}</td>
                                <td style="border: 1px solid #000; padding: 5px;">${stat.notSupported}</td>
                                <td style="border: 1px solid #000; padding: 5px;">${stat.supportPercentage}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            container.append(table);

            // **Botão para Resetar Dados**
            let resetButton = $('<button>Resetar Dados</button>').css({
                marginTop: '10px',
                padding: '10px 15px',
                cursor: 'pointer',
                backgroundColor: '#ff4d4d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px'
            }).on('click', function() {
                if (confirm('Tem certeza que deseja resetar todos os dados de apoio?')) {
                    deleteCookie('tribalSupportData');
                    $('#supportInfoContainer').remove();
                    $('#supportStatsContainer').remove();
                    alert('Dados de apoio foram resetados.');
                }
            });
            container.append(resetButton);

            // **Adicionar Estilos Personalizados**
            let styles = `
                #supportStatsContainer h3 {
                    margin-bottom: 10px;
                    color: #2E7D32;
                }
                #supportStatsContainer table th, #supportStatsContainer table td {
                    text-align: center;
                }
                #supportStatsContainer table th {
                    background-color: #f2f2f2;
                }
                #supportStatsContainer table tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
            `;
            container.append(`<style>${styles}</style>`);

            // **Adicionar o Contêiner ao Corpo da Página**
            $('body').append(container);
        }

        /**
         * **Função para Exibir as Informações na Interface do Usuário**
         */
        function displaySupportInfo(villageInfo, supported, notSupported) {
            // Remove qualquer container anterior para evitar duplicações
            $('#supportInfoContainer').remove();

            // Cria um contêiner fixo na parte inferior direita da página
            let container = $('<div id="supportInfoContainer"></div>').css({
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '2px solid #000',
                borderRadius: '8px',
                padding: '15px',
                zIndex: 10000,
                maxHeight: '600px',
                overflowY: 'auto',
                width: '400px',
                boxShadow: '0 0 10px rgba(0,0,0,0.5)'
            });

            // **Adicionar Dados da Aldeia Atual**
            let villageInfoHtml = `
                <h3 style="margin-top:0; text-align:center;">Informações da Aldeia</h3>
                <p><strong>Coordenadas:</strong> ${villageInfo.coordinates}</p>
                <p><strong>Jogador:</strong> ${villageInfo.playerName}</p>
                <p><strong>Aldeia:</strong> ${villageInfo.villageName}</p>
                <hr>
            `;
            container.append(villageInfoHtml);

            // **Adicionar Resumo de Apoio**
            let summaryHtml = `
                <h4>Resumo de Apoio</h4>
                <p><strong>${supported.length} Apoiou</strong></p>
                <p><strong>${notSupported.length} Não Apoiou</strong></p>
                <hr>
            `;
            container.append(summaryHtml);

            // **Adicionar Lista de Quem Não Apoiou**
            let notSupportedHtml = `
                <h4>Membros que Não Enviaram Apoio</h4>
            `;
            if (notSupported.length > 0) {
                let list = $('<ul></ul>').css({ 'list-style-type': 'disc', 'padding-left': '20px' });
                notSupported.forEach(function(name) {
                    list.append(`<li>${name}</li>`);
                });
                notSupportedHtml += list.prop('outerHTML');
            } else {
                notSupportedHtml += '<p>Todos os membros enviaram apoio.</p>';
            }
            container.append(notSupportedHtml);

            // **Botão para Fechar o Contêiner**
            let closeButton = $('<button>Fechar</button>').css({
                position: 'absolute',
                top: '10px',
                right: '10px',
                padding: '5px 10px',
                cursor: 'pointer',
                backgroundColor: '#ff4d4d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px'
            }).on('click', function() {
                container.remove();
            });
            container.append(closeButton);

            // **Adicionar Estilos Personalizados**
            let styles = `
                #supportInfoContainer h3 {
                    margin-bottom: 10px;
                    color: #2E7D32;
                }
                #supportInfoContainer h4 {
                    margin-bottom: 5px;
                    color: #1565C0;
                }
                #supportInfoContainer p {
                    margin: 5px 0;
                }
                #supportInfoContainer ul {
                    list-style-type: disc;
                    padding-left: 20px;
                }
            `;
            container.append(`<style>${styles}</style>`);

            // **Adicionar o Contêiner ao Corpo da Página**
            $('body').append(container);
        }

        /**
         * **Função para Carregar Dados da Aldeia Atual nos Cookies e Atualizar as Estatísticas**
         */
        function loadAndDisplayAllSupportInfo(villageInfo, supported, notSupported) {
            // Carrega os dados existentes
            let supportData = loadSupportData();

            // Verifica se a aldeia atual já foi registrada para evitar duplicações
            let alreadyRecorded = supportData.villages.some(v => v.coordinates === villageInfo.coordinates);
            if (!alreadyRecorded) {
                // Atualiza os dados com a aldeia atual
                supportData = updateSupportData(supportData, villageInfo, supported, notSupported);

                // Salva os dados de volta no cookie
                saveSupportData(supportData);
            }

            // Calcula estatísticas de apoio
            let stats = calculateSupportStats(supportData);
            let totalVillages = supportData.villages.length;

            // Exibe as estatísticas na interface
            displaySupportStats(stats, totalVillages);
        }

        /**
         * **Função Principal que Executa Todas as Etapas**
         */
        function main() {
            if (!isInTribe()) {
                alert('Você precisa estar em uma tribo para usar este script.');
                return;
            }

            // **Extrair Informações da Aldeia Atual**
            let villageInfo = getCurrentVillageInfo();

            // **Exibir um Indicador de Carregamento**
            let loadingIndicator = $('<div id="supportLoadingIndicator"></div>').css({
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: '#fff',
                padding: '20px',
                borderRadius: '8px',
                zIndex: 10000,
                textAlign: 'center'
            }).text('Analisando apoio, por favor aguarde...');
            $('body').append(loadingIndicator);

            // **Buscar Membros da Tribo**
            fetchTribeMembers().then(function(tribeMembers) {
                // **Obter Jogadores que Enviaram Apoio**
                let supportingPlayers = getSupportingPlayers();

                // **Comparar as Listas Excluindo o Dono da Aldeia**
                let { supported, notSupported } = compareSupport(tribeMembers, supportingPlayers, villageInfo.playerName);

                // **Exibir as Informações na Interface do Usuário**
                displaySupportInfo(villageInfo, supported, notSupported);

                // **Atualizar e Exibir as Estatísticas**
                loadAndDisplayAllSupportInfo(villageInfo, supported, notSupported);

                // **Remover o Indicador de Carregamento**
                loadingIndicator.remove();
            }).catch(function(error) {
                loadingIndicator.remove();
                alert(error);
                console.error(error);
            });
        }

        /**
         * **Executa a Função Principal**
         */
        main();

    })();
})();
