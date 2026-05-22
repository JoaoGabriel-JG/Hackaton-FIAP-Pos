# Hackathon FIAP POS

Backend em microsservicos para auditoria de diagramas (imagem/PDF), com processamento assincrono, IA com guardrails e exposicao de status/relatorio via API Gateway.

## Arquitetura

A solucao segue arquitetura orientada a eventos com RabbitMQ, persistencia local com SQLite e organizacao em Clean Architecture.

Fluxo principal:
1. Cliente envia `POST /api/uploads` para o `api-gateway`.
2. O `api-gateway` roteia para o `upload-service`.
3. O `upload-service` valida arquivo, grava metadados e publica mensagem na fila `diagram_processing` (RabbitMQ).
4. O `processing-service` consome a fila, executa analise com Gemini e persiste resultado.
5. Em caso de sucesso, o `processing-service` publica evento de relatorio.
6. O cliente consulta status e relatorio via gateway:
   - `GET /api/reports/:jobId/status`
   - `GET /api/reports/:jobId`

### Microsservicos

- `api-gateway`:
  - Ponto unico de entrada HTTP.
  - Proxy de rotas para upload e report.
  - Logging estruturado (Pino) e propagacao de `x-correlation-id`.
- `upload-service`:
  - Recebe uploads com multer.
  - Valida tipo/tamanho de arquivo.
  - Enfileira processamento no RabbitMQ.
- `processing-service`:
  - Worker assincrono da fila.
  - Chama Gemini com prompt controlado.
  - Valida saida JSON via schema (Zod) e atualiza status do job.
- `report-service`:
  - Exposicao de endpoints de consulta de relatorio/status.

### Clean Architecture

Cada servico organiza codigo em:
- `domain/`: entidades, regras e erros de dominio.
- `application/`: casos de uso e portas.
- `infrastructure/`: HTTP, mensageria, banco, SDKs externos.

Dependencia sempre de fora para dentro: `infrastructure -> application -> domain`.

## Stack

- Node.js + TypeScript
- Express
- RabbitMQ (mensageria)
- SQLite (persistencia local por servico)
- Pino / pino-http (logs estruturados)
- Jest (testes)

## Seguranca

### 1) Validacao de entradas (upload)

No `upload-service`, o middleware multer aplica controles explicitos:
- Limite de tamanho: `20MB` (`limits.fileSize`).
- Tipos aceitos:
  - `image/*`
  - `application/pdf`
- Demais tipos sao rejeitados com erro de validacao (`Invalid file type`).

Isso reduz risco de upload indevido e restringe o pipeline a arquivos esperados pelo processamento.

### 2) Uso controlado da IA (guardrails no Gemini)

O `processing-service` aplica guardrails em duas camadas:
- Prompt engineering restritivo (`DIAGRAM_ANALYSIS_PROMPT`):
  - exige retorno em JSON estrito;
  - sem markdown e sem texto adicional;
  - formato fechado com 3 arrays (`components`, `risks`, `recommendations`).
- Validacao forte de saida:
  - parsing do retorno;
  - validacao com schema Zod (`diagramAnalysisSchema`);
  - se o retorno fugir do contrato, o fluxo falha de forma controlada.

Com isso, mitigamos alucinacao estrutural e evitamos persistir resposta fora do formato esperado.

### 3) Tratamento seguro de falhas

Se houver falha no Gemini (indisponibilidade, timeout, resposta invalida), o sistema:
- captura erro no caso de uso de processamento;
- marca o job como `Erro` (`AnalysisStatus.ERRO`);
- reconhece a mensagem na fila sem derrubar o worker;
- registra log estruturado com contexto (`jobId`, `service`).

Resultado: a aplicacao continua operacional, e o cliente consegue observar status consistente sem quebra global.

## Como rodar localmente

### Pre-requisitos

- Docker + Docker Compose
- Node.js 20+ (para execucao local fora de container)

### Subir ambiente com Docker Compose

```bash
docker-compose up -d
```

Servicos/portas esperados:
- `api-gateway`: `3000`
- `upload-service`: `3001`
- `processing-service`: `3002` (porta reservada no compose)
- `report-service`: `3003`
- `rabbitmq`: `5672` (AMQP) / `15672` (UI)

### Rodar testes e lint

```bash
npm ci
npm run lint
npm run test
```

## Exemplos de requisicao curl (Gateway)

### Health check

```bash
curl -X GET http://localhost:3000/health
```

### Upload de diagrama (PDF/imagem)

```bash
curl -X POST http://localhost:3000/api/uploads \
  -H "x-correlation-id: demo-123" \
  -F "file=@./exemplos/diagrama.pdf"
```

### Consultar status do job

```bash
curl -X GET http://localhost:3000/api/reports/<jobId>/status \
  -H "x-correlation-id: demo-123"
```

### Consultar relatorio do job

```bash
curl -X GET http://localhost:3000/api/reports/<jobId> \
  -H "x-correlation-id: demo-123"
```

## CI

Pipeline em `.github/workflows/main.yml`:
- checkout do repositorio;
- setup Node.js 20;
- `npm ci`;
- `npm run lint`;
- `npm run test`.
