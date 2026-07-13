(function () {
    'use strict';

    let authToken = null;
    let currentUserId = null;
    let allCiphers = [];
    let allFolders = [];
    let allCollections = [];
    let draggedItem = null;

    const API_BASE = window.location.origin + '/api';

    function getAuthToken() {
        const storageAreas = [localStorage, sessionStorage];
        for (const storage of storageAreas) {
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (!key) continue;
                try {
                    const val = storage.getItem(key);
                    if (!val) continue;
                    if (typeof val === 'string' && val.startsWith('eyJ')) {
                        const parts = val.split('.');
                        if (parts.length === 3) {
                            return val;
                        }
                    }
                    const parsed = JSON.parse(val);
                    if (parsed && typeof parsed === 'object') {
                        const found = deepFindToken(parsed);
                        if (found) return found;
                    }
                } catch (_) { }
            }
        }
        return null;
    }

    function deepFindToken(obj) {
        if (!obj || typeof obj !== 'object') return null;
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (typeof val === 'string' && val.startsWith('eyJ') && val.split('.').length === 3) {
                return val;
            }
            if (val && typeof val === 'object') {
                const found = deepFindToken(val);
                if (found) return found;
            }
        }
        return null;
    }

    async function apiFetch(path, options) {
        const opts = options || {};
        const headers = opts.headers || {};
        headers['Authorization'] = 'Bearer ' + authToken;
        if (!headers['Content-Type'] && opts.method && opts.method !== 'GET') {
            headers['Content-Type'] = 'application/json';
        }
        const resp = await fetch(API_BASE + path, { ...opts, headers });
        if (!resp.ok) throw new Error('API error: ' + resp.status);
        return resp.json();
    }

    async function loadData() {
        const sync = await apiFetch('/sync');
        currentUserId = sync.profile.id;
        allCiphers = sync.ciphers || [];
        allFolders = sync.folders || [];
        allCollections = sync.collections || [];
    }

    function render() {
        const app = document.getElementById('app');
        app.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'organize-header';
        header.innerHTML = '<h1>Organizar Cofre</h1><p>Arraste e solte os itens entre pastas e grupos</p>';
        app.appendChild(header);

        const container = document.createElement('div');
        container.className = 'organize-container';

        const sidebar = document.createElement('div');
        sidebar.className = 'organize-sidebar';
        sidebar.appendChild(renderSidebar());
        container.appendChild(sidebar);

        const main = document.createElement('div');
        main.className = 'organize-main';
        main.appendChild(renderCipherList());
        container.appendChild(main);

        app.appendChild(container);
        initDragDrop();
    }

    function renderSidebar() {
        const wrapper = document.createElement('div');

        const folderSection = document.createElement('div');
        folderSection.className = 'organize-section';
        const folderTitle = document.createElement('h2');
        folderTitle.textContent = 'Pastas';
        folderSection.appendChild(folderTitle);
        const folderNone = document.createElement('div');
        folderNone.className = 'organize-node organize-dropzone';
        folderNone.setAttribute('data-type', 'folder');
        folderNone.setAttribute('data-id', '');
        folderNone.textContent = '📁 Sem pasta';
        folderNone.title = 'Soltar aqui para remover da pasta';
        folderSection.appendChild(folderNone);
        for (const f of allFolders) {
            const el = document.createElement('div');
            el.className = 'organize-node organize-dropzone';
            el.setAttribute('data-type', 'folder');
            el.setAttribute('data-id', f.id);
            el.textContent = '📁 ' + f.name;
            el.title = 'Soltar itens aqui para mover para ' + f.name;
            folderSection.appendChild(el);
        }
        wrapper.appendChild(folderSection);

        const collectionSection = document.createElement('div');
        collectionSection.className = 'organize-section';
        const collTitle = document.createElement('h2');
        collTitle.textContent = 'Grupos (Coleções)';
        collectionSection.appendChild(collTitle);
        for (const c of allCollections) {
            const el = document.createElement('div');
            el.className = 'organize-node organize-dropzone';
            el.setAttribute('data-type', 'collection');
            el.setAttribute('data-id', c.id);
            el.textContent = '🔒 ' + c.name;
            el.title = 'Soltar itens aqui';
            collectionSection.appendChild(el);
        }
        wrapper.appendChild(collectionSection);

        return wrapper;
    }

    function renderCipherList() {
        const wrapper = document.createElement('div');

        const filterBar = document.createElement('div');
        filterBar.className = 'organize-filter';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Filtrar itens...';
        searchInput.className = 'organize-search';
        searchInput.addEventListener('input', function () {
            filterCiphers(this.value);
        });
        filterBar.appendChild(searchInput);
        wrapper.appendChild(filterBar);

        const list = document.createElement('div');
        list.id = 'cipher-list';
        list.className = 'organize-cipher-list';
        wrapper.appendChild(list);

        return wrapper;
    }

    function filterCiphers(query) {
        const items = document.querySelectorAll('.organize-cipher-item');
        const q = query.toLowerCase();
        for (const item of items) {
            const name = item.getAttribute('data-name') || '';
            item.style.display = (!q || name.toLowerCase().includes(q)) ? '' : 'none';
        }
    }

    function renderCipherItems() {
        const list = document.getElementById('cipher-list');
        list.innerHTML = '';
        for (const c of allCiphers) {
            const el = document.createElement('div');
            el.className = 'organize-cipher-item';
            el.draggable = true;
            el.setAttribute('data-id', c.id);
            el.setAttribute('data-name', c.name || '');
            el.setAttribute('data-folder', c.folderId || '');
            const folderName = c.folderId
                ? (allFolders.find(function (f) { return f.id === c.folderId }) || {}).name || 'Pasta desconhecida'
                : 'Sem pasta';
            el.innerHTML = '<span class="cipher-icon">' + getCipherIcon(c) + '</span>' +
                '<span class="cipher-name">' + (c.name || 'Sem nome') + '</span>' +
                '<span class="cipher-folder">' + folderName + '</span>';
            el.addEventListener('dragstart', function (e) {
                draggedItem = { id: c.id, el: el };
                el.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', c.id);
            });
            el.addEventListener('dragend', function () {
                el.classList.remove('dragging');
                draggedItem = null;
            });
            list.appendChild(el);
        }

        if (allCiphers.length === 0) {
            list.innerHTML = '<div class="organize-empty">Nenhum item encontrado</div>';
        }
    }

    function getCipherIcon(c) {
        const type = c.type;
        if (type === 1) return '🔑';
        if (type === 2) return '💳';
        if (type === 3) return '📝';
        if (type === 4) return '🆔';
        return '🔒';
    }

    function initDragDrop() {
        const dropzones = document.querySelectorAll('.organize-dropzone');
        for (const zone of dropzones) {
            zone.addEventListener('dragover', function (e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                this.classList.add('drag-over');
            });
            zone.addEventListener('dragleave', function () {
                this.classList.remove('drag-over');
            });
            zone.addEventListener('drop', function (e) {
                e.preventDefault();
                this.classList.remove('drag-over');
                const cipherId = e.dataTransfer.getData('text/plain');
                const targetType = this.getAttribute('data-type');
                const targetId = this.getAttribute('data-id');
                if (cipherId) {
                    handleDrop(cipherId, targetType, targetId);
                }
            });
        }
    }

    async function handleDrop(cipherId, targetType, targetId) {
        if (targetType === 'folder') {
            await moveToFolder(cipherId, targetId);
        }
    }

    async function moveToFolder(cipherId, folderId) {
        try {
            const body = {};
            if (folderId) {
                body.folderId = folderId;
            } else {
                body.folderId = null;
            }
            await apiFetch('/ciphers/' + cipherId + '/partial', {
                method: 'PUT',
                body: JSON.stringify(body)
            });
            showToast('Item movido com sucesso!', 'success');
            refreshItemFolder(cipherId, folderId);
        } catch (err) {
            showToast('Erro ao mover item: ' + err.message, 'error');
        }
    }

    function refreshItemFolder(cipherId, folderId) {
        const item = document.querySelector('.organize-cipher-item[data-id="' + cipherId + '"]');
        if (item) {
            item.setAttribute('data-folder', folderId || '');
            const folderSpan = item.querySelector('.cipher-folder');
            if (folderSpan) {
                const folderName = folderId
                    ? (allFolders.find(function (f) { return f.id === folderId }) || {}).name || 'Pasta desconhecida'
                    : 'Sem pasta';
                folderSpan.textContent = folderName;
            }
        }
    }

    function showToast(msg, type) {
        const existing = document.querySelector('.organize-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'organize-toast ' + (type || 'info');
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.style.opacity = '0';
            setTimeout(function () { toast.remove(); }, 400);
        }, 2500);
    }

    (async function () {
        authToken = getAuthToken();
        if (!authToken) {
            document.getElementById('app').innerHTML =
                '<div class="organize-error">' +
                '<h2>Não foi possível autenticar</h2>' +
                '<p>Faça login no cofre primeiro, depois tente novamente.</p>' +
                '<a href="/" class="organize-btn">Ir para o cofre</a>' +
                '</div>';
            return;
        }
        try {
            await loadData();
            render();
            renderCipherItems();
        } catch (err) {
            document.getElementById('app').innerHTML =
                '<div class="organize-error">' +
                '<h2>Erro ao carregar dados</h2>' +
                '<p>' + err.message + '</p>' +
                '<button onclick="location.reload()" class="organize-btn">Tentar novamente</button>' +
                '</div>';
        }
    })();
})();
