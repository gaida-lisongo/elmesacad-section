import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Common/Breadcrumb";
import ProductMarketplaceView from "@/components/product/ProductMarketplaceView";
import { loadProductPageData } from "@/lib/product/loadProductPageData";

type Props = {
  params: Promise<{ categorie: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickProductId(sp: Record<string, string | string[] | undefined>): string {
  const raw = sp.productId ?? sp.productid;
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return "";
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { categorie } = await params;
  const sp = await searchParams;
  const productId = pickProductId(sp);
  const loaded = await loadProductPageData(categorie, productId);
  if (!loaded.ok) {
    return { title: "Produit | INBTP" };
  }
  const name = loaded.model.kind === "activity" ? loaded.model.title : loaded.model.designation;
  return {
    title: `${name} | ${loaded.categoryLabel} | INBTP`,
    description: loaded.model.kind === "activity" ? loaded.model.summary : loaded.model.designation,
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { categorie } = await params;
  const sp = await searchParams;
  const productId = pickProductId(sp);
  if (!productId) {
    notFound();
  }

  const loaded = await loadProductPageData(categorie, productId);
  if (!loaded.ok) {
    return (
      <>
        <Breadcrumb
          pageName="Produit indisponible"
          pageDescription={loaded.message}
          trail={[{ label: "Études", href: "/etudes" }, { label: "Produit" }]}
        />
        <div className="bg-gradient-to-b from-slate-100/90 via-slate-50 to-white dark:from-slate-950 dark:via-darkmode dark:to-darkmode">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-darklight">
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{loaded.message}</p>
              <Link
                href="/etudes"
                className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-darkprimary"
              >
                Retour aux études
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const title = loaded.model.kind === "activity" ? loaded.model.title : loaded.model.designation;
  const pageDescription =
    loaded.model.kind === "activity"
      ? loaded.model.summary
      : `Ressource — ${loaded.model.apiCategorie}`;

  return (
    <>
      <Breadcrumb
        pageName={title}
        pageDescription={pageDescription}
        trail={[{ label: "Études", href: "/etudes" }, { label: loaded.categoryLabel }]}
      />
      <ProductMarketplaceView
        model={loaded.model}
        categoryLabel={loaded.categoryLabel}
        categoriePath={categorie}
      />
    </>
  );
}
