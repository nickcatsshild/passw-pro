

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

Este projeto era conhecido como Bitwarden_RS (depois Vaultwarden) e foi renomeado para Passw-pro.<br>
Veja [#1642 - v1.21.0 release e renomeação do projeto](https://github.com/dani-garcia/vaultwarden/discussions/1642) para mais explicações.
