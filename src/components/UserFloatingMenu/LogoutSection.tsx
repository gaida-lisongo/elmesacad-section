type LogoutSectionProps = {
  onLogout: () => void;
};

export default function LogoutSection({ onLogout }: LogoutSectionProps) {
  return (
    <div className="pt-3">
      <button
        type="button"
        onClick={onLogout}
        className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-darkprimary"
      >
        Deconnexion
      </button>
    </div>
  );
}
