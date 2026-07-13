#!/bin/sh

if [ -n "${UMASK}" ]; then
    umask "${UMASK}"
fi

if [ -r /etc/passw-pro.sh ]; then
    . /etc/passw-pro.sh
elif [ -r /etc/vaultwarden.sh ]; then
    echo "### You are using the old /etc/vaultwarden.sh script, please migrate to /etc/passw-pro.sh ###"
    . /etc/vaultwarden.sh
fi

if [ -d /etc/passw-pro.d ]; then
    for f in /etc/passw-pro.d/*.sh; do
        if [ -r "${f}" ]; then
            . "${f}"
        fi
    done
elif [ -d /etc/vaultwarden.d ]; then
    echo "### You are using the old /etc/vaultwarden.d script directory, please migrate to /etc/passw-pro.d ###"
    for f in /etc/vaultwarden.d/*.sh; do
        if [ -r "${f}" ]; then
            . "${f}"
        fi
    done
fi

exec /passw-pro "${@}"
