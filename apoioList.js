(function() {
    // Função auto-executável para evitar poluição do escopo global
    (function() {
        // **Função para Verificar se o Jogador Está em uma Tribo**
        function isInTribe() {
            return parseInt(game_data.player.ally) > 0;
        }

        // **Função para Buscar os Membros da Tribo**
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

        // **Função para Extrair os Nomes dos Jogadores que Enviaram Apoio**
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

        // **Função para Extrair Dados da Aldeia Atual**
        function getCurrentVillageInfo() {
            let coordinates = $('#content_value > table > tbody > tr > td:nth-child(1) > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(2)').text().trim();
            let playerName = $('#content_value > table > tbody > tr > td:nth-child(1) > table:nth-child(1) > tbody > tr:nth-child(5) > td:nth-child(2) > a').text().trim();
            let villageName = $('#content_value > table > tbody > tr > td:nth-child(1) > table:nth-child(1) > tbody > tr:nth-child(5) > td:nth-child(2) > a').text().trim();

            return { coordinates, playerName, villageName };
        }

        // **Função para Comparar Membros da Tribo com Jogadores que Enviaram Apoio**
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

        // **Função para Exibir as Informações na Interface do Usuário**
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

        // **Função Principal que Executa Todas as Etapas**
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

                // **Remover o Indicador de Carregamento**
                loadingIndicator.remove();
            }).catch(function(error) {
                loadingIndicator.remove();
                alert(error);
                console.error(error);
            });
        }

        // **Executa a Função Principal**
        main();

    })();
})();
