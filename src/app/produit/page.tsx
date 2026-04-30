import type { Metadata } from "next";

type ProductItem = {
  id: string;
  title: string;
  category: string;
  author: string;
  price: string;
  stock: string;
};

const products: ProductItem[] = [
  {
    id: "p1",
    title: "Pack TP Beton Arme",
    category: "Genie civil",
    author: "Prof. Mbuyi",
    price: "12 USD",
    stock: "Disponible",
  },
  {
    id: "p2",
    title: "Serie QCM Reseaux",
    category: "Telecom",
    author: "M. Mbala",
    price: "8 USD",
    stock: "Disponible",
  },
  {
    id: "p3",
    title: "Cours PDF Structures de donnees",
    category: "Informatique",
    author: "Mme Ilunga",
    price: "10 USD",
    stock: "Faible stock",
  },
  {
    id: "p4",
    title: "Activite live: Energie solaire appliquee",
    category: "Energie",
    author: "M. Kabongo",
    price: "15 USD",
    stock: "Disponible",
  },
];

export const metadata: Metadata = {
  title: "Produits | INBTP Section",
};

export default function ProduitPage() {
  return (
    <main className="pt-below-site-header bg-slate-50 pb-16 dark:bg-darkmode">
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-primary to-indigo-600 p-7 text-white">
          <p className="text-xs uppercase tracking-wide text-white/80">Story 1 - Produit</p>
          <h1 className="mt-2 text-3xl font-bold">Commander une ressource ou une activite</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/90">
            Cette page mock presente le catalogue de ressources pedagogiques publiees par les
            enseignants et valides par les sections.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {products.map((product) => (
            <article
              key={product.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-darklight"
            >
              <p className="text-xs uppercase tracking-wide text-muted">{product.category}</p>
              <h2 className="mt-2 text-xl font-semibold text-midnight_text dark:text-white">
                {product.title}
              </h2>
              <p className="mt-2 text-sm text-muted">Auteur: {product.author}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-lg font-bold text-primary">{product.price}</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {product.stock}
                </span>
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-darkprimary"
              >
                Commander maintenant
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
