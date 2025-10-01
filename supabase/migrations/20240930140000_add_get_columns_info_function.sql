-- Create a function to get table columns info
create or replace function public.get_columns_info(table_name text)
returns table (
    column_name text,
    data_type text,
    is_nullable text,
    column_default text
) as $$
begin
    return query
    select 
        a.attname::text as column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
        case when a.attnotnull then 'NO' else 'YES' end as is_nullable,
        pg_catalog.pg_get_expr(d.adbin, d.adrelid) as column_default
    from 
        pg_catalog.pg_attribute a
        left join pg_catalog.pg_attrdef d on (a.attrelid, a.attnum) = (d.adrelid, d.adnum)
    where 
        a.attrelid = ('public.' || table_name)::regclass
        and a.attnum > 0
        and not a.attisdropped
    order by 
        a.attnum;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function public.get_columns_info(text) to authenticated;
