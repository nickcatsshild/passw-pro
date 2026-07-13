![Logo Passw-pro](./resources/passw-pro-logo-auto.svg)

Uma implementação alternativa da API do Bitwarden, escrita em Rust e compatível com os [clientes oficiais do Bitwarden](https://bitwarden.com/download/) [[aviso](#aviso)], perfeita para implantação auto-hospedada onde executar o serviço oficial, que consome muitos recursos, pode não ser ideal.

---

[![GitHub Release](https://img.shields.io/github/release/dani-garcia/vaultwarden.svg?style=for-the-badge&logo=vaultwarden&color=005AA4)](https://github.com/dani-garcia/vaultwarden/releases/latest)
[![ghcr.io Pulls](https://img.shields.io/badge/dynamic/json?style=for-the-badge&logo=github&logoColor=fff&color=005AA4&url=https%3A%2F%2Fipitio.github.io%2Fbackage%2Fdani-garcia%2Fvaultwarden%2Fvaultwarden.json&query=%24.downloads&label=ghcr.io%20pulls&cacheSeconds=14400)](https://github.com/dani-garcia/vaultwarden/pkgs/container/vaultwarden)
[![Docker Pulls](https://img.shields.io/docker/pulls/vaultwarden/server.svg?style=for-the-badge&logo=docker&logoColor=fff&color=005AA4&label=docker.io%20pulls)](https://hub.docker.com/r/vaultwarden/server)
[![Quay.io](https://img.shields.io/badge/quay.io-download-005AA4?style=for-the-badge&logo=redhat&cacheSeconds=14400)](https://quay.io/repository/vaultwarden/server) <br>
[![Contribuidores](https://img.shields.io/github/contributors-anon/dani-garcia/vaultwarden.svg?style=flat-square&logo=vaultwarden&color=005AA4)](https://github.com/dani-garcia/vaultwarden/graphs/contributors)
[![Forks](https://img.shields.io/github/forks/dani-garcia/vaultwarden.svg?style=flat-square&logo=github&logoColor=fff&color=005AA4)](https://github.com/dani-garcia/vaultwarden/network/members)
[![Estrelas](https://img.shields.io/github/stars/dani-garcia/vaultwarden.svg?style=flat-square&logo=github&logoColor=fff&color=005AA4)](https://github.com/dani-garcia/vaultwarden/stargazers)
[![Issues Abertas](https://img.shields.io/github/issues/dani-garcia/vaultwarden.svg?style=flat-square&logo=github&logoColor=fff&color=005AA4&cacheSeconds=300)](https://github.com/dani-garcia/vaultwarden/issues)
[![Issues Fechadas](https://img.shields.io/github/issues-closed/dani-garcia/vaultwarden.svg?style=flat-square&logo=github&logoColor=fff&color=005AA4&cacheSeconds=300)](https://github.com/dani-garcia/vaultwarden/issues?q=is%3Aissue+is%3Aclosed)
[![Licença AGPL-3.0](https://img.shields.io/github/license/dani-garcia/vaultwarden.svg?style=flat-square&logo=vaultwarden&color=944000&cacheSeconds=14400)](https://github.com/dani-garcia/vaultwarden/blob/main/LICENSE.txt) <br>
[![Status de Dependências](https://img.shields.io/badge/dynamic/xml?url=https%3A%2F%2Fdeps.rs%2Frepo%2Fgithub%2Fdani-garcia%2Fvaultwarden%2Fstatus.svg&query=%2F*%5Blocal-name()%3D'svg'%5D%2F*%5Blocal-name()%3D'g'%5D%5B2%5D%2F*%5Blocal-name()%3D'text'%5D%5B4%5D&style=flat-square&logo=rust&label=dependencias&color=005AA4)](https://deps.rs/repo/github/dani-garcia/vaultwarden)
[![GHA Release](https://img.shields.io/github/actions/workflow/status/dani-garcia/vaultwarden/release.yml?style=flat-square&logo=github&logoColor=fff&label=Release%20Workflow)](https://github.com/dani-garcia/vaultwarden/actions/workflows/release.yml)
[![GHA Build](https://img.shields.io/github/actions/workflow/status/dani-garcia/vaultwarden/build.yml?style=flat-square&logo=github&logoColor=fff&label=Build%20Workflow)](https://github.com/dani-garcia/vaultwarden/actions/workflows/build.yml) <br>
[![Matrix Chat](https://img.shields.io/matrix/vaultwarden:matrix.org.svg?style=flat-square&logo=matrix&logoColor=fff&color=953B00&cacheSeconds=14400)](https://matrix.to/#/#vaultwarden:matrix.org)
[![Discussões GitHub](https://img.shields.io/github/discussions/dani-garcia/vaultwarden?style=flat-square&logo=github&logoColor=fff&color=953B00&cacheSeconds=300)](https://github.com/dani-garcia/vaultwarden/discussions)
[![Fórum Discourse](https://img.shields.io/discourse/topics?server=https%3A%2F%2Fvaultwarden.discourse.group%2F&style=flat-square&logo=discourse&color=953B00)](https://vaultwarden.discourse.group/)

> [!IMPORTANTE]
> **Ao usar este servidor, reporte quaisquer bugs ou sugestões diretamente para nós (veja [Fale conosco](#fale-conosco)), independentemente de qual cliente você estiver usando (mobile, desktop, navegador...). NÃO use os canais oficiais de suporte do Bitwarden.**

<br>

## Funcionalidades

Uma implementação quase completa da API do Bitwarden, incluindo:

 * [Cofre Pessoal](https://bitwarden.com/help/managing-items/)
 * [Send](https://bitwarden.com/help/about-send/)
 * [Anexos](https://bitwarden.com/help/attachments/)
 * [Ícones de sites](https://bitwarden.com/help/website-icons/)
 * [Chave de API Pessoal](https://bitwarden.com/help/personal-api-key/)
 * [Organizações](https://bitwarden.com/help/getting-started-organizations/)
   - [Coleções](https://bitwarden.com/help/about-collections/),
     [Compartilhamento de Senhas](https://bitwarden.com/help/sharing/),
     [Funções de Membros](https://bitwarden.com/help/user-types-access-control/),
     [Grupos](https://bitwarden.com/help/about-groups/),
     [Logs de Eventos](https://bitwarden.com/help/event-logs/),
     [Redefinição de Senha Admin](https://bitwarden.com/help/admin-reset/),
     [Conector de Diretório](https://bitwarden.com/help/directory-sync/),
     [Políticas](https://bitwarden.com/help/policies/)
 * [Autenticação Multifator (MFA/2FA)](https://bitwarden.com/help/bitwarden-field-guide-two-step-login/)
   - [Authenticator](https://bitwarden.com/help/setup-two-step-login-authenticator/),
     [Email](https://bitwarden.com/help/setup-two-step-login-email/),
     [FIDO2 WebAuthn](https://bitwarden.com/help/setup-two-step-login-fido/),
     [YubiKey](https://bitwarden.com/help/setup-two-step-login-yubikey/),
     [Duo](https://bitwarden.com/help/setup-two-step-login-duo/)
 * [Acesso de Emergência](https://bitwarden.com/help/emergency-access/)
 * [Painel Admin do Passw-pro](https://github.com/dani-garcia/vaultwarden/wiki/Enabling-admin-page)
 * [Cliente Web Vault modificado](https://github.com/dani-garcia/bw_web_builds) (Incluso nos containers)

<br>

## Uso

> [!IMPORTANTE]
> O web-vault exige HTTPS e um contexto seguro para a [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API). <br>
> Isso significa que só funcionará se você [habilitar HTTPS](https://github.com/dani-garcia/vaultwarden/wiki/Enabling-HTTPS). <br>
> Recomendamos também o uso de um [proxy reverso](https://github.com/dani-garcia/vaultwarden/wiki/Proxy-examples).

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
  --env DOMAIN="https://exemplo.com" \
  --volume /caminho/para/dados/:/data/ \
  --restart unless-stopped \
  --publish 127.0.0.1:8000:80 \
  passw-pro/server:latest
```

| Parâmetro | Descrição |
|---|---|
| `DOMAIN` | Altere para seu domínio real (obrigatório para HTTPS/WebAuthn) |
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
DOMAIN=https://exemplo.com
SIGNUPS_ALLOWED=true
ADMIN_TOKEN=seu-token-admin-aqui
```

> Para gerar um `ADMIN_TOKEN` seguro, execute: `docker run --rm passw-pro/server hash`

### 4. Acessar

- **Web Vault:** http://localhost:8000
- **Painel Admin:** http://localhost:8000/admin
- **Health Check:** http://localhost:8000/alive

<br>

## Fale conosco

Tem uma pergunta, sugestão ou precisa de ajuda? Participe da nossa comunidade no [Matrix](https://matrix.to/#/#vaultwarden:matrix.org), [Discussões do GitHub](https://github.com/dani-garcia/vaultwarden/discussions) ou [Fórum Discourse](https://vaultwarden.discourse.group/).

Encontrou um bug ou falha? Pesquise nosso rastreador de issues e discussões para ver se já foi reportado. Se não, [inicie uma nova discussão](https://github.com/dani-garcia/vaultwarden/discussions) ou [crie uma nova issue](https://github.com/dani-garcia/vaultwarden/issues/). Certifique-se de estar usando a versão mais recente do Passw-pro e que não há issues similares abertas ou fechadas!

<br>

## Aviso

**Este projeto não é associado ao [Bitwarden](https://bitwarden.com/) ou à Bitwarden, Inc.**

No entanto, um dos mantenedores ativos do Passw-pro é funcionário da Bitwarden e tem permissão para contribuir com o projeto em seu tempo livre. Essas contribuições são independentes da Bitwarden e são revisadas por outros mantenedores.

Os mantenedores trabalham juntos para definir a direção do projeto, focando em atender a comunidade de auto-hospedagem, incluindo indivíduos, famílias e pequenas organizações, garantindo a sustentabilidade do projeto.

**Observação:** Não podemos ser responsabilizados por qualquer perda de dados que possa ocorrer ao usar o Passw-pro. Isso inclui senhas, anexos e outras informações manipuladas pela aplicação. Recomendamos fortemente a realização de backups regulares dos seus arquivos e banco de dados. No entanto, se você tiver perda de dados, encorajamos você a nos contatar imediatamente.

<br>

## Bitwarden_RS

Este projeto era conhecido como Bitwarden_RS e foi renomeado para se separar do servidor oficial do Bitwarden, na esperança de evitar confusão e problemas de marca registrada.<br>
Veja [#1642 - v1.21.0 release e renomeação do projeto para Vaultwarden](https://github.com/dani-garcia/vaultwarden/discussions/1642) para mais explicações.
