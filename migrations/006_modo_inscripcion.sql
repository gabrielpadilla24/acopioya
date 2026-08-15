alter table shifts add column if not exists signup_mode text not null default 'self';
alter table shifts add constraint shifts_signup_mode_check
  check (signup_mode in ('self','contacto'));
