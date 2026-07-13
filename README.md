
Uma solução opensource para gerenciar seus logins e senhas de acesso, fork do Vaultwarden com funcionalidades extras.

---

## Funcionalidades

### Adicionais (Passw-pro)

 * Cofre Pessoal
 * Send
 * Anexos
 * Ícones de sites
 * Chave de API Pessoal
 * Organizações
   - Coleções, Compartilhamento de Senhas, Funções de Membros, Grupos,
     Logs de Eventos, Redefinição de Senha Admin, Conector de Diretório, Políticas
 * Autenticação Multifator (MFA/2FA)
   - Authenticator, Email, FIDO2 WebAuthn, YubiKey, Duo
 * Acesso de Emergência
 * Painel Admin do Passw-pro
 * Cliente Web Vault modificado (Incluso nos containers)
 * **Busca corrigida** — Endpoint `GET /api/ciphers/search` implementado (corrige erro 404 na busca do web vault)
 * **Página /organize** — Interface com drag-and-drop para organizar itens do cofre por pasta
 * **Botão "Organizar"** — Injetado dinamicamente no web vault para acesso rápido à organização

<br>

## Instalação via Docker

### Pré-requisitos

- [Docker](https://docs.docker.com/engine/install/) instalado
- Ou [Podman](https://podman.io/) como alternativa

### 1. Docker CLI

O `Dockerfile` já está incluso no projeto. Build da imagem:

```shell
git clone https://github.com/seu-usuario/passw-pro
cd passw-pro
docker build -t passw-pro/server .
```

Execute o container:

```shell
docker run --detach --name passw-pro \
  --env DOMAIN="http://localhost" \
  --volume ./passw-data/:/data/ \
  --restart unless-stopped \
  --publish 127.0.0.1:8000:80 \
  passw-pro/server:latest
```

| Parâmetro | Descrição |
|---|---|
| `DOMAIN` | Altere para seu domínio real. Para teste local use `http://localhost` |
| `--volume` | Diretório onde os dados serão persistidos no host |
| `--publish` | Mapeia a porta 80 do container para a porta 8000 do host |

### 2. Docker Compose (recomendado)

Crie um arquivo `docker-compose.yml` na raiz do projeto:

```yaml
services:
  passw-pro:
    image: ghcr.io/nickcatsshild/passw-pro:latest
    container_name: passw-pro
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./passw-data/:/data/
    environment:
      DOMAIN: "http://localhost"
      SIGNUPS_ALLOWED: "true"
      # ADMIN_TOKEN: "seu-token-aqui"
    cap_drop:
      - ALL
    cap_add:
      - CAP_NET_BIND_SERVICE
      - CAP_CHOWN
      - CAP_SETUID
      - CAP_SETGID
    security_opt:
      - no-new-privileges:yes
    healthcheck:
      test: ["CMD", "/healthcheck.sh"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - passw-pro-network

networks:
  passw-pro-network:
    driver: bridge
```

Execute:

```shell
docker compose up --build --detach
```

> Para usar MySQL ou PostgreSQL, descomente os blocos correspondentes no `docker-compose.yml`.

### 3. Configuração

```shell
cp .env.template .env
```

Edite as variáveis principais no `.env`:

```ini
DOMAIN=http://localhost
SIGNUPS_ALLOWED=true
ADMIN_TOKEN=seu-token-admin-aqui
```

> Para gerar um `ADMIN_TOKEN` seguro: `docker run --rm passw-pro/server hash`

### 4. Acessar

- **Web Vault:** http://localhost:8000
- **Painel Admin:** http://localhost:8000/admin
- **Health Check:** http://localhost:8000/alive
- **Organizar Cofre:** http://localhost:8000/organize

<br>

## Aviso

**Projeto em desenvolvimento — não usar em produção.**
