type UserInfoSectionProps = {
  userName: string;
  userEmail: string;
  matricule: string;
};

export default function UserInfoSection({ userName, userEmail, matricule }: UserInfoSectionProps) {
  return (
    <div className="border-b border-gray-200 pb-3 dark:border-gray-700">
      <h4 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{userName}</h4>
      <p className="mt-1 text-xs text-gray-500">{userEmail}</p>
      <p className="mt-2 inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
        Matricule: {matricule}
      </p>
    </div>
  );
}
