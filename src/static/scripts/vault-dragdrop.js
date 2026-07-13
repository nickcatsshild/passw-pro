(function () {
    'use strict';

    var AUTH_TOKEN = null;
    var TOKEN_LOADED = false;

    function findToken() {
        var storageAreas = [localStorage, sessionStorage];
        for (var s = 0; s < storageAreas.length; s++) {
            var storage = storageAreas[s];
            try {
                for (var i = 0; i < storage.length; i++) {
                    var key = storage.key(i);
                    if (!key) continue;
                    var val = storage.getItem(key);
                    if (!val) continue;
                    if (typeof val === 'string' && val.length > 100 && val.startsWith('eyJ')) {
                        var parts = val.split('.');
                        if (parts.length === 3) return val;
                    }
                    try {
                        var parsed = JSON.parse(val);
                        var found = deepFind(parsed);
                        if (found) return found;
                    } catch (_) {}
                }
            } catch (_) {}
        }
        return null;
    }

    function deepFind(obj) {
        if (!obj || typeof obj !== 'object') return null;
        var keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) {
            var val = obj[keys[i]];
            if (typeof val === 'string' && val.length > 100 && val.startsWith('eyJ')) {
                var parts = val.split('.');
                if (parts.length === 3) return val;
            }
            if (val && typeof val === 'object') {
                var found = deepFind(val);
                if (found) return found;
            }
        }
        return null;
    }

    function getAuthToken() {
        if (TOKEN_LOADED) return AUTH_TOKEN;
        AUTH_TOKEN = findToken();
        TOKEN_LOADED = true;

        if (!AUTH_TOKEN) {
            var origFetch = window.fetch;
            window.fetch = function () {
                var args = arguments;
                var req = args[0];
                if (req && typeof req === 'object' && req.url && req.headers) {
                    try {
                        var auth = req.headers.get('Authorization');
                        if (auth && auth.startsWith('Bearer ')) {
                            AUTH_TOKEN = auth.slice(7);
                            TOKEN_LOADED = true;
                            window.fetch = origFetch;
                        }
                    } catch (_) {}
                }
                return origFetch.apply(this, args);
            };
        }
        return AUTH_TOKEN;
    }

    var API_BASE = window.location.origin + '/api';

    function apiFetch(path, opts) {
        var token = getAuthToken();
        if (!token) return Promise.reject(new Error('No auth token'));
        var headers = opts.headers || {};
        headers['Authorization'] = 'Bearer ' + token;
        if (!headers['Content-Type'] && opts.method && opts.method !== 'GET') {
            headers['Content-Type'] = 'application/json';
        }
        return fetch(API_BASE + path, { method: opts.method, headers: headers, body: opts.body });
    }

    var draggedCipherId = null;

    function addDragDrop() {
        var vaultEl = document.querySelector('[data-testid="vault-list"], .vault-items, app-vault');
        if (!vaultEl) return false;

        var cipherItems = document.querySelectorAll(
            '[data-testid="vault-list-item"], [data-testid="cipher-row"], .vault-item'
        );
        cipherItems.forEach(function (el) {
            if (el.draggable) return;
            el.draggable = true;
            el.classList.add('pw-draggable');
            el.addEventListener('dragstart', function (e) {
                var id = el.getAttribute('data-id') ||
                    (el.querySelector('[data-id]') && el.querySelector('[data-id]').getAttribute('data-id'));
                if (id) {
                    draggedCipherId = id;
                    e.dataTransfer.setData('text/plain', id);
                    e.dataTransfer.effectAllowed = 'move';
                    el.classList.add('pw-dragging');
                }
            });
            el.addEventListener('dragend', function () {
                el.classList.remove('pw-dragging');
                draggedCipherId = null;
            });
        });

        var dropTargets = document.querySelectorAll(
            '[data-testid="folder"], [data-testid="collection"], .folder-item, .collection-item'
        );
        dropTargets.forEach(function (el) {
            if (el._pwDrop) return;
            el._pwDrop = true;
            el.addEventListener('dragover', function (e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                el.classList.add('pw-drop-hover');
            });
            el.addEventListener('dragleave', function () {
                el.classList.remove('pw-drop-hover');
            });
            el.addEventListener('drop', function (e) {
                e.preventDefault();
                el.classList.remove('pw-drop-hover');
                var id = e.dataTransfer.getData('text/plain');
                if (!id && draggedCipherId) id = draggedCipherId;
                if (!id) return;
                var folderId = el.getAttribute('data-id') || el.getAttribute('data-folder-id') || '';
                moveToFolder(id, folderId);
            });
        });

        var noFolderTargets = document.querySelectorAll(
            '[data-testid="no-folder"], .filter-no-folder, [data-testid="folders"]'
        );
        noFolderTargets.forEach(function (el) {
            if (el._pwDrop) return;
            el._pwDrop = true;
            el.addEventListener('dragover', function (e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                el.classList.add('pw-drop-hover');
            });
            el.addEventListener('dragleave', function () {
                el.classList.remove('pw-drop-hover');
            });
            el.addEventListener('drop', function (e) {
                e.preventDefault();
                el.classList.remove('pw-drop-hover');
                var id = e.dataTransfer.getData('text/plain');
                if (!id && draggedCipherId) id = draggedCipherId;
                if (!id) return;
                moveToFolder(id, null);
            });
        });

        return true;
    }

    function moveToFolder(cipherId, folderId) {
        var body = {};
        if (folderId) {
            body.folderId = folderId;
        } else {
            body.folderId = null;
        }
        apiFetch('/ciphers/' + encodeURIComponent(cipherId) + '/partial', {
            method: 'PUT',
            body: JSON.stringify(body)
        }).then(function (resp) {
            if (resp.ok) {
                showToast('Item movido');
            } else {
                showToast('Erro ao mover', 'error');
            }
        }).catch(function () {
            showToast('Erro ao mover', 'error');
        });
    }

    function addOrganizeButton() {
        var nav = document.querySelector('nav, header, .navbar, .top-bar');
        if (!nav) return;
        if (document.querySelector('.pw-organize-btn')) return;
        var btn = document.createElement('a');
        btn.className = 'pw-organize-btn';
        btn.href = window.location.origin + '/organize';
        btn.textContent = '📦 Organizar';
        btn.style.cssText =
            'display:inline-flex;align-items:center;gap:4px;padding:6px 12px;' +
            'margin-left:8px;border-radius:6px;text-decoration:none;' +
            'font-size:13px;color:#fff;background:#4361ee;cursor:pointer;';
        nav.appendChild(btn);
    }

    function showToast(msg, type) {
        var existing = document.querySelector('.pw-toast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.className = 'pw-toast';
        toast.textContent = msg;
        toast.style.cssText =
            'position:fixed;bottom:20px;right:20px;padding:12px 24px;' +
            'border-radius:8px;font-size:14px;z-index:99999;' +
            'box-shadow:0 4px 16px rgba(0,0,0,0.3);transition:opacity 0.3s;' +
            (type === 'error' ? 'background:#9b2226;color:#fff;' : 'background:#2d6a4f;color:#fff;');
        document.body.appendChild(toast);
        setTimeout(function () { toast.style.opacity = '0'; }, 2000);
        setTimeout(function () { toast.remove(); }, 2500);
    }

    var pwStyle = document.createElement('style');
    pwStyle.textContent =
        '.pw-draggable{cursor:grab}.pw-draggable:active{cursor:grabbing}' +
        '.pw-dragging{opacity:0.5}' +
        '.pw-drop-hover{outline:2px solid #4361ee;outline-offset:-2px;border-radius:4px}' +
        '[draggable="true"]{user-select:none}';
    document.head.appendChild(pwStyle);

    var POLL_INTERVAL = 3000;
    var MAX_POLLS = 30;
    var pollCount = 0;

    function poll() {
        pollCount++;
        addOrganizeButton();
        if (addDragDrop()) return;
        if (pollCount < MAX_POLLS) {
            setTimeout(poll, POLL_INTERVAL);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', poll);
    } else {
        poll();
    }

    var observer = new MutationObserver(function () {
        addDragDrop();
        addOrganizeButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
