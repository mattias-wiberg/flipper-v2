create table "public"."orders" (
    "token" uuid not null,
    "id" bigint not null,
    "tier" smallint not null,
    "item_type_id" character varying not null,
    "item_group_type_id" character varying not null,
    "location_id" integer not null,
    "quality_level" smallint not null,
    "enchantment_level" smallint not null,
    "unit_price_silver" bigint not null,
    "amount" smallint not null,
    "action_type" character varying not null,
    "expires" timestamp without time zone not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."orders" enable row level security;

create table "public"."tokens" (
    "user_id" uuid not null default auth.uid(),
    "token" uuid not null default gen_random_uuid()
);


alter table "public"."tokens" enable row level security;

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (token, id);

CREATE UNIQUE INDEX tokens_pkey ON public.tokens USING btree (token);

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."tokens" add constraint "tokens_pkey" PRIMARY KEY using index "tokens_pkey";

alter table "public"."orders" add constraint "orders_token_fkey" FOREIGN KEY (token) REFERENCES tokens(token) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_token_fkey";

alter table "public"."tokens" add constraint "tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."tokens" validate constraint "tokens_user_id_fkey";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."tokens" to "anon";

grant insert on table "public"."tokens" to "anon";

grant references on table "public"."tokens" to "anon";

grant select on table "public"."tokens" to "anon";

grant trigger on table "public"."tokens" to "anon";

grant truncate on table "public"."tokens" to "anon";

grant update on table "public"."tokens" to "anon";

grant delete on table "public"."tokens" to "authenticated";

grant insert on table "public"."tokens" to "authenticated";

grant references on table "public"."tokens" to "authenticated";

grant select on table "public"."tokens" to "authenticated";

grant trigger on table "public"."tokens" to "authenticated";

grant truncate on table "public"."tokens" to "authenticated";

grant update on table "public"."tokens" to "authenticated";

grant delete on table "public"."tokens" to "service_role";

grant insert on table "public"."tokens" to "service_role";

grant references on table "public"."tokens" to "service_role";

grant select on table "public"."tokens" to "service_role";

grant trigger on table "public"."tokens" to "service_role";

grant truncate on table "public"."tokens" to "service_role";

grant update on table "public"."tokens" to "service_role";

create policy "Enable to get users own token"
on "public"."tokens"
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = user_id));




