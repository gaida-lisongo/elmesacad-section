export type AdminSubMenuItem = {
  item: string;
  path: string;
};

export type AdminMenuItem = {
  item: string;
  path: string;
  subMenu?: AdminSubMenuItem[];
};
