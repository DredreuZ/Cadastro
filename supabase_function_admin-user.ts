import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(URL, KEY);

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const auth = req.headers.get("Authorization") || "";

    if (!auth.startsWith("Bearer ")) {
      throw new Error("Não autenticado.");
    }

    const token = auth.replace("Bearer ", "").trim();

    const userResult = await admin.auth.getUser(token);

    if (userResult.error || !userResult.data.user) {
      throw new Error("Não autenticado.");
    }

    const userId = userResult.data.user.id;

    const profile = await admin
      .from("profiles")
      .select("role,status")
      .eq("id", userId)
      .single();

    if (
      profile.error ||
      profile.data?.role !== "superuser" ||
      profile.data?.status !== "active"
    ) {
      throw new Error("Acesso negado.");
    }

    const body = await req.json();

    if (body.action !== "delete") {
      throw new Error("Ação inválida.");
    }

    if (!body.user_id) {
      throw new Error("Usuário não informado.");
    }

    if (body.user_id === userId) {
      throw new Error("Não é permitido excluir a própria conta.");
    }

    const result = await admin.auth.admin.deleteUser(body.user_id);

    if (result.error) {
      throw result.error;
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro interno."
      }),
      { status: 400, headers }
    );
  }
});