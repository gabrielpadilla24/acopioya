alter table shifts alter column capacity drop not null;
alter table shifts add constraint shifts_capacity_self_check
  check (signup_mode = 'contacto' or capacity is not null);
