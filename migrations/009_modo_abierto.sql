alter table shifts drop constraint shifts_signup_mode_check;
alter table shifts add constraint shifts_signup_mode_check
  check (signup_mode in ('self','contacto','abierto'));

alter table shifts drop constraint shifts_capacity_self_check;
alter table shifts add constraint shifts_capacity_self_check
  check (signup_mode <> 'self' or capacity is not null);
