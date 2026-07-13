

Uma alternativa open-source ao servidor Bitwarden, escrita em Rust e compatível com todos os clientes oficiais do Bitwarden. [[aviso](#aviso)]

---

> [!IMPORTANTE]
> **Ao usar este servidor, reporte quaisquer bugs ou sugestões diretamente para nós (veja [Fale conosco](#fale-conosco)).**

<br>

## Funcionalidades

Uma implementação quase completa do Bitwarden Server, incluindo:

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

<br>



## Instalação via Docker

### Pré-requisitos

- [Docker](https://docs.docker.com/engine/install/) instalado
- Ou [Podman](https://podman.io/) como alternativa

### 1. Docker CLI (construir e executar)

Clone o repositório e faça o build da imagem:

```shell
git clone https://github.com/seu-usuario/passw-pro
cd passw-pro
docker build -t passw-pro/server .
```

Execute o container:

```shell
docker run --detach --name passw-pro \
  --env DOMAIN="http://localhost" \
  --volume /caminho/para/dados/:/data/ \
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

O projeto já inclui um arquivo `docker-compose.yml` pronto para uso. Execute:

```shell
# Clone o repositório
git clone https://github.com/seu-usuario/passw-pro
cd passw-pro

# (Opcional) Edite as variáveis de ambiente
notepad .env
# ou no Linux: nano .env

# Construa e inicie o container
docker compose up --build --detach

# Para ver os logs
docker compose logs --follow

# Para parar o container
docker compose down
```

O arquivo `docker-compose.yml` incluído já contém:

- Build automático a partir do código fonte
- Persistência de dados no diretório `./passw-data/`
- Healthcheck configurado
- Boas práticas de segurança (cap_drop, no-new-privileges)
- Suporte comentado para MySQL e PostgreSQL

### 3. Configuração

Crie um arquivo `.env` na raiz do projeto (copie do `.env.template`):

```shell
cp .env.template .env
```

Edite as variáveis principais:

```ini
DOMAIN=http://localhost
SIGNUPS_ALLOWED=true
ADMIN_TOKEN=seu-token-admin-aqui
```

> Para gerar um `ADMIN_TOKEN` seguro, execute: `docker run --rm passw-pro/server hash`

### 4. Acessar

- **Web Vault:** http://localhost:8000
- **Painel Admin:** http://localhost:8000/admin
- **Health Check:** http://localhost:8000/alive

<br>


## Aviso

**eSTA EM DESENVOLVIEMNTO NÃO USAR EM PROD.**



