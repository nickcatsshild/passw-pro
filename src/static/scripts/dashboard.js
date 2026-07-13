(function () {
    'use strict';

    var authToken = null;
    var API_BASE = window.location.origin + '/api';

    function getAuthToken() {
        var storageAreas = [localStorage, sessionStorage];
        for (var s = 0; s < storageAreas.length; s++) {
            var storage = storageAreas[s];
            for (var i = 0; i < storage.length; i++) {
                var key = storage.key(i);
                if (!key) continue;
                var val = storage.getItem(key);
                if (!val) continue;
                if (typeof val === 'string' && val.startsWith('eyJ')) {
                    var parts = val.split('.');
                    if (parts.length === 3) return val;
                }
                try {
                    var parsed = JSON.parse(val);
                    var found = deepFindToken(parsed);
                    if (found) return found;
                } catch (_) {}
            }
        }
        return null;
    }

    function deepFindToken(obj) {
        if (!obj || typeof obj !== 'object') return null;
        var keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) {
            var val = obj[keys[i]];
            if (typeof val === 'string' && val.startsWith('eyJ') && val.split('.').length === 3) return val;
            if (val && typeof val === 'object') {
                var found = deepFindToken(val);
                if (found) return found;
            }
        }
        return null;
    }

    async function apiFetch(path) {
        var resp = await fetch(API_BASE + path, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        if (!resp.ok) throw new Error('API error: ' + resp.status);
        return resp.json();
    }

    var typeIcons = { 1: '🔑', 2: '📝', 3: '💳', 4: '🆔', 5: '🔐' };
    var typeNames = { 1: 'Logins', 2: 'Secure Notes', 3: 'Cards', 4: 'Identities', 5: 'SSH Keys' };

    function renderStats(data) {
        var app = document.getElementById('app');
        app.innerHTML = '';

        // Summary cards
        var summary = document.createElement('div');
        summary.className = 'dash-grid';
        summary.innerHTML =
            '<div class="dash-card"><div class="dash-number">' + data.total + '</div><div class="dash-label">Total de Itens</div></div>' +
            '<div class="dash-card"><div class="dash-number">' + data.totalFolders + '</div><div class="dash-label">Pastas</div></div>' +
            '<div class="dash-card"><div class="dash-number">' + data.totalUsers + '</div><div class="dash-label">Usuários</div></div>' +
            '<div class="dash-card"><div class="dash-number">' + data.totalOrganizations + '</div><div class="dash-label">Organizações</div></div>' +
            '<div class="dash-card warn"><div class="dash-number">' + data.orphanCount + '</div><div class="dash-label">Sem Pasta</div></div>' +
            '<div class="dash-card ' + (data.repromptCount > 0 ? 'info' : '') + '"><div class="dash-number">' + data.repromptCount + '</div><div class="dash-label">C/ Proteção</div></div>' +
            '<div class="dash-card ' + (data.deletedCount > 0 ? 'warn' : '') + '"><div class="dash-number">' + data.deletedCount + '</div><div class="dash-label">Arquivados</div></div>';
        app.appendChild(summary);

        // By type section
        if (data.byType && Object.keys(data.byType).length > 0) {
            var typeSection = document.createElement('div');
            typeSection.className = 'dash-section';
            typeSection.innerHTML = '<h2 class="dash-section-title">Itens por Tipo</h2>';
            var typeGrid = document.createElement('div');
            typeGrid.className = 'dash-grid';
            var typeKeys = Object.keys(data.byType);
            for (var t = 0; t < typeKeys.length; t++) {
                var typeName = typeKeys[t];
                var typeCount = data.byType[typeName];
                var icon = typeIcons[t + 1] || '🔒';
                typeGrid.innerHTML +=
                    '<div class="dash-card small"><div class="dash-number">' + icon + ' ' + typeCount + '</div><div class="dash-label">' + typeName + '</div></div>';
            }
            typeSection.appendChild(typeGrid);
            app.appendChild(typeSection);
        }

        // By age section
        if (data.byAge) {
            var ageSection = document.createElement('div');
            ageSection.className = 'dash-section';
            ageSection.innerHTML = '<h2 class="dash-section-title">Itens por Idade</h2>';
            var ageGrid = document.createElement('div');
            ageGrid.className = 'dash-grid age-grid';
            ageGrid.innerHTML =
                '<div class="dash-card"><div class="dash-number">' + data.byAge.last7Days + '</div><div class="dash-label">Últimos 7 dias</div></div>' +
                '<div class="dash-card"><div class="dash-number">' + data.byAge.last30Days + '</div><div class="dash-label">Últimos 30 dias</div></div>' +
                '<div class="dash-card"><div class="dash-number">' + data.byAge.last90Days + '</div><div class="dash-label">Últimos 90 dias</div></div>' +
                '<div class="dash-card"><div class="dash-number">' + data.byAge.older + '</div><div class="dash-label">Mais de 90 dias</div></div>';
            ageSection.appendChild(ageGrid);
            app.appendChild(ageSection);
        }
    }

    function showError(msg) {
        document.getElementById('app').innerHTML =
            '<div class="dash-error"><h2>Erro ao carregar dados</h2><p>' + msg + '</p>' +
            '<button onclick="location.reload()" class="dash-btn">Tentar novamente</button></div>';
    }

    (async function () {
        authToken = getAuthToken();
        if (!authToken) {
            document.getElementById('app').innerHTML =
                '<div class="dash-error"><h2>Não foi possível autenticar</h2>' +
                '<p>Faça login no cofre primeiro.</p><a href="/" class="dash-btn">Ir para o cofre</a></div>';
            return;
        }
        try {
            var data = await apiFetch('/health/vault-stats');
            renderStats(data);
        } catch (err) {
            showError(err.message);
        }
    })();
})();
