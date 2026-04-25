export type AdminSubMenuItem = {
  item: string;
  path: string;
};

export type AdminMenuItem = {
  item: string;
  path: string;
  subMenu?: AdminSubMenuItem[];
};

/** Décrit seul le contenu du menu (les entrées) ; le libellé `account` est injecté à l’exécution. */
export type UserFloatingConfig = {
  account: string;
  menu: AdminMenuItem[];
};
