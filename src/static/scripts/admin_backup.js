(function () {
    'use strict';

    const BASE_URL = window.location.origin;

    function showAlert(msg, type) {
        const existing = document.querySelector('.pw-alert');
        if (existing) existing.remove();
        const div = document.createElement('div');
        div.className = 'pw-alert alert alert-' + (type || 'info') + ' alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        div.style.zIndex = '99999';
        div.innerHTML = msg + '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
        document.body.appendChild(div);
        setTimeout(function () { div.remove(); }, 8000);
    }

    // Create backup
    document.getElementById('createBackup').addEventListener('click', function () {
        const btn = this;
        const progress = document.getElementById('backupProgress');
        btn.disabled = true;
        progress.classList.remove('d-none');

        fetch(BASE_URL + '/admin/backup/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.success) {
                    showAlert(data.message, 'success');
                    setTimeout(function () { location.reload(); }, 1500);
                } else {
                    showAlert('Error: ' + data.message, 'danger');
                }
            })
            .catch(function (err) {
                showAlert('Error: ' + err.message, 'danger');
            })
            .finally(function () {
                btn.disabled = false;
                progress.classList.add('d-none');
            });
    });

    // Restore backup
    document.getElementById('restoreForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const fileInput = document.getElementById('restoreFile');
        if (!fileInput.files || !fileInput.files[0]) {
            showAlert('Please select a backup file to restore.', 'warning');
            return;
        }

        if (!confirm('Are you sure? This will overwrite ALL current data including database, attachments, and configuration. This cannot be undone!')) {
            return;
        }

        const btn = document.getElementById('restoreBtn');
        const progress = document.getElementById('restoreProgress');
        btn.disabled = true;
        progress.classList.remove('d-none');

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        fetch(BASE_URL + '/admin/backup/restore', {
            method: 'POST',
            body: formData,
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.success) {
                    let msg = data.message;
                    if (data.details && data.details.length) {
                        msg += '<br><ul>';
                        data.details.forEach(function (d) { msg += '<li>' + d + '</li>'; });
                        msg += '</ul>';
                    }
                    showAlert(msg, 'success');
                } else {
                    showAlert('Error: ' + data.message, 'danger');
                }
            })
            .catch(function (err) {
                showAlert('Error: ' + err.message, 'danger');
            })
            .finally(function () {
                btn.disabled = false;
                progress.classList.add('d-none');
            });
    });

    // Delete backup
    document.querySelectorAll('.delete-backup').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const filename = this.getAttribute('data-filename');
            if (!confirm('Delete backup "' + filename + '"? This cannot be undone.')) return;

            fetch(BASE_URL + '/admin/backup/delete/' + encodeURIComponent(filename), {
                method: 'DELETE',
            })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success) {
                        showAlert('Backup deleted: ' + filename, 'success');
                        setTimeout(function () { location.reload(); }, 1000);
                    } else {
                        showAlert('Error: ' + data.message, 'danger');
                    }
                })
                .catch(function (err) {
                    showAlert('Error: ' + err.message, 'danger');
                });
        });
    });
})();
