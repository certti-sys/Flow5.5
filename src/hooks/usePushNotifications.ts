import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Inscrição do aparelho atual no Web Push.
 *
 * O estado exposto é o da **inscrição**, não o da permissão: o usuário pode ter
 * liberado notificações e nunca ter inscrito (cache limpo, troca de navegador,
 * ou o clique que falhou por causa da chave VAPID). Tratar "permission ===
 * granted" como ativo mostrava "ativados" sem nenhum endpoint salvo, e o aviso
 * nunca chegava.
 *
 * A chave pública VAPID vem de `VITE_VAPID_PUBLIC_KEY`. Sem ela o hook fica
 * inerte — o app continua funcionando, só não há push.
 *
 * Limitação real: no iPhone o push só chega depois de "Adicionar à Tela de
 * Início" (iOS 16.4+). No Safari de aba normal `PushManager` nem existe.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/**
 * Marca de "desativei de propósito".
 *
 * Sem ela, desativar não funciona: o navegador continua com a permissão
 * liberada, a inscrição some, e a reativação automática (que existe justamente
 * para recuperar inscrição perdida) recria tudo no instante seguinte.
 */
const optOutKey = (userId: string) => `push:optout:${userId}`;

type PushState = "checking" | "unsupported" | "insecure" | "prompt" | "granted" | "denied";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!isSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSupported()) return setState("unsupported");
    if (!window.isSecureContext) return setState("insecure");
    if (Notification.permission === "denied") return setState("denied");

    const subscription = await currentSubscription().catch(() => null);
    setState(subscription ? "granted" : "prompt");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persist = useCallback(
    async (subscription: PushSubscription) => {
      if (!user) throw new Error("sem usuário");
      const json = subscription.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("inscrição incompleta");
      }

      // `endpoint` é único: logar em outra conta no mesmo aparelho transfere a
      // inscrição, senão o dono anterior levaria push de aviso alheio.
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent.slice(0, 300),
        },
        { onConflict: "endpoint" },
      );
      if (error) throw error;
    },
    [user],
  );

  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!VAPID_PUBLIC_KEY) throw new Error("VITE_VAPID_PUBLIC_KEY ausente");

    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;

    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }, []);

  // Permissão já liberada e usuário logado: garante a inscrição, que pode ter se
  // perdido sem ninguém perceber (cache limpo, reinstalação do PWA).
  useEffect(() => {
    if (!user || state !== "prompt" || !VAPID_PUBLIC_KEY) return;
    if (Notification.permission !== "granted") return;
    if (localStorage.getItem(optOutKey(user.id))) return;

    let active = true;
    (async () => {
      try {
        const subscription = await subscribe();
        if (!subscription || !active) return;
        await persist(subscription);
        if (active) setState("granted");
      } catch (err) {
        console.warn("[push] reativação falhou", err);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, state, subscribe, persist]);

  const enable = useCallback(async () => {
    if (!user) return false;
    if (!VAPID_PUBLIC_KEY) {
      console.warn("[push] VITE_VAPID_PUBLIC_KEY ausente");
      return false;
    }

    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "prompt");
        return false;
      }

      const subscription = await subscribe();
      if (!subscription) return false;

      await persist(subscription);
      localStorage.removeItem(optOutKey(user.id));
      setState("granted");
      return true;
    } catch (err) {
      console.warn("[push] inscrição falhou", err);
      return false;
    } finally {
      setBusy(false);
    }
  }, [user, subscribe, persist]);

  const disable = useCallback(async () => {
    if (!isSupported()) return;
    setBusy(true);
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
      if (user) localStorage.setItem(optOutKey(user.id), "1");
      setState("prompt");
    } catch (err) {
      console.warn("[push] desinscrição falhou", err);
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable, refresh, supported: isSupported() };
}
