# Plano 12 — Dashboard: Gestão Evolution API (WhatsApp)

## Objetivo
Implementar a interface de gestão de instâncias WhatsApp via Evolution API: criar instâncias, exibir QR code para conexão, monitorar status de conexão, vincular instâncias a agentes, e gerenciar configurações.

## Pré-requisitos
- Plano 09 concluído (dashboard base)
- Plano 04 concluído (API com módulo WhatsApp)
- Plano 02 concluído (Evolution API rodando)

## Estrutura de Arquivos

```
apps/dashboard/src/
├── app/(dashboard)/whatsapp/
│   ├── page.tsx                        (lista de instâncias)
│   └── [instanceId]/
│       └── page.tsx                    (detalhe/config da instância)
├── components/whatsapp/
│   ├── instance-card.tsx
│   ├── instance-status.tsx
│   ├── qr-code-modal.tsx
│   ├── create-instance-dialog.tsx
│   └── link-agent-select.tsx
└── hooks/
    └── use-whatsapp-instances.ts
```

## Steps

### 1. Criar hook use-whatsapp-instances

**hooks/use-whatsapp-instances.ts:**
- Fetch GET /whatsapp/instances com orgId
- createInstance: POST /whatsapp/instances com { name }
- deleteInstance: DELETE /whatsapp/instances/:name
- getQrCode: GET /whatsapp/instances/:name/qr
- getStatus: GET /whatsapp/instances/:name/status
- Polling de status a cada 10s para instâncias em estado "connecting" ou "qr_pending"

### 2. Página principal (/whatsapp)

Layout:
- Header com título "WhatsApp" e botão "Nova Instância"
- Grid de InstanceCards
- Empty state quando não há instâncias

Cada card mostra:
- Nome da instância
- Número de telefone (se conectado)
- Status com indicador visual
- Agente vinculado (se houver)
- Ações: Conectar/QR, Configurar, Desvincular, Deletar

### 3. Componente InstanceCard

```typescript
interface InstanceCardProps {
  instance: {
    id: string;
    instance_name: string;
    phone_number: string | null;
    status: 'connected' | 'disconnected' | 'connecting' | 'qr_pending';
    agent?: { id: string; name: string } | null;
  };
  onConnect: () => void;
  onDelete: () => void;
}
```

Visual:
- Ícone de smartphone com cor baseada no status
- connected → verde, disconnected → vermelho, connecting → amarelo pulsante
- Badge com status text
- Se conectado: mostra número formatado
- Se desconectado: botão "Conectar" que abre QR modal

### 4. Componente InstanceStatus

Indicador visual de status:
- connected: bolinha verde + "Conectado"
- disconnected: bolinha vermelha + "Desconectado"
- connecting: bolinha amarela animada + "Conectando..."
- qr_pending: bolinha azul + "Aguardando QR Code"

### 5. Componente QrCodeModal

- Modal/dialog que exibe o QR code para escanear
- Faz GET /whatsapp/instances/:name/qr
- Exibe imagem do QR code (base64 retornado pela Evolution API)
- Auto-refresh a cada 30s (QR expira)
- Polling de status a cada 5s — fecha modal quando status = connected
- Instruções: "Abra o WhatsApp > Dispositivos conectados > Conectar dispositivo"
- Botão "Fechar" e indicador de loading

### 6. Componente CreateInstanceDialog

- Dialog com formulário simples:
  - Campo: Nome da instância (slug, sem espaços)
  - Validação: apenas letras, números, hífens
- Ao criar: POST /whatsapp/instances
- Após criar: abre QrCodeModal automaticamente

### 7. Componente LinkAgentSelect

- Select dropdown com agentes disponíveis (sem instância vinculada)
- Ao selecionar: PUT /agents/:id com { whatsapp_instance_id }
- Opção "Nenhum" para desvincular
- Mostra nome do agente atualmente vinculado

### 8. Página de detalhe (/whatsapp/[instanceId])

Seções:
- **Status:** indicador grande com último update
- **Informações:** nome, número, data de criação
- **Agente Vinculado:** LinkAgentSelect para trocar/vincular agente
- **Webhook:** URL configurada, eventos habilitados
- **Ações:** Desconectar, Reconectar (novo QR), Deletar instância

### 9. Endpoints necessários na API

Verificar/adicionar no WhatsappController:

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /whatsapp/instances | Lista instâncias da org |
| POST | /whatsapp/instances | Cria nova instância |
| GET | /whatsapp/instances/:name/status | Status da conexão |
| GET | /whatsapp/instances/:name/qr | QR code (base64) |
| DELETE | /whatsapp/instances/:name | Remove instância |
| POST | /whatsapp/instances/:name/reconnect | Força reconexão |

### 10. Lógica de polling no frontend

```typescript
// Polling inteligente:
// - Instâncias "connected": poll a cada 60s (health check)
// - Instâncias "qr_pending" ou "connecting": poll a cada 5s
// - Instâncias "disconnected": sem poll (manual refresh)

useEffect(() => {
  const needsPolling = instances.some(
    (i) => i.status === 'qr_pending' || i.status === 'connecting'
  );

  if (!needsPolling) return;

  const interval = setInterval(refetchStatuses, 5000);
  return () => clearInterval(interval);
}, [instances]);
```

### 11. Sincronização de status com banco

No WhatsappService da API, ao receber webhook `connection.update`:
- Atualizar status na tabela whatsapp_instances
- Se conectou: salvar phone_number
- Se desconectou: atualizar status

## Dependências
- Plano 09 (dashboard base)
- Plano 04 (API módulo WhatsApp)
- Plano 02 (Evolution API rodando)

## Critérios de Conclusão
- [ ] Lista de instâncias exibe com status correto
- [ ] Criar nova instância funciona
- [ ] QR code é exibido e atualizável
- [ ] Status atualiza automaticamente ao conectar (polling)
- [ ] Modal fecha ao detectar conexão bem-sucedida
- [ ] Vincular agente a instância funciona
- [ ] Desvincular agente funciona
- [ ] Deletar instância funciona (com confirmação)
- [ ] Status visual diferenciado (cores + animação)
- [ ] Reconexão (gerar novo QR) funciona
- [ ] Webhook connection.update atualiza status no banco
