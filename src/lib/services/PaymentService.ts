type Currency = "CDF" | "USD";
type PaymentChannel = "MOBILE_MONEY" | "CREDIT_CARD";

export interface CollectMobileMoneyPayload {
  channel: "MOBILE_MONEY";
  amount: number;
  currency: Currency;
  reference: string;
  phone: string;
}

export interface CollectCardPayload {
  channel: "CREDIT_CARD";
  amount: number;
  currency: Currency;
  reference: string;
  description?: string;
}

export type CollectPayload = CollectMobileMoneyPayload | CollectCardPayload;

export interface PayoutPayload {
  amount: number;
  currency: Currency;
  phone: string;
  reference: string;
}

export interface PaymentResponse {
  success: boolean;
  provider?: string;
  channel?: PaymentChannel;
  message?: string;
  data?: unknown;
  error?: string;
}

const getBaseUrl = (): string => {
  const url = process.env.PAYMENT_SERVICE;
  if (!url) {
    throw new Error("Missing PAYMENT_SERVICE environment variable");
  }
  return url.replace(/\/+$/, "");
};

const buildAuthHeaders = (): Record<string, string> => {
  const token = process.env.PAYMENT_SERVICE_AUTH_TOKEN ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
    apikey: token,
  };
};

const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  const last9 = digits.length > 9 ? digits.slice(-9) : digits;
  return `243${last9}`;
};

export class PaymentService {
  private static instance: PaymentService | null = null;
  private baseUrl: string;

  private constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService(getBaseUrl());
    }
    return PaymentService.instance;
  }

  private async fetchJson(endpoint: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    const authHeaders = buildAuthHeaders();
    for (const [key, value] of Object.entries(authHeaders)) {
      headers.set(key, value);
    }

    const url = `${this.baseUrl}${endpoint}`;
    console.info("[PAYMENT_SERVICE] HTTP", options.method ?? "GET", url);

    let resp: Response;
    try {
      resp = await fetch(url, {
        ...options,
        headers,
      });
    } catch (err) {
      const cause = err instanceof Error && "cause" in err ? (err as Error & { cause?: unknown }).cause : undefined;
      const causeObj =
        cause && typeof cause === "object" && cause !== null && "code" in cause
          ? { code: String((cause as { code?: unknown }).code), message: String((cause as { message?: unknown }).message ?? "") }
          : cause instanceof Error
            ? { name: cause.name, message: cause.message }
            : cause;
      console.error(
        "[PAYMENT_SERVICE] connexion échouée (aucune réponse HTTP) — réseau, TLS, DNS ou pare-feu",
        JSON.stringify(
          {
            url,
            error: err instanceof Error ? err.message : String(err),
            cause: causeObj,
            hint: "Tester depuis cette machine : curl -v -X POST URL -H 'Content-Type: application/json' -d '{}'",
          },
          null,
          2
        )
      );
      throw err;
    }

    const payload = await (resp.json().catch(() => ({})));

    if (!resp.ok) {
      const message = (payload as any)?.message || `Payment service error ${resp.status}`;
      console.error(
        "[PAYMENT_SERVICE] HTTP erreur — la requête a atteint le service mais la réponse est en échec",
        JSON.stringify({ endpoint, httpStatus: resp.status, message, payload }, null, 2)
      );
      throw new Error(message);
    }

    return payload;
  }

  async collect(payload: CollectPayload): Promise<PaymentResponse> {
    if (!payload.amount || !payload.currency || !payload.reference || !payload.channel) {
      throw new Error("channel, amount, currency et reference sont requis");
    }

    const channel = payload.channel;

    if (payload.channel === "MOBILE_MONEY") {
      const body = {
        channel: payload.channel,
        amount: payload.amount,
        currency: payload.currency,
        reference: payload.reference,
        phone: normalizePhone(payload.phone),
      };
      console.info(
        "[PAYMENT_SERVICE] corps normalisé /collect (téléphone → 243…)",
        JSON.stringify({ ...body, phone: body.phone })
      );

      const data = await this.fetchJson("/collect", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return {
        success: (data as any)?.code === "0" || true,
        provider: "flexpay",
        channel: payload.channel,
        message: (data as any)?.message ?? "Collecte mobile money initiée",
        data,
      };
    }

    if (payload.channel === "CREDIT_CARD") {
      const body = {
        channel: payload.channel,
        amount: payload.amount,
        currency: payload.currency,
        reference: payload.reference,
        description: payload.description ?? "Paiement via FlexPay",
      };

      const data = await this.fetchJson("/collect", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return {
        success: (data as any)?.code === "0" || true,
        provider: "flexpay",
        channel: payload.channel,
        message: (data as any)?.message ?? "Collecte par carte initiée",
        data,
      };
    }

    throw new Error(`Channel non supporté: ${channel}`);
  }

  async check(orderNumber: string): Promise<PaymentResponse> {
    if (!orderNumber) {
      throw new Error("orderNumber est requis");
    }

    const data = await this.fetchJson(`/check?orderNumber=${encodeURIComponent(orderNumber)}`);

    return {
      success: true, //(data as any)?.code === "0" ? true : false,
      provider: "flexpay",
      message: (data as any)?.message ?? "Vérification transaction",
      data,
    };
  }

  async payout(payload: PayoutPayload): Promise<PaymentResponse> {
    if (!payload.amount || !payload.currency || !payload.reference || !payload.phone) {
      throw new Error("amount, currency, phone et reference sont requis");
    }

    const body = {
      amount: payload.amount,
      currency: payload.currency,
      phone: normalizePhone(payload.phone),
      reference: payload.reference,
    };

    const data = await this.fetchJson("/payout", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      success: (data as any)?.code === "0" || true,
      provider: "flexpay",
      message: (data as any)?.message ?? "Payout initié",
      data,
    };
  }
}
