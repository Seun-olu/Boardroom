-- Catalog fingerprint used to check a hosted database matches the migration files.
select 'policy' as kind, md5(string_agg(format('%s|%s|%s|%s|%s|%s', tablename, policyname, cmd, roles::text, coalesce(qual, ''), coalesce(with_check, '')), E'\n' order by tablename, policyname)) as hash
from pg_policies where schemaname = 'public'
union all
select 'function', md5(string_agg(format('%s.%s|%s|%s|%s', n.nspname, p.proname, md5(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g')), p.prosecdef, coalesce(array_to_string(p.proconfig, ','), '')), E'\n' order by n.nspname, p.proname))
from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'private')
union all
select 'trigger', md5(string_agg(format('%s|%s', c.relname, t.tgname), E'\n' order by c.relname, t.tgname))
from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal and n.nspname in ('public', 'auth') and t.tgname not like 'pgrst%' and t.tgname <> 'on_auth_user_created_stub'
union all
select 'index', md5(string_agg(indexdef, E'\n' order by indexname)) from pg_indexes where schemaname = 'public'
union all
select 'column', md5(string_agg(format('%s.%s|%s|%s|%s', table_name, column_name, data_type, is_nullable, coalesce(column_default, '')), E'\n' order by table_name, column_name))
from information_schema.columns where table_schema = 'public'
order by kind;
