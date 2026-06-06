import React from 'react';

// Types basés sur ton modèle de données
export interface Student {
  nom: string;
  matricule: string;
  email: string;
}

export interface Transaction {
  _id: string;
  categorie: string;
  orderNumber: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  providerInfo: string;
}

export interface OrderData {
  _id: string;
  student: Student;
  transaction: Transaction;
  status: string;
  createdAt: string | Date;
  rechargeId: string;
}

interface OrderCardProps {
  order: OrderData;
  // Prop pour injecter dynamiquement des boutons ou composants
  renderActions?: (order: OrderData) => React.ReactNode; 
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, renderActions }) => {
  const { student, transaction, status, createdAt } = order;
  const formattedDate = new Date(createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
      
      {/* Infos Étudiant & Commande */}
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Matricule: {student.matricule}
          </span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
            status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {status}
          </span>
        </div>
        
        <h3 className="font-bold text-gray-800 text-lg">{student.nom}</h3>
        <p className="text-sm text-gray-500">{student.email}</p>
        
        <div className="text-xs text-gray-400 pt-1">
          Cmd # : <span className="font-mono">{transaction.orderNumber}</span> • {formattedDate}
        </div>
      </div>

      {/* Détails Financiers */}
      <div className="text-left md:text-right space-y-1 min-w-[150px]">
        <div className="text-2xl font-black text-gray-950">
          {transaction.amount} {transaction.currency}
        </div>
        <p className="text-xs text-gray-500">Via {transaction.phoneNumber}</p>
        {/* Petit warning discret si le provider indique un échec malgré le statut paid */}
        {transaction.providerInfo.includes("pas réussi") && (
          <p className="text-xs text-red-500 font-medium italic">⚠️ {transaction.providerInfo}</p>
        )}
      </div>

      {/* Zone d'action dynamique (Boutons injectés) */}
      {renderActions && (
        <div className="w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 flex justify-end">
          {renderActions(order)}
        </div>
      )}

    </div>
  );
};