-- Columnas para centros de solo consulta (sin panel de voluntarios)
alter table centers add column if not exists source text;
alter table centers add column if not exists data_source_url text;
alter table centers add column if not exists recepcion_hasta date;

alter table centers add constraint centers_source_check
  check (source is null or source in
    ('oficial_distrital','cruz_roja','universidad','aliado','ciudadano'));
