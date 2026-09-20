"""Local PostgreSQL concurrency tests. Requires migrated isolated fixture DB.
Run: python3 supabase/tests/safe_case_deletion_races.py
Uses ONLY docker container pg436e / postgres; no remote credentials. QA IDs are new.
"""
import subprocess
import uuid

CMD = ['docker', 'exec', '-i', 'pg436e', 'psql', '-U', 'postgres', '-d', 'postgres', '-XAt', '-v', 'ON_ERROR_STOP=1']

def sql(query, expected=None):
    p = subprocess.run(CMD + ['-c', query], capture_output=True, text=True)
    if expected:
        assert p.returncode and expected in p.stderr, (p.stdout, p.stderr)
    else:
        assert p.returncode == 0, p.stderr
    return p.stdout.strip()

def holding(query):
    # psql flushes each result; READY proves the write/locks happened before contender starts.
    p = subprocess.Popen(CMD + ['-c', query + "; SELECT 'READY'; SELECT pg_sleep(1); COMMIT;"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    while True:
        line = p.stdout.readline()
        assert line, p.stderr.read()
        if line.strip() == 'READY':
            return p

def settled(p):
    out, err = p.communicate(timeout=10)
    assert p.returncode == 0, (out, err)

lawyer = str(uuid.uuid4())
sql(f"INSERT INTO auth.users(id) VALUES('{lawyer}'); INSERT INTO public.profiles(id,role) VALUES('{lawyer}','lawyer') ON CONFLICT DO NOTHING; INSERT INTO public.lawyer_subscriptions(lawyer_id,status,current_period_end) VALUES('{lawyer}','active',now()+interval '1 month');")
try:
    for kind in ['note', 'timeline_update', 'booking']:
        for first in ['work', 'delete']:
            c, w, child = [str(uuid.uuid4()) for _ in range(3)]
            sql(f"INSERT INTO public.ai_workspaces(id,lawyer_id,name) VALUES('{w}','{lawyer}','QA race'); INSERT INTO public.lawyer_cases(id,lawyer_id,title,source,ai_workspace_id,status) VALUES('{c}','{lawyer}','QA race','LAWYER_DIRECT','{w}','closed');")
            if kind == 'timeline_update':
                sql(f"INSERT INTO public.ai_case_timeline_events(id,lawyer_id,workspace_id,event_type,title) VALUES('{child}','{lawyer}','{w}','case_created','QA');")
                work = f"UPDATE public.ai_case_timeline_events SET event_type='note' WHERE id='{child}'"
            elif kind == 'note':
                work = f"INSERT INTO public.ai_case_timeline_events(id,lawyer_id,workspace_id,event_type,title) VALUES('{child}','{lawyer}','{w}','note','QA')"
            else:
                work = f"INSERT INTO public.bookings(id,lawyer_id,case_id,price,user_name,user_email) VALUES('{child}','{lawyer}','{c}',0,'QA','qa@example.invalid')"
            delete = f"BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='{lawyer}'; DELETE FROM public.lawyer_cases WHERE id='{c}'"
            if first == 'work':
                p = holding('BEGIN; ' + work)
                sql(delete + '; COMMIT;', 'CASE_NOT_DELETABLE')
                settled(p)
                assert sql(f"SELECT count(*) FROM public.lawyer_cases WHERE id='{c}'") == '1'
            else:
                p = holding(delete)
                if kind == 'timeline_update':
                    # UPDATE may report zero because the automatic row was removed, also safe.
                    sql(work)
                else:
                    sql(work, 'foreign key' if kind == 'booking' else 'Workspace no longer exists')
                settled(p)
                assert sql(f"SELECT count(*) FROM public.ai_workspaces WHERE id='{w}'") == '0'
            print('PASS', kind, first, flush=True)
    # Existing 4.36D commit-time admission: simultaneous create and reopen at 19/20.
    for operation in ['create', 'reopen']:
        sql(f"INSERT INTO public.lawyer_cases(lawyer_id,title,source,status) SELECT '{lawyer}','QA capacity','LAWYER_DIRECT','new' FROM generate_series(1,19)")
        a, b = str(uuid.uuid4()), str(uuid.uuid4())
        if operation == 'reopen':
            sql(f"INSERT INTO public.lawyer_cases(id,lawyer_id,title,source,status) VALUES('{a}','{lawyer}','QA closed','LAWYER_DIRECT','closed'),('{b}','{lawyer}','QA closed','LAWYER_DIRECT','closed')")
            writes = [f"UPDATE public.lawyer_cases SET status='new' WHERE id='{x}'" for x in [a,b]]
        else:
            writes = [f"INSERT INTO public.lawyer_cases(id,lawyer_id,title,source) VALUES('{x}','{lawyer}','QA create','LAWYER_DIRECT')" for x in [a,b]]
        auth = f"BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='{lawyer}'; "
        p = holding(auth + writes[0])
        sql(auth + writes[1] + '; COMMIT;', 'ACTIVE_CASE_LIMIT_REACHED')
        settled(p)
        assert sql(f"SELECT count(*) FROM public.lawyer_cases WHERE lawyer_id='{lawyer}' AND status='new'") == '20'
        sql(f"DELETE FROM public.lawyer_cases WHERE lawyer_id='{lawyer}' AND status='new'")
        print('PASS capacity concurrent', operation, flush=True)

finally:
    sql(f"DELETE FROM auth.users WHERE id='{lawyer}'")
    assert sql(f"SELECT count(*) FROM public.profiles WHERE id='{lawyer}'") == '0'
