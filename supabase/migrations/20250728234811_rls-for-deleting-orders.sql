create policy "Enable user to delete their own orders"
on "public"."orders"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM tokens t
  WHERE ((t.token = orders.token) AND ((SELECT auth.uid()) = t.user_id)))));