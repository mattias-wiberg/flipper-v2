create policy "Enable user to access their own orders"
on "public"."orders"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM tokens t
  WHERE ((t.token = orders.token) AND ((SELECT auth.uid()) = t.user_id)))));




