# TrackUp — MVP de rastreamento

Este projeto começou como um painel próprio inspirado no fluxo de ferramentas como UTMify, mas focado primeiro no problema principal: saber exatamente quando uma venda aconteceu e quando o evento chegou à Meta.

## Fluxo alvo

1. Landing page captura UTMs, `fbclid`, `_fbc` e `_fbp`.
2. A sessão é salva no Supabase.
3. Vega/AppMax dispara webhook de pagamento aprovado.
4. Edge Function identifica a sessão/origem da compra.
5. A venda é persistida com `order_id`, produto e horário real.
6. A mesma função envia `Purchase` para a Meta CAPI.
7. A resposta da Meta e cada tentativa ficam registradas.
8. O dashboard calcula atraso, falhas e qualidade de identificação.

## Tabelas sugeridas

### tracking_sessions
- id
- session_id
- product_slug
- landing_url
- utm_source
- utm_medium
- utm_campaign
- utm_content
- utm_term
- fbclid
- fbc
- fbp
- created_at

### orders
- id
- provider
- provider_order_id
- product_slug
- amount
- currency
- payment_status
- paid_at
- webhook_received_at
- session_id
- raw_payload

### meta_events
- id
- order_id
- event_name
- event_id
- event_time
- fbc
- fbp
- sent_at
- response_status
- response_body
- attempt
- created_at

## Regras importantes

- `event_time` deve representar o horário original da compra.
- `event_id` deve permitir deduplicação e não mudar em reenvios da mesma compra.
- Nunca aplicar lowercase, substring ou transformação no identificador de clique.
- Separar ofertas por `product_slug` mesmo quando usam o mesmo Pixel.
- Reenvios precisam ser idempotentes.
- Segredos da Meta/Vega/AppMax ficam somente no servidor, nunca no frontend.

## Estado atual

A interface visual do MVP está implementada com dados simulados. Próxima etapa: conectar Supabase + webhook Vega/AppMax + Meta CAPI e substituir o array de demonstração por dados reais.
