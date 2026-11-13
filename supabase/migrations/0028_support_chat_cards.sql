-- 0028: richer chat messages. kind says how a message is shown:
--   text    = normal message
--   topic   = customer picked a consulting topic chip (meta.topic)
--   auto    = automatic reply to that topic that points to booking (meta.topic)
--   product = product card sent by staff (meta: slug, name, priceUsd, image snapshot)
alter table public.support_messages add column if not exists kind text not null default 'text';
alter table public.support_messages add column if not exists meta jsonb;
alter table public.support_messages drop constraint if exists support_messages_kind_check;
alter table public.support_messages add constraint support_messages_kind_check check (kind in ('text', 'topic', 'auto', 'product'));
