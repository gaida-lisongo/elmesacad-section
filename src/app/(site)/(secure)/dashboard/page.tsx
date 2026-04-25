import PageDashboard from "@/components/secure/PageDashboard";

export default function DashboardPage() {
  return (
    <PageDashboard
      title="Dashboard metier"
      metrics={[
        { label: "Agents actifs", value: 48, trend: "+8% cette semaine" },
        { label: "Etudiants actifs", value: 1240, trend: "+2.3% ce mois" },
        { label: "Sections operationnelles", value: 12, trend: "Stable" },
      ]}
      chartTitle="Statistiques globales"
      chartPlaceholder="Chart de performance (a brancher avec tes donnees)"
      whiteList={[
        { label: "Tickets prioritaires", value: "21" },
        { label: "OTP valides", value: "39" },
        { label: "Agents online", value: "7" },
      ]}
      tableHeaders={["Nom", "Type", "Etat", "Maj"]}
      tableRows={[
        { id: "r1", columns: ["Jean Mukendi", "Agent", "Actif", "09:15"] },
        { id: "r2", columns: ["Grace Ilunga", "Etudiant", "Actif", "08:03"] },
        { id: "r3", columns: ["Section Finances", "Section", "OK", "07:42"] },
      ]}
    />
  );
}
