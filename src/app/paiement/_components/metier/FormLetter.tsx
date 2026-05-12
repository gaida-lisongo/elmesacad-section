"use client";

import React, { useState } from 'react';

interface FormLettreProps {
    onSubmit: (data: any) => void;
    reference: string;
    stageTitle: string;
}

interface FormLettreData {
    recipientName: string;
    recipientQuality: string;
    recipientSex: 'M' | 'F';
    companyName: string;
    companyLocation: string;
    documentReference: string;
    stageTitle: string;
}

const FormLettre = ({ onSubmit, reference, stageTitle }: FormLettreProps) => {
  // Un seul état pour tout le formulaire
  const [formData, setFormData] = useState<FormLettreData>({
    documentReference: reference,
    stageTitle: stageTitle,
    recipientName: '',
    recipientQuality: '',
    recipientSex: 'M',
    companyName: '',
    companyLocation: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    console.log("handleChange", name, value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Logique d'envoi ici
    onSubmit(formData);
  };

  return (
    <div className="max-w-xl mx-auto my-10 p-6 bg-white shadow-lg rounded-xl border border-gray-100">
      <h2 className="text-xl font-bold mb-6 text-primary border-b pb-2">
        Rédaction de la lettre de stage
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        <div className="group">
          <label className="text-xs font-semibold uppercase text-gray-500">Destinataire</label>
          <input
            type="text"
            name="recipientName"
            value={formData.recipientName}
            onChange={handleChange}
            placeholder="Ex: À l'attention de Monsieur le DG"
            className="w-full p-2 border-b-2 border-gray-200 outline-none focus:border-blue-500 transition-colors"
            required
          />
        </div>
        {/* Sexe du destinataire */}
        <div className="group">
          <label className="text-xs font-semibold uppercase text-gray-500">Sexe du destinataire</label>
          <select name="recipientSex" value={formData.recipientSex} onChange={
            (e) => setFormData(prev => ({ ...prev, recipientSex: e.target.value as 'M' | 'F' }))
          } className="w-full p-2 border-b-2 border-gray-200 outline-none focus:border-blue-500">
            <option value="M">Monsieur</option>
            <option value="F">Madame</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Entreprise</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full p-2 border-b-2 border-gray-200 outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Service visé</label>
            <input
              type="text"
              name="recipientQuality"
              value={formData.recipientQuality}
              onChange={handleChange}
              placeholder="Ex: Bureau technique"
              className="w-full p-2 border-b-2 border-gray-200 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">Adresse de l'entreprise</label>
          <input
            type="text"
            name="companyLocation"
            value={formData.companyLocation}
            onChange={handleChange}
            className="w-full p-2 border-b-2 border-gray-200 outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          className="mt-6 bg-primary text-white py-3 rounded-lg font-bold hover:bg-darkprimary active:scale-95 transition-all shadow-md"
        >
          Générer la lettre
        </button>
      </form>
    </div>
  );
};

export default FormLettre;